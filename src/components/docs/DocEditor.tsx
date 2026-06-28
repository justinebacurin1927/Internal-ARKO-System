"use client";

import { useState, useTransition } from "react";
import { Markdown } from "@/components/Markdown";
import { updateDocument } from "@/app/(app)/docs/actions";

type Option = { id: string; name: string };

export function DocEditor({
  doc,
  milestones,
  canEdit,
}: {
  doc: {
    id: string;
    title: string;
    contentMd: string;
    milestoneId: string | null;
  };
  milestones: Option[];
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(doc.title);
  const [content, setContent] = useState(doc.contentMd);
  const [milestoneId, setMilestoneId] = useState(doc.milestoneId ?? "");
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      await updateDocument({ id: doc.id, title, contentMd: content, milestoneId });
      setEditing(false);
    });
  }

  if (!editing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">{doc.title}</h1>
          {canEdit && (
            <button
              onClick={() => setEditing(true)}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Edit
            </button>
          )}
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          {doc.contentMd ? (
            <Markdown>{doc.contentMd}</Markdown>
          ) : (
            <p className="text-sm text-gray-400">This document is empty.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-lg font-semibold"
      />
      <select
        value={milestoneId}
        onChange={(e) => setMilestoneId(e.target.value)}
        className="rounded-md border border-gray-300 px-3 py-2 text-sm"
      >
        <option value="">No milestone</option>
        {milestones.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={18}
          placeholder="Write Markdown…"
          className="w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm focus:border-gray-900 focus:outline-none"
        />
        <div className="overflow-auto rounded-md border border-gray-200 bg-white p-3">
          <Markdown>{content || "_Nothing to preview_"}</Markdown>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={pending}
          className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        <button
          onClick={() => setEditing(false)}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
