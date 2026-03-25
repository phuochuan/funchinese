// src/app/api/admin/questions/import/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";

const execAsync = promisify(exec);

async function requireTeacher() {
  const session = await auth();
  if (!session?.user?.keycloakId || session.user.role !== "teacher") return null;
  return true;
}

// POST — bulk import từ CSV data (đã parse ở client)
export async function POST(req: NextRequest) {
  const ok = await requireTeacher();
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { rows, autoGenerateAudio } = body;
  // rows: [{ hanzi, pinyin, meaningVi, category, hskLevel, type }]

  if (!rows?.length) {
    return NextResponse.json({ error: "Không có dữ liệu" }, { status: 400 });
  }

  const results = { success: 0, skipped: 0, errors: [] as string[] };
  const audioDir = path.join(process.cwd(), "public", "audio", "zh");
  fs.mkdirSync(audioDir, { recursive: true });

  const count = await prisma.hskQuestion.count();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row.hanzi) { results.errors.push(`Row ${i+1}: thiếu hanzi`); continue; }

    try {
      const code    = `Q-${String(count + results.success + 1000).padStart(4, "0")}`;
      let audioUrl: string | null = null;

      // Auto generate audio nếu bật
      if (autoGenerateAudio && row.hanzi) {
        const filename   = `${encodeURIComponent(row.hanzi)}.mp3`;
        const outputPath = path.join(audioDir, filename);
        if (!fs.existsSync(outputPath)) {
          try {
            await execAsync(
              `edge-tts --voice zh-CN-XiaoxiaoNeural --text "${row.hanzi}" --write-media "${outputPath}"`
            );
          } catch { /* edge-tts chưa cài, bỏ qua */ }
        }
        if (fs.existsSync(outputPath)) {
          audioUrl = `/audio/zh/${filename}`;
        }
      }

      await prisma.hskQuestion.upsert({
        where:  { code },
        create: {
          code,
          hanzi:     row.hanzi,
          pinyin:    row.pinyin    ?? null,
          meaningVi: row.meaningVi ?? null,
          hskLevel:  parseInt(row.hskLevel ?? "1"),
          type:      row.type      ?? "MULTIPLE_CHOICE",
          category:  row.category  ?? null,
          audioUrl,
        },
        update: {
          pinyin:    row.pinyin    ?? null,
          meaningVi: row.meaningVi ?? null,
          hskLevel:  parseInt(row.hskLevel ?? "1"),
          category:  row.category  ?? null,
          ...(audioUrl && { audioUrl }),
        },
      });

      results.success++;
    } catch (e: any) {
      results.errors.push(`Row ${i+1} (${row.hanzi}): ${e.message}`);
    }
  }

  return NextResponse.json({ results });
}
