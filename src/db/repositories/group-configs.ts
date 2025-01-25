import { eq } from 'drizzle-orm';
import { db } from '../index';
import { groupConfigs } from '../schema';

export interface GroupConfig {
  chatId: number;
  summaryInterval?: number;
  minMessagesForSummary?: number;
  isActive?: boolean;
  language?: string;
  schemaVersion?: number;
  maxDailyTokens?: number;
  maxSummaryTokens?: number;
  tokenUsageAlert?: number;
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
        maxDailyTokens: config.maxDailyTokens,
        maxSummaryTokens: config.maxSummaryTokens,
        tokenUsageAlert: config.tokenUsageAlert,
        language: config.language,
        schemaVersion: config.schemaVersion,
        maxDailyTokens: config.maxDailyTokens,
        maxSummaryTokens: config.maxSummaryTokens,
        tokenUsageAlert: config.tokenUsageAlert,
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

  /**
   * Check token usage and trigger alerts if needed
   */
  async checkTokenUsage(chatId: number) {
    const config = await this.getByChatId(chatId);
    if (!config?.maxDailyTokens || !config.tokenUsageAlert) {
      return null;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await db
      .select({ 
        totalTokens: sql<number>`sum(tokens_used)`,
        lastAlert: sql<number>`max(case when alert_sent = 1 then created_at end)`
      })
      .from(summaries)
      .where(and(
        eq(summaries.chatId, chatId),
        sql`created_at >= ${today.getTime()}`
      ));

    const totalTokens = result[0]?.totalTokens || 0;
    const alertThreshold = config.maxDailyTokens * (config.tokenUsageAlert / 100);
    const lastAlert = result[0]?.lastAlert;
    const shouldAlert = totalTokens >= alertThreshold && 
                       (!lastAlert || (Date.now() - lastAlert) > 3600000); // 1 hour cooldown

    if (shouldAlert) {
      await db.update(summaries)
        .set({ alertSent: true })
        .where(eq(summaries.chatId, chatId));
    }

    return shouldAlert ? {
      currentUsage: totalTokens,
      limit: config.maxDailyTokens,
      percentage: (totalTokens / config.maxDailyTokens) * 100,
      shouldAlert
    } : null;
  }

  async generateCostReport(chatId: number, startDate?: Date, endDate: Date = new Date()) {
    const start = startDate || new Date(endDate.getTime() - (30 * 24 * 60 * 60 * 1000)); // Default 30 days

    const rawData = await db
      .select({
        date: sql<string>`date(datetime(created_at/1000, 'unixepoch'))`,
        totalTokens: sql<number>`sum(tokens_used)`,
        summaryCount: sql<number>`count(*)`,
        avgTokensPerSummary: sql<number>`avg(tokens_used)`
      })
      .from(summaries)
      .where(and(
        eq(summaries.chatId, chatId),
        sql`created_at >= ${start.getTime()}`,
        sql`created_at <= ${endDate.getTime()}`
      ))
      .groupBy(sql`date`)
      .orderBy(sql`date`);

    // Format the report
    const totalTokens = rawData.reduce((sum, day) => sum + (day.totalTokens || 0), 0);
    const totalSummaries = rawData.reduce((sum, day) => sum + day.summaryCount, 0);
    
    return {
      period: {
        start: start.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0]
      },
      totals: {
        tokens: totalTokens,
        summaries: totalSummaries,
        avgTokensPerSummary: totalSummaries ? Math.round(totalTokens / totalSummaries) : 0
      },
      dailyStats: rawData.map(day => ({
        date: day.date,
        tokens: day.totalTokens || 0,
        summaries: day.summaryCount,
        avgTokens: Math.round(day.avgTokensPerSummary || 0)
      }))
    };
  }
}
