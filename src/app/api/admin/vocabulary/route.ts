// src/app/api/admin/vocabulary/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateZhAudio } from "@/lib/tts";
import Papa from "papaparse";
import * as XLSX from "xlsx";


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

  let finalAudioUrl = audioUrl || null;

  // nếu chưa có audio mà muốn auto gen
  if (!finalAudioUrl && hanzi) {
    finalAudioUrl = await generateZhAudio(hanzi);
    console.log("gen audio")
  }


  const vocab = await prisma.vocabulary.create({
    data: {
      hanzi, pinyin,
      hanViet:         hanViet         || null,
      meaningVi,
      exampleSentence: exampleSentence || null,
      examplePinyin:   examplePinyin   || null,
      exampleVi:       exampleVi       || null,
      audioUrl:        finalAudioUrl        || null,
      hskLevel,
      wordType:        wordType        || null,
    },
  });

  return NextResponse.json({ vocab }, { status: 201 });
}


export async function PUT(req: NextRequest) {
  const user = await requireTeacher();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return NextResponse.json({ error: "Thiếu file" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let rows: any[] = [];

  // ─── Parse file ─────────────────────────────────────────
  if (file.name.endsWith(".csv")) {
    const csv = buffer.toString("utf-8");
    const parsed = Papa.parse(csv, { header: true });
    rows = parsed.data;
  } else if (file.name.match(/\.(xlsx|xls)$/)) {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json(sheet);
  } else {
    return NextResponse.json({ error: "Chỉ hỗ trợ CSV/XLSX" }, { status: 400 });
  }

  // ─── Utils ──────────────────────────────────────────────
  const normalizeRow = (row: any) =>
    Object.fromEntries(
      Object.entries(row).map(([k, v]) => [
        k.trim().toLowerCase(),
        typeof v === "string" ? v.trim() : v,
      ])
    );

  const mapHskLevel = (val: any) => {
    if (!val) return null;
    const v = String(val).toUpperCase().replace(/\s/g, "");

    // cho phép nhập: 1, HSK1, hsk 1
    if (["1","HSK1"].includes(v)) return "HSK1";
    if (["2","HSK2"].includes(v)) return "HSK2";
    if (["3","HSK3"].includes(v)) return "HSK3";
    if (["4","HSK4"].includes(v)) return "HSK4";
    if (["5","HSK5"].includes(v)) return "HSK5";
    if (["6","HSK6"].includes(v)) return "HSK6";

    return null;
  };

  let success = 0;
  let failed = 0;

  // ─── Process rows ───────────────────────────────────────
  for (const rawRow of rows) {
    try {
      const row = normalizeRow(rawRow);

      const hanzi = row.hanzi;
      const pinyin = row.pinyin;
      const meaningVi = row.meaningvi;

      const hanViet = row.hanviet || null;
      const exampleSentence = row.examplesentence || null;
      const examplePinyin = row.examplepinyin || null;
      const exampleVi = row.examplevi || null;
      const wordType = row.wordtype || null;

      const hskLevel = mapHskLevel(row.hsklevel);

      // ❗ validate
      if (!hanzi || !pinyin || !meaningVi || !hskLevel) {
        failed++;
        continue;
      }

      // 🔊 audio
      let finalAudioUrl = row.audiourl || null;
      if (!finalAudioUrl) {
        try {
          finalAudioUrl = await generateZhAudio(hanzi);
        } catch (e) {
          console.error("audio error:", e);
        }
      }

      await prisma.vocabulary.create({
        data: {
          hanzi,
          pinyin,
          hanViet,
          meaningVi,
          exampleSentence,
          examplePinyin,
          exampleVi,
          audioUrl: finalAudioUrl,
          hskLevel: hskLevel as any,
          wordType,
        },
      });

      success++;
    } catch (err) {
      console.error("row error:", err);
      failed++;
    }
  }

  return NextResponse.json({
    message: "Import xong",
    success,
    failed,
    total: rows.length,
  });
}