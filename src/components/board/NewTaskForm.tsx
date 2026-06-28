"use client";

import { useState, useRef } from "react";
import { createTask } from "@/app/(app)/board/actions";

type Option = { id: string; name: string };

export function NewTaskForm({
  milestones,
  users,
}: {
  milestones: Option[];
  users: Option[];
}) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700"
      >
        + Task
      </button>
      {open && (
        <form
          ref={formRef}
          action={async (fd) => {
            await createTask(fd);
            formRef.current?.reset();
            setOpen(false);
          }}
          className="absolute right-0 z-10 mt-2 w-80 space-y-2 rounded-lg border border-gray-200 bg-white p-4 shadow-lg"
        >
          <input
            name="title"
            required
            placeholder="Task title"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <select
            name="milestoneId"
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            {milestones.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <select
            name="assigneeId"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Unassigned</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
          <button className="w-full rounded-md bg-gray-900 py-1.5 text-sm font-medium text-white hover:bg-gray-700">
            Create task
          </button>
        </form>
      )}
    </div>
  );
}
