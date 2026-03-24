// src/app/api/student/assignments/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.keycloakId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({
    where: { keycloakId: session.user.keycloakId },
    select: { id: true },
  });
  if (!dbUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const filter = req.nextUrl.searchParams.get("filter") ?? "pending";

  // Submissions của user
  const submissions = await prisma.submission.findMany({
    where: { userId: dbUser.id },
    include: {
      assignment: {
        include: {
          class: { select: { id: true, name: true } },
        },
      },
      grade: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const now = new Date();

  const items = submissions.map(s => {
    const dl       = s.assignment.deadline ? new Date(s.assignment.deadline) : null;
    const diffMs   = dl ? dl.getTime() - now.getTime() : null;
    const diffHrs  = diffMs !== null ? Math.floor(diffMs / 3600000) : null;
    const isLate   = diffHrs !== null && diffHrs < 0 && s.status !== "SUBMITTED" && s.status !== "GRADED";

    return {
      submissionId: s.id,
      assignmentId: s.assignment.id,
      title:        s.assignment.title,
      className:    s.assignment.class?.name ?? "Bài cá nhân",
      deadline:     s.assignment.deadline,
      diffHrs,
      status:       s.status,
      passed:       s.grade?.passed ?? null,
      score:        s.grade?.score  ?? null,
      reassign:     s.grade?.reassign ?? false,
      attempt:      s.attempt,
      maxAttempts:  s.assignment.maxAttempts,
      xpReward:     s.assignment.xpReward,
    };
  });

  let filtered = items;
  if (filter === "pending") filtered = items.filter(i => i.status === "DRAFT" || i.status === "REASSIGNED");
  if (filter === "submitted") filtered = items.filter(i => i.status === "SUBMITTED");
  if (filter === "graded") filtered = items.filter(i => i.status === "GRADED");

  // Weekly stats
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay() + 1); weekStart.setHours(0,0,0,0);
  const weekSubmitted = submissions.filter(s =>
    s.submittedAt && new Date(s.submittedAt) >= weekStart
  ).length;
  const weekTotal = submissions.filter(s => {
    const dl = s.assignment.deadline;
    return dl && new Date(dl) >= weekStart && new Date(dl) <= new Date(weekStart.getTime() + 7*86400000);
  }).length;

  return NextResponse.json({
    assignments: filtered,
    stats: {
      pending:   items.filter(i => i.status === "DRAFT" || i.status === "REASSIGNED").length,
      submitted: items.filter(i => i.status === "SUBMITTED").length,
      graded:    items.filter(i => i.status === "GRADED").length,
    },
    weekly: { submitted: weekSubmitted, total: weekTotal || 4 },
  });
}
