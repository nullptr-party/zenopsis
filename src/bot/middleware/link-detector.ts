import { Context, Middleware } from 'grammy';
import { AdminGroupLinksRepository } from '@/db/repositories/admin-group-links';
import { scheduleTask } from '@/tasks/schedule';

const LINK_PATTERN = /zenopsis-link:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/;
const AUTO_DELETE_DELAY_MS = 15_000; // 15 seconds

const adminGroupLinksRepo = new AdminGroupLinksRepository();

export function createLinkDetector(): Middleware<Context> {
  return async (ctx, next) => {
    const msg = ctx.message;
    if (!msg || !ctx.chat?.id) {
      return next();
    }

    // Only process in groups/supergroups
    if (ctx.chat.type !== 'group' && ctx.chat.type !== 'supergroup') {
      return next();
    }

    // Check message text for link token pattern
    const text = msg.text || msg.caption || '';
    const match = text.match(LINK_PATTERN);
    if (!match) {
      return next();
    }

    const token = match[1];

    try {
      const result = await adminGroupLinksRepo.consumeToken(token);
      if (!result) {
        await ctx.reply('This linking token is invalid or has expired. Please generate a new one with /link in the admin group.');
        return; // Don't pass to next middleware — don't log linking messages
      }

      const { adminChatId } = result;

      // Check if this group is already controlled
      const existingLink = await adminGroupLinksRepo.getByControlledChatId(ctx.chat.id);
      if (existingLink) {
        await ctx.reply('This group is already controlled from an admin group. Unlink it first with /unlink in the admin group.');
        return;
      }

      // Check if the admin group already has a different link
      const existingAdminLink = await adminGroupLinksRepo.getByAdminChatId(adminChatId);
      if (existingAdminLink) {
        await ctx.reply('The admin group is already linked to another group. Unlink it first with /unlink in the admin group.');
        return;
      }

      const controlledChatTitle = ctx.chat.title || undefined;
      await adminGroupLinksRepo.createLink(
        adminChatId,
        ctx.chat.id,
        ctx.from?.id || 0,
        controlledChatTitle,
      );

      const confirmMsg = await ctx.reply(
        'This group is now controlled from an admin group. Commands like /summary will only work from the admin group.'
      );

      // Auto-delete the forwarded token message and confirmation
      await scheduleTask({
        type: 'delete_message',
        payload: { chatId: ctx.chat.id, messageId: msg.message_id },
        runAt: Date.now() + AUTO_DELETE_DELAY_MS,
      });
      await scheduleTask({
        type: 'delete_message',
        payload: { chatId: ctx.chat.id, messageId: confirmMsg.message_id },
        runAt: Date.now() + AUTO_DELETE_DELAY_MS,
      });

      // Notify admin group
      try {
        await ctx.api.sendMessage(
          adminChatId,
          `Successfully linked to "${controlledChatTitle || 'Unknown Group'}". Commands you run here will now affect that group.`,
        );
      } catch (err) {
        console.error('Failed to notify admin group:', err);
      }

      // Invalidate the admin group cache used by message-logger
      const { invalidateAdminGroupCache } = await import('./message-logger');
      invalidateAdminGroupCache();

    } catch (error) {
      console.error('Error processing link token:', error);
      await ctx.reply('An error occurred while linking. Please try again.');
    }

    // Don't pass to next middleware — don't log linking messages
  };
}
