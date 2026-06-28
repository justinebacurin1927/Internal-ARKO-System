import { prisma } from "@/lib/prisma";
import { entityWhere, type EntityType } from "@/lib/polymorphic";
import { AttachmentUploader } from "@/components/AttachmentUploader";

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export async function AttachmentList({
  entityType,
  entityId,
}: {
  entityType: EntityType;
  entityId: string;
}) {
  const attachments = await prisma.attachment.findMany({
    where: entityWhere(entityType, entityId),
    orderBy: { createdAt: "desc" },
  });

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">
          Attachments ({attachments.length})
        </h2>
        <AttachmentUploader entityType={entityType} entityId={entityId} />
      </div>

      <ul className="space-y-1">
        {attachments.map((a) => (
          <li
            key={a.id}
            className="flex items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
          >
            <a
              href={`/api/attachments/${a.id}/download`}
              className="font-medium text-indigo-600 hover:underline"
            >
              {a.fileName}
            </a>
            <span className="text-xs text-gray-400">{formatSize(a.size)}</span>
          </li>
        ))}
        {attachments.length === 0 && (
          <li className="text-sm text-gray-400">No attachments.</li>
        )}
      </ul>
    </section>
  );
}
