import { eq } from 'drizzle-orm';
import { db } from '../index';
import { groupConfigs } from '../schema';

export interface GroupConfig {
  chatId: number;
  summaryInterval?: number;
  minMessagesForSummary?: number;
  isActive?: boolean;
}

export class GroupConfigsRepository {
  /**
   * Create or update a group configuration
   */
  async upsert(config: GroupConfig) {
    const [created] = await db.insert(groupConfigs)
      .values({
        chatId: config.chatId,
        summaryInterval: config.summaryInterval,
        minMessagesForSummary: config.minMessagesForSummary,
        isActive: config.isActive,
      })
      .onConflictDoUpdate({
        target: groupConfigs.chatId,
        set: {
          summaryInterval: config.summaryInterval,
          minMessagesForSummary: config.minMessagesForSummary,
          isActive: config.isActive,
        },
      })
      .returning();

    return created;
  }

  /**
   * Get configuration for a specific chat
   */
  async getByChatId(chatId: number) {
    return await db.query.groupConfigs.findFirst({
      where: eq(groupConfigs.chatId, chatId),
    });
  }

  /**
   * Get all active group configurations
   */
  async getAllActive() {
    return await db.query.groupConfigs.findMany({
      where: eq(groupConfigs.isActive, true),
    });
  }

  /**
   * Update group configuration
   */
  async update(chatId: number, config: Partial<GroupConfig>) {
    const [updated] = await db.update(groupConfigs)
      .set({
        summaryInterval: config.summaryInterval,
        minMessagesForSummary: config.minMessagesForSummary,
        isActive: config.isActive,
      })
      .where(eq(groupConfigs.chatId, chatId))
      .returning();

    return updated;
  }
} 