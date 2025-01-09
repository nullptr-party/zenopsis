import { Context, Middleware } from "grammy";

interface MessageMetadata {
  messageId: number;
  chatId: number;
  senderId: number;
  senderName: string;
  timestamp: Date;
  text: string | null;
  isCommand: boolean;
  isFromBot: boolean;
}

/**
 * Extracts essential metadata from a message
 */
function extractMessageMetadata(ctx: Context): MessageMetadata | null {
  const message = ctx.message;
  if (!message) return null;

  return {
    messageId: message.message_id,
    chatId: message.chat.id,
    senderId: message.from?.id ?? 0,
    senderName: message.from?.first_name ?? "Unknown",
    timestamp: new Date(message.date * 1000),
    text: message.text ?? message.caption ?? null,
    isCommand: !!message.text?.startsWith("/"),
    isFromBot: message.from?.is_bot ?? false,
  };
}

/**
 * Validates if a message should be processed
 */
function shouldProcessMessage(metadata: MessageMetadata): boolean {
  // Skip bot commands and bot messages
  if (metadata.isCommand || metadata.isFromBot) return false;
  
  // Skip empty messages
  if (!metadata.text?.trim()) return false;
  
  return true;
}

/**
 * Message capture middleware
 */
export const messageHandler: Middleware<Context> = async (ctx, next) => {
  try {
    const metadata = extractMessageMetadata(ctx);
    
    if (metadata && shouldProcessMessage(metadata)) {
      // TODO: Store message in database
      console.log("Processing message:", {
        chatId: metadata.chatId,
        senderId: metadata.senderId,
        text: metadata.text,
        timestamp: metadata.timestamp,
      });
    }
  } catch (error) {
    console.error("Error processing message:", error);
  }

  await next();
}; 