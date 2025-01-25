export interface Message {
  messageId: number;
  chatId: number;
  userId: number;
  username?: string;
  content: string;
  timestamp: number;
  threadId?: number;
  replyToMessageId?: number;
  references?: MessageReference[];
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
