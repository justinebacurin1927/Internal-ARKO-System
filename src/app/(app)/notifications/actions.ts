"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";

export async function markAllRead() {
  const user = await requireUser();
  await prisma.notification.updateMany({
    where: { userId: user.id, read: false },
    data: { read: true },
  });
  revalidatePath("/notifications");
  revalidatePath("/", "layout");
}

export async function markRead(id: string) {
  const user = await requireUser();
  await prisma.notification.updateMany({
    where: { id, userId: user.id },
    data: { read: true },
  });
  revalidatePath("/notifications");
  revalidatePath("/", "layout");
}
