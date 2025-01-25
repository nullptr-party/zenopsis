import { Context, Middleware } from "grammy";

import { Message, MessageReference, ReferenceType } from '../../types/message';

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
function detectMessageReferences(ctx: Context): MessageReference[] {
  const references: MessageReference[] = [];
  
  // Detect reply-to references
  if (ctx.message?.reply_to_message) {
    references.push({
      type: ReferenceType.REPLY,
      targetMessageId: ctx.message.reply_to_message.message_id,
    });
  }

  // Detect explicit thread references
  if (ctx.message?.text) {
    const threadMatch = ctx.message.text.match(/(?:re:|thread:)\s*(\d+)/i);
    if (threadMatch) {
      references.push({
        type: ReferenceType.THREAD,
        targetMessageId: parseInt(threadMatch[1], 10),
      });
    }
  }

  // Detect context-based thread references
  if (ctx.message?.text) {
    const contextKeywords = {
      project: ['project', 'task', 'milestone', 'deadline'],
      meeting: ['meeting', 'call', 'discussion', 'sync'],
      support: ['issue', 'problem', 'help', 'error'],
      event: ['event', 'planning', 'schedule', 'organize']
    };

    for (const [context, keywords] of Object.entries(contextKeywords)) {
      if (keywords.some(keyword => ctx.message!.text!.toLowerCase().includes(keyword))) {
        references.push({
          type: ReferenceType.CONTEXT,
          targetMessageId: -1,
          contextType: context
        });
        break;
      }
    }
  }

  // Detect mentions (@username)
  if (ctx.message?.text) {
    const mentionRegex = /@([a-zA-Z0-9_]{5,32})/g;
    let matches: RegExpExecArray | null;
    
    while ((matches = mentionRegex.exec(ctx.message.text)) !== null) {
      references.push({
        type: ReferenceType.MENTION,
        targetMessageId: -1,
        resolvedUsername: matches[1]
      });
    }
  }

  return references;
}

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
      // Detect and add references
      const references = detectMessageReferences(ctx);
      
      // Create full message object
      const message: Message = {
        messageId: metadata.messageId,
        chatId: metadata.chatId,
        userId: metadata.senderId,
        username: metadata.senderName,
        content: metadata.text || '',
        timestamp: metadata.timestamp.getTime(),
        references
      };

      // TODO: Store message with references
      console.log('Processing message with references:', message);
    }
  } catch (error) {
    console.error("Error processing message:", error);
  }

  await next();
}; 
