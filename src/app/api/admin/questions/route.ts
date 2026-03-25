// src/app/api/admin/questions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireTeacher() {
  const session = await auth();
  if (!session?.user?.keycloakId || session.user.role !== "teacher") return null;
  return true;
}

// GET — danh sách câu hỏi + filter + pagination
export async function GET(req: NextRequest) {
  const ok = await requireTeacher();
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp       = req.nextUrl.searchParams;
  const q        = sp.get("q")        ?? "";
  const hsk      = sp.get("hsk");
  const type     = sp.get("type");
  const page     = parseInt(sp.get("page")  ?? "1");
  const limit    = parseInt(sp.get("limit") ?? "20");

  const where: any = {};
  if (q)    where.OR = [
    { hanzi:     { contains: q, mode: "insensitive" } },
    { pinyin:    { contains: q, mode: "insensitive" } },
    { meaningVi: { contains: q, mode: "insensitive" } },
  ];
  if (hsk)  where.hskLevel = parseInt(hsk);
  if (type) where.type     = type;

  const [total, items] = await Promise.all([
    prisma.hskQuestion.count({ where }),
    prisma.hskQuestion.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip:    (page - 1) * limit,
      take:    limit,
    }),
  ]);

  // Stats per HSK level
  const stats = await prisma.hskQuestion.groupBy({
    by:      ["hskLevel"],
    _count:  { id: true },
    orderBy: { hskLevel: "asc" },
  });

  return NextResponse.json({
    questions: items,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    stats: stats.map(s => ({ level: s.hskLevel, count: s._count.id })),
  });
}

// POST — tạo câu hỏi mới
export async function POST(req: NextRequest) {
  const ok = await requireTeacher();
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { hanzi, pinyin, meaningVi, meaningEn, hskLevel, type, options, answer, explanation, category, tags, audioUrl } = body;

  if (!hanzi || !hskLevel) {
    return NextResponse.json({ error: "Thiếu hanzi hoặc hskLevel" }, { status: 400 });
  }

  // Generate code Q-XXXX
  const count = await prisma.hskQuestion.count();
  const code  = `Q-${String(count + 1000).padStart(4, "0")}`;

  const question = await prisma.hskQuestion.create({
    data: {
      code,
      hanzi, pinyin: pinyin ?? null,
      meaningVi: meaningVi ?? null,
      meaningEn: meaningEn ?? null,
      hskLevel: parseInt(hskLevel),
      type:     type ?? "MULTIPLE_CHOICE",
      options:  options ?? null,
      answer:   answer  ?? null,
      explanation: explanation ?? null,
      category: category ?? null,
      tags:     tags ?? [],
      audioUrl: audioUrl ?? null,
    },
  });

  return NextResponse.json({ question }, { status: 201 });
}
