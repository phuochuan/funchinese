// src/app/api/admin/vocabulary/[vocabId]/route.ts
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

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ vocabId: string }> }
) {
  const user = await requireTeacher();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { vocabId } = await params;
  const body = await req.json();

  const vocab = await prisma.vocabulary.update({
    where: { id: vocabId },
    data: {
      ...(body.hanzi           !== undefined && { hanzi: body.hanzi }),
      ...(body.pinyin          !== undefined && { pinyin: body.pinyin }),
      ...(body.hanViet         !== undefined && { hanViet: body.hanViet }),
      ...(body.meaningVi       !== undefined && { meaningVi: body.meaningVi }),
      ...(body.exampleSentence !== undefined && { exampleSentence: body.exampleSentence }),
      ...(body.exampleVi       !== undefined && { exampleVi: body.exampleVi }),
      ...(body.audioUrl        !== undefined && { audioUrl: body.audioUrl }),
      ...(body.hskLevel        !== undefined && { hskLevel: body.hskLevel }),
      ...(body.wordType        !== undefined && { wordType: body.wordType }),
    },
  });

  return NextResponse.json({ vocab });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ vocabId: string }> }
) {
  const user = await requireTeacher();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { vocabId } = await params;
  await prisma.vocabulary.delete({ where: { id: vocabId } });

  return NextResponse.json({ ok: true });
}
