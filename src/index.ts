import bot from "./bot";

console.log("Starting Zenopsis bot...");

// Start the bot
bot.start({
  onStart: (botInfo) => {
    console.log(`Bot @${botInfo.username} started successfully!`);
  },
}).catch((err) => {
  console.error("Failed to start bot:", err);
  process.exit(1);
}); 