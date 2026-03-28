// src/app/api/practice/session/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { addXP, updateStreak } from "@/lib/xp";

// ─── GET — lấy từ vựng cho phiên luyện HOẶC kết quả phiên đã luyện ─────────
export async function GET(req: NextRequest) {
  const authSession = await auth();
  if (!authSession?.user?.keycloakId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { keycloakId: authSession.user.keycloakId },
    select: { id: true },
  });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const userId   = dbUser.id;
  const sp       = req.nextUrl.searchParams;
  const sessionId = sp.get("sessionId");
  const lessonId = sp.get("lessonId");
  const hskLevel = sp.get("hsk");
  const source   = sp.get("source"); // "weak" = ôn từ yếu

  let words: any[]        = [];
  let sessionTitle        = "";
  let sessionSubtitle     = "";

  // ── Nguồn 1: theo bài học ──────────────────────────────────────────────────
  if (lessonId) {
    const lessonVocabs = await prisma.lessonVocabulary.findMany({
      where: { lessonId },
      orderBy: { sortOrder: "asc" },
      include: { vocabulary: true },
    });
    if (lessonVocabs.length === 0) {
      return NextResponse.json({ error: "Bài học chưa có từ vựng" }, { status: 404 });
    }
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: {
        title: true,
        chapter: { select: { course: { select: { hskLevel: true, title: true } } } },
      },
    });
    sessionTitle    = lesson?.title ?? "Bài học";
    sessionSubtitle = lesson?.chapter.course.hskLevel ?? "";
    words           = lessonVocabs.map(lv => lv.vocabulary);
  }

  // ── Nguồn 2: theo HSK level ────────────────────────────────────────────────
  else if (hskLevel) {
    const vocabs = await prisma.vocabulary.findMany({
      where: { hskLevel },
      orderBy: { hanzi: "asc" },
    });
    sessionTitle    = `Luyện ${hskLevel}`;
    sessionSubtitle = `${vocabs.length} từ vựng`;
    words           = vocabs;
  }

  // ── Nguồn 3: từ yếu (timesWrong cao, nextReviewAt <= now) ─────────────────
  else if (source === "weak") {
    const uvs = await prisma.userVocabulary.findMany({
      where: {
        userId,
        OR: [
          { nextReviewAt: { lte: new Date() } },
          { timesWrong: { gt: 0 } },
        ],
      },
      orderBy: [{ timesWrong: "desc" }, { nextReviewAt: "asc" }],
      take: 20,
      include: { vocabulary: true },
    });
    if (uvs.length === 0) {
      return NextResponse.json({ error: "Chưa có từ yếu để ôn" }, { status: 404 });
    }
    sessionTitle    = "Ôn từ yếu";
    sessionSubtitle = `${uvs.length} từ cần ôn`;
    words           = uvs.map(uv => uv.vocabulary);
  }

  // ── Nguồn 0: lấy kết quả phiên đã luyện (cho trang review) ─────────────────
  else if (sessionId) {
    const quizSession = await prisma.quizSession.findUnique({
      where: { id: sessionId },
    });

    if (!quizSession || quizSession.userId !== userId) {
      return NextResponse.json({ error: "Phiên không tồn tại" }, { status: 404 });
    }

    const wrongIds = (quizSession.results as any[])
      .filter((r: any) => !r.correct)
      .map((r: any) => r.vocabId);

    const weakWords = wrongIds.length > 0
      ? await prisma.vocabulary.findMany({
          where: { id: { in: wrongIds } },
          select: { id: true, hanzi: true, pinyin: true, meaningVi: true, audioUrl: true },
        })
      : [];

    return NextResponse.json({
      xpEarned:    quizSession.xpEarned,
      correctQ:    quizSession.correctQ,
      totalQ:      quizSession.totalQ,
      accuracy:    Math.round((quizSession.correctQ / quizSession.totalQ) * 100),
      weakWords,
      durationSec: quizSession.durationSec,
    });
  }

  else {
    return NextResponse.json({ error: "Cần lessonId, hsk, source=weak hoặc sessionId" }, { status: 400 });
  }

  // Lấy tiến độ từng từ của user
  const vocabIds   = words.map((v: any) => v.id);
  const userVocabs = await prisma.userVocabulary.findMany({
    where: { userId, vocabularyId: { in: vocabIds } },
  });
  const uvMap = new Map(userVocabs.map(uv => [uv.vocabularyId, uv]));

  // User streak
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { streakDays: true, xp: true },
  });

  // Build word list — từ yếu ưu tiên đầu, shuffle phần còn lại
  const enriched = words.map((v: any) => {
    const uv = uvMap.get(v.id);
    return {
      id:              v.id,
      hanzi:           v.hanzi,
      pinyin:          v.pinyin,
      hanViet:         v.hanViet,
      meaningVi:       v.meaningVi,
      exampleSentence: v.exampleSentence,
      exampleVi:       v.exampleVi,
      audioUrl:        v.audioUrl,
      wordType:        v.wordType,
      timesCorrect:    uv?.timesCorrect ?? 0,
      timesWrong:      uv?.timesWrong  ?? 0,
      needsReview:     uv ? uv.nextReviewAt <= new Date() : true,
    };
  });

  // Ưu tiên từ yếu lên trước, shuffle mỗi nhóm
  const weak   = enriched.filter(w => w.needsReview || w.timesWrong > w.timesCorrect);
  const strong = enriched.filter(w => !w.needsReview && w.timesWrong <= w.timesCorrect);
  const sorted = [
    ...weak.sort(() => Math.random() - 0.5),
    ...strong.sort(() => Math.random() - 0.5),
  ].slice(0, 20); // tối đa 20 từ / phiên

  return NextResponse.json({
    sessionTitle,
    sessionSubtitle,
    words:       sorted,
    totalWords:  sorted.length,
    userStreak:  user?.streakDays ?? 0,
    userXP:      user?.xp ?? 0,
  });
}

