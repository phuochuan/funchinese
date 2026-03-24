// src/app/api/admin/vocabulary/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireTeacher() {
  const session = await auth();
  if (!session?.user?.keycloakId || session.user.role !== "teacher") return null;
  return await prisma.user.findUnique({
    where: { keycloakId: session.user.keycloakId },
    select: { id: true },
  });
}

export async function GET(req: NextRequest) {
  const user = await requireTeacher();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search     = searchParams.get("q")     ?? "";
  const hskLevel   = searchParams.get("hsk")   ?? "";
  const wordType   = searchParams.get("type")  ?? "";
  const hasAudio   = searchParams.get("audio");
  const page       = parseInt(searchParams.get("page")  ?? "1");
  const limit      = parseInt(searchParams.get("limit") ?? "10");

  const where: any = {};

  if (search) {
    where.OR = [
      { hanzi:    { contains: search, mode: "insensitive" } },
      { pinyin:   { contains: search, mode: "insensitive" } },
      { hanViet:  { contains: search, mode: "insensitive" } },
      { meaningVi:{ contains: search, mode: "insensitive" } },
    ];
  }
  if (hskLevel)         where.hskLevel  = hskLevel;
  if (wordType)         where.wordType  = wordType;
  if (hasAudio === "1") where.audioUrl  = { not: null };
  if (hasAudio === "0") where.audioUrl  = null;

  const [total, items] = await Promise.all([
    prisma.vocabulary.count({ where }),
    prisma.vocabulary.findMany({
      where,
      orderBy: [{ hskLevel: "asc" }, { hanzi: "asc" }],
      skip:  (page - 1) * limit,
      take:  limit,
    }),
  ]);

  return NextResponse.json({
    vocabulary: items,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export async function POST(req: NextRequest) {
  const user = await requireTeacher();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    hanzi, pinyin, hanViet, meaningVi,
    exampleSentence, examplePinyin, exampleVi,
    audioUrl, hskLevel, wordType,
  } = body;

  if (!hanzi || !pinyin || !meaningVi || !hskLevel) {
    return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
  }

  const vocab = await prisma.vocabulary.create({
    data: {
      hanzi, pinyin,
      hanViet:         hanViet         || null,
      meaningVi,
      exampleSentence: exampleSentence || null,
      examplePinyin:   examplePinyin   || null,
      exampleVi:       exampleVi       || null,
      audioUrl:        audioUrl        || null,
      hskLevel,
      wordType:        wordType        || null,
    },
  });

  return NextResponse.json({ vocab }, { status: 201 });
}
