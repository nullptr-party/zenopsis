import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { messages } from '@/db/schema';

/**
 * Detect the dominant language in a group chat based on participants' Telegram language_code.
 * Looks at messages from the last 30 days and returns the most common language.
 */
export async function detectGroupLanguage(chatId: number): Promise<string | null> {
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

  const result = await db
    .select({
      languageCode: messages.languageCode,
      count: sql<number>`count(*)`,
    })
    .from(messages)
    .where(
      sql`${messages.chatId} = ${chatId} AND ${messages.languageCode} IS NOT NULL AND ${messages.timestamp} >= ${thirtyDaysAgo}`
    )
    .groupBy(messages.languageCode)
    .orderBy(sql`count(*) DESC`)
    .limit(1);

  if (result.length === 0 || !result[0].languageCode) {
    return null;
  }

  // Normalize locale variants (e.g. "en-US" → "en")
  return result[0].languageCode.split('-')[0];
}
