import { Context, Middleware } from 'grammy';
import { MessagesRepository } from '../../db/repositories';

const messagesRepo = new MessagesRepository();

export function createMessageLogger(): Middleware<Context> {
  return async (ctx, next) => {
    try {
      // Only process text messages from group chats
      if (!ctx.message?.text || !ctx.chat?.id || ctx.chat.type === 'private') {
        return next();
      }

      // Skip bot commands
      if (ctx.message.text.startsWith('/')) {
        return next();
      }

      // Save message to database
      await messagesRepo.create({
        messageId: ctx.message.message_id,
        chatId: ctx.chat.id,
        userId: ctx.from?.id || 0,
        username: ctx.from?.username,
        content: ctx.message.text,
        timestamp: ctx.message.date * 1000,
        threadId: ctx.message.message_thread_id,
        replyToMessageId: ctx.message.reply_to_message?.message_id,
      });

      return next();
    } catch (error) {
      console.error('Error saving message to database:', error);
      return next();
    }
  };
} 