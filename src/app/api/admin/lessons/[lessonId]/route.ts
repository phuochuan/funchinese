// src/app/api/admin/lessons/[lessonId]/route.ts
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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  const user = await requireTeacher();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { lessonId } = await params;

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      vocabularies: {
        orderBy: { sortOrder: "asc" },
        include: {
          vocabulary: true,
        },
      },
      chapter: {
        select: {
          id: true, title: true,
          course: { select: { id: true, title: true } },
        },
      },
    },
  });

  if (!lesson) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ lesson });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  const user = await requireTeacher();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { lessonId } = await params;
  const body = await req.json();

  const {
    title, titleChinese, pinyin,
    durationMins, isPublished, content,
    thumbnail,        // ← thêm vào đây
    vocabularyIds,
  } = body;

  const lesson = await prisma.lesson.update({
    where: { id: lessonId },
    data: {
      ...(title        !== undefined && { title }),
      ...(titleChinese !== undefined && { titleChinese }),
      ...(pinyin       !== undefined && { pinyin }),
      ...(durationMins !== undefined && { durationMins }),
      ...(isPublished  !== undefined && { isPublished }),
      ...(content      !== undefined && { content }),
      ...(thumbnail    !== undefined && { thumbnail }),  // ← thêm dòng này
    },
  });

  // Cập nhật danh sách từ vựng nếu có
  if (vocabularyIds !== undefined) {
    // Xoá hết rồi thêm lại
    await prisma.lessonVocabulary.deleteMany({ where: { lessonId } });
    if (vocabularyIds.length > 0) {
      await prisma.lessonVocabulary.createMany({
        data: vocabularyIds.map((v: { vocabId: string; sortOrder: number }) => ({
          lessonId,
          vocabularyId: v.vocabId,
          sortOrder:    v.sortOrder,
        })),
      });
    }
  }

  return NextResponse.json({ lesson });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  const user = await requireTeacher();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { lessonId } = await params;
  await prisma.lesson.delete({ where: { id: lessonId } });

  return NextResponse.json({ ok: true });
}
