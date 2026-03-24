"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface AssignmentCard {
  submissionId: string; assignmentId: string; title: string;
  className: string; deadline: string | null; diffHrs: number | null;
  status: string; passed: boolean | null; score: number | null;
  reassign: boolean; attempt: number; maxAttempts: number; xpReward: number;
}
interface Stats { pending: number; submitted: number; graded: number; }

const ICON_MAP: Record<string, string> = {
  DRAFT: "edit", SUBMITTED: "hourglass_top",
  GRADED: "task_alt", REASSIGNED: "refresh",
};

function DeadlineTag({ diffHrs }: { diffHrs: number | null }) {
  if (diffHrs === null) return null;
  if (diffHrs < 0)    return <span className="text-[10px] font-extrabold px-2 py-0.5 bg-error text-white rounded-full">Không đạt</span>;
  if (diffHrs < 6)    return <span className="text-[10px] font-extrabold px-2 py-0.5 bg-error text-white rounded-full">Còn {diffHrs} giờ</span>;
  if (diffHrs < 72)   return <span className="text-[10px] font-extrabold px-2 py-0.5 bg-amber-500 text-white rounded-full">{Math.ceil(diffHrs/24)} ngày còn lại</span>;
  return null;
}

function AssignmentCard({ item }: { item: AssignmentCard }) {
  const isLate    = item.diffHrs !== null && item.diffHrs < 0 && item.status === "DRAFT";
  const showScore = item.status === "GRADED" && item.score !== null;

  return (
    <div className={`bg-white rounded-2xl border p-5 flex flex-col gap-4 hover:shadow-md transition-all
      ${isLate ? "border-error/30" : "border-gray-100"}`}>
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
          ${item.status === "GRADED" ? "bg-secondary/10" :
            item.status === "SUBMITTED" ? "bg-primary/10" :
            item.status === "REASSIGNED" ? "bg-error/10" : "bg-surface-container"}`}>
          <span className={`material-symbols-outlined ${
            item.status === "GRADED" ? "text-secondary" :
            item.status === "SUBMITTED" ? "text-primary" :
            item.status === "REASSIGNED" ? "text-error" : "text-on-surface-variant"}`}
            style={{ fontSize: 20 }}>{ICON_MAP[item.status] ?? "assignment"}</span>
        </div>

        <div className="flex-1 min-w-0">
          {item.diffHrs !== null && (
            <DeadlineTag diffHrs={item.diffHrs} />
          )}
          {showScore && (
            <span className="text-[10px] font-extrabold px-2 py-0.5 bg-secondary/10 text-secondary rounded-full">
              Đạt: {item.score}/10
            </span>
          )}
          {item.status === "REASSIGNED" && (
            <span className="text-[10px] font-extrabold px-2 py-0.5 bg-error/10 text-error rounded-full">Không đạt</span>
          )}
        </div>
      </div>

      {/* Content */}
      <div>
        <p className="text-xs text-on-surface-variant mb-1">
          {item.className} • Bài {item.attempt}
        </p>
        <h3 className="font-extrabold text-on-surface leading-snug mb-1">{item.title}</h3>
        <p className="chinese-text text-sm text-primary/70">學習進度管理</p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100">
        <div>
          {item.deadline && (
            <p className="text-xs text-on-surface-variant">
              Deadline:&nbsp;
              <span className={item.diffHrs !== null && item.diffHrs < 6 ? "text-error font-bold" : ""}>
                {item.diffHrs !== null && item.diffHrs < 24
                  ? `${new Date(item.deadline).getHours()}:${String(new Date(item.deadline).getMinutes()).padStart(2,"0")} Hôm nay`
                  : new Date(item.deadline).toLocaleDateString("vi-VN", { day: "2-digit", month: "short" })
                }
              </span>
            </p>
          )}
        </div>

        {item.status === "DRAFT" && (
          <Link href={`/home/student/assignments/${item.assignmentId}`}
            className="flex items-center gap-1.5 bg-primary text-on-primary text-xs font-bold px-4 py-2 rounded-xl hover:brightness-110 transition-all">
            Làm bài
          </Link>
        )}
        {item.status === "SUBMITTED" && (
          <span className="text-xs text-on-surface-variant italic">Chờ chấm</span>
        )}
        {item.status === "GRADED" && (
          <Link href={`/home/student/assignments/${item.assignmentId}`}
            className="text-xs font-bold text-primary hover:underline">
            Xem kết quả
          </Link>
        )}
        {item.status === "REASSIGNED" && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-error">Cần làm lại bài tập này</span>
            <Link href={`/home/student/assignments/${item.assignmentId}`}
              className="text-xs font-bold text-on-surface border border-outline-variant/40 px-3 py-1.5 rounded-lg hover:bg-surface-container transition-all">
              Xem lỗi sai
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function StudentAssignmentsPage() {
  const [items,   setItems]   = useState<AssignmentCard[]>([]);
  const [stats,   setStats]   = useState<Stats | null>(null);
  const [weekly,  setWeekly]  = useState<{ submitted: number; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState("pending");
  const streak = 12; // from user data

  useEffect(() => {
    setLoading(true);
    fetch(`/api/student/assignments?filter=${filter}`)
      .then(r => r.json())
      .then(d => {
        setItems(d.assignments ?? []);
        setStats(d.stats ?? null);
        setWeekly(d.weekly ?? null);
      })
      .finally(() => setLoading(false));
  }, [filter]);

  const weekPct = weekly ? Math.round((weekly.submitted / weekly.total) * 100) : 0;

  return (
    <div className="p-4 md:p-6" style={{ background: "#f5f7fa", minHeight: "100vh" }}>
      {/* Hero */}
      <div className="flex items-start gap-4 mb-8">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="chinese-text text-5xl font-bold text-on-surface/10 select-none">作业</span>
            <h1 className="text-3xl font-extrabold text-on-surface">Lộ trình học tập</h1>
          </div>
          <p className="text-sm text-on-surface-variant">
            Chào mừng bạn trở lại Studio. Hãy hoàn thành các bài tập dưới đây để nâng cao kỹ năng thư pháp và ngữ pháp của mình.
          </p>
        </div>
        <div className="flex items-center gap-1.5 bg-amber-100 text-amber-700 px-3 py-1.5 rounded-xl text-sm font-bold flex-shrink-0">
          <span className="material-symbols-outlined" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
          Chuỗi {streak} ngày
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <div className="flex bg-white rounded-xl p-1 gap-1 border border-gray-100 shadow-sm">
          {[
            { key: "pending",   label: "Chưa nộp"  },
            { key: "submitted", label: "Đã nộp"    },
            { key: "graded",    label: "Đã chấm"   },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all
                ${filter === f.key ? "bg-surface-container shadow text-on-surface" : "text-on-surface-variant hover:text-on-surface"}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {loading ? [1,2,3].map(i => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 h-52 animate-pulse" />
        )) : items.map(item => (
          <AssignmentCard key={item.submissionId} item={item} />
        ))}

        {/* Weekly goal card */}
        {!loading && weekly && (
          <div className="bg-primary rounded-2xl p-5 relative overflow-hidden col-span-1 md:col-span-1 lg:col-span-1">
            <div className="absolute right-0 bottom-0 text-[8rem] chinese-text font-bold text-white/8 leading-none select-none">努</div>
            <h3 className="font-extrabold text-white mb-1">Mục tiêu tuần này</h3>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-white/70">Tiến độ hoàn thành bài tập</p>
              <span className="text-sm font-bold text-white">{weekPct}%</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden mb-3">
              <div className="h-full bg-white rounded-full transition-all" style={{ width: `${weekPct}%` }} />
            </div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-white/60 italic">"Chỉ cần kiên trì, sắt cũng mài thành kim." — Châm ngôn học tập.</p>
              <div className="w-12 h-12 bg-white/20 rounded-xl flex flex-col items-center justify-center flex-shrink-0">
                <span className="text-lg font-extrabold text-white leading-none">{weekly.submitted}/{weekly.total}</span>
                <span className="text-[9px] text-white/60 uppercase">bài tập nộp</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {!loading && items.length === 0 && (
        <div className="text-center py-16">
          <span className="material-symbols-outlined text-5xl text-on-surface-variant/20 block mb-3">assignment</span>
          <p className="text-sm text-on-surface-variant">Không có bài tập nào</p>
        </div>
      )}
    </div>
  );
}
