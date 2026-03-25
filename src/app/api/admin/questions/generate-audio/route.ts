// src/app/api/admin/questions/generate-audio/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import os from "os";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const execFileAsync = promisify(execFile);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!, 
);

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

  // 🔑 filename an toàn
  const fileName = crypto.createHash("md5").update(text).digest("hex") + ".mp3";
  const storagePath = `zh/${fileName}`;

  // 👉 Check file đã tồn tại trên Supabase chưa
  const { data: existing } = await supabase.storage
    .from("audio_question")
    .list("zh", { search: fileName });

  if (existing && existing.length > 0) {
    const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/audio_question/${storagePath}`;
    return NextResponse.json({ url: publicUrl, cached: true });
  }

  // 📂 tạo file tạm
  const tempPath = path.join(os.tmpdir(), fileName);

  try {
    // 🎤 generate audio (fix exec)
    await execFileAsync("edge-tts", [
      "--voice",
      "zh-CN-XiaoxiaoNeural",
      "--text",
      text,
      "--write-media",
      tempPath,
    ]);

    // 🔍 check file tồn tại
    if (!fs.existsSync(tempPath)) {
      throw new Error("Audio file not generated");
    }

    // ☁️ upload lên Supabase
    const fileBuffer = fs.readFileSync(tempPath);

    const { error: uploadError } = await supabase.storage
      .from("audio_question")
      .upload(storagePath, fileBuffer, {
        contentType: "audio/mpeg",
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // 🌍 public URL
    const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/audio_question/${storagePath}`;

    return NextResponse.json({ url: publicUrl, cached: false });
  } catch (err) {
    console.error("[generate-audio] error:", err);
    return NextResponse.json({ error: "Không thể generate audio" }, { status: 500 });
  } finally {
    // 🧹 cleanup
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
  }
}