import { describe, test, expect, beforeEach } from 'bun:test';
import { db } from '../../../src/db';
import { messageReferences } from '../../../src/db/schema';
import { cleanDatabase, setupTestDatabase } from '../../helpers/test-utils';

describe('Message References Repository', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  test('should create message reference', async () => {
    const reference = {
      sourceMessageId: 123,
      targetMessageId: 456,
      referenceType: 'reply',
      resolvedUsername: 'test_user'
    };

    const [created] = await db.insert(messageReferences)
      .values(reference)
      .returning();

    expect(created.sourceMessageId).toBe(reference.sourceMessageId);
    expect(created.targetMessageId).toBe(reference.targetMessageId);
    expect(created.referenceType).toBe(reference.referenceType);
    expect(created.resolvedUsername).toBe(reference.resolvedUsername);
  });

  test('should retrieve message reference', async () => {
    const { createMessage } = await setupTestDatabase();
    
    const source = await createMessage();
    const target = await createMessage();
    
    const reference = {
      sourceMessageId: source[0].messageId,
      targetMessageId: target[0].messageId,
      referenceType: 'mention',
      resolvedUsername: 'mentioned_user'
    };

    await db.insert(messageReferences).values(reference);

    const [retrieved] = await db.select()
      .from(messageReferences)
      .where(sql`source_message_id = ${source[0].messageId}`);

    expect(retrieved).toBeDefined();
    expect(retrieved.referenceType).toBe('mention');
    expect(retrieved.resolvedUsername).toBe('mentioned_user');
  });

  test('should delete message reference', async () => {
    const reference = {
      sourceMessageId: 789,
      targetMessageId: 101,
      referenceType: 'edit',
    };

    const [created] = await db.insert(messageReferences)
      .values(reference)
      .returning();

    await db.delete(messageReferences)
      .where(sql`id = ${created.id}`);

    const [deleted] = await db.select()
      .from(messageReferences)
      .where(sql`id = ${created.id}`);

    expect(deleted).toBeUndefined();
  });
});
