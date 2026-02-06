import { mkdir } from 'node:fs/promises';
import { join, extname } from 'node:path';
import type { Api } from 'grammy';
import { MessagesRepository } from '../db/repositories/messages';

const ATTACHMENTS_BASE_DIR = './data/attachments';
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB Telegram Bot API limit

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'audio/ogg': '.ogg',
  'audio/mpeg': '.mp3',
  'audio/mp4': '.m4a',
  'video/mp4': '.mp4',
  'video/quicktime': '.mov',
  'application/pdf': '.pdf',
  'application/zip': '.zip',
  'text/plain': '.txt',
};

function getExtension(mimeType?: string, filePath?: string): string {
  if (filePath) {
    const ext = extname(filePath);
    if (ext) return ext;
  }
  if (mimeType && MIME_TO_EXT[mimeType]) {
    return MIME_TO_EXT[mimeType];
  }
  return '.bin';
}

function formatDate(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export interface DownloadTask {
  attachmentDbId: number;
  fileId: string;
  fileUniqueId: string;
  chatId: number;
  timestamp: number;
  mimeType?: string;
}

const messagesRepo = new MessagesRepository();

export async function downloadAttachment(api: Api, task: DownloadTask): Promise<void> {
  try {
    const file = await api.getFile(task.fileId);

    if (!file.file_path) {
      console.error(`No file_path returned for file ${task.fileId}`);
      return;
    }

    const ext = getExtension(task.mimeType, file.file_path);
    const dateDir = formatDate(task.timestamp);
    const dir = join(ATTACHMENTS_BASE_DIR, String(task.chatId), dateDir);
    await mkdir(dir, { recursive: true });

    const localPath = join(dir, `${task.fileUniqueId}${ext}`);

    // Download using Bot API URL
    const token = api.token;
    const url = `https://api.telegram.org/file/bot${token}/${file.file_path}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`Failed to download file ${task.fileId}: HTTP ${response.status}`);
      return;
    }

    const buffer = await response.arrayBuffer();

    if (buffer.byteLength > MAX_FILE_SIZE) {
      console.error(`File ${task.fileId} exceeds 20MB limit (${buffer.byteLength} bytes), skipping save`);
      return;
    }

    await Bun.write(localPath, buffer);
    await messagesRepo.updateAttachmentLocalPath(task.attachmentDbId, localPath);

    console.log(`Downloaded attachment: ${localPath}`);
  } catch (error) {
    console.error(`Error downloading attachment ${task.fileId}:`, error);
  }
}

/**
 * Fire-and-forget download of multiple attachments
 */
export function downloadAttachmentsInBackground(api: Api, tasks: DownloadTask[]): void {
  for (const task of tasks) {
    downloadAttachment(api, task).catch(err =>
      console.error(`Background download failed for ${task.fileId}:`, err)
    );
  }
}
