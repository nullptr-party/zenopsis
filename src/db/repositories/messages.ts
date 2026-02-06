import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '../index';
import { messages, messageReferences, messageAttachments } from '../schema';
import type { Message, MessageAttachment } from '../../types/message';

export class MessagesRepository {
  /**
   * Create a new message record
   */
  async create(message: Message) {
    const [created] = await db.insert(messages).values({
      messageId: message.messageId,
      chatId: message.chatId,
      userId: message.userId,
      username: message.username,
      content: message.content,
      timestamp: message.timestamp,
      threadId: message.threadId,
      replyToMessageId: message.replyToMessageId,
      messageType: message.messageType,
      senderFirstName: message.senderFirstName,
      senderLastName: message.senderLastName,
      forwardOrigin: message.forwardOrigin,
      mediaGroupId: message.mediaGroupId,
      rawJson: message.rawJson,
    }).returning();

    // Store message references if they exist
    if (message.references?.length) {
      await db.insert(messageReferences).values(
        message.references.map(ref => ({
          sourceMessageId: created.id,
          targetMessageId: ref.targetMessageId,
          referenceType: ref.type,
          resolvedUsername: ref.resolvedUsername,
        }))
      );
    }

    return created;
  }

  /**
   * Create attachments for a message
   */
  async createAttachments(attachments: MessageAttachment[]) {
    if (!attachments.length) return [];
    return await db.insert(messageAttachments).values(
      attachments.map(a => ({
        messageDbId: a.messageDbId,
        attachmentType: a.attachmentType,
        fileId: a.fileId,
        fileUniqueId: a.fileUniqueId,
        fileSize: a.fileSize,
        mimeType: a.mimeType,
        fileName: a.fileName,
        duration: a.duration,
        width: a.width,
        height: a.height,
        localPath: a.localPath,
      }))
    ).returning();
  }

  /**
   * Update the local path of an attachment after downloading
   */
  async updateAttachmentLocalPath(id: number, localPath: string) {
    return await db.update(messageAttachments)
      .set({ localPath })
      .where(eq(messageAttachments.id, id));
  }

  /**
   * Get a message by its Telegram message ID and chat ID
   */
  async getByMessageId(messageId: number, chatId: number) {
    const message = await db.query.messages.findFirst({
      where: and(
        eq(messages.messageId, messageId),
        eq(messages.chatId, chatId)
      ),
    });

    return message;
  }

  /**
   * Get messages for a specific chat within a time range
   */
  async getByChatId(chatId: number, options?: {
    startTime?: Date;
    endTime?: Date;
    limit?: number;
  }) {
    let conditions = [eq(messages.chatId, chatId)];

    if (options?.startTime) {
      conditions.push(sql`${messages.timestamp} >= ${options.startTime.getTime()}`);
    }

    if (options?.endTime) {
      conditions.push(sql`${messages.timestamp} <= ${options.endTime.getTime()}`);
    }

    const query = db.select().from(messages)
      .where(and(...conditions))
      .orderBy(desc(messages.timestamp));

    if (options?.limit) {
      query.limit(options.limit);
    }

    return await query;
  }

  /**
   * Get messages that are part of a specific thread
   */
  async getByThreadId(threadId: number, chatId: number) {
    return await db.select().from(messages)
      .where(and(
        eq(messages.threadId, threadId),
        eq(messages.chatId, chatId)
      ))
      .orderBy(desc(messages.timestamp));
  }

  /**
   * Delete messages older than a specified date for a chat
   */
  async deleteOlderThan(chatId: number, date: Date) {
    return await db.delete(messages)
      .where(and(
        eq(messages.chatId, chatId),
        sql`${messages.timestamp} < ${date.getTime()}`
      ));
  }

  /**
   * Get references for a specific message
   */
  async getMessageReferences(messageId: number) {
    return await db.query.messageReferences.findMany({
      where: eq(messageReferences.sourceMessageId, messageId),
    });
  }
}
