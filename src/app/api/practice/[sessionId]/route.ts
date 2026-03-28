// app/api/practice/[sessionId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const session = await prisma.practiceSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    return NextResponse.json({ error: 'Session không tồn tại' }, { status: 404 });
  }

  // Active session → return questions + remaining time
  if (session.status === 'doing') {
    const remainingSeconds = Math.max(0, Math.floor((new Date(session.expiresAt).getTime() - Date.now()) / 1000));
    return NextResponse.json({
      questions: session.questions,
      remainingSeconds,
    });
  }

  // Submitted / expired → return results for review screen
  return NextResponse.json({
    score: session.score ?? 0,
    correctCount: session.correctCount ?? 0,
    totalQuestions: session.totalQuestions ?? 0,
    xpEarned: session.xpEarned ?? 0,
    results: session.results ?? [],
    status: session.status,
  });
}