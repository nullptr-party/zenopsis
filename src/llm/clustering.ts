import { instructor } from './client';
import { z } from 'zod';

// Define the topic cluster schema
export const TopicClusterSchema = z.object({
  topics: z.array(z.object({
    name: z.string().describe('Name of the topic cluster'),
    keywords: z.array(z.string()).describe('Key terms associated with this topic'),
    messageIds: z.array(z.number()).describe('IDs of messages in this topic cluster'),
    confidence: z.number().min(0).max(1).describe('Confidence score for this clustering')
  })),
  unclustered: z.array(z.number()).describe('Message IDs that could not be clustered')
});

export type TopicCluster = z.infer<typeof TopicClusterSchema>;

export async function clusterMessages(messages: Array<{ id: number, content: string }>) {
  const prompt = `Analyze these messages and group them into coherent topics. 
    Consider semantic similarity, shared keywords, and conversation flow.
    Messages that don't fit clearly into any topic should be marked as unclustered.
    Ensure each topic has a descriptive name and relevant keywords.`;

  try {
    const response = await instructor.chat<z.infer<typeof TopicClusterSchema>>({
      messages: [
        {
          role: 'system',
          content: prompt
        },
        {
          role: 'user',
          content: JSON.stringify(messages.map(m => m.content))
        }
      ],
      schema: TopicClusterSchema
    });

    return response;
  } catch (error) {
    console.error('Error in topic clustering:', error);
    throw error;
  }
}
