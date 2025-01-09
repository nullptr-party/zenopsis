import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Messages table to store all chat messages
export const messages = sqliteTable('messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  messageId: integer('message_id').notNull(),
  chatId: integer('chat_id').notNull(),
  userId: integer('user_id').notNull(),
  username: text('username'),
  content: text('content').notNull(),
  timestamp: integer('timestamp', { mode: 'number' }).notNull(),
  threadId: integer('thread_id'),
  replyToMessageId: integer('reply_to_message_id'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Group configurations table
export const groupConfigs = sqliteTable('group_configs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  chatId: integer('chat_id').unique().notNull(),
  summaryInterval: integer('summary_interval').notNull().default(21600), // 6 hours in seconds
  minMessagesForSummary: integer('min_messages_for_summary').notNull().default(10),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Summaries table
export const summaries = sqliteTable('summaries', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  chatId: integer('chat_id').notNull(),
  content: text('content').notNull(),
  messageCount: integer('message_count').notNull(),
  startTimestamp: integer('start_timestamp', { mode: 'timestamp' }).notNull(),
  endTimestamp: integer('end_timestamp', { mode: 'timestamp' }).notNull(),
  tokensUsed: integer('tokens_used'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
}); 