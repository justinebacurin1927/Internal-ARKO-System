import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";
import { markAllRead } from "./actions";

/** Resolve the parent object of a comment to its page URL + label. */
function commentLink(comment: {
  taskId: string | null;
  documentId: string | null;
  storyboardId: string | null;
}) {
  if (comment.taskId) return { url: `/tasks/${comment.taskId}`, label: "a task" };
  if (comment.documentId)
    return { url: `/docs/${comment.documentId}`, label: "a document" };
  if (comment.storyboardId)
    return { url: `/storyboards/${comment.storyboardId}`, label: "a storyboard" };
  return { url: "#", label: "an item" };
}

export default async function NotificationsPage() {
  const user = await requireUser();
  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { comment: { include: { author: true } } },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Notifications</h1>
        <form action={markAllRead}>
          <button className="text-sm text-gray-500 hover:text-gray-900">
            Mark all read
          </button>
        </form>
      </div>

      <ul className="space-y-2">
        {notifications.map((n) => {
          const link = n.comment ? commentLink(n.comment) : { url: "#", label: "" };
          return (
            <li key={n.id}>
              <Link
                href={link.url}
                className={`block rounded-md border p-3 text-sm ${
                  n.read
                    ? "border-gray-200 bg-white text-gray-600"
                    : "border-indigo-200 bg-indigo-50 text-gray-900"
                }`}
              >
                <span className="font-medium">
                  {n.comment?.author.name ?? "Someone"}
                </span>{" "}
                mentioned you in {link.label}
                <span className="ml-2 text-xs text-gray-400">
                  {n.createdAt.toLocaleString()}
                </span>
              </Link>
            </li>
          );
        })}
        {notifications.length === 0 && (
          <li className="rounded-md border border-gray-200 bg-white p-6 text-sm text-gray-400">
            No notifications yet.
          </li>
        )}
      </ul>
    </div>
  );
}
