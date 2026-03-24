// src/app/api/classes/join/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET — preview lớp trước khi join
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) return NextResponse.json({ error: "Thiếu mã" }, { status: 400 });

  const cls = await prisma.class.findUnique({
    where: { joinCode: code.toUpperCase() },
    include: {
      schedules: true,
      course:    { select: { id: true, title: true, hskLevel: true } },
      _count:    { select: { members: true } },
    },
  });
  if (!cls) return NextResponse.json({ error: "Không tìm thấy lớp" }, { status: 404 });

  // Lấy teacher riêng
  const teacher = await prisma.user.findUnique({
    where: { id: cls.teacherId },
    select: { name: true },
  });

  return NextResponse.json({
    preview: {
      id:           cls.id,
      name:         cls.name,
      teacherName:  teacher?.name ?? "Giáo viên",
      studentCount: cls._count.members,
      schedules:    cls.schedules,
      scheduleNote: cls.scheduleNote,
      course:       cls.course,
    },
  });
}

// POST — join lớp
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.keycloakId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { keycloakId: session.user.keycloakId },
    select: { id: true },
  });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { joinCode } = await req.json();
  if (!joinCode) return NextResponse.json({ error: "Thiếu mã tham gia" }, { status: 400 });

  const cls = await prisma.class.findUnique({
    where: { joinCode: joinCode.toUpperCase() },
    include: {
      schedules: { select: { dayOfWeek: true, startTime: true, endTime: true } },
      _count:    { select: { members: true } },
    },
  });
  if (!cls) return NextResponse.json({ error: "Mã không hợp lệ hoặc lớp không tồn tại" }, { status: 404 });

  const existing = await prisma.classMember.findUnique({
    where: { classId_userId: { classId: cls.id, userId: dbUser.id } },
  });
  if (existing) return NextResponse.json({ error: "Bạn đã tham gia lớp này rồi" }, { status: 409 });

  await prisma.classMember.create({
    data: { classId: cls.id, userId: dbUser.id },
  });

  const teacher = await prisma.user.findUnique({
    where: { id: cls.teacherId },
    select: { name: true },
  });

  return NextResponse.json({
    class: {
      id:           cls.id,
      name:         cls.name,
      teacherName:  teacher?.name ?? "Giáo viên",
      studentCount: cls._count.members + 1,
      schedules:    cls.schedules,
    },
  }, { status: 201 });
}
