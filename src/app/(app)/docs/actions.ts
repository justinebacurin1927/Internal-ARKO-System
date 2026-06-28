"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, canEdit } from "@/lib/rbac";

export async function createDocument() {
  const user = await requireUser();
  const doc = await prisma.document.create({
    data: { title: "Untitled document", authorId: user.id },
  });
  redirect(`/docs/${doc.id}`);
}

const updateSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(200),
  contentMd: z.string().max(100_000),
  milestoneId: z.string().optional().nullable(),
});

export async function updateDocument(input: z.infer<typeof updateSchema>) {
  const user = await requireUser();
  const { id, title, contentMd, milestoneId } = updateSchema.parse(input);

  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) throw new Error("NOT_FOUND");
  if (!canEdit(user, doc.authorId)) throw new Error("FORBIDDEN");

  await prisma.document.update({
    where: { id },
    data: { title, contentMd, milestoneId: milestoneId || null },
  });
  revalidatePath(`/docs/${id}`);
  revalidatePath("/docs");
}
