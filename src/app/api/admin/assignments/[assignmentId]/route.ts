// src/app/api/admin/assignments/[assignmentId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireTeacher() {
  const session = await auth();
  if (!session?.user?.keycloakId || session.user.role !== "teacher") return null;
  return prisma.user.findUnique({ where: { keycloakId: session.user.keycloakId }, select: { id: true } });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  const user = await requireTeacher();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { assignmentId } = await params;

  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: {
      class: { select: { id: true, name: true } },
      assignees: { include: { user: { select: { id: true, name: true, email: true, image: true } } } },
      submissions: {
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
          grade: true,
        },
        orderBy: { submittedAt: "desc" },
      },
    },
  });

  if (!assignment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ assignment });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  const user = await requireTeacher();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { assignmentId } = await params;
  const body = await req.json();

  const assignment = await prisma.assignment.update({
    where: { id: assignmentId },
    data: {
      ...(body.title       !== undefined && { title:       body.title }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.imageUrls   !== undefined && { imageUrls:   body.imageUrls }),
      ...(body.deadline    !== undefined && { deadline:    body.deadline ? new Date(body.deadline) : null }),
      ...(body.maxAttempts !== undefined && { maxAttempts: body.maxAttempts }),
      ...(body.allowLate   !== undefined && { allowLate:   body.allowLate }),
      ...(body.xpReward    !== undefined && { xpReward:    body.xpReward }),
    },
  });

  return NextResponse.json({ assignment });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  const user = await requireTeacher();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { assignmentId } = await params;
  await prisma.assignment.delete({ where: { id: assignmentId } });
  return NextResponse.json({ ok: true });
}
