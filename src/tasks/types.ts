export interface TaskPayloadMap {
  delete_message: { chatId: number; messageId: number };
}

export type TaskType = keyof TaskPayloadMap;

export type TaskHandler<T extends TaskType> = (payload: TaskPayloadMap[T]) => Promise<void>;

export interface ScheduleTaskInput<T extends TaskType> {
  type: T;
  payload: TaskPayloadMap[T];
  runAt: number; // unix ms
  maxAttempts?: number; // default 3
}
