// src/app/api/admin/courses/[courseId]/route.ts
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

// GET — chi tiết khoá + chapters + lessons đầy đủ (cho admin edit)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const user = await requireTeacher();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { courseId } = await params;

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      chapters: {
        orderBy: { sortOrder: "asc" },
        include: {
          lessons: {
            orderBy: { sortOrder: "asc" },
            select: {
              id: true, title: true, titleChinese: true,
              pinyin: true, durationMins: true,
              sortOrder: true, isPublished: true,
            },
          },
        },
      },
    },
  });

  if (!course) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ course });
}

// PUT — cập nhật thông tin khoá học
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const user = await requireTeacher();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { courseId } = await params;
  const body = await req.json();
  const { title, description, hskLevel, isPublished, thumbnail } = body;

  const course = await prisma.course.update({
    where: { id: courseId },
    data: {
      ...(title       !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(hskLevel    !== undefined && { hskLevel }),
      ...(isPublished !== undefined && { isPublished }),
      ...(thumbnail   !== undefined && { thumbnail }),
    },
  });

  return NextResponse.json({ course });
}

// DELETE — xoá khoá học
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const user = await requireTeacher();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { courseId } = await params;
  await prisma.course.delete({ where: { id: courseId } });

  return NextResponse.json({ ok: true });
}
