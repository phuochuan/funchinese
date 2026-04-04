// src/app/api/student/flashcard/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// ─── Bucket classification ──────────────────────────────────────────────────
// Bucket 1 (overdue):  nextReviewAt <= now          → "10 phút"  🔴
// Bucket 2 (one day):  interval == 1                 → "1 ngày"   🟠
// Bucket 3 (2-3 days): interval in [2,3]            → "2-3 ngày" 🟡
// Bucket 4 (one week): interval in [4,7]            → "1 tuần"   🟢
// Bucket 5 (one month): interval >= 8               → "1 tháng"  🔵

type Bucket = {
  overdue:    FlashcardWord[];
  oneDay:    FlashcardWord[];
  twoThreeDays: FlashcardWord[];
  oneWeek:   FlashcardWord[];
  oneMonth:  FlashcardWord[];
};

type FlashcardWord = {
  id: string;
  hanzi: string;
  pinyin: string;
  hanViet: string;
  meaningVi: string;
  exampleSentence: string | null;
  examplePinyin: string | null;
  exampleVi: string | null;
  audioUrl: string | null;
  wordType: string | null;
  hskLevel: string;
  // user-specific
  timesCorrect: number;
  timesWrong: number;
  easeFactor: number;
  interval: number;
  nextReviewAt: string;
  needsReview: boolean;
  // which bucket it belongs to
  bucket: string;
};

function classifyWord(uv: {
  timesCorrect: number;
  timesWrong: number;
  easeFactor: number;
  interval: number;
  nextReviewAt: Date;
}): string {
  const now = new Date();
  if (uv.nextReviewAt <= now) return "overdue";
  if (uv.interval === 1)       return "oneDay";
  if (uv.interval >= 2 && uv.interval <= 3) return "twoThreeDays";
  if (uv.interval >= 4 && uv.interval <= 7) return "oneWeek";
  return "oneMonth"; // interval >= 8
}

function buildFlashcardWord(v: any, uv: any): FlashcardWord {
  const word = {
    id:              v.id,
    hanzi:           v.hanzi,
    pinyin:          v.pinyin ?? "",
    hanViet:          v.hanViet ?? "",
    meaningVi:        v.meaningVi ?? "",
    exampleSentence:  v.exampleSentence ?? null,
    examplePinyin:   v.examplePinyin ?? null,
    exampleVi:       v.exampleVi ?? null,
    audioUrl:        v.audioUrl ?? null,
    wordType:        v.wordType ?? null,
    hskLevel:        v.hskLevel,
  };

  if (!uv) {
    return {
      ...word,
      timesCorrect: 0,
      timesWrong:   0,
      easeFactor:   2.5,
      interval:     0,
      nextReviewAt: new Date().toISOString(),
      needsReview:  true,
      bucket:       "overdue",
    };
  }

  const bucket = classifyWord(uv);
  return {
    ...word,
    timesCorrect: uv.timesCorrect,
    timesWrong:   uv.timesWrong,
    easeFactor:  uv.easeFactor,
    interval:    uv.interval,
    nextReviewAt: uv.nextReviewAt.toISOString(),
    needsReview: uv.nextReviewAt <= new Date() || uv.timesWrong > uv.timesCorrect,
    bucket,
  };
}

