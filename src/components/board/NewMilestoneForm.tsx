"use client";

import { useState, useRef } from "react";
import { createMilestone } from "@/app/(app)/board/actions";

export function NewMilestoneForm() {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        + Milestone
      </button>
      {open && (
        <form
          ref={formRef}
          action={async (fd) => {
            await createMilestone(fd);
            formRef.current?.reset();
            setOpen(false);
          }}
          className="absolute right-0 z-10 mt-2 w-72 space-y-2 rounded-lg border border-gray-200 bg-white p-4 shadow-lg"
        >
          <input
            name="name"
            required
            placeholder="Milestone name"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            name="description"
            placeholder="Description (optional)"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <button className="w-full rounded-md bg-gray-900 py-1.5 text-sm font-medium text-white hover:bg-gray-700">
            Create milestone
          </button>
        </form>
      )}
    </div>
  );
}
