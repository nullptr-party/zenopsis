import { Bot } from "grammy";
import { config } from "dotenv";
import { initializeDatabase } from "../db/init";
import { createMessageLogger, invalidateAdminGroupCache } from "./middleware/message-logger";
import { createLinkDetector } from "./middleware/link-detector";
import { rateLimiter } from "./middleware/rate-limiter";
import { triggerManualSummary, triggerManualTopics } from "../llm/scheduler";
import { db } from "../db";
import { groupConfigs } from "../db/schema";
import { eq } from "drizzle-orm";
import { GroupConfigsRepository } from "../db/repositories/group-configs";
import { AdminGroupLinksRepository } from "../db/repositories/admin-group-links";
import { detectGroupLanguage } from "../services/language-detector";
import { resolveTargetChatId } from "./helpers/resolve-target";
import { registerTaskHandlers } from "../tasks/handlers";
import { startWorker } from "../tasks/worker";
import { scheduleTask } from "../tasks/schedule";

// Load environment variables
config();

if (!process.env.TELEGRAM_BOT_TOKEN) {
  throw new Error("TELEGRAM_BOT_TOKEN environment variable is required");
}

// Create bot instance
export const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);

// Debug mode detection
const isDebugMode = process.env.NODE_ENV === 'development' || process.argv.includes('--debug');

interface CommandContext {
  targetChatId: number;
  config: typeof groupConfigs.$inferSelect;
}

