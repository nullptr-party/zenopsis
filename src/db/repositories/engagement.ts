import { db } from '../index';
import { userEngagement } from '../schema';
import { eq, and, sql } from 'drizzle-orm';

export interface EngagementMetrics {
  userId: number;
  chatId: number;
  messageCount?: number;
  commandCount?: number;
  replyCount?: number;
  mentionCount?: number;
  lastActive?: Date;
  dailyActiveStreak?: number;
  averageResponseTime?: number;
}

export class UserEngagementRepository {
  async upsertMetrics(metrics: EngagementMetrics) {
    const now = new Date();
    
    const [updated] = await db
      .insert(userEngagement)
      .values({
        userId: metrics.userId,
        chatId: metrics.chatId,
        messageCount: metrics.messageCount ?? 0,
        commandCount: metrics.commandCount ?? 0,
        replyCount: metrics.replyCount ?? 0,
        mentionCount: metrics.mentionCount ?? 0,
        lastActive: metrics.lastActive?.getTime() ?? now.getTime(),
        dailyActiveStreak: metrics.dailyActiveStreak ?? 0,
        averageResponseTime: metrics.averageResponseTime,
        updatedAt: now.getTime(),
      })
      .onConflictDoUpdate({
        target: [userEngagement.userId, userEngagement.chatId],
        set: {
          messageCount: sql`${userEngagement.messageCount} + excluded.message_count`,
          commandCount: sql`${userEngagement.commandCount} + excluded.command_count`,
          replyCount: sql`${userEngagement.replyCount} + excluded.reply_count`,
          mentionCount: sql`${userEngagement.mentionCount} + excluded.mention_count`,
          lastActive: sql`excluded.last_active`,
          dailyActiveStreak: sql`excluded.daily_active_streak`,
          averageResponseTime: sql`excluded.average_response_time`,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        },
      })
      .returning();

    return updated;
  }

  async getMetrics(userId: number, chatId: number) {
    const [metrics] = await db
      .select()
      .from(userEngagement)
      .where(
        and(
          eq(userEngagement.userId, userId),
          eq(userEngagement.chatId, chatId)
        )
      );
    
    return metrics;
  }

  async updateActiveStreak(userId: number, chatId: number) {
    const [metrics] = await db
      .select()
      .from(userEngagement)
      .where(
        and(
          eq(userEngagement.userId, userId),
          eq(userEngagement.chatId, chatId)
        )
      );

    if (!metrics) return;

    const lastActiveDate = new Date(metrics.lastActive);
    const now = new Date();
    const daysSinceLastActive = Math.floor(
      (now.getTime() - lastActiveDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    let newStreak = metrics.dailyActiveStreak;
    if (daysSinceLastActive <= 1) {
      newStreak += 1;
    } else {
      newStreak = 1;
    }

    await db
      .update(userEngagement)
      .set({
        dailyActiveStreak: newStreak,
        lastActive: now.getTime(),
        updatedAt: now.getTime(),
      })
      .where(
        and(
          eq(userEngagement.userId, userId),
          eq(userEngagement.chatId, chatId)
        )
      );
  }
}
