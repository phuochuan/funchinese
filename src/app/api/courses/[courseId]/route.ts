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
  // Lấy classIds của student (nếu có)
  const memberships = await prisma.classMember.findMany({
    where: { userId },
    select: { classId: true },
  });
  const classIds = memberships.map(m => m.classId);

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

  // Lọc lessons: nếu student có lớp → chỉ hiện bài đã được GV đánh dấu dạy xong
  const taughtLessonIds = new Set<string>();
  if (classIds.length > 0) {
    const taught = await prisma.classLesson.findMany({
      where: {
        classId: { in: classIds },
        completedAt: { not: null },
        lessonId: { in: allLessonIds },
      },
      select: { lessonId: true },
    });
    taught.forEach(t => taughtLessonIds.add(t.lessonId));
  }

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
  // Lọc: nếu student có lớp → chỉ tính bài đã được GV dạy xong
  const effectiveLessonIds = classIds.length === 0
    ? allLessonIds
    : allLessonIds.filter(id => taughtLessonIds.has(id));

  const totalLessons = effectiveLessonIds.length;
  const completedLessons = progressList.filter((p) =>
    effectiveLessonIds.includes(p.lessonId) && p.completed
  ).length;
  const progressPct = totalLessons > 0
    ? Math.round((completedLessons / totalLessons) * 100)
    : 0;

  // Bài đang học / bài tiếp theo (chỉ bài đã dạy)
  let currentLessonId: string | null = null;
  let nextLessonId: string | null = null;

  for (const id of effectiveLessonIds) {
    const p = progressMap.get(id);
    if (!p) {
      nextLessonId = nextLessonId ?? id;
    } else if (!p.completed) {
      currentLessonId = id;
      break;
    }
  }
  const continueLessonId = currentLessonId ?? nextLessonId;

  // Build chapters data với lesson statuses
  // Logic mở khóa: bài trước completed thì mở bài sau
  // Nếu student có lớp → chỉ hiện bài đã được GV đánh dấu dạy xong
  let prevCompleted = true; // bài đầu tiên luôn mở
  const chaptersData = course.chapters.map((ch) => {
    const chCompleted = ch.lessons.filter((l) => progressMap.get(l.id)?.completed).length;

    const lessonsData = ch.lessons.map((lesson) => {
      const progress = progressMap.get(lesson.id);
      const isTaught = classIds.length === 0 || taughtLessonIds.has(lesson.id);
      let status: "completed" | "in_progress" | "available" | "locked";

      if (!isTaught) {
        status = "locked"; // GV chưa dạy bài này trong lớp của student
      } else if (progress?.completed) {
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
