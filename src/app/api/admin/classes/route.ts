// src/app/api/admin/classes/route.ts
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

// GET — danh sách lớp + stats
export async function GET(req: NextRequest) {
  const user = await requireTeacher();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";

  const classes = await prisma.class.findMany({
    where: q ? { name: { contains: q, mode: "insensitive" } } : {},
    orderBy: { createdAt: "desc" },
    include: {
      _count:    { select: { members: true } },
      members:   { select: { userId: true } },
      schedules: { select: { dayOfWeek: true, startTime: true, endTime: true, isOnline: true } },
      course:    { select: { id: true, title: true, hskLevel: true } },
    },
  });

  // Stats
  const totalStudents   = await prisma.classMember.count();
  const activeClasses   = classes.length;
  const weeklySchedules = await prisma.classSchedule.count();

  return NextResponse.json({
    classes: classes.map(c => ({
      id:          c.id,
      name:        c.name,
      joinCode:    c.joinCode,
      scheduleNote: c.scheduleNote,
      studentCount: c._count.members,
      schedules:   c.schedules,
      course:      c.course,
      createdAt:   c.createdAt,
    })),
    stats: { activeClasses, totalStudents, weeklySchedules },
  });
}

// POST — tạo lớp mới
export async function POST(req: NextRequest) {
  const user = await requireTeacher();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, courseId, scheduleNote } = await req.json();
  if (!name) return NextResponse.json({ error: "Tên lớp là bắt buộc" }, { status: 400 });

  // Generate join code 6 ký tự
  const joinCode = Math.random().toString(36).slice(2, 8).toUpperCase();

  const cls = await prisma.class.create({
    data: {
      name,
      joinCode,
      scheduleNote: scheduleNote ?? "",
      teacherId:    user.id,
      ...(courseId ? { course: { connect: { id: courseId } } } : {}),
    },
  });

  return NextResponse.json({ class: cls }, { status: 201 });
}
