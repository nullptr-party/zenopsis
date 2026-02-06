import { db } from "@/db";
import { messages, groupConfigs, summaries, messageAttachments, messageReferences, adminGroupLinks, linkingTokens, scheduledTasks } from "@/db/schema";

export async function cleanDatabase() {
  await db.delete(scheduledTasks);
  await db.delete(linkingTokens);
  await db.delete(adminGroupLinks);
  await db.delete(messageAttachments);
  await db.delete(messageReferences);
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
    messageType: "text",
    senderFirstName: "Test",
    senderLastName: "User",
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

export function createTestAttachment(overrides = {}) {
  return {
    attachmentType: "photo",
    fileId: `file_${Math.random().toString(36).slice(2)}`,
    fileUniqueId: `unique_${Math.random().toString(36).slice(2)}`,
    fileSize: 12345,
    mimeType: "image/jpeg",
    width: 800,
    height: 600,
    ...overrides
  };
}

export function createTestAdminGroupLink(overrides = {}) {
  return {
    adminChatId: -1009999999999,
    controlledChatId: -1001234567890,
    linkedByUserId: 123456789,
    controlledChatTitle: "Test Controlled Group",
    ...overrides
  };
}

export function createTestScheduledTask(overrides = {}) {
  return {
    type: "delete_message",
    payload: JSON.stringify({ chatId: -1001234567890, messageId: 42 }),
    runAt: Date.now() + 60_000,
    maxAttempts: 3,
    ...overrides
  };
}

export function createTestLinkingToken(overrides = {}) {
  return {
    token: crypto.randomUUID(),
    adminChatId: -1009999999999,
    createdByUserId: 123456789,
    expiresAt: Date.now() + 15 * 60 * 1000,
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
