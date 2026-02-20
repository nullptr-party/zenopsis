import { generateObject } from 'ai';
import { model, SummarySchema, TopicsSchema, withErrorHandling } from './client';
import { messages as messagesTable, summaries } from '../db/schema';

const TOPIC_KEYWORDS = {
  tech: ['ai', 'code', 'server', 'database', 'api', 'framework'],
  support: ['help', 'issue', 'error', 'bug', 'fix', 'problem'],
  offTopic: ['meme', 'joke', 'offtopic', 'random', 'funny']
};
import type { InferSelectModel } from 'drizzle-orm';
import { and, eq, gte } from 'drizzle-orm';
import { db } from '../db';

// Configuration
const MAX_MESSAGES_PER_BATCH = 50;
const MIN_MESSAGES_FOR_SUMMARY = 5;
const MAX_TOKENS_PER_REQUEST = 4000;

type Message = InferSelectModel<typeof messagesTable>;

interface MessageBatch {
  messages: Message[];
  chatId: number;
  startTime: Date;
  endTime: Date;
}

export async function batchMessages(chatId: number, timeWindowMinutes: number = 360): Promise<MessageBatch | null> {
  const cutoffTime = new Date(Date.now() - timeWindowMinutes * 60 * 1000);

  const batchMessages = await db.query.messages.findMany({
    where: (messages, { eq }) => eq(messages.chatId, chatId),
    orderBy: (messages, { asc }) => [asc(messages.timestamp)],
    limit: MAX_MESSAGES_PER_BATCH,
  });

  if (batchMessages.length < MIN_MESSAGES_FOR_SUMMARY) {
    return null;
  }

  return {
    messages: batchMessages,
    chatId,
    startTime: new Date(batchMessages[0].timestamp),
    endTime: new Date(batchMessages[batchMessages.length - 1].timestamp),
  };
}

export function detectTopics(messages: Message[]): string[] {
  const content = messages
    .map(m => m.content)
    .filter((c): c is string => c !== null)
    .join(' ')
    .toLowerCase();
  return Object.entries(TOPIC_KEYWORDS)
    .filter(([_, keywords]) => keywords.some(kw => content.includes(kw)))
    .map(([topic]) => topic);
}

export async function generateSummary(batch: MessageBatch) {
  const messageText = batch.messages
    .filter(msg => msg.content !== null)
    .map(msg => `${msg.username || 'Unknown'}: ${msg.content}`)
    .join('\n');

  const detectedTopics = detectTopics(batch.messages);

  return await withErrorHandling(async () => {
    const { object: summary } = await generateObject({
      model,
      schema: SummarySchema,
      system: 'You are a helpful assistant that summarizes group chat conversations. Focus on key points, decisions, and action items.',
      prompt: `Please analyze and summarize the following conversation:\n\n${messageText}`,
      temperature: 0.7,
      maxTokens: MAX_TOKENS_PER_REQUEST,
    });

    return summary;
  });
}

export async function storeSummary(chatId: number, summary: any, batch: MessageBatch) {
  const [created] = await db.insert(summaries).values({
    chatId,
    content: JSON.stringify(summary),
    messageCount: batch.messages.length,
    startTimestamp: batch.startTime,
    endTimestamp: batch.endTime,
    tokensUsed: summary.usage?.total_tokens,
  }).returning();
  return created;
}

// Topics extraction

const MAX_MESSAGES_FOR_TOPICS = 5000;
const MIN_MESSAGES_FOR_TOPICS = 10;

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  ru: 'Russian',
  es: 'Spanish',
  de: 'German',
  fr: 'French',
  pt: 'Portuguese',
  uk: 'Ukrainian',
  zh: 'Chinese',
  ja: 'Japanese',
  ko: 'Korean',
};

export interface TopicsBatch extends MessageBatch {
  participantNames: string[];
}

export async function batchMessagesForTopics(chatId: number, days: number = 14): Promise<TopicsBatch | null> {
  const cutoffTimestamp = Date.now() - days * 24 * 60 * 60 * 1000;

  const allMessages = await db.query.messages.findMany({
    where: and(
      eq(messagesTable.chatId, chatId),
      gte(messagesTable.timestamp, cutoffTimestamp),
    ),
    orderBy: (messages, { asc }) => [asc(messages.timestamp)],
  });

  if (allMessages.length < MIN_MESSAGES_FOR_TOPICS) {
    return null;
  }

  // Evenly sample messages if over the limit
  const batch = allMessages.length <= MAX_MESSAGES_FOR_TOPICS
    ? allMessages
    : evenSample(allMessages, MAX_MESSAGES_FOR_TOPICS);

  const participantNames = [...new Set(
    batch
      .map(m => m.username || m.senderFirstName || 'Unknown')
      .filter(Boolean)
  )];

  return {
    messages: batch,
    chatId,
    startTime: new Date(batch[0].timestamp),
    endTime: new Date(batch[batch.length - 1].timestamp),
    participantNames,
  };
}

function evenSample<T>(items: T[], limit: number): T[] {
  const step = items.length / limit;
  const result: T[] = [];
  for (let i = 0; i < limit; i++) {
    result.push(items[Math.floor(i * step)]);
  }
  return result;
}

export async function generateTopics(batch: TopicsBatch, language: string = 'en') {
  const messageText = batch.messages
    .filter(msg => msg.content !== null)
    .map(msg => `${msg.username || msg.senderFirstName || 'Unknown'}: ${msg.content}`)
    .join('\n');

  const langName = LANGUAGE_NAMES[language] || language;

  return await withErrorHandling(async () => {
    const { object: topics } = await generateObject({
      model,
      schema: TopicsSchema,
      system: `You are an assistant that extracts discussion topics from group chat history to help people prepare for offline meetings. Identify 10-12 most important and interesting topics. Skip obvious spam messages — especially those that someone replied to with /sban or similar ban commands. Do not create topics from spam content. Respond in ${langName}.`,
      prompt: `Analyze the following chat messages and extract the main discussion topics. For each topic, provide a short title, a brief summary (1-2 sentences), approximate participant count, and approximate message count.\n\n${messageText}`,
      temperature: 0.7,
      maxTokens: MAX_TOKENS_PER_REQUEST,
    });

    return {
      ...topics,
      _meta: {
        messageCount: batch.messages.length,
        participantCount: batch.participantNames.length,
        startTime: batch.startTime,
        endTime: batch.endTime,
      },
    };
  });
}
