"use client";

import { useState, useRef } from "react";
import { requestUpload, confirmUpload } from "@/lib/attachments";
import type { EntityType } from "@/lib/polymorphic";

export function AttachmentUploader({
  entityType,
  entityId,
}: {
  entityType: EntityType;
  entityId: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const mimeType = file.type || "application/octet-stream";
      const { url, key } = await requestUpload({ fileName: file.name, mimeType });

      const put = await fetch(url, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": mimeType },
      });
      if (!put.ok) throw new Error("Upload failed");

      await confirmUpload({
        entityType,
        entityId,
        key,
        fileName: file.name,
        mimeType,
        size: file.size,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
        {busy ? "Uploading…" : "+ Attach file"}
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          disabled={busy}
          onChange={onChange}
        />
      </label>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
