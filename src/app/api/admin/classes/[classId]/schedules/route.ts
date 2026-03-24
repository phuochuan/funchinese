// src/app/api/admin/classes/[classId]/schedules/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireTeacher() {
  const session = await auth();
  if (!session?.user?.keycloakId || session.user.role !== "teacher") return null;
  return prisma.user.findUnique({ where: { keycloakId: session.user.keycloakId }, select: { id: true } });
}

// POST — thêm lịch học
export async function POST(req: NextRequest, { params }: { params: Promise<{ classId: string }> }) {
  const user = await requireTeacher();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { classId } = await params;
  const { dayOfWeek, startTime, endTime, location, isOnline } = await req.json();

  if (!dayOfWeek || !startTime || !endTime) {
    return NextResponse.json({ error: "Thiếu thông tin lịch học" }, { status: 400 });
  }

  const schedule = await prisma.classSchedule.create({
    data: { classId, dayOfWeek, startTime, endTime, location: location ?? null, isOnline: isOnline ?? false },
  });

  return NextResponse.json({ schedule }, { status: 201 });
}

// ─────────────────────────────────────────────────────────────────────────────
// src/app/api/admin/classes/[classId]/schedules/[scheduleId]/route.ts
// PUT + DELETE một lịch cụ thể — export riêng để dùng lại

export async function DELETE_SCHEDULE(scheduleId: string, userId: string) {
  await prisma.classSchedule.delete({ where: { id: scheduleId } });
}
