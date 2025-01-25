import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { GroupConfigsRepository } from "../../../src/db/repositories/group-configs";
import { db } from "../../../src/db";
import { groupConfigs, summaries } from "../../../src/db/schema";

describe("GroupConfigsRepository", () => {
  let repo: GroupConfigsRepository;

  beforeEach(() => {
    repo = new GroupConfigsRepository();
  });

  afterEach(async () => {
    // Clean up test data
    await db.delete(groupConfigs);
  });

  test("upsert creates new config", async () => {
    const config = {
      chatId: 123,
      summaryInterval: 3600,
      minMessagesForSummary: 5,
      isActive: true
    };

    const result = await repo.upsert(config);

    expect(result).toBeDefined();
    expect(result.chatId).toBe(config.chatId);
    expect(result.summaryInterval).toBe(config.summaryInterval);
  });

  test("upsert updates existing config", async () => {
    // Create initial config
    const initial = await repo.upsert({
      chatId: 123,
      summaryInterval: 3600,
      isActive: true
    });

    // Update config
    const updated = await repo.upsert({
      chatId: 123,
      summaryInterval: 7200,
      isActive: false
    });

    expect(updated.summaryInterval).toBe(7200);
    expect(updated.isActive).toBe(false);
  });

  test("getByChatId returns null for non-existent chat", async () => {
    const result = await repo.getByChatId(999);
    expect(result).toBeUndefined();
  });

  test("getAllActive returns only active configs", async () => {
    await repo.upsert({ chatId: 1, isActive: true });
    await repo.upsert({ chatId: 2, isActive: false });
    await repo.upsert({ chatId: 3, isActive: true });

    const active = await repo.getAllActive();
    
    expect(active).toHaveLength(2);
    expect(active.map(c => c.chatId)).toEqual([1, 3]);
  });

  test("checkTokenUsage returns alert when threshold exceeded", async () => {
    const config = {
      chatId: 123,
      maxDailyTokens: 1000,
      tokenUsageAlert: 80 // Alert at 80%
    };

    await repo.upsert(config);

    // Simulate token usage
    await db.insert(summaries).values({
      chatId: 123,
      tokensUsed: 850, // 85% of limit
      content: "Test summary",
      messageCount: 10,
      startTimestamp: new Date(),
      endTimestamp: new Date()
    });

    const usage = await repo.checkTokenUsage(123);
    
    expect(usage).toBeDefined();
    expect(usage?.shouldAlert).toBe(true);
    expect(usage?.percentage).toBeGreaterThan(80);
  });
});
