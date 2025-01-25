import { db } from "../../src/db";
import { messages, groupConfigs, summaries } from "../../src/db/schema";

export async function cleanDatabase() {
  await db.delete(messages);
  await db.delete(groupConfigs);
  await db.delete(summaries);
}

export function createTestMessage(overrides = {}) {
  return {
    messageId: Math.floor(Math.random() * 1000000),
    chatId: -1001234567890,
    userId: 123456789,
    username: "test_user",
    content: "Test message content",
    timestamp: Date.now(),
    ...overrides
  };
}

export function createTestConfig(overrides = {}) {
  return {
    chatId: -1001234567890,
    summaryInterval: 21600,
    minMessagesForSummary: 10,
    isActive: true,
    ...overrides
  };
}

export async function setupTestDatabase() {
  await cleanDatabase();
  return {
    createMessage: async (data = {}) => {
      const message = createTestMessage(data);
      return await db.insert(messages).values(message).returning();
    },
    createConfig: async (data = {}) => {
      const config = createTestConfig(data);
      return await db.insert(groupConfigs).values(config).returning();
    }
  };
}
