import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

const UPLOAD_DIR = join(process.cwd(), "public", "uploads", "avatars");
const MAX_SIZE   = 2 * 1024 * 1024; // 2 MB
const ALLOWED    = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.keycloakId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { keycloakId: session.user.keycloakId },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const formData = await req.formData();
  const file     = formData.get("avatar") as File | null;

  if (!file) {
    // Allow removing the avatar
    await prisma.userProfile.upsert({
      where:  { userId: user.id },
      create: { userId: user.id, avatar: null },
      update: { avatar: null },
    });
    return NextResponse.json({ avatar: null });
  }

  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json(
      { error: "Chỉ hỗ trợ định dạng JPEG, PNG, WebP, GIF." },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "Kích thước tối đa là 2 MB." },
      { status: 400 }
    );
  }

  // Ensure upload dir exists
  await mkdir(UPLOAD_DIR, { recursive: true });

  // Unique filename: userId-timestamp.ext
  const ext    = file.name.split(".").pop() ?? "jpg";
  const fileName = `${user.id}-${Date.now()}.${ext}`;
  const filePath = join(UPLOAD_DIR, fileName);

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  await writeFile(filePath, buffer);

  const avatarUrl = `/uploads/avatars/${fileName}`;

  await prisma.userProfile.upsert({
    where:  { userId: user.id },
    create: { userId: user.id, avatar: avatarUrl },
    update: { avatar: avatarUrl },
  });

  return NextResponse.json({ avatar: avatarUrl });
}
