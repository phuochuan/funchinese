// src/app/api/student/assignments/[assignmentId]/submit/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  const session = await auth();
  if (!session?.user?.keycloakId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({
    where: { keycloakId: session.user.keycloakId },
    select: { id: true },
  });
  if (!dbUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { assignmentId } = await params;

  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: { class: { select: { name: true } } },
  });
  if (!assignment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Submission hiện tại của user
  const submission = await prisma.submission.findFirst({
    where: { assignmentId, userId: dbUser.id },
    orderBy: { attempt: "desc" },
    include: { grade: { include: { teacher: { select: { name: true } } } } },
  });

  return NextResponse.json({ assignment, submission });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  const session = await auth();
  if (!session?.user?.keycloakId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({
    where: { keycloakId: session.user.keycloakId },
    select: { id: true },
  });
  if (!dbUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { assignmentId } = await params;
  const { textContent, mediaUrls } = await req.json();

  // Lấy submission hiện tại
  const existing = await prisma.submission.findFirst({
    where: { assignmentId, userId: dbUser.id },
    orderBy: { attempt: "desc" },
  });

  if (!existing) return NextResponse.json({ error: "Bạn không có quyền nộp bài này" }, { status: 403 });
  if (existing.status === "SUBMITTED") return NextResponse.json({ error: "Bạn đã nộp bài rồi" }, { status: 400 });

  // Nếu reassign → tạo submission mới với attempt++
  const isReassign = existing.status === "REASSIGNED";
  let submission;

  if (isReassign) {
    submission = await prisma.submission.create({
      data: {
        assignmentId,
        userId:      dbUser.id,
        status:      "SUBMITTED",
        textContent: textContent ?? null,
        mediaUrls:   mediaUrls   ?? [],
        attempt:     existing.attempt + 1,
        submittedAt: new Date(),
      },
    });
  } else {
    submission = await prisma.submission.update({
      where: { id: existing.id },
      data: {
        status:      "SUBMITTED",
        textContent: textContent ?? null,
        mediaUrls:   mediaUrls   ?? [],
        submittedAt: new Date(),
      },
    });
  }

  return NextResponse.json({ submission });
}
