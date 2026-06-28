import { prisma } from "@/lib/prisma";
import { BoardClient } from "@/components/board/BoardClient";
import { NewTaskForm } from "@/components/board/NewTaskForm";
import { NewMilestoneForm } from "@/components/board/NewMilestoneForm";

export default async function BoardPage() {
  const [tasks, milestones, users] = await Promise.all([
    prisma.task.findMany({
      orderBy: [{ order: "asc" }],
      include: { milestone: true, assignee: true },
    }),
    prisma.milestone.findMany({ orderBy: { order: "asc" } }),
    prisma.user.findMany({ orderBy: { name: "asc" } }),
  ]);

  const cards = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    milestoneName: t.milestone.name,
    assigneeName: t.assignee?.name ?? null,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Board</h1>
        <div className="flex gap-2">
          <NewMilestoneForm />
          <NewTaskForm
            milestones={milestones.map((m) => ({ id: m.id, name: m.name }))}
            users={users.map((u) => ({ id: u.id, name: u.name }))}
          />
        </div>
      </div>

      {milestones.length === 0 ? (
        <p className="text-sm text-gray-500">
          No milestones yet. Create one to start adding tasks.
        </p>
      ) : (
        <BoardClient cards={cards} />
      )}
    </div>
  );
}
