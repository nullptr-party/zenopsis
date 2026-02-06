import { describe, test, expect, beforeEach } from "bun:test";
import { batchMessages, detectTopics } from "@/llm/summarizer";
import { MessagesRepository } from "@/db/repositories/messages";
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
