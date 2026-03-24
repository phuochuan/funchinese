// src/app/api/admin/classes/[classId]/route.ts
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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  const user = await requireTeacher();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { classId } = await params;

  const cls = await prisma.class.findUnique({
    where: { id: classId },
    include: {
      course:    { select: { id: true, title: true, hskLevel: true } },
      schedules: { orderBy: { dayOfWeek: "asc" } },
      members: {
        include: {
          user: {
            select: {
              id: true, name: true, email: true, image: true,
              xp: true, level: true, streakDays: true,
            },
          },
        },
        orderBy: { joinedAt: "asc" }, // ← ClassMember dùng joinedAt không phải createdAt
      },
      // ← bỏ sessions vì chưa có relation trên Class
    },
  });

  if (!cls) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Đếm sessions an toàn — nếu model chưa có thì trả 0
  let totalSessions = 0;
  let doneSessions  = 0;
  try {
    totalSessions = await (prisma as any).classSession.count({ where: { classId } });
    doneSessions  = await (prisma as any).classSession.count({ where: { classId, status: "COMPLETED" } });
  } catch { /* ClassSession chưa được migrate */ }

  return NextResponse.json({
    class: {
      id:           cls.id,
      name:         cls.name,
      joinCode:     cls.joinCode,
      scheduleNote: cls.scheduleNote,
      course:       cls.course ?? null,
      schedules:    cls.schedules,
      members:      cls.members.map(m => m.user),
      stats: {
        totalStudents:     cls.members.length,
        totalSessions,
        doneSessions,
        remainingSessions: totalSessions - doneSessions,
      },
    },
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  const user = await requireTeacher();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { classId } = await params;
  const { name, courseId, scheduleNote } = await req.json();

  const cls = await prisma.class.update({
    where: { id: classId },
    data: {
      ...(name         !== undefined && { name }),
      ...(scheduleNote !== undefined && { scheduleNote }),
      ...(courseId     !== undefined && { courseId: courseId || null }),
    },
  });

  return NextResponse.json({ class: cls });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  const user = await requireTeacher();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { classId } = await params;
  await prisma.class.delete({ where: { id: classId } });
  return NextResponse.json({ ok: true });
}
