import { describe, expect, test, beforeEach } from 'bun:test';
import { db } from '@/db';
import { messages } from '@/db/schema';
import { detectGroupLanguage } from '@/services/language-detector';
import { cleanDatabase, createTestMessage } from '../../helpers/test-utils';

const CHAT_ID = -1001234567890;

describe('detectGroupLanguage', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  test('returns null when no messages exist', async () => {
    const result = await detectGroupLanguage(CHAT_ID);
    expect(result).toBeNull();
  });

  test('returns null when no messages have language_code', async () => {
    await db.insert(messages).values(
      createTestMessage({ chatId: CHAT_ID, languageCode: null })
    );

    const result = await detectGroupLanguage(CHAT_ID);
    expect(result).toBeNull();
  });

  test('returns the most common language when coverage is sufficient', async () => {
    // All messages have language_code (100% coverage)
    await db.insert(messages).values([
      createTestMessage({ chatId: CHAT_ID, languageCode: 'ru' }),
      createTestMessage({ chatId: CHAT_ID, languageCode: 'ru' }),
      createTestMessage({ chatId: CHAT_ID, languageCode: 'ru' }),
      createTestMessage({ chatId: CHAT_ID, languageCode: 'en' }),
    ]);

    const result = await detectGroupLanguage(CHAT_ID);
    expect(result).toBe('ru');
  });

  test('returns null when language_code coverage is below threshold', async () => {
    // 3 messages with language_code out of 30 total = 10% < 20% threshold
    const msgs = [];
    for (let i = 0; i < 27; i++) {
      msgs.push(createTestMessage({ chatId: CHAT_ID, languageCode: null }));
    }
    msgs.push(createTestMessage({ chatId: CHAT_ID, languageCode: 'en' }));
    msgs.push(createTestMessage({ chatId: CHAT_ID, languageCode: 'en' }));
    msgs.push(createTestMessage({ chatId: CHAT_ID, languageCode: 'en' }));
    await db.insert(messages).values(msgs);

    const result = await detectGroupLanguage(CHAT_ID);
    expect(result).toBeNull();
  });

  test('returns language when coverage meets threshold', async () => {
    // 2 with language_code out of 5 total = 40% > 20% threshold
    await db.insert(messages).values([
      createTestMessage({ chatId: CHAT_ID, languageCode: 'ru' }),
      createTestMessage({ chatId: CHAT_ID, languageCode: 'ru' }),
      createTestMessage({ chatId: CHAT_ID, languageCode: null }),
      createTestMessage({ chatId: CHAT_ID, languageCode: null }),
      createTestMessage({ chatId: CHAT_ID, languageCode: null }),
    ]);

    const result = await detectGroupLanguage(CHAT_ID);
    expect(result).toBe('ru');
  });

  test('normalizes locale variants (en-US → en)', async () => {
    await db.insert(messages).values([
      createTestMessage({ chatId: CHAT_ID, languageCode: 'en-US' }),
      createTestMessage({ chatId: CHAT_ID, languageCode: 'en-GB' }),
    ]);

    const result = await detectGroupLanguage(CHAT_ID);
    // Both are stored as "en-US" and "en-GB" but the most common raw value
    // gets normalized to "en" on return
    expect(result).toBe('en');
  });

  test('ignores messages from other chats', async () => {
    const otherChatId = -1009999999999;

    await db.insert(messages).values([
      createTestMessage({ chatId: otherChatId, languageCode: 'en' }),
      createTestMessage({ chatId: otherChatId, languageCode: 'en' }),
      createTestMessage({ chatId: CHAT_ID, languageCode: 'ru' }),
    ]);

    const result = await detectGroupLanguage(CHAT_ID);
    expect(result).toBe('ru');
  });

  test('ignores messages older than 30 days', async () => {
    const thirtyOneDaysAgo = Date.now() - 31 * 24 * 60 * 60 * 1000;
    const recent = Date.now();

    await db.insert(messages).values([
      // Old messages — should be ignored
      createTestMessage({ chatId: CHAT_ID, languageCode: 'en', timestamp: thirtyOneDaysAgo }),
      createTestMessage({ chatId: CHAT_ID, languageCode: 'en', timestamp: thirtyOneDaysAgo }),
      // Recent message
      createTestMessage({ chatId: CHAT_ID, languageCode: 'ru', timestamp: recent }),
    ]);

    const result = await detectGroupLanguage(CHAT_ID);
    expect(result).toBe('ru');
  });
});
