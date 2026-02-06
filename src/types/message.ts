export interface Message {
  messageId: number;
  chatId: number;
  userId: number;
  username?: string;
  content?: string;
  timestamp: number;
  threadId?: number;
  replyToMessageId?: number;
  messageType: string;
  senderFirstName?: string;
  senderLastName?: string;
  forwardOrigin?: string;
  mediaGroupId?: string;
  rawJson?: string;
  references?: MessageReference[];
}

export interface MessageAttachment {
  messageDbId: number;
  attachmentType: string;
  fileId: string;
  fileUniqueId: string;
  fileSize?: number;
  mimeType?: string;
  fileName?: string;
  duration?: number;
  width?: number;
  height?: number;
  localPath?: string;
}

export interface MessageReference {
  type: 'reply' | 'mention' | 'edit' | 'summary';
  targetMessageId: number;
  resolvedUsername?: string;
}

export const ReferenceType = {
  REPLY: 'reply',
  MENTION: 'mention',
  EDIT: 'edit',
  SUMMARY: 'summary',
} as const;
