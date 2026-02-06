import { describe, test, expect, beforeEach } from "bun:test";
import { batchMessages, detectTopics, storeSummary } from "@/llm/summarizer";
import { MessagesRepository } from "@/db/repositories/messages";
import { db } from "@/db";
import { summaries } from "@/db/schema";
import { cleanDatabase, createTestMessage } from "../../helpers/test-utils";

describe("batchMessages", () => {
  let repo: MessagesRepository;

  beforeEach(async () => {
    await cleanDatabase();
    repo = new MessagesRepository();
  });

  test("returns null if fewer than 5 messages", async () => {
    for (let i = 0; i < 4; i++) {
      await repo.create(createTestMessage({ messageId: i, chatId: -100 }));
    }
    const result = await batchMessages(-100);
    expect(result).toBeNull();
  });

  test("returns batch with correct fields", async () => {
    for (let i = 0; i < 6; i++) {
      await repo.create(createTestMessage({ messageId: i, chatId: -100, timestamp: Date.now() + i * 1000 }));
    }
    const result = await batchMessages(-100);
    expect(result).not.toBeNull();
    expect(result!.messages).toHaveLength(6);
    expect(result!.chatId).toBe(-100);
    expect(result!.startTime).toBeDefined();
    expect(result!.endTime).toBeDefined();
  });

  test("limits to MAX_MESSAGES_PER_BATCH (50)", async () => {
    for (let i = 0; i < 60; i++) {
      await repo.create(createTestMessage({ messageId: i, chatId: -100, timestamp: Date.now() + i * 1000 }));
    }
    const result = await batchMessages(-100);
    expect(result).not.toBeNull();
    expect(result!.messages).toHaveLength(50);
  });
});

describe("detectTopics", () => {
  function makeMessages(contents: (string | null)[]) {
    return contents.map((content, i) => ({
      id: i,
      messageId: i,
      chatId: -100,
      userId: 1,
      username: "user" as string | null,
      content: content as string | null,
      timestamp: Date.now(),
      messageType: "text",
      threadId: null as number | null,
      replyToMessageId: null as number | null,
      senderFirstName: null as string | null,
      senderLastName: null as string | null,
      forwardOrigin: null as string | null,
      mediaGroupId: null as string | null,
      rawJson: null as string | null,
      createdAt: new Date(),
    }));
  }

  test("detects tech topics by keywords", () => {
    const msgs = makeMessages(["Let's discuss the API design", "The server is down"]);
    const topics = detectTopics(msgs);
    expect(topics).toContain("tech");
  });

  test("detects support topics by keywords", () => {
    const msgs = makeMessages(["I have an issue with the login", "There's a bug in the form"]);
    const topics = detectTopics(msgs);
    expect(topics).toContain("support");
  });

  test("returns empty array when no keywords match", () => {
    const msgs = makeMessages(["Hello everyone", "Good morning"]);
    const topics = detectTopics(msgs);
    expect(topics).toEqual([]);
  });

  test("detects multiple topics simultaneously", () => {
    const msgs = makeMessages(["The API has a bug, help me fix it"]);
    const topics = detectTopics(msgs);
    expect(topics).toContain("tech");
    expect(topics).toContain("support");
  });

  test("handles messages with null content", () => {
    const msgs = makeMessages(["some text"]);
    msgs.push({ ...msgs[0], id: 99, content: null });
    const topics = detectTopics(msgs);
    expect(Array.isArray(topics)).toBe(true);
  });
});

