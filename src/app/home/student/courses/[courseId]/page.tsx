"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────
interface LessonItem {
  id: string;
  title: string;
  titleChinese: string | null;
  durationMins: number;
  status: "completed" | "in_progress" | "available" | "locked";
  completedAt: string | null;
  lastViewedAt: string | null;
}

interface ChapterItem {
  id: string;
  title: string;
  totalLessons: number;
  completedLessons: number;
  totalMins: number;
  lessons: LessonItem[];
}

interface CourseDetail {
  course: {
    id: string;
    title: string;
    description: string | null;
    hskLevel: string;
  };
  stats: {
    totalLessons: number;
    completedLessons: number;
    progressPct: number;
    totalMinutes: number;
    enrolledCount: number;
  };
  continueLesson: { id: string; title: string; titleChinese: string | null } | null;
  chapters: ChapterItem[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtMins(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m} phút`;
  if (m === 0) return `${h} giờ`;
  return `${h} giờ ${m} phút`;
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-surface-container rounded-xl ${className}`} />;
}

// ─── Lesson status icon ───────────────────────────────────────────────────────
function LessonIcon({ status }: { status: LessonItem["status"] }) {
  if (status === "completed") {
    return (
      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
        <span className="material-symbols-outlined text-white" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>check</span>
      </div>
    );
  }
  if (status === "in_progress") {
    return (
      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
        <span className="material-symbols-outlined text-white" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
      </div>
    );
  }
  if (status === "locked") {
    return (
      <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center flex-shrink-0">
        <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 16 }}>lock</span>
      </div>
    );
  }
  return (
    <div className="w-8 h-8 rounded-full border-2 border-outline-variant/40 flex items-center justify-center flex-shrink-0">
      <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 14 }}>circle</span>
    </div>
  );
}

