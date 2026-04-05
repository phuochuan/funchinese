// src/app/api/student/ai-quiz/[sessionId]/route.ts
// GET — Lấy session (trạng thái, điểm)
// PUT / POST — Submit kết quả quiz AI
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { addXP, updateStreak } from "@/lib/xp";

async function requireStudent() {
  const session = await auth();
  if (!session?.user?.keycloakId) return null;
  return session.user.keycloakId;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const keycloakId = await requireStudent();
  if (!keycloakId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sessionId } = await params;
  const session = await prisma.practiceSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  // Security: chỉ chủ nhân session mới được xem
  if (session.userId !== keycloakId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const questions = session.questions as any[];
  const remainingSec = Math.max(
    0,
    Math.floor((session.expiresAt.getTime() - Date.now()) / 1000)
  );

  if (session.status === "doing") {
    return NextResponse.json({
      sessionId: session.id,
      status: "doing",
      totalQuestions: questions.length,
      remainingSeconds: remainingSec,
      answeredCount: 0,
    });
  }

  // Submitted/expired — trả về kết quả
  const results = (session.results as any[]) ?? [];
  const correctCount = results.filter((r: any) => r.correct).length;

  return NextResponse.json({
    sessionId: session.id,
    status: session.status,
    totalQuestions: session.totalQuestions ?? questions.length,
    correctCount,
    score: session.score ?? 0,
    xpEarned: session.xpEarned ?? 0,
    remainingSeconds: 0,
    results: results.map((r: any) => ({
      questionId: r.questionId,
      vocabId: r.vocabId,
      correct: r.correct,
      userAnswer: r.userAnswer,
      correctAnswer: r.correctAnswer,
    })),
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const keycloakId = await requireStudent();
  if (!keycloakId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sessionId } = await params;
  const { answers } = await req.json(); // { [questionId]: userAnswer }

  const session = await prisma.practiceSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  if (session.userId !== keycloakId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.status !== "doing") {
    return NextResponse.json({ error: "Session already submitted" }, { status: 400 });
  }

  // Get user DB id
  const dbUser = await prisma.user.findUnique({
    where: { keycloakId },
    select: { id: true },
  });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const questions = session.questions as any[];

  // Grade each answer
  const results = questions.map(q => {
    const userAnswer = answers[q.id] ?? null;
    const correct = userAnswer !== null && userAnswer === q.correctAnswer;

    return {
      questionId: q.id,
      vocabId: q.vocabId,
      userAnswer,
      correctAnswer: q.correctAnswer,
      correct,
      explanation: q.explanation ?? null,
      hanzi: q.hanzi,
      pinyin: q.pinyin,
      meaningVi: q.meaningVi,
    };
  });

  const correctCount = results.filter(r => r.correct).length;
  const score = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;
  const xpEarned = correctCount * 5;

  // Update session
  await prisma.practiceSession.update({
    where: { id: sessionId },
    data: {
      status: "submitted",
      score,
      correctCount,
      results,
      xpEarned,
    },
  });

  // Create canonical QuizSession log
  await prisma.quizSession.create({
    data: {
      userId: dbUser.id,
      mode: "ai-quiz",
      source: session.level ? `ai-quiz:hsk${session.level}` : "ai-quiz:mixed",
      totalQ: questions.length,
      correctQ: correctCount,
      xpEarned,
      durationSec: Math.floor(
        (Date.now() - session.createdAt.getTime()) / 1000
      ),
      results: results.map(r => ({
        vocabId: r.vocabId,
        correct: r.correct,
        questionId: r.questionId,
      })),
    },
  });

  // Award XP + streak
  await addXP(prisma, dbUser.id, xpEarned);
  await updateStreak(prisma, dbUser.id);

  // Update UserVocabulary (SM-2)
  for (const r of results) {
    const correct = r.correct;
    await prisma.userVocabulary.upsert({
      where: {
        userId_vocabularyId: { userId: dbUser.id, vocabularyId: r.vocabId },
      },
      update: {
        lastSeenAt: new Date(),
        timesCorrect: correct ? { increment: 1 } : undefined,
        timesWrong:   correct ? undefined : { increment: 1 },
        easeFactor: correct
          ? { increment: 0.1 }
          : { increment: -0.2 },
      },
      create: {
        userId:       dbUser.id,
        vocabularyId: r.vocabId,
        timesCorrect: correct ? 1 : 0,
        timesWrong:   correct ? 0 : 1,
        easeFactor:   correct ? 2.6 : 2.3,
        interval:     correct ? 3 : 1,
        nextReviewAt: new Date(Date.now() + (correct ? 3 : 1) * 86400000),
      },
    });
  }

  return NextResponse.json({
    score,
    correctCount,
    totalQuestions: questions.length,
    xpEarned,
    newXP: xpEarned,
    results,
  });
}
