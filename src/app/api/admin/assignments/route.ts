// src/app/api/admin/assignments/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireTeacher() {
  const session = await auth();
  if (!session?.user?.keycloakId || session.user.role !== "teacher") return null;
  return prisma.user.findUnique({ where: { keycloakId: session.user.keycloakId }, select: { id: true } });
}

// GET — danh sách bài tập + filter
export async function GET(req: NextRequest) {
  const user = await requireTeacher();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp     = req.nextUrl.searchParams;
  const filter = sp.get("filter") ?? "pending"; // pending | all | closed
  const q      = sp.get("q")     ?? "";
  const page   = parseInt(sp.get("page") ?? "1");
  const limit  = 10;

  // Build where
  const where: any = {};
  if (q) where.title = { contains: q, mode: "insensitive" };

  const [total, items] = await Promise.all([
    prisma.assignment.count({ where }),
    prisma.assignment.findMany({
      where,
      orderBy: { deadline: "asc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        class: { select: { id: true, name: true } },
        assignees: { include: { user: { select: { id: true, name: true } } } },
        _count: { select: { submissions: true } },
        submissions: {
          select: { status: true },
        },
      },
    }),
  ]);

  // Stats
  const allSubmissions = await prisma.submission.findMany({
    select: { status: true },
  });
  const pendingCount = allSubmissions.filter(s => s.status === "SUBMITTED").length;
  const gradedCount  = allSubmissions.filter(s => s.status === "GRADED").length;

  // Filter pending = có submission SUBMITTED chưa chấm
  let filtered = items;
  if (filter === "pending") {
    filtered = items.filter(a => a.submissions.some(s => s.status === "SUBMITTED"));
  } else if (filter === "closed") {
    filtered = items.filter(a => a.deadline && new Date(a.deadline) < new Date());
  }

  const now = new Date();

  return NextResponse.json({
    assignments: filtered.map(a => {
      const submitted = a.submissions.filter(s => s.status === "SUBMITTED" || s.status === "GRADED").length;
      const totalAssignees = a.assignType === "CLASS"
        ? (a._count.submissions) // rough estimate
        : a.assignees.length;
      const deadlineDate = a.deadline ? new Date(a.deadline) : null;
      const diffMs   = deadlineDate ? deadlineDate.getTime() - now.getTime() : null;
      const diffHrs  = diffMs !== null ? Math.floor(diffMs / 3600000) : null;
      let deadlineStatus = "ok";
      if (diffHrs !== null) {
        if (diffHrs < 0)  deadlineStatus = "overdue";
        else if (diffHrs < 2)  deadlineStatus = "urgent";
        else if (diffHrs < 72) deadlineStatus = "soon";
      }

      return {
        id:           a.id,
        title:        a.title,
        assignType:   a.assignType,
        className:    a.class?.name ?? null,
        classId:      a.class?.id  ?? null,
        assignees:    a.assignees.map(ae => ({ id: ae.user.id, name: ae.user.name })),
        deadline:     a.deadline,
        deadlineStatus,
        diffHrs,
        submitted,
        totalAssignees,
        pct:          totalAssignees > 0 ? Math.round((submitted / totalAssignees) * 100) : 0,
        hasPending:   a.submissions.some(s => s.status === "SUBMITTED"),
      };
    }),
    stats: {
      pendingCount,
      gradedCount,
      total: allSubmissions.length,
    },
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  });
}

// POST — tạo bài tập mới
export async function POST(req: NextRequest) {
  const user = await requireTeacher();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    title, description, imageUrls, deadline,
    maxAttempts, allowLate, xpReward,
    assignType, classId, assigneeIds,
  } = body;

  if (!title) return NextResponse.json({ error: "Tiêu đề là bắt buộc" }, { status: 400 });

 const assignment = await prisma.assignment.create({
    data: {
      title,
      description:  description  ?? null,
      imageUrls:    imageUrls    ?? [],
      deadline:     deadline     ? new Date(deadline) : null,
      maxAttempts:  maxAttempts  ?? 1,
      allowLate:    allowLate    ?? true,
      xpReward:     xpReward     ?? 50,
      assignType:   assignType   ?? "CLASS",
      ...(classId ? {
        class: { connect: { id: classId } }
      } : {}),
    },
  });

  // Nếu assign cá nhân → tạo AssignmentAssignee
  if (assignType === "INDIVIDUAL" && assigneeIds?.length) {
    await prisma.assignmentAssignee.createMany({
      data: assigneeIds.map((uid: string) => ({
        assignmentId: assignment.id,
        userId:       uid,
      })),
    });
  }

  // Nếu assign lớp → tạo Submission DRAFT cho mỗi học sinh
  if (assignType === "CLASS" && classId) {
    const members = await prisma.classMember.findMany({
      where: { classId },
      select: { userId: true },
    });
    if (members.length > 0) {
      await prisma.submission.createMany({
        data: members.map(m => ({
          assignmentId: assignment.id,
          userId:       m.userId,
          status:       "DRAFT",
          attempt:      1,
          answers:      {},   
        })),
        skipDuplicates: true,
      });
    }
  }

  return NextResponse.json({ assignment }, { status: 201 });
}