// ─── POST — lưu kết quả phiên ─────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.keycloakId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { keycloakId: session.user.keycloakId },
    select: { id: true },
  });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const userId = dbUser.id;
  const body   = await req.json();
  const { lessonId, mode, results, durationSec } = body;
  // results: [{ vocabId, correct, timeMs }]

  const correctQ = results.filter((r: any) => r.correct).length;
  const totalQ   = results.length;
  const xpEarned = correctQ * 5;

  // 1. Lưu QuizSession
  await prisma.quizSession.create({
    data: {
      userId,
      mode,
      source:      lessonId ? `lesson:${lessonId}` : "practice",
      totalQ,
      correctQ,
      durationSec: durationSec ?? 0,
      xpEarned,
      results,
    },
  });

  // 2. Cập nhật UserVocabulary với SM-2
  for (const r of results as { vocabId: string; correct: boolean }[]) {
    const existing = await prisma.userVocabulary.findUnique({
      where: { userId_vocabularyId: { userId, vocabularyId: r.vocabId } },
    });

    if (existing) {
      // SM-2: tính easeFactor và interval mới
      let { easeFactor, interval } = existing;
      if (r.correct) {
        interval    = interval === 1 ? 3 : Math.round(interval * easeFactor);
        easeFactor  = Math.max(1.3, easeFactor + 0.1);
      } else {
        interval    = 1;
        easeFactor  = Math.max(1.3, easeFactor - 0.2);
      }
      const nextReviewAt = new Date(Date.now() + interval * 24 * 60 * 60 * 1000);

      await prisma.userVocabulary.update({
        where: { userId_vocabularyId: { userId, vocabularyId: r.vocabId } },
        data: {
          timesCorrect: r.correct ? { increment: 1 } : undefined,
          timesWrong:   r.correct ? undefined : { increment: 1 },
          easeFactor,
          interval,
          nextReviewAt,
          lastSeenAt: new Date(),
        },
      });
    } else {
      // Tạo mới
      await prisma.userVocabulary.create({
        data: {
          userId,
          vocabularyId: r.vocabId,
          timesCorrect: r.correct ? 1 : 0,
          timesWrong:   r.correct ? 0 : 1,
          easeFactor:   r.correct ? 2.6 : 2.3,
          interval:     r.correct ? 3   : 1,
          nextReviewAt: new Date(Date.now() + (r.correct ? 3 : 1) * 24 * 60 * 60 * 1000),
          lastSeenAt:   new Date(),
        },
      });
    }
  }

  // 3. Cộng XP + streak + dailyActivity
  const newXP     = await addXP(prisma, userId, xpEarned);
  const newStreak = await updateStreak(prisma, userId);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  await prisma.dailyActivity.upsert({
    where: { userId_date: { userId, date: today } },
    create: { userId, date: today, xpEarned, wordsLearned: correctQ },
    update: {
      xpEarned:     { increment: xpEarned },
      wordsLearned: { increment: correctQ },
    },
  });

  // 4. Từ sai để hiện ở màn kết quả
  const wrongIds = (results as any[]).filter(r => !r.correct).map(r => r.vocabId);
  const weakWords = wrongIds.length > 0
    ? await prisma.vocabulary.findMany({
        where: { id: { in: wrongIds } },
        select: { id: true, hanzi: true, pinyin: true, meaningVi: true, audioUrl: true },
      })
    : [];

  return NextResponse.json({
    xpEarned,
    totalXP:   newXP,
    newStreak,
    correctQ,
    totalQ,
    accuracy:  Math.round((correctQ / totalQ) * 100),
    weakWords,
  });
}
