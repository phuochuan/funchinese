// src/app/api/admin/chapters/[chapterId]/lessons/route.ts
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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ chapterId: string }> }
) {
  const user = await requireTeacher();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { chapterId } = await params;
  const { title, titleChinese, pinyin, durationMins } = await req.json();

  const maxOrder = await prisma.lesson.aggregate({
    where: { chapterId },
    _max: { sortOrder: true },
  });

  const lesson = await prisma.lesson.create({
    data: {
      chapterId,
      title,
      titleChinese,
      pinyin,
      durationMins: durationMins ?? 15,
      sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
      isPublished: false,
    },
  });

  return NextResponse.json({ lesson }, { status: 201 });
}
