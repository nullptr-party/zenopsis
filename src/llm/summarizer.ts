import { instructor, SummarySchema, withErrorHandling } from './client';
import { messages as messagesTable, summaries } from '../db/schema';
import { z } from 'zod';

const TOPIC_KEYWORDS = {
  tech: ['ai', 'code', 'server', 'database', 'api', 'framework'],
  support: ['help', 'issue', 'error', 'bug', 'fix', 'problem'],
  offTopic: ['meme', 'joke', 'offtopic', 'random', 'funny']
};
import type { InferSelectModel } from 'drizzle-orm';
import { eq } from 'drizzle-orm';
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
    where: eq(messagesTable.chatId, chatId),
    orderBy: (messages, { asc }) => [asc(messages.createdAt)],
    limit: MAX_MESSAGES_PER_BATCH,
  });

  if (batchMessages.length < MIN_MESSAGES_FOR_SUMMARY) {
    return null;
  }

  return {
    messages: batchMessages,
    chatId,
    startTime: new Date(batchMessages[0].createdAt),
    endTime: new Date(batchMessages[batchMessages.length - 1].createdAt),
  };
}

function detectTopics(messages: Message[]): string[] {
  const content = messages.map(m => m.content).join(' ').toLowerCase();
  return Object.entries(TOPIC_KEYWORDS)
    .filter(([_, keywords]) => keywords.some(kw => content.includes(kw)))
    .map(([topic]) => topic);
}

export async function generateSummary(batch: MessageBatch) {
  const messageText = batch.messages
    .map(msg => `${msg.username || 'Unknown'}: ${msg.content}`)
    .join('\n');
  
  const detectedTopics = detectTopics(batch.messages);

  return await withErrorHandling(async () => {
    const summary = await instructor.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that summarizes group chat conversations. Focus on key points, decisions, and action items.',
        },
        {
          role: 'user',
          content: `Please analyze and summarize the following conversation:\n\n${messageText}`,
        },
      ],
      model: 'gpt-3.5-turbo',
      response_model: {
        schema: SummarySchema.extend({
          topics: z.array(z.string()).optional()
        }),
        name: 'EnhancedSummary',
      },
      temperature: 0.7,
      max_tokens: MAX_TOKENS_PER_REQUEST,
    });

    return summary;
  });
}

export async function storeSummary(chatId: number, summary: any) {
  // TODO: Implement summary storage in the database
  // This will be implemented when we add the summary table to the database schema
  console.log('Summary generated for chat', chatId, summary);
  return summary;
} 
