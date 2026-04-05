// src/app/api/admin/ai-questions/[questionId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireTeacher() {
  const session = await auth();
  if (!session?.user?.keycloakId || session.user.role !== "teacher") return null;
  return true;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ questionId: string }> }) {
  const ok = await requireTeacher();
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { questionId } = await params;
  const q = await prisma.aiQuestion.findUnique({
    where: { id: questionId },
    include: { vocabulary: { select: { hanzi: true, pinyin: true, meaningVi: true } } },
  });

  if (!q) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
  return NextResponse.json({ question: q });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ questionId: string }> }) {
  const ok = await requireTeacher();
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { questionId } = await params;
  const body = await req.json();
  const { questionText, correctAnswer, options, explanation, imageUrl, status } = body;

  if (!questionText || !correctAnswer) {
    return NextResponse.json({ error: "Thiếu questionText hoặc correctAnswer" }, { status: 400 });
  }

  const q = await prisma.aiQuestion.update({
    where: { id: questionId },
    data: {
      questionText,
      correctAnswer,
      options: options ?? [],
      explanation: explanation ?? null,
      imageUrl: imageUrl ?? null,
      status: status ?? "pending",
      reviewedAt: new Date(),
    },
  });

  return NextResponse.json({ question: q });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ questionId: string }> }) {
  const ok = await requireTeacher();
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { questionId } = await params;
  await prisma.aiQuestion.delete({ where: { id: questionId } });
  return NextResponse.json({ deleted: true });
}
