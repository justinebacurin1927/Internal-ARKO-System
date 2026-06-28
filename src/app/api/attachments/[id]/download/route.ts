import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { presignDownload } from "@/lib/s3";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const att = await prisma.attachment.findUnique({ where: { id } });
  if (!att) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const url = await presignDownload(att.s3Key);
  return NextResponse.redirect(url);
}
