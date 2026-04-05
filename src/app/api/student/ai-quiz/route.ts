// src/app/api/student/ai-quiz/route.ts
// POST — Tạo quiz session từ AiQuestion (user's vocabulary words)
// GET — Lấy danh sách mode quiz cho student
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { addXP, updateStreak } from "@/lib/xp";

function shuffle<T>(arr: T[]): T[] {
  return arr.sort(() => Math.random() - 0.5);
}

// ─── Auth ────────────────────────────────────────────────────────────────────
async function requireStudent() {
  const session = await auth();
  if (!session?.user?.keycloakId) return null;
  return session.user.keycloakId;
}

// ─── GET — Available quiz modes ───────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const keycloakId = await requireStudent();
  if (!keycloakId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { keycloakId },
    select: { id: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Count approved AI questions per user's vocabulary
  const userVocab = await prisma.userVocabulary.findMany({
    where: { userId: user.id },
    select: { vocabularyId: true, vocabulary: { select: { hskLevel: true } } },
  });

  const vocabIds = userVocab.map(uv => uv.vocabularyId);
  if (vocabIds.length === 0) {
    return NextResponse.json({ modes: [], totalApproved: 0 });
  }

  const approvedCount = await prisma.aiQuestion.count({
    where: { vocabularyId: { in: vocabIds }, status: "approved" },
  });

  // Group by HSK level
  const byLevel = await prisma.aiQuestion.groupBy({
    by: ["hskLevel"],
    where: { vocabularyId: { in: vocabIds }, status: "approved" },
    _count: { id: true },
  });

  return NextResponse.json({
    totalApproved: approvedCount,
    totalVocab: vocabIds.length,
    byLevel: byLevel.map(l => ({ hskLevel: l.hskLevel, count: l._count.id })),
  });
}

// ─── POST — Start quiz session ────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const keycloakId = await requireStudent();
  if (!keycloakId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { keycloakId },
    select: { id: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const body = await req.json();
  const { hskLevel, durationMinutes = 10, limit = 10 } = body;

  // 1. Get user's vocabulary IDs
  const userVocab = await prisma.userVocabulary.findMany({
    where: { userId: user.id },
    select: { vocabularyId: true },
  });
  const vocabIds = userVocab.map(uv => uv.vocabularyId);

  if (vocabIds.length === 0) {
    return NextResponse.json({ error: "Bạn chưa có từ vựng nào trong danh sách. Hãy học bài trước!" }, { status: 400 });
  }

  // 2. Build where clause for AI questions
  const whereClause: any = {
    vocabularyId: { in: vocabIds },
    status: "approved",
  };
  if (hskLevel) {
    whereClause.hskLevel = parseInt(hskLevel);
  }

  // 3. Fetch approved AI questions
  const aiQuestions = await prisma.aiQuestion.findMany({
    where: whereClause,
    include: {
      vocabulary: {
        select: { hanzi: true, pinyin: true, meaningVi: true, audioUrl: true },
      },
    },
    take: parseInt(limit),
    orderBy: { createdAt: "desc" },
  });

  if (aiQuestions.length === 0) {
    // Fallback: check if any AI questions exist at all
    const anyCount = await prisma.aiQuestion.count({
      where: { vocabularyId: { in: vocabIds }, status: "approved" },
    });
    if (anyCount === 0) {
      return NextResponse.json({
        error: "Chưa có câu hỏi AI nào được duyệt cho từ vựng của bạn. Giáo viên cần tạo và duyệt câu hỏi trước.",
      }, { status: 400 });
    }
  }

  // 4. Shuffle and format questions for the session
  const shuffled = shuffle(aiQuestions);
  const formatted = shuffled.map((q, idx) => {
    const options: any[] = Array.isArray(q.options) ? [...(q.options as any[])] : [];
    const shuffledOpts = shuffle(options);

    return {
      id: q.id,
      vocabId: q.vocabularyId,
      index: idx,
      hanzi: q.vocabulary.hanzi,
      pinyin: q.vocabulary.pinyin,
      meaningVi: q.vocabulary.meaningVi,
      questionText: q.questionText,
      correctAnswer: q.correctAnswer,
      options: shuffledOpts,
      explanation: q.explanation ?? null,
      audioUrl: q.vocabulary.audioUrl ?? null,
      imageUrl: q.imageUrl ?? null,
      type: q.type,
    };
  });

  // 5. Create a practice session record (reuse existing model)
  const session = await prisma.practiceSession.create({
    data: {
      userId: keycloakId,
      level: parseInt(hskLevel ?? "0"), // 0 = mixed/all
      durationSelected: parseInt(durationMinutes),
      expiresAt: new Date(Date.now() + parseInt(durationMinutes) * 60 * 1000),
      questions: formatted,
      status: "doing",
      totalQuestions: formatted.length,
    },
  });

  return NextResponse.json({
    sessionId: session.id,
    mode: "ai-quiz",
    totalQuestions: formatted.length,
    questions: formatted.map(q => ({
      id: q.id,
      vocabId: q.vocabId,
      index: q.index,
      questionText: q.questionText,
      options: q.options,
      audioUrl: q.audioUrl,
      imageUrl: q.imageUrl,
      type: q.type,
      // NOTE: correctAnswer NOT sent to client for security
    })),
  });
}
