// src/app/api/admin/questions/[questionId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireTeacher() {
  const session = await auth();
  if (!session?.user?.keycloakId || session.user.role !== "teacher") return null;
  return true;
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ questionId: string }> }
) {
  const ok = await requireTeacher();
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { questionId } = await params;
  const body = await req.json();

  const question = await prisma.hskQuestion.update({
    where: { id: questionId },
    data: {
      ...(body.hanzi       !== undefined && { hanzi:       body.hanzi }),
      ...(body.pinyin      !== undefined && { pinyin:      body.pinyin }),
      ...(body.meaningVi   !== undefined && { meaningVi:   body.meaningVi }),
      ...(body.hskLevel    !== undefined && { hskLevel:    body.hskLevel }),
      ...(body.type        !== undefined && { type:        body.type }),
      ...(body.options     !== undefined && { options:     body.options }),
      ...(body.answer      !== undefined && { answer:      body.answer }),
      ...(body.explanation !== undefined && { explanation: body.explanation }),
      ...(body.category    !== undefined && { category:    body.category }),
      ...(body.audioUrl    !== undefined && { audioUrl:    body.audioUrl }),

       // NEW FIELDS
      ...(body.questionText     !== undefined && { questionText: body.questionText }),
      ...(body.questionImageUrl !== undefined && { questionImageUrl: body.questionImageUrl }),
    },
  });

  return NextResponse.json({ question });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ questionId: string }> }
) {
  const ok = await requireTeacher();
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { questionId } = await params;
  await prisma.hskQuestion.delete({ where: { id: questionId } });
  return NextResponse.json({ ok: true });
}
