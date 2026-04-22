import { db } from '../db';
import { groupConfigs } from '../db/schema';
import { eq } from 'drizzle-orm';
import { batchMessages, generateSummary, storeSummary, batchMessagesForTopics, generateTopics } from './summarizer';
import { bot } from '../bot';
import { Summary, Topics } from './client';

function escapeTelegramHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

export function formatSummary(summary: Summary): string {
  const sentiment = {
    positive: '😊',
    neutral: '😐',
    negative: '😕',
  };

  return `📋 <b>Conversation Summary</b>\n\n` +
    `<b>Main Topics:</b>\n${summary.mainTopics.map(topic => `• ${escapeTelegramHtml(topic.name)}`).join('\n')}\n\n` +
    `<b>Summary:</b>\n${escapeTelegramHtml(summary.summary)}\n\n` +
    `<b>Key Participants:</b>\n${summary.keyParticipants.map(participant => `• ${escapeTelegramHtml(participant)}`).join('\n')}\n\n` +
    (summary.actionItems && summary.actionItems.length > 0
      ? `<b>Action Items:</b>\n${summary.actionItems.map(item => `• ${escapeTelegramHtml(item)}`).join('\n')}\n\n`
      : '') +
    `<b>Overall Sentiment:</b> ${sentiment[summary.sentiment]}`;
}

async function processGroupSummary(config: any, autoSend: boolean = false) {
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
      parse_mode: 'HTML',
    });
  }

  return formattedSummary;
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

  const lines: string[] = ['<b>Discussion Topics for Meeting Prep</b>\n'];

  topics.forEach((topic, i) => {
    lines.push(`<b>${i + 1}. ${escapeTelegramHtml(topic.title)}</b>`);
    lines.push(escapeTelegramHtml(topic.summary));
    lines.push(`<i>${topic.participantCount} participants, ~${topic.messageCount} messages</i>\n`);
  });

  const totalHours = Math.max(1, Math.round((_meta.endTime.getTime() - _meta.startTime.getTime()) / (1000 * 60 * 60)));
  const days = Math.floor(totalHours / 24);
  const remainingHours = totalHours % 24;
  const period = days > 0
    ? remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`
    : `${remainingHours}h`;
  lines.push(`<i>Based on ${_meta.messageCount} messages from ${_meta.participantCount} participants over ${period}</i>`);

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
