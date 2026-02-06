import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { messages } from '@/db/schema';

// Minimum fraction of messages that must have language_code for detection to be reliable
const MIN_COVERAGE = 0.2;

/**
 * Detect the dominant language in a group chat based on participants' Telegram language_code.
 * Looks at messages from the last 30 days and returns the most common language.
 * Returns null if too few messages have language_code set (below MIN_COVERAGE threshold).
 */
export async function detectGroupLanguage(chatId: number): Promise<string | null> {
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

  const timeFilter = sql`${messages.chatId} = ${chatId} AND ${messages.timestamp} >= ${thirtyDaysAgo}`;

  // Count total messages, messages with language_code, and top language in parallel
  const [totalResult, withLangResult, langResult] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(messages)
      .where(timeFilter),
    db
      .select({ count: sql<number>`count(*)` })
      .from(messages)
      .where(sql`${timeFilter} AND ${messages.languageCode} IS NOT NULL`),
    db
      .select({
        languageCode: messages.languageCode,
        count: sql<number>`count(*)`,
      })
      .from(messages)
      .where(
        sql`${timeFilter} AND ${messages.languageCode} IS NOT NULL`
      )
      .groupBy(messages.languageCode)
      .orderBy(sql`count(*) DESC`)
      .limit(1),
  ]);

  const totalMessages = totalResult[0]?.count ?? 0;
  if (totalMessages === 0 || langResult.length === 0 || !langResult[0].languageCode) {
    return null;
  }

  // Require at least MIN_COVERAGE of messages to have language_code for reliable detection
  const messagesWithLang = withLangResult[0]?.count ?? 0;
  if (messagesWithLang / totalMessages < MIN_COVERAGE) {
    return null;
  }

  // Normalize locale variants (e.g. "en-US" → "en")
  return langResult[0].languageCode.split('-')[0];
}
