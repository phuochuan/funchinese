// src/app/api/admin/classes/[classId]/members/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireTeacher() {
  const session = await auth();
  if (!session?.user?.keycloakId || session.user.role !== "teacher") return null;
  return prisma.user.findUnique({ where: { keycloakId: session.user.keycloakId }, select: { id: true } });
}

// POST — teacher thêm học sinh (tìm theo email)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  const user = await requireTeacher();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { classId } = await params;
  const { email } = await req.json();

  const student = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true, email: true } });
  if (!student) return NextResponse.json({ error: "Không tìm thấy học sinh" }, { status: 404 });

  const existing = await prisma.classMember.findUnique({
    where: { classId_userId: { classId, userId: student.id } },
  });
  if (existing) return NextResponse.json({ error: "Học sinh đã trong lớp" }, { status: 409 });

  await prisma.classMember.create({ data: { classId, userId: student.id } });

  return NextResponse.json({ student }, { status: 201 });
}

// DELETE — xoá học sinh khỏi lớp
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  const user = await requireTeacher();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { classId } = await params;
  const { userId } = await req.json();

  await prisma.classMember.delete({
    where: { classId_userId: { classId, userId } },
  });

  return NextResponse.json({ ok: true });
}
