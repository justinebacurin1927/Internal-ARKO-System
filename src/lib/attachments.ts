"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, canEdit } from "@/lib/rbac";
import { presignUpload, buildKey, deleteObject } from "@/lib/s3";
import { entityWhere, type EntityType } from "@/lib/polymorphic";

const PATH: Record<EntityType, string> = {
  task: "/tasks",
  document: "/docs",
  storyboard: "/storyboards",
};

const uploadSchema = z.object({
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
});

/** Step 1: presign a direct-to-S3 PUT and return the URL + object key. */
export async function requestUpload(input: {
  fileName: string;
  mimeType: string;
}) {
  await requireUser();
  const { fileName, mimeType } = uploadSchema.parse(input);
  const key = buildKey(fileName);
  const url = await presignUpload(key, mimeType);
  return { url, key };
}

const confirmSchema = z.object({
  entityType: z.enum(["task", "document", "storyboard"]),
  entityId: z.string().min(1),
  key: z.string().min(1),
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  size: z.number().int().nonnegative(),
});

/** Step 2: record the uploaded object's metadata. */
export async function confirmUpload(input: z.infer<typeof confirmSchema>) {
  const user = await requireUser();
  const { entityType, entityId, key, fileName, mimeType, size } =
    confirmSchema.parse(input);

  await prisma.attachment.create({
    data: {
      fileName,
      s3Key: key,
      mimeType,
      size,
      uploaderId: user.id,
      ...entityWhere(entityType, entityId),
    },
  });
  revalidatePath(`${PATH[entityType]}/${entityId}`);
}

export async function deleteAttachment(id: string, entityPath: string) {
  const user = await requireUser();
  const att = await prisma.attachment.findUnique({ where: { id } });
  if (!att) return;
  if (!canEdit(user, att.uploaderId)) throw new Error("FORBIDDEN");

  await deleteObject(att.s3Key);
  await prisma.attachment.delete({ where: { id } });
  revalidatePath(entityPath);
}
