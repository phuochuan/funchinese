import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

const UPLOAD_DIR = join(process.cwd(), "public", "uploads", "videos");
const MAX_SIZE   = 50 * 1024 * 1024; // 50 MB
const ALLOWED    = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"];

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.keycloakId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file     = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "Thiếu file" }, { status: 400 });
  }

  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json(
      { error: "Chỉ hỗ trợ định dạng MP4, WebM, MOV, AVI." },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "File quá lớn. Giới hạn: 50 MB." },
      { status: 400 }
    );
  }

  await mkdir(UPLOAD_DIR, { recursive: true });

  const ext      = file.name.split(".").pop() ?? "mp4";
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const filePath = join(UPLOAD_DIR, fileName);

  const bytes  = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  await writeFile(filePath, buffer);

  const url = `/uploads/videos/${fileName}`;
  return NextResponse.json({ url, fileName, size: file.size, mimeType: file.type });
}
