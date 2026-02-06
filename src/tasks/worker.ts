import { ScheduledTasksRepository } from "@/db/repositories/scheduled-tasks";
import type { TaskHandler, TaskType } from "./types";

const handlers = new Map<string, TaskHandler<any>>();
const repo = new ScheduledTasksRepository();

let intervalId: ReturnType<typeof setInterval> | null = null;
let isProcessing = false;

export function registerHandler<T extends TaskType>(type: T, handler: TaskHandler<T>) {
  handlers.set(type, handler);
}

export async function processDueTasks() {
  if (isProcessing) return;
  isProcessing = true;

  try {
    const tasks = await repo.claimDueTasks();

    for (const task of tasks) {
      const handler = handlers.get(task.type);
      if (!handler) {
        await repo.markFailed(task.id, `No handler registered for type "${task.type}"`, task.attempts, task.maxAttempts);
        continue;
      }

      try {
        const payload = JSON.parse(task.payload);
        await handler(payload);
        await repo.markCompleted(task.id);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await repo.markFailed(task.id, message, task.attempts, task.maxAttempts);
      }
    }

    await repo.cleanup();
  } finally {
    isProcessing = false;
  }
}

export function startWorker(intervalMs = 5000) {
  // Process immediately on startup (picks up tasks due during downtime)
  processDueTasks();
  intervalId = setInterval(processDueTasks, intervalMs);
}

export function stopWorker() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
