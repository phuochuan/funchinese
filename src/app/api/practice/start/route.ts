// app/api/practice/start/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from "@/auth";


function shuffle<T>(arr: T[]) {
  return arr.sort(() => Math.random() - 0.5);
}

function cleanOption(opt: string) {
  // Strip "A. ", "B. ", etc. prefix so the UI can render its own letter label
  return opt.replace(/^[A-D]\.\s*/, '');
}

export async function POST(req: NextRequest) {
  const { durationMinutes, level = 3 } = await req.json();

  if (!durationMinutes || durationMinutes < 5) {
    return NextResponse.json(
      { error: 'Thời gian tối thiểu là 5 phút' },
      { status: 400 }
    );
  }

  const levelMap = ['HSK1', 'HSK2', 'HSK3', 'HSK4', 'HSK5', 'HSK6'] as const;

  const levelEnum = levelMap[level - 1];

  // 🔥 RANDOM chuẩn trong DB (PostgreSQL)
  const questions = await prisma.$queryRaw<any[]>`
    SELECT *
    FROM "hsk_questions"
    WHERE "hskLevel" = ${level}
    ORDER BY RANDOM()
    LIMIT 12
  `;
  // if (!questions || questions.length < 8) {
  //   return NextResponse.json(
  //     { error: 'Không đủ câu hỏi cho level này' },
  //     { status: 400 }
  //   );
  // }

  // 🔥 normalize + shuffle options
  const normalized = questions.map((q: any) => {
    let options: string[] = [];

    if (q.options && Array.isArray(q.options)) {
      // Clean each option and shuffle
      const raw = q.options.map(String).map(cleanOption);
      options = shuffle(raw);
    } else {
      // fallback tạo options fake (no letter prefix — UI adds them)
      options = shuffle([
        q.meaningVi,
        'Sai 1',
        'Sai 2',
        'Sai 3',
      ]);
    }

    // Normalize answer: resolve letter "A"/"B"/"C"/"D" → actual meaning text
    // This ensures grading (submit API) always compares meaning-to-meaning
    let correctAnswer = q.answer;
    if (
      typeof correctAnswer === 'string' &&
      /^[A-D]$/.test(correctAnswer) &&
      q.options &&
      Array.isArray(q.options)
    ) {
      const idx = correctAnswer.charCodeAt(0) - 65; // A→0, B→1, C→2, D→3
      const rawOptions: string[] = q.options.map(String).map(cleanOption);
      correctAnswer = rawOptions[idx] ?? correctAnswer;
    }

    return {
      id: q.id,
      hanzi: q.hanzi,
      pinyin: q.pinyin,
      meaningVi: q.meaningVi,
      options,
      answer: correctAnswer,
      audioUrl: q.audioUrl ?? null,
      questionImageUrl: q.questionImageUrl ?? null,
      type: q.type ?? 'MULTIPLE_CHOICE',
    };
  });

    const authSession = await auth(); // 🔥 lấy session login

  if (!authSession?.user?.keycloakId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = authSession.user.keycloakId;

  const sessionDb = await prisma.practiceSession.create({
    data: {
      userId, // ✅ đúng
      level,
      durationSelected: durationMinutes,
      expiresAt: new Date(Date.now() + durationMinutes * 60 * 1000),
      questions: normalized, // ✅ snapshot chuẩn
      status: 'doing',
    },
  });

  // 🔥 trả về FE (format giống /next)
  return NextResponse.json({
    sessionId: sessionDb.id,
    questions: normalized.map((q: any) => ({
      id: q.id,
      hanzi: q.hanzi,
      questionText: `Nghĩa của chữ "${q.hanzi}" là gì?`,
      options: shuffle([...q.options]), // mỗi lần render khác nhau
      correctAnswer: q.answer,
      audioUrl: q.audioUrl ?? null,
      questionImageUrl: q.questionImageUrl ?? null,
      type: q.type ?? 'MULTIPLE_CHOICE',
    })),
  });
}