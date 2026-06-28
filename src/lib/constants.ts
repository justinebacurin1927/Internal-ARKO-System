import type { TaskStatus } from "@prisma/client";

// Column order for the SDLC board (Backlog → Done).
export const TASK_STATUSES: TaskStatus[] = [
  "BACKLOG",
  "DESIGN",
  "DEV",
  "TESTING",
  "DONE",
];

export const STATUS_LABELS: Record<TaskStatus, string> = {
  BACKLOG: "Backlog",
  DESIGN: "Design",
  DEV: "Dev",
  TESTING: "Testing",
  DONE: "Done",
};
