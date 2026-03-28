// src/app/api/admin/assignments/[assignmentId]/grade/[submissionId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { addXP } from "@/lib/xp";

async function requireTeacher() {
  const session = await auth();
  if (!session?.user?.keycloakId || session.user.role !== "teacher") return null;
  return prisma.user.findUnique({ where: { keycloakId: session.user.keycloakId }, select: { id: true } });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ assignmentId: string; submissionId: string }> }
) {
  const user = await requireTeacher();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { submissionId } = await params;
  const { passed, score, comment, reassign } = await req.json();

  // Lấy submission
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: { assignment: { select: { xpReward: true } } },
  });
  if (!submission) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Xoá grade cũ nếu có
  await prisma.grade.deleteMany({ where: { submissionId } });

  // Tạo grade mới
  const grade = await prisma.grade.create({
    data: {
      submission: { connect: { id: submissionId } }, 
      teacher: { connect: { id: user.id } }, 
      passed:    passed ?? false,
      score:     passed ? 10 : 5 ,
      comment:   comment ?? null,
      reassign:  reassign ?? false,
      scores: {},
      totalScore: score  ?? 10,
    },
  });

  // Cập nhật status submission
  const newStatus = reassign ? "SUBMITTED" : "GRADED";
  await prisma.submission.update({
    where: { id: submissionId },
    data: { status: newStatus },
  });

  // Nếu đạt → cộng XP cho student
  if (passed && submission.assignment.xpReward) {
    await addXP(prisma, submission.userId, submission.assignment.xpReward);
  }

  // Tạo notification cho student
  await prisma.notification.create({
    data: {
      userId:  submission.userId,
      type:    "GRADE",
      title:   passed ? "Bài tập đã được chấm: Đạt ✓" : "Bài tập đã được chấm: Không đạt",
      body:    comment ?? (passed ? "Chúc mừng! Bạn đã hoàn thành bài tập." : "Bài tập chưa đạt. Hãy xem nhận xét của giáo viên."), // ← đổi message → body
      read:    false,
    },
  });

  return NextResponse.json({ grade });
}
