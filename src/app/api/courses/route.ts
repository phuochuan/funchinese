// src/app/api/courses/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.keycloakId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { keycloakId: session.user.keycloakId },
    select: { id: true },
  });
  if (!dbUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Lớp học student đang tham gia + courseId của lớp đó
  const memberships = await prisma.classMember.findMany({
    where: { userId: dbUser.id },
    include: {
      class: { select: { courseId: true } },
    },
  });

  const classCoursesIds = memberships
    .map(m => m.class.courseId)
    .filter(Boolean) as string[];

  // Lấy courses:
  // 1. Không gắn với lớp nào (classId null) → public cho tất cả
  // 2. Gắn với lớp mà student đang học
  const courses = await prisma.course.findMany({
    where: {
      isPublished: true,
      OR: [
        { classes: { none: {} } },              // Không gắn lớp nào → public
        { id: { in: classCoursesIds } },        // Gắn với lớp student đang học
      ],
    },
    orderBy: { sortOrder: "asc" },
    include: {
      chapters: {
        orderBy: { sortOrder: "asc" },
        include: {
          lessons: {
            where: { isPublished: true },
            orderBy: { sortOrder: "asc" },
            select: { id: true, title: true, durationMins: true },
          },
        },
      },
    },
  });

  // Tính progress cho mỗi course
  const lessonIds = courses.flatMap(c =>
    c.chapters.flatMap(ch => ch.lessons.map(l => l.id))
  );
  const progress = await prisma.lessonProgress.findMany({
    where: { userId: dbUser.id, lessonId: { in: lessonIds } },
  });
  const progressMap = new Map(progress.map(p => [p.lessonId, p]));

  return NextResponse.json({
    courses: courses.map(c => {
      const allLessons   = c.chapters.flatMap(ch => ch.lessons);
      const completed    = allLessons.filter(l => progressMap.get(l.id)?.completed).length;
      const isClassCourse = classCoursesIds.includes(c.id);

      return {
        id:          c.id,
        title:       c.title,
        hskLevel:    c.hskLevel,
        totalLessons: allLessons.length,
        completedLessons: completed,
        pct:         allLessons.length > 0
          ? Math.round((completed / allLessons.length) * 100) : 0,
        isClassCourse, // badge "Khoá học lớp"
        chapters:    c.chapters.map(ch => ({
          id:      ch.id,
          title:   ch.title,
          lessons: ch.lessons,
        })),
      };
    }),
  });
}
