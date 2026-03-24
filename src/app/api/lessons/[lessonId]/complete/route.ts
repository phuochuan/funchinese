// src/app/api/lessons/[lessonId]/complete/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { addXP, updateStreak, XP_REWARDS } from "@/lib/xp";

export async function POST(
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

  // Kiểm tra bài có tồn tại không
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: {
      id: true,
      title: true,
      _count: { select: { vocabularies: true } },
    },
  });
  if (!lesson) return NextResponse.json({ error: "Lesson not found" }, { status: 404 });

  // Tạo/cập nhật LessonProgress
  const existing = await prisma.lessonProgress.findUnique({
    where: { userId_lessonId: { userId, lessonId } },
  });

  if (existing?.completed) {
    return NextResponse.json({ message: "Already completed", xpEarned: 0 });
  }

  await prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    create: { userId, lessonId, completed: true, completedAt: new Date() },
    update: { completed: true, completedAt: new Date() },
  });

  // Tạo UserVocabulary records cho từng từ trong bài (nếu chưa có)
  const lessonVocab = await prisma.lessonVocabulary.findMany({
    where: { lessonId },
    select: { vocabularyId: true },
  });

  for (const lv of lessonVocab) {
    await prisma.userVocabulary.upsert({
      where: { userId_vocabularyId: { userId, vocabularyId: lv.vocabularyId } },
      create: { userId, vocabularyId: lv.vocabularyId },
      update: {}, // Không ghi đè nếu đã có data spaced repetition
    });
  }

  // Cộng XP + cập nhật streak
  const newXP    = await addXP(prisma, userId, XP_REWARDS.LESSON_COMPLETE);
  const newStreak = await updateStreak(prisma, userId);

  return NextResponse.json({
    message:     "Lesson completed",
    xpEarned:    XP_REWARDS.LESSON_COMPLETE,
    totalXP:     newXP,
    streakDays:  newStreak,
    wordsLearned: lesson._count.vocabularies,
  });
}
