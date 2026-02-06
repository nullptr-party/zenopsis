import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

// Model instance — provider auto-reads OPENAI_API_KEY from env
export const model = openai('gpt-5.2-chat-latest');

// Define summary schema using Zod
export const SummarySchema = z.object({
  title: z.string().describe('A brief title for the summary'),
  sections: z.array(z.object({
    title: z.string().describe('Section title'),
    content: z.string().describe('Section content'),
    topicCluster: z.string().optional().describe('Associated topic cluster')
  })).describe('Organized sections of the summary'),
  mainTopics: z.array(z.object({
    name: z.string().describe('Topic name'),
    relevance: z.number().min(0).max(1).describe('Topic relevance score')
  })).describe('Main topics discussed in the conversation'),
  summary: z.string().describe('A concise summary of the conversation'),
  keyParticipants: z.array(z.string()).describe('Key participants in the conversation'),
  actionItems: z.array(z.string()).optional().describe('Any action items or decisions made'),
  sentiment: z.enum(['positive', 'neutral', 'negative']).describe('Overall sentiment of the conversation'),
});

export type Summary = z.infer<typeof SummarySchema>;

// Rate limiting configuration
export const RATE_LIMIT = {
  maxTokensPerMinute: 90000,
  maxRequestsPerMinute: 3500,
};

// Error handling wrapper
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  retries = 3,
  delayMs = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Retry on rate limit (429) or transient errors
      const message = (error as Error).message ?? '';
      if (message.includes('429') || message.includes('rate limit')) {
        await new Promise(resolve => setTimeout(resolve, delayMs * (attempt + 1)));
        continue;
      }

      console.error(`LLM API error (attempt ${attempt + 1}/${retries}):`, error);
    }
  }

  throw lastError || new Error('Operation failed after multiple retries');
}
