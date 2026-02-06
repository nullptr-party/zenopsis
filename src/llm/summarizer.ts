import { generateObject } from 'ai';
import { model, SummarySchema, withErrorHandling } from './client';
import { messages as messagesTable, summaries } from '../db/schema';

const TOPIC_KEYWORDS = {
  tech: ['ai', 'code', 'server', 'database', 'api', 'framework'],
  support: ['help', 'issue', 'error', 'bug', 'fix', 'problem'],
  offTopic: ['meme', 'joke', 'offtopic', 'random', 'funny']
};
import type { InferSelectModel } from 'drizzle-orm';
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
