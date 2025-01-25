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
  sentimentScore: integer('sentiment_score'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  embedding: text('embedding'), // Store text-embedding-3-small vectors
});

// Group configurations table
export const groupConfigs = sqliteTable('group_configs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  chatId: integer('chat_id').unique().notNull(),
  summaryInterval: integer('summary_interval').notNull().default(21600), // 6 hours in seconds
  minMessagesForSummary: integer('min_messages_for_summary').notNull().default(10),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  summaryFormat: text('summary_format').notNull().default('markdown'),
  language: text('language').notNull().default('en'),
  schemaVersion: integer('schema_version').notNull().default(1),
  maxDailyTokens: integer('max_daily_tokens'),
  maxSummaryTokens: integer('max_summary_tokens'),
  tokenUsageAlert: integer('token_usage_alert_percent'),
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
  format: text('format').notNull().default('markdown'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const messageReferences = sqliteTable('message_references', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sourceMessageId: integer('source_message_id').notNull(),
  targetMessageId: integer('target_message_id').notNull(),
  referenceType: text('reference_type').notNull(),
  resolvedUsername: text('resolved_username'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const summaryFeedback = sqliteTable('summary_feedback', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  summaryId: integer('summary_id').references(() => summaries.id),
  chatId: integer('chat_id').notNull(),
  userId: integer('user_id').notNull(),
  rating: integer('rating').notNull().check(sql`rating >= 1 AND rating <= 5`),
  feedbackText: text('feedback_text'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const userEngagement = sqliteTable('user_engagement', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull(),
  chatId: integer('chat_id').notNull(),
  messageCount: integer('message_count').notNull().default(0),
  commandCount: integer('command_count').notNull().default(0),
  replyCount: integer('reply_count').notNull().default(0),
  mentionCount: integer('mention_count').notNull().default(0),
  lastActive: integer('last_active', { mode: 'timestamp' }).notNull(),
  dailyActiveStreak: integer('daily_active_streak').notNull().default(0),
  averageResponseTime: integer('average_response_time'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
});
