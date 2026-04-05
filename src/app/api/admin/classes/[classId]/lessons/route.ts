// src/app/api/admin/classes/[classId]/lessons/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireTeacher() {
  const session = await auth();
  if (!session?.user?.keycloakId || session.user.role !== "teacher") return null;
  return prisma.user.findUnique({
    where: { keycloakId: session.user.keycloakId },
    select: { id: true },
  });
}

// GET — lấy timeline bài học của lớp (theo course liên kết)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  const user = await requireTeacher();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { classId } = await params;

  const cls = await prisma.class.findUnique({
    where: { id: classId },
    select: { courseId: true },
  });
  if (!cls) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!cls.courseId) {
    return NextResponse.json({ chapters: [], message: "Lớp chưa liên kết khoá học" });
  }

  // Lấy chapters + lessons + trạng thái hoàn thành trong lớp này
  const chapters = await prisma.chapter.findMany({
    where: { courseId: cls.courseId },
    orderBy: { sortOrder: "asc" },
    include: {
      lessons: {
        orderBy: { sortOrder: "asc" },
        include: {
          classLessons: {
            where: { classId },
            select: { completedAt: true, note: true },
          },
        },
      },
    },
  });

  const timeline = chapters.map(chapter => ({
    id: chapter.id,
    title: chapter.title,
    sortOrder: chapter.sortOrder,
    lessons: chapter.lessons.map(lesson => ({
      id: lesson.id,
      title: lesson.title,
      titleChinese: lesson.titleChinese,
      pinyin: lesson.pinyin,
      durationMins: lesson.durationMins,
      sortOrder: lesson.sortOrder,
      isCompleted: lesson.classLessons[0]?.completedAt != null,
      completedAt: lesson.classLessons[0]?.completedAt ?? null,
      note: lesson.classLessons[0]?.note ?? null,
    })),
  }));

  return NextResponse.json({ chapters: timeline });
}

// PUT — đánh dấu hoàn thành / bỏ đánh dấu một bài học trong lớp
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  const user = await requireTeacher();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { classId } = await params;
  const { lessonId, completed, note } = await req.json();

  if (!lessonId) {
    return NextResponse.json({ error: "Thiếu lessonId" }, { status: 400 });
  }

  if (completed) {
    // Upsert ClassLesson
    await prisma.classLesson.upsert({
      where: { classId_lessonId: { classId, lessonId } },
      create: { classId, lessonId, completedAt: new Date(), note: note ?? null },
      update: { completedAt: new Date(), note: note ?? null },
    });

    // ── Auto-seed UserVocabulary cho tất cả học sinh trong lớp ──
    // Lấy danh sách vocab trong bài học
    const lessonVocab = await prisma.lessonVocabulary.findMany({
      where: { lessonId },
      select: { vocabularyId: true },
    });

    if (lessonVocab.length > 0) {
      // Lấy danh sách học sinh trong lớp
      const members = await prisma.classMember.findMany({
        where: { classId },
        select: { userId: true },
      });

      if (members.length > 0) {
        const vocabIds = lessonVocab.map(v => v.vocabularyId);
        const now = new Date();

        // Upsert UserVocabulary cho mỗi học sinh — không overwrite existing review data
        await prisma.$transaction(
          members.flatMap(member =>
            vocabIds.map(vocabId => ({
              userId: member.userId,
              vocabularyId: vocabId,
              easeFactor: 2.5,
              interval: 1,
              nextReviewAt: now,
              lastSeenAt: now,
            }))
          ).map(data =>
            prisma.userVocabulary.upsert({
              where: {
                userId_vocabularyId: {
                  userId: data.userId,
                  vocabularyId: data.vocabularyId,
                },
              },
              create: data,
              // Giữ nguyên dữ liệu spaced repetition đã có, chỉ update lastSeenAt nếu record đã tồn tại
              update: { lastSeenAt: now },
            })
          )
        );
      }
    }
  } else {
    // Bỏ đánh dấu — giữ UserVocabulary (học sinh có thể đã ôn rồi)
    await prisma.classLesson.upsert({
      where: { classId_lessonId: { classId, lessonId } },
      create: { classId, lessonId, completedAt: null, note: note ?? null },
      update: { completedAt: null },
    });
  }

  return NextResponse.json({ ok: true });
}