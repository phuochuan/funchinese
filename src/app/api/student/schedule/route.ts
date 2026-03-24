// src/app/api/student/schedule/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

function getMonday(d: Date) {
  const date = new Date(d);
  const day  = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.keycloakId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { keycloakId: session.user.keycloakId },
    select: { id: true, streakDays: true, xp: true },
  });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const weekParam = req.nextUrl.searchParams.get("week");
  const monday    = weekParam ? new Date(weekParam) : getMonday(new Date());
  const sunday    = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  // Lấy lớp user đang tham gia — chỉ dùng fields có trong schema
  const memberships = await prisma.classMember.findMany({
    where: { userId: dbUser.id },
    include: {
      class: {
        include: {
          schedules: true,
          members:   { select: { userId: true } },
          // course đã có relation rồi
          course: { select: { id: true, title: true, hskLevel: true } },
        },
      },
    },
  });

  // Lấy teacherId → query teacher riêng
  const teacherIds = [...new Set(memberships.map(m => m.class.teacherId))];
  const teachers   = await prisma.user.findMany({
    where: { id: { in: teacherIds } },
    select: { id: true, name: true, image: true },
  });
  const teacherMap = new Map(teachers.map(t => [t.id, t]));

  // Build lịch theo ngày trong tuần (1=T2 ... 7=CN)
  const days: Record<number, any[]> = { 1:[], 2:[], 3:[], 4:[], 5:[], 6:[], 7:[] };
  const now = new Date();

  for (const m of memberships) {
    const cls     = m.class;
    const teacher = teacherMap.get(cls.teacherId);

    for (const schedule of cls.schedules) {
      // Tính ngày cụ thể của buổi học trong tuần này
      const dayDate = new Date(monday);
      dayDate.setDate(monday.getDate() + (schedule.dayOfWeek - 1));
      dayDate.setHours(0, 0, 0, 0);

      // Tính status
      const startDt = new Date(dayDate);
      const [sh, sm] = schedule.startTime.split(":").map(Number);
      startDt.setHours(sh, sm, 0, 0);

      const endDt = new Date(dayDate);
      const [eh, em] = schedule.endTime.split(":").map(Number);
      endDt.setHours(eh, em, 0, 0);

      let status: string;
      if      (now > endDt)                                          status = "COMPLETED";
      else if (now >= startDt && now <= endDt)                       status = "ONGOING";
      else if (dayDate.toDateString() === now.toDateString())        status = "TODAY";
      else                                                           status = "SCHEDULED";

      days[schedule.dayOfWeek].push({
        scheduleId:   schedule.id,
        sessionId:    null,
        classId:      cls.id,
        className:    cls.name,
        teacherName:  teacher?.name  ?? "Giáo viên",
        teacherImage: teacher?.image ?? null,
        date:         dayDate.toISOString(),
        startTime:    schedule.startTime,
        endTime:      schedule.endTime,
        location:     schedule.location,
        isOnline:     schedule.isOnline,
        status,
        cancelReason: null,
        course:       cls.course,
      });
    }
  }

  // Sort mỗi ngày theo giờ bắt đầu
  for (const d of Object.values(days)) {
    d.sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  return NextResponse.json({
    week: {
      monday: monday.toISOString(),
      sunday: sunday.toISOString(),
    },
    days,
    userStreak: dbUser.streakDays,
    userXP:     dbUser.xp,
    classes:    memberships.map(m => ({
      id:   m.class.id,
      name: m.class.name,
    })),
  });
}
