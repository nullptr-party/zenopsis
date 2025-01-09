import { db } from '../db';
import { groupConfigs } from '../db/schema';
import { eq } from 'drizzle-orm';
import { batchMessages, generateSummary, storeSummary } from './summarizer';
import { bot } from '../bot';
import { Summary } from './client';

export async function initializeSummaryScheduler() {
  // Check for summaries every minute
  setInterval(checkAndGenerateSummaries, 60 * 1000);
}

async function checkAndGenerateSummaries() {
  try {
    // Get all active group configurations
    const configs = await db.query.groupConfigs.findMany({
      where: eq(groupConfigs.isActive, true),
    });

    // Process each active group
    for (const config of configs) {
      await processGroupSummary(config, true);
    }
  } catch (error) {
    console.error('Error in summary scheduler:', error);
  }
}

function formatSummary(summary: Summary): string {
  const sentiment = {
    positive: '😊',
    neutral: '😐',
    negative: '😕',
  };

  return `📋 *Conversation Summary*\n\n` +
    `*Main Topics:*\n${summary.mainTopics.map(topic => `• ${topic}`).join('\n')}\n\n` +
    `*Summary:*\n${summary.summary}\n\n` +
    `*Key Participants:*\n${summary.keyParticipants.map(participant => `• ${participant}`).join('\n')}\n\n` +
    (summary.actionItems && summary.actionItems.length > 0 
      ? `*Action Items:*\n${summary.actionItems.map(item => `• ${item}`).join('\n')}\n\n`
      : '') +
    `*Overall Sentiment:* ${sentiment[summary.sentiment]}`;
}

async function processGroupSummary(config: any, autoSend: boolean = false) {
  try {
    // Get messages batch for the group
    const batch = await batchMessages(config.chatId, config.summaryInterval / 60);
    
    if (!batch) {
      return null; // Not enough messages for summary
    }

    // Generate summary
    const summary = await generateSummary(batch);
    await storeSummary(config.chatId, summary);

    // Format summary
    const formattedSummary = formatSummary(summary);

    // If autoSend is true (scheduler) or it's a manual trigger without a return handler
    if (autoSend) {
      await bot.api.sendMessage(config.chatId, formattedSummary, {
        parse_mode: 'Markdown',
      });
    }

    return formattedSummary;
  } catch (error) {
    console.error(`Error processing summary for chat ${config.chatId}:`, error);
    return null;
  }
}

// Export for manual trigger support
export async function triggerManualSummary(chatId: number): Promise<string | null> {
  const config = await db.query.groupConfigs.findFirst({
    where: eq(groupConfigs.chatId, chatId),
  });

  if (!config) {
    throw new Error('Group configuration not found');
  }

  return await processGroupSummary(config, false);
}
