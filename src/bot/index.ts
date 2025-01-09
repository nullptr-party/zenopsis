import { Bot } from "grammy";
import { config } from "dotenv";
import { initializeDatabase } from "../db/init";
import { createMessageLogger } from "./middleware/message-logger";

// Load environment variables
config();

if (!process.env.TELEGRAM_BOT_TOKEN) {
  throw new Error("TELEGRAM_BOT_TOKEN environment variable is required");
}

// Create bot instance
const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);

// Initialize bot
export async function initializeBot() {
  try {
    // Initialize database
    await initializeDatabase();

    // Add message logger middleware
    bot.use(createMessageLogger());

    // Add command handlers
    bot.command("start", (ctx) => ctx.reply("Welcome to Zenopsis! I will help you track and summarize group chat conversations."));
    bot.command("help", (ctx) => ctx.reply("Available commands:\n/start - Start the bot\n/help - Show this help message"));

    // Start the bot
    await bot.start();
    console.log("Bot started successfully");
  } catch (error) {
    console.error("Failed to initialize bot:", error);
    throw error;
  }
} 