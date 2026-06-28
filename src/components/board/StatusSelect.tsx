"use client";

import { useTransition } from "react";
import type { TaskStatus } from "@prisma/client";
import { TASK_STATUSES, STATUS_LABELS } from "@/lib/constants";
import { moveTask } from "@/app/(app)/board/actions";

export function StatusSelect({
  taskId,
  status,
}: {
  taskId: string;
  status: TaskStatus;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <select
      value={status}
      disabled={pending}
      onChange={(e) =>
        startTransition(() => moveTask(taskId, e.target.value))
      }
      className="rounded-md border border-gray-300 px-2 py-1 text-sm"
    >
      {TASK_STATUSES.map((s) => (
        <option key={s} value={s}>
          {STATUS_LABELS[s]}
        </option>
      ))}
    </select>
  );
}
