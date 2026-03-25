// src/app/api/admin/questions/generate-audio/route.ts
// API để generate audio on-demand khi import câu hỏi
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
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

export async function POST(req: NextRequest) {
  const user = await requireTeacher();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { text } = await req.json();
  if (!text) return NextResponse.json({ error: "Thiếu text" }, { status: 400 });

  const outputDir  = path.join(process.cwd(), "public", "audio", "zh");
  const filename   = `${encodeURIComponent(text)}.mp3`;
  const outputPath = path.join(outputDir, filename);
  const publicUrl  = `/audio/zh/${filename}`;

  // Nếu đã có audio → trả về URL luôn
  if (fs.existsSync(outputPath)) {
    return NextResponse.json({ url: publicUrl, cached: true });
  }

  // Generate bằng edge-tts
  try {
    fs.mkdirSync(outputDir, { recursive: true });
    await execAsync(
      `edge-tts --voice zh-CN-XiaoxiaoNeural --text "${text}" --write-media "${outputPath}"`
    );
    return NextResponse.json({ url: publicUrl, cached: false });
  } catch (err) {
    console.error("[generate-audio] error:", err);
    return NextResponse.json({ error: "Không thể generate audio" }, { status: 500 });
  }
}
