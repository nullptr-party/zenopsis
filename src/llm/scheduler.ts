import { db } from '../db';
import { groupConfigs } from '../db/schema';
import { eq } from 'drizzle-orm';
import { batchMessages, generateSummary, storeSummary, batchMessagesForTopics, generateTopics } from './summarizer';
import { bot } from '../bot';
import { Summary, Topics } from './client';

export function formatSummary(summary: Summary): string {
  const sentiment = {
    positive: '😊',
    neutral: '😐',
    negative: '😕',
  };

  return `📋 *Conversation Summary*\n\n` +
    `*Main Topics:*\n${summary.mainTopics.map(topic => `• ${topic.name}`).join('\n')}\n\n` +
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
    await storeSummary(config.chatId, summary, batch);

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

// Topics for meeting prep

interface TopicsWithMeta extends Topics {
  _meta: {
    messageCount: number;
    participantCount: number;
    startTime: Date;
    endTime: Date;
  };
}

export function formatTopics(result: TopicsWithMeta): string {
  const { topics, _meta } = result;

  const lines: string[] = ['*Discussion Topics for Meeting Prep*\n'];

  topics.forEach((topic, i) => {
    lines.push(`*${i + 1}. ${topic.title}*`);
    lines.push(topic.summary);
    lines.push(`_${topic.participantCount} participants, ~${topic.messageCount} messages_\n`);
  });

  const hours = Math.max(1, Math.round(((_meta.endTime.getTime() - _meta.startTime.getTime()) / (1000 * 60 * 60))));
  lines.push(`_Based on ${_meta.messageCount} messages from ${_meta.participantCount} participants over ${hours} hour(s)_`);

  return lines.join('\n');
}

export async function triggerManualTopics(chatId: number, days: number = 14): Promise<string | null> {
  const config = await db.query.groupConfigs.findFirst({
    where: eq(groupConfigs.chatId, chatId),
  });

  if (!config) {
    throw new Error('Group configuration not found');
  }

  const batch = await batchMessagesForTopics(chatId, days);
  if (!batch) {
    return null;
  }

  const result = await generateTopics(batch, config.language);
  return formatTopics(result);
}
