import { db } from "@/db";
import { scheduledTasks } from "@/db/schema";
import { eq, and, lte, sql } from "drizzle-orm";
import type { ScheduleTaskInput, TaskType } from "@/tasks/types";

export class ScheduledTasksRepository {
  async schedule<T extends TaskType>(input: ScheduleTaskInput<T>) {
    const [task] = await db
      .insert(scheduledTasks)
      .values({
        type: input.type,
        payload: JSON.stringify(input.payload),
        runAt: input.runAt,
        maxAttempts: input.maxAttempts ?? 3,
      })
      .returning();
    return task;
  }

  async claimDueTasks(limit = 10) {
    const now = Date.now();
    const dueTasks = await db
      .select()
      .from(scheduledTasks)
      .where(
        and(
          eq(scheduledTasks.status, "pending"),
          lte(scheduledTasks.runAt, now),
        ),
      )
      .limit(limit);

    if (dueTasks.length === 0) return [];

    // Atomically mark as running and increment attempts
    for (const task of dueTasks) {
      await db
        .update(scheduledTasks)
        .set({
          status: "running",
          attempts: task.attempts + 1,
        })
        .where(
          and(
            eq(scheduledTasks.id, task.id),
            eq(scheduledTasks.status, "pending"),
          ),
        );
    }

    return dueTasks;
  }

  async markCompleted(taskId: number) {
    await db
      .update(scheduledTasks)
      .set({
        status: "completed",
        completedAt: new Date(),
      })
      .where(eq(scheduledTasks.id, taskId));
  }

  async markFailed(taskId: number, error: string, attempts: number, maxAttempts: number) {
    const status = attempts >= maxAttempts ? "failed" : "pending";
    await db
      .update(scheduledTasks)
      .set({
        status,
        lastError: error,
      })
      .where(eq(scheduledTasks.id, taskId));
  }

  async cleanup(maxAgeMs = 24 * 60 * 60 * 1000) {
    const cutoff = new Date(Date.now() - maxAgeMs);
    await db
      .delete(scheduledTasks)
      .where(
        and(
          sql`${scheduledTasks.status} IN ('completed', 'failed')`,
          lte(scheduledTasks.completedAt, cutoff),
        ),
      );
  }

  async getById(taskId: number) {
    return db
      .select()
      .from(scheduledTasks)
      .where(eq(scheduledTasks.id, taskId))
      .then((rows) => rows[0] ?? null);
  }

  async getPendingByType(type: string) {
    return db
      .select()
      .from(scheduledTasks)
      .where(
        and(
          eq(scheduledTasks.type, type),
          eq(scheduledTasks.status, "pending"),
        ),
      );
  }
}
