import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Messages table to store all chat messages
export const messages = sqliteTable('messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  messageId: integer('message_id').notNull(),
  chatId: integer('chat_id').notNull(),
  userId: integer('user_id').notNull(),
  username: text('username'),
  content: text('content'),
  timestamp: integer('timestamp', { mode: 'number' }).notNull(),
  threadId: integer('thread_id'),
  replyToMessageId: integer('reply_to_message_id'),
  messageType: text('message_type').notNull().default('text'),
  senderFirstName: text('sender_first_name'),
  senderLastName: text('sender_last_name'),
  forwardOrigin: text('forward_origin'),
  mediaGroupId: text('media_group_id'),
  rawJson: text('raw_json'),
  languageCode: text('language_code'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Message attachments table
export const messageAttachments = sqliteTable('message_attachments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  messageDbId: integer('message_db_id').notNull().references(() => messages.id),
  attachmentType: text('attachment_type').notNull(),
  fileId: text('file_id').notNull(),
  fileUniqueId: text('file_unique_id').notNull(),
  fileSize: integer('file_size'),
  mimeType: text('mime_type'),
  fileName: text('file_name'),
  duration: integer('duration'),
  width: integer('width'),
  height: integer('height'),
  localPath: text('local_path'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
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
  alertSent: integer('alert_sent', { mode: 'boolean' }).default(false),
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
  rating: integer('rating').notNull(),
  feedbackText: text('feedback_text'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Admin group links - one-to-one mapping between admin groups and controlled groups
export const adminGroupLinks = sqliteTable('admin_group_links', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  adminChatId: integer('admin_chat_id').notNull().unique(),
  controlledChatId: integer('controlled_chat_id').notNull().unique(),
  linkedByUserId: integer('linked_by_user_id').notNull(),
  controlledChatTitle: text('controlled_chat_title'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Linking tokens for onboarding admin group → controlled group
export const linkingTokens = sqliteTable('linking_tokens', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  token: text('token').notNull().unique(),
  adminChatId: integer('admin_chat_id').notNull(),
  createdByUserId: integer('created_by_user_id').notNull(),
  expiresAt: integer('expires_at').notNull(), // unix ms
  usedAt: integer('used_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Scheduled tasks for persistent deferred execution
export const scheduledTasks = sqliteTable('scheduled_tasks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  type: text('type').notNull(),
  payload: text('payload').notNull(),
  runAt: integer('run_at').notNull(), // unix ms
  status: text('status').notNull().default('pending'), // pending | running | completed | failed
  attempts: integer('attempts').notNull().default(0),
  maxAttempts: integer('max_attempts').notNull().default(3),
  lastError: text('last_error'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
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
