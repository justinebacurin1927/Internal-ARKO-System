"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";
import { notifyMentions } from "@/lib/mentions";
import { entityWhere, type EntityType } from "@/lib/polymorphic";

const schema = z.object({
  entityType: z.enum(["task", "document", "storyboard"]),
  entityId: z.string().min(1),
  body: z.string().min(1).max(5000),
});

const PATH: Record<EntityType, string> = {
  task: "/tasks",
  document: "/docs",
  storyboard: "/storyboards",
};

const LABEL: Record<EntityType, string> = {
  task: "a task",
  document: "a document",
  storyboard: "a storyboard",
};

export async function addComment(formData: FormData) {
  const user = await requireUser();
  const { entityType, entityId, body } = schema.parse({
    entityType: formData.get("entityType"),
    entityId: formData.get("entityId"),
    body: formData.get("body"),
  });

  const comment = await prisma.comment.create({
    data: {
      body,
      authorId: user.id,
      ...entityWhere(entityType, entityId),
    },
  });

  const url = `${PATH[entityType]}/${entityId}`;
  await notifyMentions({
    body,
    commentId: comment.id,
    authorId: user.id,
    authorName: user.name ?? user.email ?? "Someone",
    contextLabel: LABEL[entityType],
    url,
  });

  revalidatePath(url);
}
