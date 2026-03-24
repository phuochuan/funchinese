// src/app/api/admin/courses/[courseId]/chapters/route.ts
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

// POST — thêm chương mới vào khoá
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const user = await requireTeacher();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { courseId } = await params;
  const { title } = await req.json();

  const maxOrder = await prisma.chapter.aggregate({
    where: { courseId },
    _max: { sortOrder: true },
  });

  const chapter = await prisma.chapter.create({
    data: { courseId, title, sortOrder: (maxOrder._max.sortOrder ?? 0) + 1 },
  });

  return NextResponse.json({ chapter }, { status: 201 });
}
