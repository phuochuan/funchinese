// src/app/api/courses/[courseId]/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const session = await auth();
  if (!session?.user?.keycloakId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { courseId } = await params;

  const dbUser = await prisma.user.findUnique({
    where: { keycloakId: session.user.keycloakId },
    select: { id: true },
  });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const userId = dbUser.id;

  // Course + chapters + lessons
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      chapters: {
        orderBy: { sortOrder: "asc" },
        include: {
          lessons: {
            where: { isPublished: true },
            orderBy: { sortOrder: "asc" },
            select: {
              id: true,
              title: true,
              titleChinese: true,
              pinyin: true,
              durationMins: true,
              sortOrder: true,
            },
          },
        },
      },
    },
  });

  if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });

  // Tất cả lesson ID trong khoá
  const allLessonIds = course.chapters.flatMap((ch) =>
    ch.lessons.map((l) => l.id)
  );

  // Progress của user cho khoá này
  const progressList = await prisma.lessonProgress.findMany({
    where: { userId, lessonId: { in: allLessonIds } },
    select: { lessonId: true, completed: true, completedAt: true, lastViewedAt: true },
  });
  const progressMap = new Map(progressList.map((p) => [p.lessonId, p]));

  // Tổng số học viên đang học khoá này (approximate)
  const enrolledCount = await prisma.lessonProgress.groupBy({
    by: ["userId"],
    where: { lessonId: { in: allLessonIds } },
    _count: { userId: true },
  }).then((r) => r.length);

  // Tính tổng thời lượng
  const totalMinutes = course.chapters.reduce(
    (acc, ch) => acc + ch.lessons.reduce((a, l) => a + l.durationMins, 0),
    0
  );

  // Map chapters với lesson status
  const totalLessons = allLessonIds.length;
  const completedLessons = progressList.filter((p) => p.completed).length;
  const progressPct = totalLessons > 0
    ? Math.round((completedLessons / totalLessons) * 100)
    : 0;

  // Bài đang học / bài tiếp theo
  let currentLessonId: string | null = null;
  let nextLessonId: string | null = null;

  for (const id of allLessonIds) {
    const p = progressMap.get(id);
    if (!p) {
      // Chưa mở bao giờ — đây là bài tiếp theo
      nextLessonId = nextLessonId ?? id;
    } else if (!p.completed) {
      // Đang học dở
      currentLessonId = id;
      break;
    }
  }
  const continueLessonId = currentLessonId ?? nextLessonId;

  // Build chapters data với lesson statuses
  // Logic mở khóa: bài trước completed thì mở bài sau
  let prevCompleted = true; // bài đầu tiên luôn mở
  const chaptersData = course.chapters.map((ch) => {
    const chCompleted = ch.lessons.filter((l) => progressMap.get(l.id)?.completed).length;

    const lessonsData = ch.lessons.map((lesson) => {
      const progress = progressMap.get(lesson.id);
      let status: "completed" | "in_progress" | "available" | "locked";

      if (progress?.completed) {
        status = "completed";
      } else if (progress && !progress.completed) {
        status = "in_progress";
      } else if (prevCompleted) {
        status = "available";
      } else {
        status = "locked";
      }

      prevCompleted = status === "completed";

      return {
        id:           lesson.id,
        title:        lesson.title,
        titleChinese: lesson.titleChinese,
        durationMins: lesson.durationMins,
        status,
        completedAt:  progress?.completedAt ?? null,
        lastViewedAt: progress?.lastViewedAt ?? null,
      };
    });

    return {
      id:               ch.id,
      title:            ch.title,
      totalLessons:     ch.lessons.length,
      completedLessons: chCompleted,
      totalMins:        ch.lessons.reduce((a, l) => a + l.durationMins, 0),
      lessons:          lessonsData,
    };
  });

  // Tìm lesson object của bài tiếp theo để hiển thị trong hero
  const continueLesson = continueLessonId
    ? course.chapters
        .flatMap((ch) => ch.lessons)
        .find((l) => l.id === continueLessonId) ?? null
    : null;

  return NextResponse.json({
    course: {
      id:          course.id,
      title:       course.title,
      description: course.description,
      hskLevel:    course.hskLevel,
      thumbnail:   course.thumbnail,
    },
    stats: {
      totalLessons,
      completedLessons,
      progressPct,
      totalMinutes,
      enrolledCount,
    },
    continueLesson: continueLesson
      ? {
          id:           continueLesson.id,
          title:        continueLesson.title,
          titleChinese: continueLesson.titleChinese,
        }
      : null,
    chapters: chaptersData,
  });
}