// ─── GET ─────────────────────────────────────────────────────────────────────
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

  const userId = dbUser.id;
  const hsk    = req.nextUrl.searchParams.get("hsk"); // "HSK1" … "HSK6"

  // Build where clause
  const vocabWhere: any = {};
  if (hsk) vocabWhere.hskLevel = hsk;

  // Fetch all vocab at this level (or all if no hsk filter)
  const vocabs = await prisma.vocabulary.findMany({
    where:  vocabWhere,
    orderBy: { hanzi: "asc" },
  });

  if (vocabs.length === 0) {
    return NextResponse.json({
      words: [],
      levels: [],
      totalWords: 0,
      totalLearned: 0,
    });
  }

  const vocabIds = vocabs.map(v => v.id);

  // Fetch user records for these words
  const userVocabs = await prisma.userVocabulary.findMany({
    where: { userId, vocabularyId: { in: vocabIds } },
  });
  const uvMap = new Map(userVocabs.map(uv => [uv.vocabularyId, uv]));

  // Build flat word list with bucket info
  const allWords: FlashcardWord[] = vocabs.map(v =>
    buildFlashcardWord(v, uvMap.get(v.id) ?? null)
  );

  // Group into buckets
  const buckets: Bucket = emptyBuckets();
  for (const w of allWords) {
    buckets[w.bucket as keyof Bucket].push(w);
  }

  // Sort each bucket: timesWrong DESC, nextReviewAt ASC (most neglected first)
  const sortBucket = (arr: FlashcardWord[]) =>
    arr.sort((a, b) => {
      if (b.timesWrong !== a.timesWrong) return b.timesWrong - a.timesWrong;
      return new Date(a.nextReviewAt).getTime() - new Date(b.nextReviewAt).getTime();
    });

  for (const key of Object.keys(buckets) as (keyof Bucket)[]) {
    buckets[key] = sortBucket(buckets[key]);
  }

  // Flatten in bucket order for the UI queue
  const BUCKET_ORDER: (keyof Bucket)[] = [
    "overdue", "oneDay", "twoThreeDays", "oneWeek", "oneMonth",
  ];
  const orderedWords: FlashcardWord[] = BUCKET_ORDER.flatMap(k => buckets[k]);

  // Build levels summary (for bar chart on library page)
  const levelCounts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const w of allWords) {
    const lvl = wordToLevel(w);
    levelCounts[lvl] = (levelCounts[lvl] ?? 0) + 1;
  }

  const LEVEL_META = [
    { level: 0, label: 'Từ mới',   sub: 'Chưa gặp',    color: 'bg-gray-300'  },
    { level: 1, label: 'Cần ôn',    sub: 'Hôm nay',      color: 'bg-red-500'   },
    { level: 2, label: '1 ngày',   sub: 'Ngày mai',     color: 'bg-orange-500'},
    { level: 3, label: '2–3 ngày', sub: 'Tuần này',     color: 'bg-amber-500' },
    { level: 4, label: '1 tuần',   sub: 'Tuần sau',     color: 'bg-green-500' },
    { level: 5, label: '1 tháng+', sub: 'Đã thuộc',    color: 'bg-blue-500'  },
  ];

  const totalLearned = allWords.filter(w => w.bucket !== 'overdue' || w.timesCorrect > 0 || w.timesWrong > 0).length;

  return NextResponse.json({
    hsk,
    totalWords: orderedWords.length,
    totalLearned,
    words: orderedWords,
    levels: LEVEL_META.map(l => ({
      ...l,
      colorText: l.color.replace('bg-', 'text-'),
      count: levelCounts[l.level] ?? 0,
    })),
  });
}

function wordToLevel(w: FlashcardWord): number {
  // A word is "new" if it has no UserVocabulary record (timesCorrect=0 && timesWrong=0 && interval=0)
  if (w.timesCorrect === 0 && w.timesWrong === 0 && w.interval === 0) return 0;
  if (w.bucket === 'overdue') return 1;
  if (w.bucket === 'oneDay') return 2;
  if (w.bucket === 'twoThreeDays') return 3;
  if (w.bucket === 'oneWeek') return 4;
  return 5; // oneMonth
}

// ─── POST ─────────────────────────────────────────────────────────────────────
// Body: { vocabId: string, correct: boolean }
export async function POST(req: NextRequest) {
  const authSession = await auth();
  if (!authSession?.user?.keycloakId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { keycloakId: authSession.user.keycloakId },
    select: { id: true },
  });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const userId = dbUser.id;
  const { vocabId, correct } = await req.json();

  if (!vocabId) {
    return NextResponse.json({ error: "vocabId is required" }, { status: 400 });
  }

  const existing = await prisma.userVocabulary.findUnique({
    where: { userId_vocabularyId: { userId, vocabularyId: vocabId } },
  });

  let interval: number, easeFactor: number;

  if (existing) {
    let ef = existing.easeFactor;
    let iv = existing.interval;

    if (correct) {
      iv = iv === 1 ? 3 : Math.round(iv * ef);
      ef = Math.max(1.3, ef + 0.1);
    } else {
      iv = 1;
      ef = Math.max(1.3, ef - 0.2);
    }

    interval    = iv;
    easeFactor  = ef;

    await prisma.userVocabulary.update({
      where: { userId_vocabularyId: { userId, vocabularyId: vocabId } },
      data: {
        timesCorrect: correct ? { increment: 1 } : undefined,
        timesWrong:   correct ? undefined : { increment: 1 },
        easeFactor:   ef,
        interval:     iv,
        nextReviewAt: new Date(Date.now() + iv * 24 * 60 * 60 * 1000),
        lastSeenAt:   new Date(),
      },
    });
  } else {
    // First encounter
    interval    = correct ? 3 : 1;
    easeFactor  = correct ? 2.6 : 2.3;

    await prisma.userVocabulary.create({
      data: {
        userId,
        vocabularyId: vocabId,
        timesCorrect: correct ? 1 : 0,
        timesWrong:   correct ? 0 : 1,
        easeFactor,
        interval,
        nextReviewAt: new Date(Date.now() + interval * 24 * 60 * 60 * 1000),
        lastSeenAt:   new Date(),
      },
    });
  }

  const nextReviewAt = new Date(Date.now() + interval * 24 * 60 * 60 * 1000);

  return NextResponse.json({
    vocabId,
    correct,
    interval,
    easeFactor,
    nextReviewAt: nextReviewAt.toISOString(),
    bucket: classifyWord({ interval, easeFactor, nextReviewAt } as any),
  });
}

function emptyBuckets(): Bucket {
  return {
    overdue:      [],
    oneDay:       [],
    twoThreeDays: [],
    oneWeek:      [],
    oneMonth:     [],
  };
}
