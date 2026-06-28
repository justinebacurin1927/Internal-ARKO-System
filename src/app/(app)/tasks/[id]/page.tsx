import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CommentThread } from "@/components/CommentThread";
import { AttachmentList } from "@/components/AttachmentList";
import { StatusSelect } from "@/components/board/StatusSelect";

export default async function TaskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const task = await prisma.task.findUnique({
    where: { id },
    include: { milestone: true, assignee: true },
  });
  if (!task) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/board" className="text-sm text-gray-500 hover:text-gray-900">
        ← Back to board
      </Link>

      <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-6">
        <h1 className="text-xl font-semibold text-gray-900">{task.title}</h1>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <StatusSelect taskId={task.id} status={task.status} />
          <span className="rounded bg-indigo-50 px-2 py-0.5 text-indigo-700">
            {task.milestone.name}
          </span>
          <span className="text-gray-500">
            {task.assignee ? `Assigned to ${task.assignee.name}` : "Unassigned"}
          </span>
        </div>
        {task.description && (
          <p className="whitespace-pre-wrap text-sm text-gray-700">
            {task.description}
          </p>
        )}
      </div>

      <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
        <AttachmentList entityType="task" entityId={task.id} />
      </div>

      <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
        <CommentThread entityType="task" entityId={task.id} />
      </div>
    </div>
  );
}
