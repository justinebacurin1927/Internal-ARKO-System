"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";
import type { TaskStatus } from "@prisma/client";

const STATUSES: TaskStatus[] = ["BACKLOG", "DESIGN", "DEV", "TESTING", "DONE"];

export async function createMilestone(formData: FormData) {
  await requireUser();
  const name = z.string().min(1).parse(formData.get("name"));
  const description = (formData.get("description") as string) || null;

  const max = await prisma.milestone.aggregate({ _max: { order: true } });
  await prisma.milestone.create({
    data: { name, description, order: (max._max.order ?? -1) + 1 },
  });
  revalidatePath("/board");
}

export async function createTask(formData: FormData) {
  await requireUser();
  const schema = z.object({
    title: z.string().min(1),
    milestoneId: z.string().min(1),
    assigneeId: z.string().optional().nullable(),
  });
  const data = schema.parse({
    title: formData.get("title"),
    milestoneId: formData.get("milestoneId"),
    assigneeId: formData.get("assigneeId") || null,
  });

  const max = await prisma.task.aggregate({
    where: { status: "BACKLOG" },
    _max: { order: true },
  });
  await prisma.task.create({
    data: {
      title: data.title,
      milestoneId: data.milestoneId,
      assigneeId: data.assigneeId || null,
      status: "BACKLOG",
      order: (max._max.order ?? -1) + 1,
    },
  });
  revalidatePath("/board");
}

/** Move a task to a new status column (drag-and-drop). */
export async function moveTask(taskId: string, status: string) {
  await requireUser();
  if (!STATUSES.includes(status as TaskStatus)) throw new Error("Bad status");

  const max = await prisma.task.aggregate({
    where: { status: status as TaskStatus },
    _max: { order: true },
  });
  await prisma.task.update({
    where: { id: taskId },
    data: { status: status as TaskStatus, order: (max._max.order ?? -1) + 1 },
  });
  revalidatePath("/board");
}
