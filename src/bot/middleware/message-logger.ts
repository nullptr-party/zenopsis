import { Context, Middleware } from 'grammy';
import type { Message as TgMessage } from '@grammyjs/types';
import { MessagesRepository } from '../../db/repositories';
import type { MessageAttachment } from '../../types/message';
import { downloadAttachmentsInBackground, type DownloadTask } from '../../services/attachment-downloader';

const messagesRepo = new MessagesRepository();

interface FileInfo {
  attachmentType: string;
  fileId: string;
  fileUniqueId: string;
  fileSize?: number;
  mimeType?: string;
  fileName?: string;
  duration?: number;
  width?: number;
  height?: number;
}

export function detectMessageType(msg: TgMessage): string {
  if (msg.text) return 'text';
  if (msg.photo) return 'photo';
  if (msg.document) return 'document';
  if (msg.voice) return 'voice';
  if (msg.video) return 'video';
  if (msg.video_note) return 'video_note';
  if (msg.audio) return 'audio';
  if (msg.sticker) return 'sticker';
  if (msg.animation) return 'animation';
  if (msg.poll) return 'poll';
  if (msg.location) return 'location';
  if (msg.contact) return 'contact';
  if (msg.venue) return 'venue';
  if (msg.dice) return 'dice';
  return 'unknown';
}

export function extractContent(msg: TgMessage, messageType: string): string | undefined {
  if (msg.text) return msg.text;
  if (msg.caption) return msg.caption;

  switch (messageType) {
    case 'sticker':
      return `[sticker: ${msg.sticker?.emoji || ''}]`;
    case 'photo':
      return '[photo]';
    case 'document':
      return `[document: ${msg.document?.file_name || 'unknown'}]`;
    case 'voice':
      return `[voice: ${msg.voice?.duration || 0}s]`;
    case 'video':
      return `[video: ${msg.video?.duration || 0}s]`;
    case 'video_note':
      return `[video_note: ${msg.video_note?.duration || 0}s]`;
    case 'audio':
      return `[audio: ${msg.audio?.title || msg.audio?.file_name || 'unknown'}]`;
    case 'animation':
      return '[animation]';
    case 'poll':
      return `[poll: ${msg.poll?.question || ''}]`;
    case 'location':
      return `[location: ${msg.location?.latitude}, ${msg.location?.longitude}]`;
    case 'contact':
      return `[contact: ${msg.contact?.first_name || ''} ${msg.contact?.phone_number || ''}]`;
    case 'venue':
      return `[venue: ${msg.venue?.title || ''}]`;
    case 'dice':
      return `[dice: ${msg.dice?.emoji} = ${msg.dice?.value}]`;
    default:
      return undefined;
  }
}

