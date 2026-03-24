// src/app/api/admin/classes/[classId]/schedules/[scheduleId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireTeacher() {
  const session = await auth();
  if (!session?.user?.keycloakId || session.user.role !== "teacher") return null;
  return prisma.user.findUnique({ where: { keycloakId: session.user.keycloakId }, select: { id: true } });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ scheduleId: string }> }
) {
  const user = await requireTeacher();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { scheduleId } = await params;
  const body = await req.json();

  const schedule = await prisma.classSchedule.update({
    where: { id: scheduleId },
    data: {
      ...(body.dayOfWeek  !== undefined && { dayOfWeek:  body.dayOfWeek }),
      ...(body.startTime  !== undefined && { startTime:  body.startTime }),
      ...(body.endTime    !== undefined && { endTime:    body.endTime }),
      ...(body.location   !== undefined && { location:   body.location || null }),
      ...(body.isOnline   !== undefined && { isOnline:   body.isOnline }),
    },
  });

  return NextResponse.json({ schedule });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ scheduleId: string }> }
) {
  const user = await requireTeacher();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { scheduleId } = await params;
  await prisma.classSchedule.delete({ where: { id: scheduleId } });
  return NextResponse.json({ ok: true });
}
