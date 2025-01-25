import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '../index';
import { messages, messageReferences } from '../schema';
import type { Message } from '../../types/message';

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
      sentimentScore: message.sentimentScore,
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
   * Search messages with fuzzy matching
   */
  async searchMessages(chatId: number, query: string, options?: {
    startTime?: Date;
    endTime?: Date;
    limit?: number;
    similarityThreshold?: number;
  }) {
    let conditions = [
      eq(messages.chatId, chatId),
      options?.similarityThreshold 
        ? sql`similarity(${messages.content}, ${query}) > ${options.similarityThreshold}`
        : sql`${messages.content} LIKE '%' || ${query} || '%'`
    ];

    if (options?.startTime) {
      conditions.push(sql`${messages.timestamp} >= ${options.startTime.getTime()}`);
    }

    if (options?.endTime) {
      conditions.push(sql`${messages.timestamp} <= ${options.endTime.getTime()}`);
    }

    const searchQuery = db.select()
      .from(messages)
      .where(and(...conditions))
      .orderBy(desc(messages.timestamp));

    if (options?.limit) {
      searchQuery.limit(options.limit);
    }

    return await searchQuery;
  }
  /**
   * Get references for a specific message
   */
  async getMessageReferences(messageId: number) {
    return await db.query.messageReferences.findMany({
      where: eq(messageReferences.sourceMessageId, messageId),
    });
  }

  /**
   * Find messages similar to the given embedding vector
   */
  async findSimilarMessages(chatId: number, embedding: number[], options?: {
    startTime?: Date;
    endTime?: Date;
    threshold?: number;
    limit?: number;
  }) {
    let conditions = [
      eq(messages.chatId, chatId),
      sql`cosine_similarity(${messages.embedding}, ${JSON.stringify(embedding)}) > ${options?.threshold ?? 0.78}`
    ];

    if (options?.startTime) {
      conditions.push(sql`${messages.timestamp} >= ${options.startTime.getTime()}`);
    }

    if (options?.endTime) {
      conditions.push(sql`${messages.timestamp} <= ${options.endTime.getTime()}`);
    }

    const query = db.select()
      .from(messages)
      .where(and(...conditions))
      .orderBy(desc(messages.timestamp));

    if (options?.limit) {
      query.limit(options.limit);
    }

    return await query;
  }
}
