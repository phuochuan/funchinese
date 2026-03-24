"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────
interface CourseItem {
  id: string;
  title: string;
  description: string | null;
  hskLevel: string;
  totalLessons: number;
  completedLessons: number;
  progressPct: number;
  status: "completed" | "in_progress" | "not_started";
  inProgressLessonId: string | null;
}

const HSK_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  HSK1: { bg: "bg-green-50",  text: "text-green-700",  border: "border-green-200" },
  HSK2: { bg: "bg-blue-50",   text: "text-blue-700",   border: "border-blue-200"  },
  HSK3: { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200"},
  HSK4: { bg: "bg-amber-50",  text: "text-amber-700",  border: "border-amber-200" },
  HSK5: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200"},
  HSK6: { bg: "bg-red-50",    text: "text-red-700",    border: "border-red-200"   },
};

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-surface-container rounded-xl ${className}`} />;
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/courses")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setCourses(d.courses);
      })
      .catch(() => setError("Không thể tải danh sách khoá học"))
      .finally(() => setLoading(false));
  }, []);

  // Khoá đang học (ưu tiên hiển thị)
  const activeIdx = courses.findIndex((c) => c.status === "in_progress");

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-on-surface">Lộ trình học</h1>
        <p className="text-sm text-on-surface-variant mt-1">
          Chinh phục tiếng Trung từ HSK 1 đến HSK 6
        </p>
      </div>

      {error && (
        <div className="text-center py-12">
          <span className="material-symbols-outlined text-4xl text-error block mb-2">error</span>
          <p className="text-sm text-on-surface-variant">{error}</p>
        </div>
      )}

      {loading && (
        <div className="space-y-4">
          {[1,2,3,4].map((i) => <Skeleton key={i} className="h-40 w-full" />)}
        </div>
      )}

      {!loading && !error && (
        <div className="space-y-4">
          {courses.map((course, idx) => {
            const color    = HSK_COLORS[course.hskLevel] ?? HSK_COLORS.HSK1;
            const isActive = idx === activeIdx;
            const isLocked = idx > 0
              && courses[idx - 1].status !== "completed"
              && course.status === "not_started";

            return (
              <div
                key={course.id}
                className={`rounded-2xl border transition-all overflow-hidden
                  ${isLocked
                    ? "border-outline-variant/20 opacity-60"
                    : isActive
                    ? "border-primary/30 shadow-md"
                    : "border-outline-variant/20 hover:shadow-sm"}`}
              >
                <div className={`p-5 md:p-6 ${isActive ? "bg-primary" : "bg-surface-container-lowest"}`}>
                  <div className="flex items-start gap-4">
                    {/* Left */}
                    <div className="flex-1 min-w-0">
                      {/* Badges */}
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border
                          ${isActive
                            ? "bg-white/20 text-white border-white/30"
                            : `${color.bg} ${color.text} ${color.border}`}`}>
                          {course.hskLevel}
                        </span>
                        {course.status === "completed" && (
                          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-green-100 text-green-700 border border-green-200 flex items-center gap-1">
                            <span className="material-symbols-outlined" style={{ fontSize: 12 }}>check_circle</span>
                            Hoàn thành
                          </span>
                        )}
                        {isActive && (
                          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white/20 text-white border border-white/30">
                            Đang học
                          </span>
                        )}
                        {isLocked && (
                          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant border border-outline-variant/20 flex items-center gap-1">
                            <span className="material-symbols-outlined" style={{ fontSize: 12 }}>lock</span>
                            Chưa mở
                          </span>
                        )}
                      </div>

                      <h2 className={`text-lg font-extrabold mb-1 ${isActive ? "text-white" : "text-on-surface"}`}>
                        {course.title}
                      </h2>

                      {course.description && (
                        <p className={`text-sm leading-relaxed mb-4 line-clamp-2
                          ${isActive ? "text-white/80" : "text-on-surface-variant"}`}>
                          {course.description}
                        </p>
                      )}

                      {/* Progress */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`text-xs font-semibold ${isActive ? "text-white/70" : "text-on-surface-variant"}`}>
                            {course.completedLessons}/{course.totalLessons} bài học
                          </span>
                          <span className={`text-sm font-extrabold italic ${isActive ? "text-white" : "text-primary"}`}>
                            {course.progressPct}%
                          </span>
                        </div>
                        <div className={`h-2 rounded-full overflow-hidden ${isActive ? "bg-white/20" : "bg-surface-container"}`}>
                          <div
                            className={`h-full rounded-full transition-all ${isActive ? "bg-secondary-fixed" : "bg-primary"}`}
                            style={{ width: `${course.progressPct}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Right — action */}
                    {!isLocked && (
                      <div className="flex-shrink-0">
                        {isActive ? (
                          <Link
                            href={`/home/student/courses/${course.id}`}
                            className="flex items-center gap-2 bg-white text-primary font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-primary-fixed transition-all"
                          >
                            Tiếp tục
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
                          </Link>
                        ) : course.status === "completed" ? (
                          <Link
                            href={`/home/student/courses/${course.id}`}
                            className="flex items-center gap-2 border border-outline-variant/40 text-on-surface font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-surface-container transition-all"
                          >
                            Xem lại
                          </Link>
                        ) : (
                          <Link
                            href={`/home/student/courses/${course.id}`}
                            className="flex items-center gap-2 bg-primary text-on-primary font-bold text-sm px-5 py-2.5 rounded-xl hover:brightness-110 transition-all"
                          >
                            Bắt đầu
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
