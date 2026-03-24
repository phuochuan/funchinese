// src/app/api/admin/dashboard/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.keycloakId || session.user.role !== "teacher") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { keycloakId: session.user.keycloakId },
    select: { id: true, name: true },
  });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const now       = new Date();
  const weekAgo   = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const threeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const [
    totalStudents,
    pendingGradesCount,
    publishedCourses,
    pendingSubmissions,
    upcomingDeadlines,
    weeklyActivity,
    classes,
  ] = await Promise.all([
    // Tổng học viên (role = student)
    prisma.user.count({ where: { role: "student" } }),

    // Bài tập chờ chấm
    prisma.submission.count({ where: { status: "SUBMITTED" } }),

    // Khoá học đang mở
    prisma.course.count({ where: { isPublished: true } }),

    // 5 submission mới nhất chưa chấm
    prisma.submission.findMany({
      where: { status: "SUBMITTED" },
      orderBy: { submittedAt: "desc" },
      take: 5,
      select: {
        id: true,
        submittedAt: true,
        user: { select: { id: true, name: true, image: true } },
        assignment: {
          select: {
            id: true, title: true,
            class: { select: { name: true } },
          },
        },
      },
    }),

    // Deadline trong 3 ngày
    prisma.assignment.findMany({
      where: { deadline: { gte: now, lte: threeDays } },
      orderBy: { deadline: "asc" },
      take: 5,
      select: {
        id: true, title: true, deadline: true,
        class: { select: { name: true, members: { select: { userId: true } } } },
        _count: { select: { submissions: true } },
      },
    }),

    // Hoạt động 7 ngày
    prisma.dailyActivity.groupBy({
      by: ["date"],
      where: { date: { gte: weekAgo } },
      _count: { userId: true },
      orderBy: { date: "asc" },
    }),

    // Tiến độ các lớp
    prisma.class.findMany({
      select: {
        id: true, name: true,
        members: {
          select: {
            userId: true,
            user: {
              select: {
                dailyActivity: {
                  where: { date: { gte: weekAgo } },
                  select: { xpEarned: true },
                },
              },
            },
          },
        },
        assignments: {
          select: {
            _count: { select: { submissions: true } },
            submissions: { where: { status: "GRADED" }, select: { id: true } },
          },
        },
      },
    }),
  ]);

  // Tính completion rate TB
  const allProgress = await prisma.lessonProgress.groupBy({
    by: ["userId"],
    _count: { lessonId: true },
  });
  const completedProgress = await prisma.lessonProgress.groupBy({
    by: ["userId"],
    where: { completed: true },
    _count: { lessonId: true },
  });
  const completedMap = new Map(completedProgress.map(p => [p.userId, p._count.lessonId]));
  const avgCompletion = allProgress.length > 0
    ? Math.round(
        allProgress.reduce((acc, p) => {
          const completed = completedMap.get(p.userId) ?? 0;
          return acc + (completed / p._count.lessonId) * 100;
        }, 0) / allProgress.length
      )
    : 0;

  // Build weekly activity array (T2–CN)
  const dayNames = ["CN","T2","T3","T4","T5","T6","T7"];
  const activityMap = new Map(
    weeklyActivity.map(a => [new Date(a.date).getDay(), a._count.userId])
  );
  const weekData = Array.from({ length: 7 }, (_, i) => {
    const dayIdx = (i + 1) % 7; // T2=1...CN=0
    return {
      day: dayNames[(i + 1) % 7],
      count: activityMap.get(dayIdx) ?? 0,
    };
  });

  // Class progress
  const classProgress = classes.map(cls => {
    const total    = cls.members.length;
    const active   = cls.members.filter(m =>
      m.user.dailyActivity.some(a => a.xpEarned > 0)
    ).length;
    const pct      = total > 0 ? Math.round((active / total) * 100) : 0;
    let status: "good" | "warn" | "done" = "warn";
    if (pct >= 70) status = "good";
    if (pct >= 100) status = "done";

    return { id: cls.id, name: cls.name, total, active, pct, status };
  });

  // Deadline với progress nộp bài
  const deadlines = upcomingDeadlines.map(a => {
    const totalMembers  = a.class.members.length;
    const submitted     = a._count.submissions;
    const pct           = totalMembers > 0 ? Math.round((submitted / totalMembers) * 100) : 0;
    const diffMs        = a.deadline.getTime() - now.getTime();
    const daysLeft      = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const urgent        = daysLeft <= 2 && pct < 50;

    return {
      id: a.id, title: a.title,
      className: a.class.name,
      deadline: a.deadline,
      daysLeft, submitted, totalMembers, pct, urgent,
    };
  });

  return NextResponse.json({
    teacher: { name: dbUser.name },
    stats: {
      totalStudents,
      pendingGradesCount,
      publishedCourses,
      avgCompletion,
    },
    pendingSubmissions: pendingSubmissions.map(s => ({
      id:          s.id,
      submittedAt: s.submittedAt,
      student: {
        id:    s.user.id,
        name:  s.user.name,
        image: s.user.image,
      },
      assignment: {
        id:        s.assignment.id,
        title:     s.assignment.title,
        className: s.assignment.class.name,
      },
    })),
    weeklyActivity: weekData,
    classProgress,
    deadlines,
  });
}
