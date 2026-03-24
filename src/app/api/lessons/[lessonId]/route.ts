// src/app/api/lessons/[lessonId]/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  const session = await auth();
  if (!session?.user?.keycloakId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { lessonId } = await params;

  const dbUser = await prisma.user.findUnique({
    where: { keycloakId: session.user.keycloakId },
    select: { id: true },
  });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const userId = dbUser.id;

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId, isPublished: true },
    include: {
      vocabularies: {
        orderBy: { sortOrder: "asc" },
        include: { vocabulary: true },
      },
      chapter: {
        select: {
          id: true, title: true, sortOrder: true,
          course: { select: { id: true, title: true, hskLevel: true } },
          lessons: {
            where: { isPublished: true },
            orderBy: { sortOrder: "asc" },
            select: { id: true, title: true, sortOrder: true },
          },
        },
      },
    },
  });

  if (!lesson) return NextResponse.json({ error: "Lesson not found" }, { status: 404 });

  // Lấy progress của user cho bài này
  const progress = await prisma.lessonProgress.findUnique({
    where: { userId_lessonId: { userId, lessonId } },
  });

  // Lấy userVocabulary để biết từ nào đã học
  const vocabIds = lesson.vocabularies.map(lv => lv.vocabulary.id);
  const userVocabs = await prisma.userVocabulary.findMany({
    where: { userId, vocabularyId: { in: vocabIds } },
    select: { vocabularyId: true, timesCorrect: true },
  });
  const learnedVocabIds = new Set(
    userVocabs.filter(uv => uv.timesCorrect > 0).map(uv => uv.vocabularyId)
  );

  // Tìm bài trước / bài sau trong cùng chapter
  const siblings   = lesson.chapter.lessons;
  const currentIdx = siblings.findIndex(l => l.id === lessonId);
  const prevLesson = currentIdx > 0 ? siblings[currentIdx - 1] : null;
  const nextLesson = currentIdx < siblings.length - 1 ? siblings[currentIdx + 1] : null;

  // Cập nhật lastViewedAt
  await prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    create: { userId, lessonId, completed: false, lastViewedAt: new Date() },
    update: { lastViewedAt: new Date() },
  });

  return NextResponse.json({
    lesson: {
      id:           lesson.id,
      title:        lesson.title,
      titleChinese: lesson.titleChinese,
      pinyin:       lesson.pinyin,
      durationMins: lesson.durationMins,
      thumbnail:    lesson.thumbnail,    // ← thêm
      content:      lesson.content,
      vocabularies: lesson.vocabularies.map(lv => ({
        ...lv.vocabulary,
        alreadyLearned: learnedVocabIds.has(lv.vocabulary.id),
      })),
    },
    chapter: {
      id:    lesson.chapter.id,
      title: lesson.chapter.title,
    },
    course: lesson.chapter.course,
    progress: {
      completed:    progress?.completed ?? false,
      completedAt:  progress?.completedAt ?? null,
      lastViewedAt: progress?.lastViewedAt ?? null,
    },
    navigation: {
      prev: prevLesson,
      next: nextLesson,
    },
  });
}
