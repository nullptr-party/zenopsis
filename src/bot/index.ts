import { Bot } from "grammy";
import { config } from "dotenv";

// Load environment variables
config();

// Initialize the bot with the token from environment variables
const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN || "");

// Basic command handlers
bot.command("start", async (ctx) => {
  await ctx.reply(
    "👋 Hello! I'm Zenopsis, your chat monitoring and summarization bot.\n\n" +
    "I'll help keep track of conversations and provide periodic summaries."
  );
});

bot.command("help", async (ctx) => {
  await ctx.reply(
    "🤖 Zenopsis Bot Commands:\n\n" +
    "/start - Start the bot\n" +
    "/help - Show this help message\n" +
    "/summary - Generate a summary of recent messages"
  );
});

// Error handling
bot.catch((err) => {
  console.error("Bot error occurred:", err);
});

// Export the bot instance
export default bot; 