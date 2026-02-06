import { expect, test, describe, beforeEach } from "bun:test";
import { MessagesRepository } from "@/db/repositories/messages";
import { db } from "@/db";
import { messageAttachments } from "@/db/schema";
import { cleanDatabase, createTestMessage } from "../../helpers/test-utils";

describe("MessagesRepository", () => {
  let repository: MessagesRepository;

  beforeEach(async () => {
    await cleanDatabase();
    repository = new MessagesRepository();
  });

  test("stores a text message with all new fields", async () => {
    const message = await repository.create(createTestMessage({
      messageId: 1,
      content: "Hello world",
      rawJson: '{"message_id":1}',
    }));

    expect(message.id).toBeDefined();
    expect(message.messageType).toBe("text");
    expect(message.senderFirstName).toBe("Test");
    expect(message.senderLastName).toBe("User");
    expect(message.rawJson).toBe('{"message_id":1}');
  });

  test("stores a message with null content (e.g. sticker)", async () => {
    const message = await repository.create(createTestMessage({
      messageId: 2,
      messageType: "sticker",
      content: "[sticker: 👍]",
    }));

    expect(message.id).toBeDefined();
    expect(message.messageType).toBe("sticker");
  });

  test("stores message with forward origin and media group", async () => {
    const forwardOrigin = JSON.stringify({ type: "user", sender_user: { id: 456 } });
    const message = await repository.create(createTestMessage({
      messageId: 3,
      content: "Forwarded text",
      forwardOrigin,
      mediaGroupId: "mg_123",
    }));

    expect(message.forwardOrigin).toBe(forwardOrigin);
    expect(message.mediaGroupId).toBe("mg_123");
  });

  test("stores message with references", async () => {
    const message = await repository.create(createTestMessage({
      messageId: 4,
      content: "Test message with @mention and reply",
      references: [
        { type: "reply", targetMessageId: 2 },
        { type: "mention", targetMessageId: -1, resolvedUsername: "mentioned_user" }
      ]
    }));

    const refs = await repository.getMessageReferences(message.id);
    expect(refs).toHaveLength(2);
    expect(refs[0].referenceType).toBe("reply");
    expect(refs[1].referenceType).toBe("mention");
  });

  test("creates attachments for a message", async () => {
    const message = await repository.create(createTestMessage({
      messageId: 5,
      content: "[photo]",
      messageType: "photo",
    }));

    const attachments = await repository.createAttachments([
      {
        messageDbId: message.id,
        attachmentType: "photo",
        fileId: "AgACAgIAAxk",
        fileUniqueId: "AQADAgAT",
        fileSize: 54321,
        mimeType: "image/jpeg",
        width: 1280,
        height: 720,
      },
    ]);

    expect(attachments).toHaveLength(1);
    expect(attachments[0].fileId).toBe("AgACAgIAAxk");
    expect(attachments[0].attachmentType).toBe("photo");
    expect(attachments[0].width).toBe(1280);
    expect(attachments[0].localPath).toBeNull();
  });

  test("creates multiple attachments", async () => {
    const message = await repository.create(createTestMessage({
      messageId: 6,
      content: "[document: test.pdf]",
      messageType: "document",
    }));

    const attachments = await repository.createAttachments([
      {
        messageDbId: message.id,
        attachmentType: "document",
        fileId: "BQACAgIAAxk1",
        fileUniqueId: "AQADAgAT1",
        fileSize: 100000,
        mimeType: "application/pdf",
        fileName: "test.pdf",
      },
      {
        messageDbId: message.id,
        attachmentType: "photo",
        fileId: "BQACAgIAAxk2",
        fileUniqueId: "AQADAgAT2",
        width: 640,
        height: 480,
      },
    ]);

    expect(attachments).toHaveLength(2);
  });

  test("updates attachment local path", async () => {
    const message = await repository.create(createTestMessage({
      messageId: 7,
      content: "[voice: 5s]",
      messageType: "voice",
    }));

    const [attachment] = await repository.createAttachments([
      {
        messageDbId: message.id,
        attachmentType: "voice",
        fileId: "AwACAgIAAxk",
        fileUniqueId: "AQADVoice",
        fileSize: 8000,
        mimeType: "audio/ogg",
        duration: 5,
      },
    ]);

    await repository.updateAttachmentLocalPath(attachment.id, "./data/attachments/-100/2024-01-01/AQADVoice.ogg");

    // Verify the update
    const updated = await db.select().from(messageAttachments);
    expect(updated[0].localPath).toBe("./data/attachments/-100/2024-01-01/AQADVoice.ogg");
  });

  test("getByChatId returns messages for a chat", async () => {
    await repository.create(createTestMessage({
      messageId: 10,
      chatId: -100,
      content: "msg1",
      timestamp: Date.now(),
    }));
    await repository.create(createTestMessage({
      messageId: 11,
      chatId: -100,
      content: "msg2",
      timestamp: Date.now() + 1000,
    }));
    await repository.create(createTestMessage({
      messageId: 12,
      chatId: -200,
      content: "other chat",
      timestamp: Date.now(),
    }));

    const results = await repository.getByChatId(-100);
    expect(results).toHaveLength(2);
  });
});