describe("batchMessages - timestamps", () => {
  let repo: MessagesRepository;

  beforeEach(async () => {
    await cleanDatabase();
    repo = new MessagesRepository();
  });

  test("startTime and endTime are valid dates derived from message timestamps", async () => {
    const baseTime = Date.now() - 60000;
    for (let i = 0; i < 6; i++) {
      await repo.create(createTestMessage({
        messageId: i,
        chatId: -200,
        timestamp: baseTime + i * 10000,
      }));
    }

    const result = await batchMessages(-200);
    expect(result).not.toBeNull();
    expect(result!.startTime.getTime()).toBe(baseTime);
    expect(result!.endTime.getTime()).toBe(baseTime + 5 * 10000);
    expect(Number.isNaN(result!.startTime.getTime())).toBe(false);
    expect(Number.isNaN(result!.endTime.getTime())).toBe(false);
  });

  test("messages are ordered by timestamp ascending", async () => {
    const baseTime = Date.now();
    // Insert in reverse order
    for (let i = 5; i >= 0; i--) {
      await repo.create(createTestMessage({
        messageId: i,
        chatId: -200,
        timestamp: baseTime + i * 10000,
      }));
    }

    const result = await batchMessages(-200);
    expect(result).not.toBeNull();
    for (let i = 1; i < result!.messages.length; i++) {
      expect(result!.messages[i].timestamp).toBeGreaterThanOrEqual(result!.messages[i - 1].timestamp);
    }
  });
});

describe("storeSummary", () => {
  let repo: MessagesRepository;

  beforeEach(async () => {
    await cleanDatabase();
    repo = new MessagesRepository();
  });

  test("serializes summary object as JSON in content field", async () => {
    const summaryObj = {
      title: "Test Summary",
      sections: [{ heading: "Topic 1", body: "Discussion about tests" }],
      mainTopics: ["testing"],
      summary: "A brief summary",
      keyParticipants: ["user1"],
      actionItems: [],
      sentiment: "neutral",
    };

    const msgs = [];
    const baseTime = Date.now() - 60000;
    for (let i = 0; i < 5; i++) {
      const created = await repo.create(createTestMessage({
        messageId: i,
        chatId: -300,
        timestamp: baseTime + i * 1000,
      }));
      msgs.push(created);
    }

    const batch = {
      messages: msgs,
      chatId: -300,
      startTime: new Date(baseTime),
      endTime: new Date(baseTime + 4 * 1000),
    };

    const created = await storeSummary(-300, summaryObj, batch);

    expect(created.content).toBe(JSON.stringify(summaryObj));
    const parsed = JSON.parse(created.content);
    expect(parsed.title).toBe("Test Summary");
    expect(parsed.mainTopics).toEqual(["testing"]);
  });

  test("stores valid start and end timestamps", async () => {
    const summaryObj = { title: "Test", summary: "test" };
    // Use second-aligned timestamps (SQLite integer timestamps lose ms precision)
    const baseTime = Math.floor(Date.now() / 1000) * 1000 - 60000;

    const msgs = [];
    for (let i = 0; i < 5; i++) {
      const created = await repo.create(createTestMessage({
        messageId: i,
        chatId: -300,
        timestamp: baseTime + i * 1000,
      }));
      msgs.push(created);
    }

    const startTime = new Date(baseTime);
    const endTime = new Date(baseTime + 4 * 1000);
    const batch = { messages: msgs, chatId: -300, startTime, endTime };

    const created = await storeSummary(-300, summaryObj, batch);

    expect(created.startTimestamp).toEqual(startTime);
    expect(created.endTimestamp).toEqual(endTime);
  });

  test("stores messageCount from batch", async () => {
    const summaryObj = { title: "Test" };
    const baseTime = Date.now();

    const msgs = [];
    for (let i = 0; i < 7; i++) {
      const created = await repo.create(createTestMessage({
        messageId: i,
        chatId: -300,
        timestamp: baseTime + i * 1000,
      }));
      msgs.push(created);
    }

    const batch = {
      messages: msgs,
      chatId: -300,
      startTime: new Date(baseTime),
      endTime: new Date(baseTime + 6 * 1000),
    };

    const created = await storeSummary(-300, summaryObj, batch);
    expect(created.messageCount).toBe(7);
  });
});
