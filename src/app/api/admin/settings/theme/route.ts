// src/app/api/admin/settings/theme/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET /api/admin/settings/theme → { theme: string }
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.keycloakId || session.user.role !== "teacher") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const setting = await (prisma as any).appSetting.findUnique({
    where: { id: "global" },
    select: { theme: true },
  });

  return NextResponse.json({ theme: setting?.theme ?? "red" });
}

// PUT /api/admin/settings/theme → { theme: string }
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.keycloakId || session.user.role !== "teacher") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { theme } = await req.json();
  const VALID_THEMES = ["red", "blue", "green", "purple", "orange", "teal", "pink"];
  if (!VALID_THEMES.includes(theme)) {
    return NextResponse.json({ error: "Invalid theme" }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const setting = await (prisma as any).appSetting.upsert({
    where: { id: "global" },
    create: { id: "global", theme },
    update: { theme },
  });

  return NextResponse.json({ theme: setting.theme });
}
