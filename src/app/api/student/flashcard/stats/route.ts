// src/app/api/student/flashcard/stats/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Memory level from interval:
// Level 0 — New:     no UserVocabulary record yet
// Level 1 — Mới:     interval = 0 or nextReviewAt <= now  (needs review NOW)
// Level 2 — Hôm nay:  interval = 1 day
// Level 3 — 2-3 ngày: interval in [2,3]
// Level 4 — 1 tuần:  interval in [4,7]
// Level 5 — 1 tháng: interval >= 8

type LevelCount = { label: string; interval: string; count: number };

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
  const now = new Date();

  // Fetch all userVocabulary records with their vocabulary
  const userVocabs = await prisma.userVocabulary.findMany({
    where: { userId },
    include: { vocabulary: { select: { hskLevel: true } } },
  });

  // Count by memory level
  const levelCounts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const byHsk: Record<string, { total: number; overdue: number }> = {};

  for (const uv of userVocabs) {
    const level = getMemoryLevel(uv, now);
    levelCounts[level] = (levelCounts[level] ?? 0) + 1;

    const hsk = uv.vocabulary.hskLevel;
    if (!byHsk[hsk]) byHsk[hsk] = { total: 0, overdue: 0 };
    byHsk[hsk].total++;
    if (level === 1) byHsk[hsk].overdue++;
  }

  const totalLearned = userVocabs.length;

  // New words = total pool - words user has seen
  const totalVocab = await prisma.vocabulary.count();
  const newWords = Math.max(0, totalVocab - totalLearned);
  levelCounts[0] = newWords;

  // Per-HSK breakdown
  for (let lvl = 1; lvl <= 6; lvl++) {
    const level = `HSK${lvl}`;
    if (!byHsk[level]) {
      const totalAtLevel = await prisma.vocabulary.count({ where: { hskLevel: level } });
      byHsk[level] = { total: 0, overdue: totalAtLevel };
    }
  }

  // How many new words per HSK level
  const newWordsByHsk: Record<string, number> = {};
  const learnedHskIds = new Set(userVocabs.map(uv => uv.vocabularyId));
  for (let lvl = 1; lvl <= 6; lvl++) {
    const level = `HSK${lvl}`;
    const allAtLevel = await prisma.vocabulary.findMany({
      where: { hskLevel: level },
      select: { id: true },
    });
    newWordsByHsk[level] = allAtLevel.filter(v => !learnedHskIds.has(v.id)).length;
  }

  return NextResponse.json({
    levels: [
      { level: 0, label: 'Từ mới',    sub: 'Chưa gặp',   color: 'bg-gray-300',   colorText: 'text-gray-500' },
      { level: 1, label: 'Cần ôn',    sub: 'Hôm nay',     color: 'bg-red-500',    colorText: 'text-red-600'   },
      { level: 2, label: '1 ngày',    sub: 'Ngày mai',   color: 'bg-orange-500', colorText: 'text-orange-600' },
      { level: 3, label: '2–3 ngày',  sub: 'Tuần này',   color: 'bg-amber-500',  colorText: 'text-amber-700'  },
      { level: 4, label: '1 tuần',    sub: 'Tuần sau',   color: 'bg-green-500',  colorText: 'text-green-700'  },
      { level: 5, label: '1 tháng+',  sub: 'Đã thuộc',  color: 'bg-blue-500',   colorText: 'text-blue-700'   },
    ].map(l => ({
      ...l,
      count: levelCounts[l.level] ?? 0,
    })),
    totalLearned,
    totalVocab,
    newWords,
    byHsk,
    newWordsByHsk,
  });
}

function getMemoryLevel(
  uv: { interval: number; nextReviewAt: Date; timesWrong: number },
  now: Date
): number {
  if (uv.nextReviewAt <= now || uv.interval === 0) return 1;
  if (uv.interval === 1)  return 2;
  if (uv.interval >= 2 && uv.interval <= 3) return 3;
  if (uv.interval >= 4 && uv.interval <= 7) return 4;
  return 5; // interval >= 8
}
