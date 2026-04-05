// src/app/api/admin/ai-questions/route.ts
// GET — Danh sách AI questions với filter
// POST — Approve/Reject nhiều questions cùng lúc
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireTeacher() {
  const session = await auth();
  if (!session?.user?.keycloakId || session.user.role !== "teacher") return null;
  return true;
}

// GET
export async function GET(req: NextRequest) {
  const ok = await requireTeacher();
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp    = req.nextUrl.searchParams;
  const q     = sp.get("q")       ?? "";
  const hsk   = sp.get("hsk");
  const status = sp.get("status");
  const page   = parseInt(sp.get("page")  ?? "1");
  const limit  = parseInt(sp.get("limit") ?? "20");

  const where: any = {};
  if (q)     where.vocabulary = {
    OR: [
      { hanzi:    { contains: q, mode: "insensitive" } },
      { pinyin:   { contains: q, mode: "insensitive" } },
      { meaningVi:{ contains: q, mode: "insensitive" } },
    ],
  };
  if (hsk)    where.hskLevel = parseInt(hsk);
  if (status) where.status  = status;

  const [total, items] = await Promise.all([
    prisma.aiQuestion.count({ where }),
    prisma.aiQuestion.findMany({
      where,
      include: {
        vocabulary: {
          select: { hanzi: true, pinyin: true, meaningVi: true, hskLevel: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  const stats = await prisma.aiQuestion.groupBy({
    by: ["status"],
    _count: { id: true },
  });

  return NextResponse.json({
    questions: items,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    stats: stats.map(s => ({ status: s.status, count: s._count.id })),
  });
}

// POST — bulk approve/reject
export async function POST(req: NextRequest) {
  const ok = await requireTeacher();
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { action, ids } = await req.json();
  if (!action || !Array.isArray(ids)) {
    return NextResponse.json({ error: "Cần action (approve|reject) và ids[]" }, { status: 400 });
  }

  const status = action === "approve" ? "approved" : "rejected";

  await prisma.aiQuestion.updateMany({
    where: { id: { in: ids } },
    data: { status, reviewedAt: new Date() },
  });

  return NextResponse.json({ updated: ids.length, status });
}
