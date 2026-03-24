// src/app/api/admin/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!, 
);

// Bucket names trong Supabase Storage
const BUCKETS = {
  image: "lesson-images",
  audio: "vocab-audio",
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.keycloakId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData  = await req.formData();
  const file      = formData.get("file") as File | null;
  const type      = formData.get("type") as "image" | "audio" | null;

  if (!file || !type) {
    return NextResponse.json({ error: "Thiếu file hoặc type" }, { status: 400 });
  }

  // Validate
  const MAX_SIZE = type === "image" ? 5 * 1024 * 1024 : 10 * 1024 * 1024; // 5MB / 10MB
  if (file.size > MAX_SIZE) {
    return NextResponse.json({
      error: `File quá lớn. Giới hạn: ${type === "image" ? "5MB" : "10MB"}`,
    }, { status: 400 });
  }

  const ALLOWED_TYPES = {
    image: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    audio: ["audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/m4a"],
  };

  if (!ALLOWED_TYPES[type].includes(file.type)) {
    return NextResponse.json({
      error: `Định dạng không hỗ trợ. Cho phép: ${ALLOWED_TYPES[type].join(", ")}`,
    }, { status: 400 });
  }

  // Tạo tên file unique
  const ext      = file.name.split(".").pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const bucket   = BUCKETS[type];

  // Upload lên Supabase Storage
  const arrayBuffer = await file.arrayBuffer();
  const buffer      = Buffer.from(arrayBuffer);

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(fileName, buffer, {
      contentType: file.type,
      upsert:      false,
    });

  if (uploadError) {
    console.error("[upload] Supabase error:", uploadError);
    return NextResponse.json({ error: "Lỗi upload file" }, { status: 500 });
  }

  // Lấy public URL
  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(fileName);

  return NextResponse.json({
    url:      urlData.publicUrl,
    fileName,
    type,
    size:     file.size,
    mimeType: file.type,
  });
}
