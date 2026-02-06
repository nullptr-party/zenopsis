import { describe, it, expect, beforeEach } from "bun:test";
import { ScheduledTasksRepository } from "@/db/repositories/scheduled-tasks";
import { db } from "@/db";
import { scheduledTasks } from "@/db/schema";
import { cleanDatabase, createTestScheduledTask } from "../../helpers/test-utils";
import { eq } from "drizzle-orm";

describe("ScheduledTasksRepository", () => {
  const repo = new ScheduledTasksRepository();

  beforeEach(async () => {
    await cleanDatabase();
  });

  describe("schedule", () => {
    it("should insert a pending task", async () => {
      const task = await repo.schedule({
        type: "delete_message",
        payload: { chatId: -1001234567890, messageId: 42 },
        runAt: Date.now() + 60_000,
      });

      expect(task.id).toBeDefined();
      expect(task.type).toBe("delete_message");
      expect(task.status).toBe("pending");
      expect(task.attempts).toBe(0);
      expect(task.maxAttempts).toBe(3);

      const parsed = JSON.parse(task.payload);
      expect(parsed.chatId).toBe(-1001234567890);
      expect(parsed.messageId).toBe(42);
    });

    it("should respect custom maxAttempts", async () => {
      const task = await repo.schedule({
        type: "delete_message",
        payload: { chatId: -100, messageId: 1 },
        runAt: Date.now(),
        maxAttempts: 5,
      });

      expect(task.maxAttempts).toBe(5);
    });
  });

  describe("claimDueTasks", () => {
    it("should claim tasks whose runAt is in the past", async () => {
      await db.insert(scheduledTasks).values(
        createTestScheduledTask({ runAt: Date.now() - 1000 }),
      );
      await db.insert(scheduledTasks).values(
        createTestScheduledTask({ runAt: Date.now() + 60_000 }),
      );

      const claimed = await repo.claimDueTasks();
      expect(claimed.length).toBe(1);

      // Verify it was marked as running
      const updated = await repo.getById(claimed[0].id);
      expect(updated?.status).toBe("running");
      expect(updated?.attempts).toBe(1);
    });

    it("should not claim already running tasks", async () => {
      await db.insert(scheduledTasks).values(
        createTestScheduledTask({ runAt: Date.now() - 1000, status: "running" }),
      );

      const claimed = await repo.claimDueTasks();
      expect(claimed.length).toBe(0);
    });

    it("should not claim completed or failed tasks", async () => {
      await db.insert(scheduledTasks).values(
        createTestScheduledTask({ runAt: Date.now() - 1000, status: "completed" }),
      );
      await db.insert(scheduledTasks).values(
        createTestScheduledTask({ runAt: Date.now() - 1000, status: "failed" }),
      );

      const claimed = await repo.claimDueTasks();
      expect(claimed.length).toBe(0);
    });

    it("should respect the limit parameter", async () => {
      for (let i = 0; i < 5; i++) {
        await db.insert(scheduledTasks).values(
          createTestScheduledTask({ runAt: Date.now() - 1000 }),
        );
      }

      const claimed = await repo.claimDueTasks(2);
      expect(claimed.length).toBe(2);
    });

    it("should return empty array when no tasks are due", async () => {
      await db.insert(scheduledTasks).values(
        createTestScheduledTask({ runAt: Date.now() + 60_000 }),
      );

      const claimed = await repo.claimDueTasks();
      expect(claimed.length).toBe(0);
    });
  });

  describe("markCompleted", () => {
    it("should set status to completed and set completedAt", async () => {
      const [inserted] = await db.insert(scheduledTasks).values(
        createTestScheduledTask({ status: "running" }),
      ).returning();

      await repo.markCompleted(inserted.id);

      const task = await repo.getById(inserted.id);
      expect(task?.status).toBe("completed");
      expect(task?.completedAt).toBeDefined();
    });
  });

  describe("markFailed", () => {
    it("should set status back to pending if retries remain", async () => {
      const [inserted] = await db.insert(scheduledTasks).values(
        createTestScheduledTask({ status: "running", attempts: 1 }),
      ).returning();

      await repo.markFailed(inserted.id, "some error", 1, 3);

      const task = await repo.getById(inserted.id);
      expect(task?.status).toBe("pending");
      expect(task?.lastError).toBe("some error");
    });

    it("should set status to failed if max attempts reached", async () => {
      const [inserted] = await db.insert(scheduledTasks).values(
        createTestScheduledTask({ status: "running", attempts: 3 }),
      ).returning();

      await repo.markFailed(inserted.id, "final error", 3, 3);

      const task = await repo.getById(inserted.id);
      expect(task?.status).toBe("failed");
      expect(task?.lastError).toBe("final error");
    });
  });

  describe("cleanup", () => {
    it("should delete old completed tasks", async () => {
      const oldDate = new Date(Date.now() - 48 * 60 * 60 * 1000); // 48h ago
      await db.insert(scheduledTasks).values(
        createTestScheduledTask({
          status: "completed",
          completedAt: oldDate,
          runAt: Date.now() - 48 * 60 * 60 * 1000,
        }),
      );
      // Recent completed task should NOT be deleted
      await db.insert(scheduledTasks).values(
        createTestScheduledTask({
          status: "completed",
          completedAt: new Date(),
          runAt: Date.now() - 1000,
        }),
      );

      await repo.cleanup();

      const remaining = await db.select().from(scheduledTasks);
      expect(remaining.length).toBe(1);
      expect(remaining[0].status).toBe("completed");
    });

    it("should delete old failed tasks", async () => {
      const oldDate = new Date(Date.now() - 48 * 60 * 60 * 1000);
      await db.insert(scheduledTasks).values(
        createTestScheduledTask({
          status: "failed",
          completedAt: oldDate,
          runAt: Date.now() - 48 * 60 * 60 * 1000,
        }),
      );

      await repo.cleanup();

      const remaining = await db.select().from(scheduledTasks);
      expect(remaining.length).toBe(0);
    });

    it("should not delete pending tasks", async () => {
      await db.insert(scheduledTasks).values(
        createTestScheduledTask({ status: "pending" }),
      );

      await repo.cleanup();

      const remaining = await db.select().from(scheduledTasks);
      expect(remaining.length).toBe(1);
    });
  });

  describe("getById", () => {
    it("should return task by id", async () => {
      const [inserted] = await db.insert(scheduledTasks).values(
        createTestScheduledTask(),
      ).returning();

      const task = await repo.getById(inserted.id);
      expect(task).toBeDefined();
      expect(task?.id).toBe(inserted.id);
    });

    it("should return null for non-existent id", async () => {
      const task = await repo.getById(99999);
      expect(task).toBeNull();
    });
  });

  describe("getPendingByType", () => {
    it("should return only pending tasks of given type", async () => {
      await db.insert(scheduledTasks).values(
        createTestScheduledTask({ type: "delete_message", status: "pending" }),
      );
      await db.insert(scheduledTasks).values(
        createTestScheduledTask({ type: "delete_message", status: "completed" }),
      );

      const pending = await repo.getPendingByType("delete_message");
      expect(pending.length).toBe(1);
      expect(pending[0].status).toBe("pending");
    });
  });
});
