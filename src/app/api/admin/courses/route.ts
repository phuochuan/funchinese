// src/app/api/admin/courses/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireTeacher() {
  const session = await auth();
  if (!session?.user?.keycloakId) return null;
  if (session.user.role !== "teacher") return null;
  return await prisma.user.findUnique({
    where: { keycloakId: session.user.keycloakId },
    select: { id: true },
  });
}

export async function GET() {
  const user = await requireTeacher();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const courses = await prisma.course.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      chapters: {
        include: {
          lessons: { where: { isPublished: true }, select: { id: true } },
        },
      },
    },
  });

  // Tính số học viên đang học mỗi khoá
  const result = await Promise.all(
    courses.map(async (course) => {
      const lessonIds = course.chapters.flatMap((ch) => ch.lessons.map((l) => l.id));
      const enrolledCount = lessonIds.length > 0
        ? (await prisma.lessonProgress.groupBy({
            by: ["userId"],
            where: { lessonId: { in: lessonIds } },
          })).length
        : 0;

      const totalLessons = lessonIds.length;

      return {
        id:           course.id,
        title:        course.title,
        description:  course.description,
        hskLevel:     course.hskLevel,
        thumbnail:    course.thumbnail,
        isPublished:  course.isPublished,
        sortOrder:    course.sortOrder,
        totalChapters: course.chapters.length,
        totalLessons,
        enrolledCount,
      };
    })
  );

  return NextResponse.json({ courses: result });
}

export async function POST(req: NextRequest) {
  const user = await requireTeacher();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { title, description, hskLevel, isPublished } = body;

  if (!title || !hskLevel) {
    return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
  }

  // sortOrder = max hiện tại + 1
  const maxOrder = await prisma.course.aggregate({ _max: { sortOrder: true } });
  const sortOrder = (maxOrder._max.sortOrder ?? 0) + 1;

  const course = await prisma.course.create({
    data: { title, description, hskLevel, isPublished: isPublished ?? false, sortOrder },
  });

  return NextResponse.json({ course }, { status: 201 });
}
