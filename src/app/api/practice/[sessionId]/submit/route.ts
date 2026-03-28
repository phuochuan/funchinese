// app/api/practice/[sessionId]/submit/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { addXP, updateStreak } from '@/lib/xp';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

  // ── Auth ──────────────────────────────────────────────────────────────────────
  const authSession = await auth();
  if (!authSession?.user?.keycloakId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { keycloakId: authSession.user.keycloakId },
    select: { id: true, streakDays: true, xp: true },
  });
  if (!dbUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const userId = dbUser.id;

  // ── Load session ──────────────────────────────────────────────────────────────
  const session = await prisma.practiceSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    return NextResponse.json({ error: 'Session không tồn tại' }, { status: 404 });
  }

  if (session.status !== 'doing' && new Date() > session.expiresAt) {
    return NextResponse.json({ error: 'Session không hợp lệ' }, { status: 400 });
  }

  // ── Parse answers ─────────────────────────────────────────────────────────────
  const { answers } = await req.json(); // { [questionId: string]: selectedOption }
  const questions: any[] = session.questions as any[];

  let correctCount = 0;
  const results: any[] = [];
  const qrResults: { vocabId: string; correct: boolean; timeMs: number }[] = [];

  // Try to parse timeMs from answers object if provided
  const answerMeta = answers._meta || {};

  questions.forEach((q: any) => {
    const userAnswer = answers[q.id];
    // Support both 'answer' and 'correctAnswer' field names
    const correctAnswer = q.answer || q.correctAnswer;
    // 🔥 FILL_BLANK: luôn đúng vì user tự nhập đáp án để ôn
    const isCorrect = q.type === 'FILL_BLANK' || userAnswer === correctAnswer;
    if (isCorrect) correctCount++;

    results.push({
      questionId: q.id,
      hanzi: q.hanzi,
      userAnswer,
      correctAnswer,
      isCorrect,
    });

    // Build QR results for QuizSession (vocabId = question id, no timeMs source here)
    qrResults.push({
      vocabId: q.id,
      correct: isCorrect,
      timeMs: answerMeta[q.id]?.timeMs ?? 0,
    });
  });

  const totalQ = questions.length;
  const score = totalQ > 0 ? Math.round((correctCount / totalQ) * 100) : 0;
  const xpEarned = correctCount * 5;

  // ── Update PracticeSession (legacy) ──────────────────────────────────────────
  const expired = new Date() > session.expiresAt;
  await prisma.practiceSession.update({
    where: { id: sessionId },
    data: {
      status: expired ? 'expired' : 'submitted',
      score,
      correctCount,
      totalQuestions: totalQ,
      results,
      xpEarned,
    },
  });

  // ── Save to QuizSession (canonical) ──────────────────────────────────────────
  await prisma.quizSession.create({
    data: {
      userId,
      mode: 'quiz',
      source: `practice:level${session.level}`,
      totalQ,
      correctQ: correctCount,
      xpEarned,
      durationSec: session.durationSelected * 60,
      results: qrResults,
    },
  });

  // ── XP + Streak ───────────────────────────────────────────────────────────────
  const newXP = await addXP(prisma, userId, xpEarned);
  const newStreak = await updateStreak(prisma, userId);

  // ── Daily activity ────────────────────────────────────────────────────────────
  const today = new Date(); today.setHours(0, 0, 0, 0);
  await prisma.dailyActivity.upsert({
    where: { userId_date: { userId, date: today } },
    create: { userId, date: today, xpEarned, wordsLearned: correctCount },
    update: {
      xpEarned: { increment: xpEarned },
      wordsLearned: { increment: correctCount },
    },
  });

  // ── Weak words for review screen ──────────────────────────────────────────────
  const wrongResults = results.filter(r => !r.isCorrect);
  const weakWords = wrongResults.map(r => ({
    id: r.questionId,
    hanzi: r.hanzi,
    correctAnswer: r.correctAnswer,
    userAnswer: r.userAnswer,
  }));

  return NextResponse.json({
    score,
    correctCount,
    total: totalQ,
    xpEarned,
    newXP,
    newStreak,
    accuracy: score,
    results,
    weakWords,
  });
}
