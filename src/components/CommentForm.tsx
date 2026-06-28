"use client";

import { useRef } from "react";
import { addComment } from "@/lib/comments";
import type { EntityType } from "@/lib/polymorphic";

export function CommentForm({
  entityType,
  entityId,
}: {
  entityType: EntityType;
  entityId: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (fd) => {
        await addComment(fd);
        formRef.current?.reset();
      }}
      className="space-y-2"
    >
      <input type="hidden" name="entityType" value={entityType} />
      <input type="hidden" name="entityId" value={entityId} />
      <textarea
        name="body"
        required
        rows={2}
        placeholder="Write a comment… use @name to mention"
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
      />
      <button className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700">
        Comment
      </button>
    </form>
  );
}
