import { bot } from "@/bot";
import { registerHandler } from "./worker";

export function registerTaskHandlers() {
  registerHandler("delete_message", async (payload) => {
    try {
      await bot.api.deleteMessage(payload.chatId, payload.messageId);
    } catch (error: any) {
      // Treat "message not found" / "can't be deleted" as success (idempotent)
      const msg = error?.message || error?.description || "";
      if (
        msg.includes("message to delete not found") ||
        msg.includes("message can't be deleted")
      ) {
        return;
      }
      throw error;
    }
  });
}
