"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { TaskStatus } from "@prisma/client";
import { TASK_STATUSES, STATUS_LABELS } from "@/lib/constants";
import { moveTask } from "@/app/(app)/board/actions";

type Card = {
  id: string;
  title: string;
  status: TaskStatus;
  milestoneName: string;
  assigneeName: string | null;
};

export function BoardClient({ cards }: { cards: Card[] }) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<TaskStatus | null>(null);
  const [, startTransition] = useTransition();

  function onDrop(status: TaskStatus) {
    setOver(null);
    const id = dragId;
    setDragId(null);
    if (!id) return;
    const card = cards.find((c) => c.id === id);
    if (!card || card.status === status) return;
    startTransition(() => moveTask(id, status));
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
      {TASK_STATUSES.map((status) => {
        const items = cards.filter((c) => c.status === status);
        return (
          <div
            key={status}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(status);
            }}
            onDragLeave={() => setOver((s) => (s === status ? null : s))}
            onDrop={() => onDrop(status)}
            className={`flex min-h-40 flex-col gap-2 rounded-lg border p-2 transition-colors ${
              over === status
                ? "border-gray-900 bg-gray-100"
                : "border-gray-200 bg-gray-50"
            }`}
          >
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-semibold text-gray-700">
                {STATUS_LABELS[status]}
              </h2>
              <span className="text-xs text-gray-400">{items.length}</span>
            </div>

            {items.map((card) => (
              <div
                key={card.id}
                draggable
                onDragStart={() => setDragId(card.id)}
                onDragEnd={() => setDragId(null)}
                className={`cursor-grab rounded-md border border-gray-200 bg-white p-3 shadow-sm hover:shadow ${
                  dragId === card.id ? "opacity-50" : ""
                }`}
              >
                <Link
                  href={`/tasks/${card.id}`}
                  className="block text-sm font-medium text-gray-900 hover:underline"
                >
                  {card.title}
                </Link>
                <div className="mt-2 flex flex-wrap items-center gap-1">
                  <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-xs text-indigo-700">
                    {card.milestoneName}
                  </span>
                  {card.assigneeName && (
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                      {card.assigneeName}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