async function resolveCommandContext(ctx: { chat: { id: number; type: string }; from?: { id: number } }, reply: (msg: string) => Promise<unknown>): Promise<CommandContext | null> {
  const chatId = ctx.chat.id;
  const userId = ctx.from?.id;

  if (!userId) {
    await reply("Sorry, I couldn't identify the user.");
    return null;
  }

  if (ctx.chat.type !== "group" && ctx.chat.type !== "supergroup") {
    return null;
  }

  const resolved = await resolveTargetChatId(chatId);
  if (!resolved) {
    await reply("Commands are managed from the admin group for this chat.");
    return null;
  }

  const isAdmin = await isGroupAdmin(chatId, userId);
  if (!isAdmin) {
    await reply(`Sorry, only group ${isDebugMode ? 'owner' : 'administrators'} can use this command.`);
    return null;
  }

  const targetChatId = resolved.targetChatId;

  let existingConfig = await db.query.groupConfigs.findFirst({
    where: eq(groupConfigs.chatId, targetChatId),
  });

  if (!existingConfig) {
    const [created] = await db.insert(groupConfigs).values({
      chatId: targetChatId,
      summaryInterval: 21600,
      minMessagesForSummary: 10,
      isActive: true,
    }).returning();
    existingConfig = created;
  }

  // Auto-detect language only if not already configured
  if (!existingConfig.language) {
    const detectedLanguage = await detectGroupLanguage(targetChatId);
    if (detectedLanguage) {
      const groupConfigsRepo = new GroupConfigsRepository();
      await groupConfigsRepo.upsert({ chatId: targetChatId, language: detectedLanguage });
      existingConfig = { ...existingConfig, language: detectedLanguage };
    }
  }

  return { targetChatId, config: existingConfig };
}

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

    // Start persistent task queue
    registerTaskHandlers();
    startWorker();

    // Add middleware - link detector first, then message logger, then rate limiter
    bot.use(createLinkDetector());
    bot.use(createMessageLogger());
    bot.use(rateLimiter());

    // Clean expired linking tokens on startup
    const adminGroupLinksRepo = new AdminGroupLinksRepository();
    await adminGroupLinksRepo.cleanExpiredTokens();

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
      `/topics [days] - Extract discussion topics for meeting prep (${isDebugMode ? 'owner' : 'admin'} only, default: 14 days)\n` +
      `/link - Link this group as an admin group to control another group (${isDebugMode ? 'owner' : 'admin'} only)\n` +
      `/unlink - Remove the link between this admin group and its controlled group (${isDebugMode ? 'owner' : 'admin'} only)`
    ));

    // Add summary command
    bot.command("summary", async (ctx) => {
      try {
        const resolved = await resolveCommandContext(ctx, (msg) => ctx.reply(msg));
        if (!resolved) return;

        const { targetChatId } = resolved;

        await ctx.reply("Generating summary... Please wait.");
        const summary = await triggerManualSummary(targetChatId);

        // Check token usage for target
        const groupConfigsRepo = new GroupConfigsRepository();
        const usage = await groupConfigsRepo.checkTokenUsage(targetChatId);
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
        const resolved = await resolveCommandContext(ctx, (msg) => ctx.reply(msg));
        if (!resolved) return;

        const { targetChatId } = resolved;

        // Parse optional days argument
        const args = ctx.match?.toString().trim();
        let days = 14;
        if (args) {
          const parsed = parseInt(args, 10);
          if (!isNaN(parsed) && parsed > 0 && parsed <= 365) {
            days = parsed;
          }
        }

        await ctx.reply(`Extracting discussion topics for the last ${days} day(s)... Please wait.`);
        const result = await triggerManualTopics(targetChatId, days);

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

    // Add link command (for admin groups)
    bot.command("link", async (ctx) => {
      try {
        const chatId = ctx.chat.id;
        const userId = ctx.from?.id;

        if (!userId) {
          await ctx.reply("Sorry, I couldn't identify the user.");
          return;
        }

        if (ctx.chat.type !== "group" && ctx.chat.type !== "supergroup") {
          await ctx.reply("This command can only be used in a group.");
          return;
        }

        const isAdmin = await isGroupAdmin(chatId, userId);
        if (!isAdmin) {
          await ctx.reply(`Sorry, only group ${isDebugMode ? 'owner' : 'administrators'} can use this command.`);
          return;
        }

        // Check if already linked as an admin group
        const existingLink = await adminGroupLinksRepo.getByAdminChatId(chatId);
        if (existingLink) {
          await ctx.reply(
            `This group is already linked as an admin group for "${existingLink.controlledChatTitle || 'Unknown Group'}". Use /unlink first to remove the existing link.`
          );
          return;
        }

        // Check if this group is being controlled by another admin group
        const controlledLink = await adminGroupLinksRepo.getByControlledChatId(chatId);
        if (controlledLink) {
          await ctx.reply("This group is controlled by another admin group. It cannot also be an admin group.");
          return;
        }

        const token = await adminGroupLinksRepo.createLinkingToken(chatId, userId);

        const tokenMsg = await ctx.reply(
          "Forward this message to the group you want to control from here.\n\n" +
          `🔗 zenopsis-link:${token}\n\n` +
          "This token expires in 15 minutes.\n\n" +
          "⚠️ Note: Once linked, messages in this group will not be logged — it becomes a control-only group."
        );

        // Auto-delete the token message after expiry (15 minutes)
        await scheduleTask({
          type: 'delete_message',
          payload: { chatId, messageId: tokenMsg.message_id },
          runAt: Date.now() + 15 * 60 * 1000,
        });
      } catch (error) {
        console.error("Error generating link token:", error);
        await ctx.reply("Sorry, an error occurred. Please try again.");
      }
    });

    // Add unlink command (for admin groups)
    bot.command("unlink", async (ctx) => {
      try {
        const chatId = ctx.chat.id;
        const userId = ctx.from?.id;

        if (!userId) {
          await ctx.reply("Sorry, I couldn't identify the user.");
          return;
        }

        if (ctx.chat.type !== "group" && ctx.chat.type !== "supergroup") {
          await ctx.reply("This command can only be used in a group.");
          return;
        }

        const isAdmin = await isGroupAdmin(chatId, userId);
        if (!isAdmin) {
          await ctx.reply(`Sorry, only group ${isDebugMode ? 'owner' : 'administrators'} can use this command.`);
          return;
        }

        const existingLink = await adminGroupLinksRepo.getByAdminChatId(chatId);
        if (!existingLink) {
          await ctx.reply("This group is not linked to any group.");
          return;
        }

        await adminGroupLinksRepo.removeLink(chatId);
        invalidateAdminGroupCache();

        await ctx.reply(
          `Unlinked from "${existingLink.controlledChatTitle || 'Unknown Group'}". Commands in that group will work normally again.`
        );

        // Try to notify the previously controlled group
        try {
          await ctx.api.sendMessage(
            existingLink.controlledChatId,
            "This group has been unlinked from its admin group. Commands like /summary now work directly in this group again."
          );
        } catch (err) {
          // Controlled group might not be reachable
        }
      } catch (error) {
        console.error("Error unlinking:", error);
        await ctx.reply("Sorry, an error occurred. Please try again.");
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