// ─── Chapter accordion ────────────────────────────────────────────────────────
function ChapterAccordion({
  chapter,
  idx,
  continueId,
  defaultOpen,
}: {
  chapter: ChapterItem;
  idx: number;
  continueId: string | null;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border border-outline-variant/20 rounded-2xl overflow-hidden">
      {/* Chapter header */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-4 p-4 md:p-5 bg-surface-container-lowest hover:bg-surface-container transition-colors text-left"
      >
        <div className="w-9 h-9 rounded-xl bg-surface-container-high flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-extrabold text-on-surface-variant">
            {String(idx + 1).padStart(2, "0")}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-on-surface text-sm md:text-base">{chapter.title}</p>
          <p className="text-xs text-on-surface-variant mt-0.5">
            {chapter.completedLessons}/{chapter.totalLessons} bài học đã hoàn thành
            {" · "}
            {fmtMins(chapter.totalMins)}
          </p>
        </div>
        <span
          className="material-symbols-outlined text-on-surface-variant transition-transform flex-shrink-0"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          expand_more
        </span>
      </button>

      {/* Lessons list */}
      {open && (
        <div className="divide-y divide-outline-variant/10">
          {chapter.lessons.map((lesson) => {
            const isCurrent = lesson.id === continueId;
            const isClickable = lesson.status !== "locked";

            const inner = (
              <div className={`flex items-center gap-4 px-4 md:px-5 py-3.5 transition-colors
                ${isCurrent
                  ? "bg-primary/5 border-l-4 border-primary"
                  : isClickable
                  ? "hover:bg-surface-container"
                  : "opacity-50 cursor-not-allowed"}`}>
                <LessonIcon status={lesson.status} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`text-sm font-semibold truncate
                      ${lesson.status === "locked" ? "text-on-surface-variant" : "text-on-surface"}`}>
                      {lesson.title}
                    </p>
                    {isCurrent && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary text-on-primary flex-shrink-0">
                        ĐANG HỌC
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {lesson.titleChinese && (
                      <span className="text-xs text-on-surface-variant chinese-text">
                        {lesson.titleChinese}
                      </span>
                    )}
                    {lesson.titleChinese && (
                      <span className="text-on-surface-variant/30 text-xs">·</span>
                    )}
                    <span className="text-xs text-on-surface-variant">
                      {fmtMins(lesson.durationMins)}
                    </span>
                  </div>
                </div>

                {isClickable && (
                  <span className="material-symbols-outlined text-on-surface-variant flex-shrink-0" style={{ fontSize: 18 }}>
                    chevron_right
                  </span>
                )}
              </div>
            );

            return isClickable ? (
              <Link key={lesson.id} href={`/home/student/lessons/${lesson.id}`}>
                {inner}
              </Link>
            ) : (
              <div key={lesson.id}>{inner}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = use(params);
  const [data, setData]       = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/courses/${courseId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setData(d);
      })
      .catch(() => setError("Không thể tải khoá học"))
      .finally(() => setLoading(false));
  }, [courseId]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <span className="material-symbols-outlined text-4xl text-error block mb-2">error</span>
          <p className="text-sm text-on-surface-variant mb-4">{error}</p>
          <button onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-bold">
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  // Tìm chapter nào chứa bài tiếp theo để mở accordion đó
  const continueId = data?.continueLesson?.id ?? null;
  const openChapterIdx = data?.chapters.findIndex((ch) =>
    ch.lessons.some((l) => l.id === continueId)
  ) ?? 0;

  return (
    <div className="pb-28 lg:pb-6">
      {/* ── Hero Banner ── */}
      <div className="bg-primary relative overflow-hidden">
        <div className="absolute right-0 top-0 text-[12rem] chinese-text font-bold text-white/5 leading-none select-none pointer-events-none">
          {data?.course.hskLevel.replace("HSK", "") ?? ""}
        </div>

        <div className="container mx-auto px-4 md:px-6 py-8 md:py-10 relative z-10">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-white/60 text-xs mb-4">
            <Link href="/home/student/courses" className="hover:text-white transition-colors">
              Lộ trình học
            </Link>
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>chevron_right</span>
            {loading
              ? <Skeleton className="h-3 w-24 bg-white/20" />
              : <span className="text-white/80">{data?.course.title}</span>
            }
          </div>

          <div className="flex flex-col lg:flex-row gap-6 items-start">
            {/* Left: title + desc + progress */}
            <div className="flex-1">
              {loading ? (
                <>
                  <Skeleton className="h-5 w-32 bg-white/20 mb-3" />
                  <Skeleton className="h-10 w-64 bg-white/20 mb-3" />
                  <Skeleton className="h-4 w-full max-w-md bg-white/20 mb-6" />
                </>
              ) : (
                <>
                  <div className="inline-block text-xs font-bold px-3 py-1 rounded-full bg-white/20 text-white border border-white/20 mb-3 uppercase tracking-wider">
                    HSK Standard Course
                  </div>
                  <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-3 leading-tight">
                    {data?.course.title}
                  </h1>
                  {data?.course.description && (
                    <p className="text-white/80 text-sm leading-relaxed mb-6 max-w-xl">
                      {data.course.description}
                    </p>
                  )}
                </>
              )}

              {/* Progress bar */}
              <div className="max-w-sm">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-white/70">Tiến độ khóa học</span>
                  <span className="text-sm font-extrabold italic text-white">
                    {loading ? "—" : `${data?.stats.progressPct}%`}
                  </span>
                </div>
                <div className="h-2.5 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-secondary-fixed rounded-full transition-all duration-700"
                    style={{ width: `${data?.stats.progressPct ?? 0}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Right: Next lesson card */}
            {!loading && data?.continueLesson && (
              <div className="w-full lg:w-64 bg-white rounded-2xl p-5 flex-shrink-0 shadow-xl">
                <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center mb-3">
                  <span className="material-symbols-outlined text-amber-600" style={{ fontSize: 24, fontVariationSettings: "'FILL' 1" }}>
                    menu_book
                  </span>
                </div>
                <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">
                  Bài học tiếp theo
                </p>
                <p className="text-sm font-bold text-on-surface mb-3 line-clamp-2">
                  {data.continueLesson.title}
                </p>
                {data.continueLesson.titleChinese && (
                  <p className="chinese-text text-lg text-primary mb-3">
                    {data.continueLesson.titleChinese}
                  </p>
                )}
                <Link
                  href={`/home/student/lessons/${data.continueLesson.id}`}
                  className="block w-full text-center bg-primary text-on-primary font-bold text-sm py-2.5 rounded-xl hover:brightness-110 transition-all"
                >
                  Tiếp tục học
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="container mx-auto px-4 md:px-6 py-6">
        <div className="flex flex-col lg:flex-row gap-6">

          {/* Left: Chapters list */}
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-extrabold text-on-surface mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-primary rounded-full block" />
              Nội dung khóa học
            </h2>

            {loading ? (
              <div className="space-y-3">
                {[1,2,3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
              </div>
            ) : (
              <div className="space-y-3">
                {data?.chapters.map((chapter, idx) => (
                  <ChapterAccordion
                    key={chapter.id}
                    chapter={chapter}
                    idx={idx}
                    continueId={continueId}
                    defaultOpen={idx === openChapterIdx}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right: Course info sidebar */}
          <div className="w-full lg:w-64 flex-shrink-0 space-y-4">
            <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-2xl p-5">
              <h3 className="font-bold text-on-surface mb-4">Thông tin khóa học</h3>

              {loading ? (
                <div className="space-y-3">
                  {[1,2,3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>group</span>
                    </div>
                    <div>
                      <p className="text-xs text-on-surface-variant">Học viên</p>
                      <p className="text-sm font-bold text-on-surface">
                        {(data?.stats.enrolledCount ?? 0).toLocaleString("vi-VN")} người đang học
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 16 }}>schedule</span>
                    </div>
                    <div>
                      <p className="text-xs text-on-surface-variant">Tổng thời lượng</p>
                      <p className="text-sm font-bold text-on-surface">
                        {fmtMins(data?.stats.totalMinutes ?? 0)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>verified</span>
                    </div>
                    <div>
                      <p className="text-xs text-on-surface-variant">Chứng chỉ</p>
                      <p className="text-sm font-bold text-on-surface">
                        {data?.course.hskLevel} Standardized
                      </p>
                    </div>
                  </div>

                  {/* Progress circle */}
                  <div className="pt-3 border-t border-outline-variant/10">
                    <div className="flex items-center gap-3">
                      <div className="relative w-14 h-14 flex-shrink-0">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                          <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor"
                            strokeWidth="3" className="text-surface-container" />
                          <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor"
                            strokeWidth="3" strokeLinecap="round" className="text-primary"
                            strokeDasharray={`${(data?.stats.progressPct ?? 0) * 94.2 / 100} 94.2`} />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xs font-extrabold text-primary">
                            {data?.stats.progressPct ?? 0}%
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-on-surface-variant">Đã hoàn thành</p>
                        <p className="text-sm font-bold text-on-surface">
                          {data?.stats.completedLessons}/{data?.stats.totalLessons} bài
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Encouragement + CTA */}
            {!loading && data?.continueLesson && (
              <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-2xl p-5">
                <p className="text-sm font-bold text-primary mb-3">Bạn đang học tốt lắm!</p>
                <Link
                  href={`/home/student/lessons/${data.continueLesson.id}`}
                  className="flex items-center justify-center gap-2 w-full bg-primary text-on-primary font-bold text-sm py-3 rounded-xl hover:brightness-110 transition-all"
                >
                  HỌC TIẾP NGAY
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Sticky bottom bar (mobile) ── */}
      {!loading && data?.continueLesson && (
        <div className="lg:hidden fixed bottom-16 left-0 right-0 z-20 bg-surface-container-lowest border-t border-outline-variant/20 px-4 py-3">
          <div className="flex items-center gap-3">
            {/* Progress circle mini */}
            <div className="relative w-11 h-11 flex-shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor"
                  strokeWidth="4" className="text-surface-container" />
                <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor"
                  strokeWidth="4" strokeLinecap="round" className="text-primary"
                  strokeDasharray={`${(data.stats.progressPct) * 94.2 / 100} 94.2`} />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[9px] font-extrabold text-primary">{data.stats.progressPct}%</span>
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                Tiếp tục hành trình
              </p>
              <p className="text-sm font-bold text-on-surface truncate">
                {data.continueLesson.title}
              </p>
            </div>

            <Link
              href={`/home/student/lessons/${data.continueLesson.id}`}
              className="flex-shrink-0 bg-primary text-on-primary font-bold text-xs px-4 py-2.5 rounded-xl hover:brightness-110 transition-all"
            >
              Học ngay →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
