import { prisma } from "@/lib/prisma";
import { entityWhere, type EntityType } from "@/lib/polymorphic";
import { CommentForm } from "@/components/CommentForm";

/** Renders @mentions as highlighted spans; everything else as plain text. */
function renderBody(body: string) {
  return body.split(/(@[a-zA-Z0-9._-]+)/g).map((part, i) =>
    part.startsWith("@") ? (
      <span key={i} className="font-medium text-indigo-600">
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

export async function CommentThread({
  entityType,
  entityId,
}: {
  entityType: EntityType;
  entityId: string;
}) {
  const comments = await prisma.comment.findMany({
    where: entityWhere(entityType, entityId),
    orderBy: { createdAt: "asc" },
    include: { author: true },
  });

  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold text-gray-700">
        Comments ({comments.length})
      </h2>

      <ul className="space-y-3">
        {comments.map((c) => (
          <li
            key={c.id}
            className="rounded-md border border-gray-200 bg-white p-3"
          >
            <div className="mb-1 flex items-center gap-2 text-xs text-gray-500">
              <span className="font-medium text-gray-700">{c.author.name}</span>
              <span>{c.createdAt.toLocaleString()}</span>
            </div>
            <p className="whitespace-pre-wrap text-sm text-gray-900">
              {renderBody(c.body)}
            </p>
          </li>
        ))}
        {comments.length === 0 && (
          <li className="text-sm text-gray-400">No comments yet.</li>
        )}
      </ul>

      <CommentForm entityType={entityType} entityId={entityId} />
    </section>
  );
}
