// src/app/api/admin/chapters/[chapterId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireTeacher() {
  const session = await auth();
  if (!session?.user?.keycloakId) return null;
  if (session.user.role !== "teacher") return null;
  return await prisma.user.findUnique({
    where: { keycloakId: session.user.keycloakId },
    select: { id: true },
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ chapterId: string }> }
) {
  const user = await requireTeacher();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { chapterId } = await params;
  const { title, sortOrder } = await req.json();

  const chapter = await prisma.chapter.update({
    where: { id: chapterId },
    data: {
      ...(title     !== undefined && { title }),
      ...(sortOrder !== undefined && { sortOrder }),
    },
  });

  return NextResponse.json({ chapter });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ chapterId: string }> }
) {
  const user = await requireTeacher();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { chapterId } = await params;
  await prisma.chapter.delete({ where: { id: chapterId } });

  return NextResponse.json({ ok: true });
}
