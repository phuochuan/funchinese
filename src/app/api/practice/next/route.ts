// app/api/practice/next/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const { sessionId } = await req.json();

  const session = await prisma.practiceSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    return NextResponse.json({ error: 'Session không tồn tại' }, { status: 404 });
  }

  // ⛔ hết thời gian thì không cho fetch nữa
  if (new Date() > new Date(session.expiresAt)) {
    return NextResponse.json({ done: true });
  }

  const oldQuestions: any[] = session.questions as any[];

  const oldIds = oldQuestions.map(q => q.id);

  // 🔥 lấy thêm câu mới, tránh trùng
  const newQuestions = await prisma.hskQuestion.findMany({
    where: {
      hskLevel: session.level,
      id: { notIn: oldIds },
    },
    take: 12,
  });

  if (newQuestions.length === 0) {
    return NextResponse.json({ done: true }); // hết câu trong DB luôn
  }

  // 👉 update lại session (append thêm câu)
  await prisma.practiceSession.update({
    where: { id: sessionId },
    data: {
      questions: [...oldQuestions, ...newQuestions],
    },
  });

  return NextResponse.json({
    questions: newQuestions.map(q => ({
      id: q.id,
      hanzi: q.hanzi,
      questionText: `Nghĩa của chữ "${q.hanzi}" là gì?`,
      options:
        (q.options as string[]) || [
          'A. ' + q.meaningVi,
          'B. Sai',
          'C. Sai',
          'D. Sai',
        ],
      correctAnswer: q.answer,
    })),
  });
}