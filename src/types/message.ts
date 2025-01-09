export interface Message {
  messageId: number;
  chatId: number;
  userId: number;
  username?: string;
  content: string;
  timestamp: number;
  threadId?: number;
  replyToMessageId?: number;
} 