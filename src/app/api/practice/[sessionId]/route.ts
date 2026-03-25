// app/api/practice/[sessionId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  context: { params: { sessionId: string } }
) {
  const { sessionId } = context.params;

  const session = await prisma.practiceSession.findUnique({
    where: { id: sessionId },
  });

  if (!session || session.status !== 'doing') {
    return NextResponse.json({ error: 'Session không tồn tại hoặc đã kết thúc' }, { status: 404 });
  }

  const remainingSeconds = Math.max(0, Math.floor((new Date(session.expiresAt).getTime() - Date.now()) / 1000));

  return NextResponse.json({
    questions: session.questions,
    remainingSeconds,
  });
}