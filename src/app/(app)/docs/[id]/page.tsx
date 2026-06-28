import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser, canEdit } from "@/lib/rbac";
import { DocEditor } from "@/components/docs/DocEditor";
import { CommentThread } from "@/components/CommentThread";
import { AttachmentList } from "@/components/AttachmentList";

export default async function DocPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [doc, milestones, user] = await Promise.all([
    prisma.document.findUnique({ where: { id } }),
    prisma.milestone.findMany({ orderBy: { order: "asc" } }),
    requireUser(),
  ]);
  if (!doc) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/docs" className="text-sm text-gray-500 hover:text-gray-900">
        ← Back to docs
      </Link>

      <DocEditor
        doc={{
          id: doc.id,
          title: doc.title,
          contentMd: doc.contentMd,
          milestoneId: doc.milestoneId,
        }}
        milestones={milestones.map((m) => ({ id: m.id, name: m.name }))}
        canEdit={canEdit(user, doc.authorId)}
      />

      <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
        <AttachmentList entityType="document" entityId={doc.id} />
      </div>

      <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
        <CommentThread entityType="document" entityId={doc.id} />
      </div>
    </div>
  );
}
