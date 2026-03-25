// app/api/practice/[sessionId]/submit/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest, { params }: { params: { sessionId: string } }) {
  const { answers } = await req.json(); // { questionId: selectedOption }

  const session = await prisma.practiceSession.findUnique({
    where: { id: params.sessionId },
  });

  if (!session || (session.status !== 'doing' && new Date() > session.expiresAt)) {
    return NextResponse.json({ error: 'Session không hợp lệ' }, { status: 400 });
  }

  const questions: any[] = session.questions as any[];
  let correctCount = 0;
  const results: any[] = [];

  questions.forEach((q: any) => {
    const userAnswer = answers[q.id];
    const isCorrect = userAnswer === q.correctAnswer || userAnswer === q.answer;
    if (isCorrect) correctCount++;

    results.push({
      questionId: q.id,
      hanzi: q.hanzi,
      userAnswer,
      correctAnswer: q.answer || q.correctAnswer,
      isCorrect,
    });
  });

  const score = Math.round((correctCount / questions.length) * 100);
  const xpEarned = correctCount * 100 + Math.floor(score / 10) * 20; // ví dụ

  await prisma.practiceSession.update({
    where: { id: params.sessionId },
    data: {
      status: new Date() > session.expiresAt ? 'expired' : 'submitted',
      score,
      correctCount,
      totalQuestions: questions.length,
      results,
      xpEarned,
    },
  });

  // Cập nhật streak, XP cho user (bạn tự implement)

  return NextResponse.json({
    score,
    correctCount,
    total: questions.length,
    xpEarned,
    results,
  });
}