export function extractFileInfos(msg: TgMessage): FileInfo[] {
  const files: FileInfo[] = [];

  if (msg.photo && msg.photo.length > 0) {
    // Take the largest photo size
    const largest = msg.photo[msg.photo.length - 1];
    files.push({
      attachmentType: 'photo',
      fileId: largest.file_id,
      fileUniqueId: largest.file_unique_id,
      fileSize: largest.file_size,
      width: largest.width,
      height: largest.height,
    });
  }

  if (msg.document) {
    files.push({
      attachmentType: 'document',
      fileId: msg.document.file_id,
      fileUniqueId: msg.document.file_unique_id,
      fileSize: msg.document.file_size,
      mimeType: msg.document.mime_type,
      fileName: msg.document.file_name,
    });
  }

  if (msg.voice) {
    files.push({
      attachmentType: 'voice',
      fileId: msg.voice.file_id,
      fileUniqueId: msg.voice.file_unique_id,
      fileSize: msg.voice.file_size,
      mimeType: msg.voice.mime_type,
      duration: msg.voice.duration,
    });
  }

  if (msg.video) {
    files.push({
      attachmentType: 'video',
      fileId: msg.video.file_id,
      fileUniqueId: msg.video.file_unique_id,
      fileSize: msg.video.file_size,
      mimeType: msg.video.mime_type,
      duration: msg.video.duration,
      width: msg.video.width,
      height: msg.video.height,
      fileName: msg.video.file_name,
    });
  }

  if (msg.video_note) {
    files.push({
      attachmentType: 'video_note',
      fileId: msg.video_note.file_id,
      fileUniqueId: msg.video_note.file_unique_id,
      fileSize: msg.video_note.file_size,
      duration: msg.video_note.duration,
      width: msg.video_note.length,
      height: msg.video_note.length,
    });
  }

  if (msg.audio) {
    files.push({
      attachmentType: 'audio',
      fileId: msg.audio.file_id,
      fileUniqueId: msg.audio.file_unique_id,
      fileSize: msg.audio.file_size,
      mimeType: msg.audio.mime_type,
      duration: msg.audio.duration,
      fileName: msg.audio.file_name,
    });
  }

  if (msg.sticker) {
    files.push({
      attachmentType: 'sticker',
      fileId: msg.sticker.file_id,
      fileUniqueId: msg.sticker.file_unique_id,
      fileSize: msg.sticker.file_size,
      width: msg.sticker.width,
      height: msg.sticker.height,
    });
  }

  if (msg.animation) {
    files.push({
      attachmentType: 'animation',
      fileId: msg.animation.file_id,
      fileUniqueId: msg.animation.file_unique_id,
      fileSize: msg.animation.file_size,
      mimeType: msg.animation.mime_type,
      duration: msg.animation.duration,
      width: msg.animation.width,
      height: msg.animation.height,
      fileName: msg.animation.file_name,
    });
  }

  return files;
}

export function createMessageLogger(): Middleware<Context> {
  return async (ctx, next) => {
    try {
      const msg = ctx.message;
      if (!msg || !ctx.chat?.id) {
        return next();
      }

      // Only process group/supergroup messages
      if (ctx.chat.type !== 'group' && ctx.chat.type !== 'supergroup') {
        return next();
      }

      const messageType = detectMessageType(msg);
      const content = extractContent(msg, messageType);

      const forwardOrigin = msg.forward_origin
        ? JSON.stringify(msg.forward_origin)
        : undefined;

      // Save message to database
      const created = await messagesRepo.create({
        messageId: msg.message_id,
        chatId: ctx.chat.id,
        userId: ctx.from?.id || 0,
        username: ctx.from?.username,
        content,
        timestamp: msg.date * 1000,
        threadId: msg.message_thread_id,
        replyToMessageId: msg.reply_to_message?.message_id,
        messageType,
        senderFirstName: ctx.from?.first_name,
        senderLastName: ctx.from?.last_name,
        forwardOrigin,
        mediaGroupId: msg.media_group_id,
        rawJson: JSON.stringify(msg),
        languageCode: ctx.from?.language_code,
      });

      // Extract and save attachments
      const fileInfos = extractFileInfos(msg);
      if (fileInfos.length > 0) {
        const attachments: MessageAttachment[] = fileInfos.map(f => ({
          messageDbId: created.id,
          attachmentType: f.attachmentType,
          fileId: f.fileId,
          fileUniqueId: f.fileUniqueId,
          fileSize: f.fileSize,
          mimeType: f.mimeType,
          fileName: f.fileName,
          duration: f.duration,
          width: f.width,
          height: f.height,
        }));

        const savedAttachments = await messagesRepo.createAttachments(attachments);

        // Fire-and-forget download
        const downloadTasks: DownloadTask[] = savedAttachments.map((sa, i) => ({
          attachmentDbId: sa.id,
          fileId: fileInfos[i].fileId,
          fileUniqueId: fileInfos[i].fileUniqueId,
          chatId: ctx.chat!.id,
          timestamp: msg.date * 1000,
          mimeType: fileInfos[i].mimeType,
        }));

        downloadAttachmentsInBackground(ctx.api, downloadTasks);
      }
    } catch (error) {
      console.error('Error saving message to database:', error);
    }

    return next();
  };
}
