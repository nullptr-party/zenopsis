import { Bot } from "grammy";
import { config } from "dotenv";
import { initializeDatabase } from "../db/init";
import { createMessageLogger } from "./middleware/message-logger";
import { rateLimiter } from "./middleware/rate-limiter";
import { triggerManualSummary, triggerManualTopics } from "../llm/scheduler";
import { db } from "../db";
import { groupConfigs } from "../db/schema";
import { eq } from "drizzle-orm";
import { GroupConfigsRepository } from "../db/repositories/group-configs";

// Load environment variables
config();

if (!process.env.TELEGRAM_BOT_TOKEN) {
  throw new Error("TELEGRAM_BOT_TOKEN environment variable is required");
}

// Create bot instance
export const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);

// Debug mode detection
const isDebugMode = process.env.NODE_ENV === 'development' || process.argv.includes('--debug');

async function isGroupAdmin(chatId: number, userId: number): Promise<boolean> {
  try {
    const member = await bot.api.getChatMember(chatId, userId);
    if (isDebugMode) {
      // In debug mode, only allow the group creator
      return member.status === "creator";
    }
    // In production, allow both creators and administrators
    return ["creator", "administrator"].includes(member.status);
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
}

// Initialize bot
export async function initializeBot() {
  try {
    // Initialize database
    await initializeDatabase();

    // Add middleware - message logger BEFORE rate limiter so it sees all messages
    bot.use(createMessageLogger());
    bot.use(rateLimiter());

    // Handle bot being added to a group
    bot.on("my_chat_member", async (ctx) => {
      if (ctx.chat.type === "group" || ctx.chat.type === "supergroup") {
        const chatId = ctx.chat.id;

        // Check if config already exists
        const existingConfig = await db.query.groupConfigs.findFirst({
          where: eq(groupConfigs.chatId, chatId),
        });

        if (!existingConfig) {
          // Create new group configuration
          await db.insert(groupConfigs).values({
            chatId: chatId,
            summaryInterval: 21600, // 6 hours in seconds
            minMessagesForSummary: 10,
            isActive: true,
          });

          await ctx.reply("Thanks for adding me! I'll help you track and summarize conversations in this group.");
        }
      }
    });

    // Add command handlers
    bot.command("start", (ctx) => ctx.reply("Welcome to Zenopsis! I will help you track and summarize group chat conversations."));
    bot.command("help", (ctx) => ctx.reply(
      "Available commands:\n" +
      "/start - Start the bot\n" +
      "/help - Show this help message\n" +
      `/summary - Generate a summary of recent messages (${isDebugMode ? 'owner' : 'admin'} only)\n` +
      `/topics [days] - Extract discussion topics for meeting prep (${isDebugMode ? 'owner' : 'admin'} only, default: 14 days)`
    ));

    // Add summary command
    bot.command("summary", async (ctx) => {
      try {
        const chatId = ctx.chat.id;
        const userId = ctx.from?.id;

        if (!userId) {
          await ctx.reply("Sorry, I couldn't identify the user.");
          return;
        }

        // Check if user is admin/owner
        if (ctx.chat.type === "group" || ctx.chat.type === "supergroup") {
          const isAdmin = await isGroupAdmin(chatId, userId);
          if (!isAdmin) {
            await ctx.reply(`Sorry, only group ${isDebugMode ? 'owner' : 'administrators'} can use this command.`);
            return;
          }
        }

        // Ensure group config exists
        let existingConfig = await db.query.groupConfigs.findFirst({
          where: eq(groupConfigs.chatId, chatId),
        });

        if (!existingConfig && (ctx.chat.type === "group" || ctx.chat.type === "supergroup")) {
          // Create config if it doesn't exist
          await db.insert(groupConfigs).values({
            chatId: chatId,
            summaryInterval: 21600,
            minMessagesForSummary: 10,
            isActive: true,
          });
        }

        await ctx.reply("Generating summary... Please wait.");
        const summary = await triggerManualSummary(chatId);

        // Check token usage
        const groupConfigsRepo = new GroupConfigsRepository();
        const usage = await groupConfigsRepo.checkTokenUsage(chatId);
        if (usage?.shouldAlert) {
          const alertMsg = [
            `⚠️ *Token Usage Alert*`,
            `Current usage: ${usage.percentage.toFixed(1)}% of daily limit`,
            `${usage.currentUsage.toLocaleString()} / ${usage.limit.toLocaleString()} tokens used`,
            '',
            `To prevent service interruption:`,
            `• Increase your daily token limit, or`,
            `• Reduce summary frequency`
          ].join('\n');

          await ctx.reply(alertMsg, { parse_mode: 'Markdown' });
        }

        if (summary) {
          await ctx.reply(summary, { parse_mode: 'Markdown' });
        } else {
          await ctx.reply("Not enough messages to generate a summary. Please try again later when there are more messages.");
        }
      } catch (error) {
        console.error("Error generating summary:", error);
        await ctx.reply("Sorry, I couldn't generate a summary at this time. Please try again later.");
      }
    });

    // Add topics command
    bot.command("topics", async (ctx) => {
      try {
        const chatId = ctx.chat.id;
        const userId = ctx.from?.id;

        if (!userId) {
          await ctx.reply("Sorry, I couldn't identify the user.");
          return;
        }

        // Check if user is admin/owner
        if (ctx.chat.type === "group" || ctx.chat.type === "supergroup") {
          const isAdmin = await isGroupAdmin(chatId, userId);
          if (!isAdmin) {
            await ctx.reply(`Sorry, only group ${isDebugMode ? 'owner' : 'administrators'} can use this command.`);
            return;
          }
        }

        // Parse optional days argument
        const args = ctx.match?.toString().trim();
        let days = 14;
        if (args) {
          const parsed = parseInt(args, 10);
          if (!isNaN(parsed) && parsed > 0 && parsed <= 365) {
            days = parsed;
          }
        }

        // Ensure group config exists
        let existingConfig = await db.query.groupConfigs.findFirst({
          where: eq(groupConfigs.chatId, chatId),
        });

        if (!existingConfig && (ctx.chat.type === "group" || ctx.chat.type === "supergroup")) {
          await db.insert(groupConfigs).values({
            chatId: chatId,
            summaryInterval: 21600,
            minMessagesForSummary: 10,
            isActive: true,
          });
        }

        await ctx.reply(`Extracting discussion topics for the last ${days} day(s)... Please wait.`);
        const result = await triggerManualTopics(chatId, days);

        if (result) {
          await ctx.reply(result, { parse_mode: 'Markdown' });
        } else {
          await ctx.reply("Not enough messages to extract topics. Please try again later when there are more messages.");
        }
      } catch (error) {
        console.error("Error extracting topics:", error);
        await ctx.reply("Sorry, I couldn't extract topics at this time. Please try again later.");
      }
    });

    // Log startup mode
    console.log(`Bot started successfully in ${isDebugMode ? 'debug' : 'production'} mode`);

    // Start the bot
    await bot.start();
  } catch (error) {
    console.error("Failed to initialize bot:", error);
    throw error;
  }
}
