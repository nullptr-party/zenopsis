import { expect, test, describe, beforeEach } from "bun:test";
import { MessagesRepository } from "../../../src/db/repositories/messages";
import { db } from "../../../src/db";
import { messages, messageReferences } from "../../../src/db/schema";

describe("MessagesRepository", () => {
  let repository: MessagesRepository;

  beforeEach(async () => {
    // Clear test database
    await db.delete(messageReferences);
    await db.delete(messages);
    repository = new MessagesRepository();
  });

  test("stores message with multiple references", async () => {
    const message = await repository.create({
      messageId: 1,
      chatId: 1,
      userId: 1,
      username: "testuser",
      content: "Test message with @mention and reply",
      timestamp: Date.now(),
      references: [
        { type: "reply", targetMessageId: 2 },
        { type: "mention", resolvedUsername: "mentioned_user" }
      ]
    });

    const refs = await repository.getMessageReferences(message.id);
    expect(refs).toHaveLength(2);
    expect(refs[0].referenceType).toBe("reply");
    expect(refs[1].referenceType).toBe("mention");
  });

  test("findSimilarMessages returns messages above threshold", async () => {
    const testEmbedding = new Array(1536).fill(0.1);
    
    await repository.create({
      messageId: 1,
      chatId: 1,
      userId: 1,
      username: "testuser",
      content: "Similar message",
      timestamp: Date.now(),
      embedding: JSON.stringify(testEmbedding)
    });

    const results = await repository.findSimilarMessages(1, testEmbedding, {
      threshold: 0.8
    });

    expect(results).toHaveLength(1);
  });
});
