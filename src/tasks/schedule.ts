import { ScheduledTasksRepository } from "@/db/repositories/scheduled-tasks";
import type { ScheduleTaskInput, TaskType } from "./types";

const repo = new ScheduledTasksRepository();

export async function scheduleTask<T extends TaskType>(input: ScheduleTaskInput<T>) {
  return repo.schedule(input);
}
