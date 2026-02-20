import { describe, test, expect, beforeEach } from "bun:test";
import { batchMessagesForTopics } from "@/llm/summarizer";
import { formatTopics } from "@/llm/scheduler";
import { TopicsSchema } from "@/llm/client";
import { MessagesRepository } from "@/db/repositories/messages";
import { cleanDatabase, createTestMessage } from "../../helpers/test-utils";

describe("batchMessagesForTopics", () => {
  let repo: MessagesRepository;

  beforeEach(async () => {
    await cleanDatabase();
    repo = new MessagesRepository();
  });

  test("returns null if fewer than 10 messages", async () => {
    for (let i = 0; i < 9; i++) {
      await repo.create(createTestMessage({ messageId: i, chatId: -100, timestamp: Date.now() }));
    }
    const result = await batchMessagesForTopics(-100);
    expect(result).toBeNull();
  });

  test("returns batch when 10+ messages exist", async () => {
    for (let i = 0; i < 12; i++) {
      await repo.create(createTestMessage({
        messageId: i,
        chatId: -100,
        timestamp: Date.now() - (12 - i) * 1000,
        username: `user_${i % 3}`,
      }));
    }
    const result = await batchMessagesForTopics(-100);
    expect(result).not.toBeNull();
    expect(result!.messages).toHaveLength(12);
    expect(result!.chatId).toBe(-100);
    expect(result!.startTime).toBeDefined();
    expect(result!.endTime).toBeDefined();
    expect(result!.participantNames.length).toBeGreaterThan(0);
  });

  test("returns all messages when under the limit", async () => {
    for (let i = 0; i < 100; i++) {
      await repo.create(createTestMessage({
        messageId: i,
        chatId: -100,
        timestamp: Date.now() - (100 - i) * 1000,
      }));
    }
    const result = await batchMessagesForTopics(-100);
    expect(result).not.toBeNull();
    expect(result!.messages).toHaveLength(100);
  });

  test("evenly samples when over 5000 messages", async () => {
    // Insert 5010 messages
    for (let i = 0; i < 5010; i++) {
      await repo.create(createTestMessage({
        messageId: i,
        chatId: -100,
        timestamp: Date.now() - (5010 - i) * 1000,
      }));
    }
    const result = await batchMessagesForTopics(-100);
    expect(result).not.toBeNull();
    expect(result!.messages).toHaveLength(5000);
    // Should span the full time range (first and last messages included)
    const first = result!.messages[0].timestamp;
    const last = result!.messages[result!.messages.length - 1].timestamp;
    expect(last - first).toBeGreaterThan(4000 * 1000);
  });

  test("only includes messages within the days window", async () => {
    const now = Date.now();
    // Old messages (20 days ago)
    for (let i = 0; i < 10; i++) {
      await repo.create(createTestMessage({
        messageId: i,
        chatId: -100,
        timestamp: now - 20 * 24 * 60 * 60 * 1000,
      }));
    }
    // Recent messages (1 day ago)
    for (let i = 10; i < 22; i++) {
      await repo.create(createTestMessage({
        messageId: i,
        chatId: -100,
        timestamp: now - 1 * 24 * 60 * 60 * 1000 + i * 1000,
      }));
    }

    const result = await batchMessagesForTopics(-100, 14);
    expect(result).not.toBeNull();
    expect(result!.messages).toHaveLength(12);
  });

  test("extracts unique participant names", async () => {
    for (let i = 0; i < 10; i++) {
      await repo.create(createTestMessage({
        messageId: i,
        chatId: -100,
        timestamp: Date.now() - (10 - i) * 1000,
        username: i < 5 ? "alice" : "bob",
      }));
    }
    const result = await batchMessagesForTopics(-100);
    expect(result).not.toBeNull();
    expect(result!.participantNames).toContain("alice");
    expect(result!.participantNames).toContain("bob");
    expect(result!.participantNames).toHaveLength(2);
  });
});

describe("TopicsSchema", () => {
  test("validates a correct topics object", () => {
    const data = {
      topics: [
        {
          title: "Project Architecture",
          summary: "Discussion about microservices vs monolith.",
          participantCount: 4,
          messageCount: 15,
        },
      ],
    };
    const result = TopicsSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  test("rejects empty topics array", () => {
    const data = { topics: [] };
    const result = TopicsSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  test("rejects more than 12 topics", () => {
    const topics = Array.from({ length: 13 }, (_, i) => ({
      title: `Topic ${i}`,
      summary: "Summary",
      participantCount: 2,
      messageCount: 5,
    }));
    const result = TopicsSchema.safeParse({ topics });
    expect(result.success).toBe(false);
  });

  test("rejects topic missing required fields", () => {
    const data = {
      topics: [{ title: "Only title" }],
    };
    const result = TopicsSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});

describe("formatTopics", () => {
  const makeResult = (overrides: Record<string, any> = {}) => ({
    topics: [
      {
        title: "API Redesign",
        summary: "Team discussed moving to REST v2.",
        participantCount: 4,
        messageCount: 15,
      },
      {
        title: "Bug in Login",
        summary: "Login fails on mobile Safari.",
        participantCount: 3,
        messageCount: 8,
      },
    ],
    _meta: {
      messageCount: 150,
      participantCount: 8,
      startTime: new Date("2025-01-01T00:00:00Z"),
      endTime: new Date("2025-01-02T00:00:00Z"),
      ...overrides,
    },
  });

  test("includes header", () => {
    const output = formatTopics(makeResult());
    expect(output).toContain("*Discussion Topics for Meeting Prep*");
  });

  test("includes numbered topics", () => {
    const output = formatTopics(makeResult());
    expect(output).toContain("*1. API Redesign*");
    expect(output).toContain("*2. Bug in Login*");
  });

  test("includes topic summaries", () => {
    const output = formatTopics(makeResult());
    expect(output).toContain("Team discussed moving to REST v2.");
    expect(output).toContain("Login fails on mobile Safari.");
  });

  test("includes participant and message counts per topic", () => {
    const output = formatTopics(makeResult());
    expect(output).toContain("_4 participants, ~15 messages_");
    expect(output).toContain("_3 participants, ~8 messages_");
  });

  test("includes footer with metadata", () => {
    const output = formatTopics(makeResult());
    expect(output).toContain("_Based on 150 messages from 8 participants over 24 hour(s)_");
  });

  test("shows minimum 1 hour even for short time spans", () => {
    const output = formatTopics(makeResult({
      startTime: new Date("2025-01-01T00:00:00Z"),
      endTime: new Date("2025-01-01T00:10:00Z"),
    }));
    expect(output).toContain("over 1 hour(s)");
  });
});
