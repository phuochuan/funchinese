import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getLevelFromXP } from "@/lib/xp";

export async function GET() {
  const session = await auth();
  if (!session?.user?.keycloakId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Tìm user trong DB theo keycloakId
  const dbUser = await prisma.user.findUnique({
    where: { keycloakId: session.user.keycloakId },
    select: { id: true },
  });

  if (!dbUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const userId = dbUser.id;

  try {
    const userXpData = await prisma.user.findUnique({
      where: { id: userId },
      select: { xp: true },
    });

    const [
      user,
      wordCount,
      assignmentStats,
      quizAvg,
      leaderboardRank,
      upcomingAssignments,
      dailyActivity,
      continueLesson,
      notifications,
    ] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true, name: true, image: true, xp: true,
          level: true, streakDays: true, maxStreak: true,
        },
      }),

      prisma.userVocabulary.count({ where: { userId } }),

      prisma.submission.aggregate({
        where: { userId, status: "GRADED" },
        _count: { id: true },
      }),

      prisma.quizSession.aggregate({
        where: {
          userId,
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
        _avg: { correctQ: true, totalQ: true },
      }),

      prisma.user.count({
        where: { xp: { gt: userXpData?.xp ?? 0 } },
      }),

      prisma.assignment.findMany({
        where: {
          class: { members: { some: { userId } } },
          deadline: {
            gte: new Date(),
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
          submissions: {
            none: { userId, status: { in: ["SUBMITTED", "GRADED"] } },
          },
        },
        select: {
          id: true, title: true, description: true, deadline: true,
          class: { select: { name: true } },
          _count: { select: { questions: true } },
        },
        orderBy: { deadline: "asc" },
        take: 5,
      }),

      prisma.dailyActivity.findMany({
        where: {
          userId,
          date: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
        select: { date: true, xpEarned: true, wordsLearned: true },
      }),

      prisma.lessonProgress.findFirst({
        where: { userId, completed: false },
        orderBy: { lastViewedAt: "desc" },
        select: {
          lesson: {
            select: {
              id: true, title: true, titleChinese: true, pinyin: true,
              chapter: { select: { course: { select: { title: true } } } },
            },
          },
        },
      }),

      prisma.notification.findMany({
        where: { userId, read: false },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true, type: true, title: true,
          body: true, link: true, createdAt: true,
        },
      }),
    ]);

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const quizAccuracy =
      quizAvg._avg.totalQ && quizAvg._avg.correctQ
        ? Math.round((quizAvg._avg.correctQ / quizAvg._avg.totalQ) * 100) / 10
        : 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayActivity = dailyActivity.find(
      (d) => new Date(d.date).toDateString() === today.toDateString()
    );

    return NextResponse.json({
      user: { ...user, levelInfo: getLevelFromXP(user.xp) },
      stats: {
        wordsLearned:      wordCount,
        assignmentsGraded: assignmentStats._count.id,
        quizAvgScore:      quizAccuracy,
        leaderboardRank:   leaderboardRank + 1,
      },
      xpToday: {
        earned: todayActivity?.xpEarned ?? 0,
        goal:   50,
      },
      upcomingAssignments,
      dailyActivity: dailyActivity.map((d) => ({
        date:         d.date,
        xpEarned:     d.xpEarned,
        wordsLearned: d.wordsLearned,
      })),
      continueLesson: continueLesson?.lesson ?? null,
      notifications,
    });
  } catch (err) {
    console.error("[dashboard API error]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}