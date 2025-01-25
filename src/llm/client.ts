import Instructor from '@instructor-ai/instructor';
import OpenAI from 'openai';
import { z } from 'zod';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Instructor client
export const instructor = Instructor({
  client: openai,
  mode: 'TOOLS',
});

// Define summary schema using Zod
export const SummarySchema = z.object({
  title: z.string().describe('A brief title for the summary'),
  sections: z.array(z.object({
    title: z.string().describe('Section title'),
    content: z.string().describe('Section content')
  })).describe('Organized sections of the summary'),
  mainTopics: z.array(z.string()).describe('Main topics discussed in the conversation'),
  summary: z.string().describe('A concise summary of the conversation'),
  keyParticipants: z.array(z.string()).describe('Key participants in the conversation'),
  actionItems: z.array(z.string()).optional().describe('Any action items or decisions made'),
  sentiment: z.enum(['positive', 'neutral', 'negative']).describe('Overall sentiment of the conversation'),
});

export type Summary = z.infer<typeof SummarySchema>;

// Rate limiting configuration
export const RATE_LIMIT = {
  maxTokensPerMinute: 90000, // OpenAI's default rate limit for GPT-3.5
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
      
      if (error instanceof OpenAI.APIError) {
        // Handle rate limiting
        if (error.status === 429) {
          await new Promise(resolve => setTimeout(resolve, delayMs * (attempt + 1)));
          continue;
        }
      }
      
      // Log the error but continue retrying
      console.error(`OpenAI API error (attempt ${attempt + 1}/${retries}):`, error);
    }
  }

  throw lastError || new Error('Operation failed after multiple retries');
} 
