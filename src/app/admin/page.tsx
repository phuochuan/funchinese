"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────
interface DashboardData {
  teacher: { name: string };
  stats: {
    totalStudents:      number;
    pendingGradesCount: number;
    publishedCourses:   number;
    avgCompletion:      number;
  };
  pendingSubmissions: {
    id: string;
    submittedAt: string;
    student: { id: string; name: string; image: string | null };
    assignment: { id: string; title: string; className: string };
  }[];
  weeklyActivity: { day: string; count: number }[];
  classProgress: {
    id: string; name: string;
    total: number; active: number; pct: number;
    status: "good" | "warn" | "done";
  }[];
  deadlines: {
    id: string; title: string; className: string;
    deadline: string; daysLeft: number;
    submitted: number; totalMembers: number; pct: number; urgent: boolean;
  }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m    = Math.floor(diff / 60000);
  if (m < 60)  return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h} giờ trước`;
  return `${Math.floor(h / 24)} ngày trước`;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "buổi sáng";
  if (h < 18) return "buổi chiều";
  return "buổi tối";
}

function initials(name: string) {
  return name.split(" ").slice(-2).map(w => w[0]).join("").toUpperCase();
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-surface-container rounded-xl ${className}`} />;
}

// ─── Bar Chart ────────────────────────────────────────────────────────────────
function BarChart({ data }: { data: { day: string; count: number }[] }) {
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div className="flex items-end justify-between gap-2 h-40">
      {data.map((d, i) => {
        const pct     = (d.count / max) * 100;
        const isToday = i === new Date().getDay() - 1;
        return (
          <div key={d.day} className="flex-1 flex flex-col items-center gap-2">
            <div className="w-full relative flex items-end justify-center" style={{ height: 120 }}>
              <div
                className={`w-full rounded-t-lg transition-all duration-700 ${isToday ? "bg-primary" : "bg-primary/30"}`}
                style={{ height: `${Math.max(pct, 4)}%` }}
              />
            </div>
            <span className={`text-xs font-semibold ${isToday ? "text-primary font-bold" : "text-on-surface-variant"}`}>
              {d.day}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({
  label, value, sub, subColor, loading,
}: {
  label: string; value: string | number;
  sub?: string; subColor?: string; loading: boolean;
}) {
  return (
    <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-5">
      <p className="text-xs text-on-surface-variant mb-2">{label}</p>
      {loading
        ? <Skeleton className="h-8 w-24 mb-2" />
        : (
          <div className="flex items-baseline gap-2 mb-2">
            <p className="text-3xl font-extrabold text-on-surface">{value}</p>
            {sub && (
              <span className={`text-xs font-bold ${subColor ?? "text-on-surface-variant"}`}>{sub}</span>
            )}
          </div>
        )}
      {/* Mini progress bar decorative */}
      <div className="h-1 bg-surface-container rounded-full overflow-hidden">
        <div className="h-full bg-primary rounded-full w-3/4" />
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [data, setData]       = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then(r => r.json())
      .then(d => {
        if (d.error) throw new Error(d.error);
        setData(d);
      })
      .catch(() => setError("Không thể tải dữ liệu"))
      .finally(() => setLoading(false));
  }, []);

  const teacherFirstName = data?.teacher.name.split(" ").pop() ?? "Giáo viên";

  return (
    <div className="p-4 md:p-6 space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          {loading
            ? <Skeleton className="h-9 w-64 mb-2" />
            : <h1 className="text-3xl font-extrabold text-on-surface">
                Chào {greeting()}, {teacherFirstName}
              </h1>
          }
          <div className="flex items-center gap-4 mt-1 flex-wrap">
            <div className="flex items-center gap-1.5 text-sm text-on-surface-variant">
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>assignment_late</span>
              {loading
                ? <Skeleton className="h-4 w-32 inline-block" />
                : <span><strong>{data?.stats.pendingGradesCount ?? 0}</strong> bài tập chưa chấm</span>
              }
            </div>
            <div className="flex items-center gap-1.5 text-sm text-on-surface-variant">
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>forum</span>
              <span><strong>3</strong> câu hỏi mới</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Link href="/admin/assignments/grade"
            className="flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-xl text-sm font-bold hover:brightness-110 transition-all shadow-md">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>grading</span>
            Chấm bài ngay
          </Link>
          <Link href="/admin/assignments/new"
            className="flex items-center gap-2 border border-outline-variant/30 bg-surface-container-lowest text-on-surface px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-surface-container transition-all">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
            Tạo bài tập mới
          </Link>
        </div>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Tổng học viên"
          value={data?.stats.totalStudents.toLocaleString("vi-VN") ?? "—"}
          sub="+12% ↑" subColor="text-secondary" loading={loading} />
        <StatCard label="Bài tập chờ chấm"
          value={data?.stats.pendingGradesCount ?? "—"}
          sub={data?.stats.pendingGradesCount && data.stats.pendingGradesCount > 20 ? "Khẩn cấp" : "Ổn định"}
          subColor={data?.stats.pendingGradesCount && data.stats.pendingGradesCount > 20 ? "text-error font-bold" : "text-on-surface-variant"}
          loading={loading} />
        <StatCard label="Khóa học đang mở"
          value={data?.stats.publishedCourses ?? "—"}
          sub="— Ổn định" loading={loading} />
        <StatCard label="Tỉ lệ hoàn thành TB"
          value={data ? `${data.stats.avgCompletion}%` : "—"}
          sub="+5% ↑" subColor="text-secondary" loading={loading} />
      </div>

      {/* ── Middle: pending grades + deadlines ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Pending submissions */}
        <div className="lg:col-span-2 bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-on-surface">Bài tập cần chấm</h2>
            <Link href="/admin/assignments/grade"
              className="text-xs font-semibold text-primary hover:underline">
              Xem tất cả
            </Link>
          </div>

          {loading && (
            <div className="space-y-4">
              {[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          )}

          {!loading && data?.pendingSubmissions.length === 0 && (
            <div className="text-center py-10">
              <span className="material-symbols-outlined text-4xl text-secondary/40 block mb-2">task_alt</span>
              <p className="text-sm text-on-surface-variant">Không có bài nào chờ chấm 🎉</p>
            </div>
          )}

          {!loading && (
            <div className="divide-y divide-outline-variant/10">
              {data?.pendingSubmissions.map((s, idx) => {
                const isHighlighted = idx === data.pendingSubmissions.length - 1;
                return (
                  <div key={s.id}
                    className={`flex items-center gap-4 py-3.5 ${isHighlighted ? "bg-primary/5 -mx-5 px-5 rounded-xl" : ""}`}>
                    {/* Avatar */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold text-white
                      ${["bg-primary","bg-secondary","bg-tertiary","bg-error","bg-amber-500"][idx % 5]}`}>
                      {s.student.image
                        ? <img src={s.student.image} alt="" className="w-full h-full object-cover rounded-full" />
                        : initials(s.student.name)
                      }
                    </div>

                    {/* Student info */}
                    <div className="w-32 flex-shrink-0">
                      <p className="text-sm font-bold text-on-surface leading-tight">{s.student.name}</p>
                      <p className="text-xs text-on-surface-variant">ID: {s.student.id.slice(-4)}</p>
                    </div>

                    {/* Assignment */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-on-surface truncate">{s.assignment.title}</p>
                      <p className="text-xs text-primary/70 chinese-text truncate">
                        {s.assignment.title.slice(0, 8)}
                      </p>
                    </div>

                    {/* Class */}
                    <div className="hidden md:block w-24 flex-shrink-0">
                      <p className="text-xs text-on-surface-variant">{s.assignment.className}</p>
                    </div>

                    {/* Time */}
                    <div className="w-24 text-right flex-shrink-0">
                      <p className="text-xs text-on-surface-variant italic">
                        {s.submittedAt ? timeAgo(s.submittedAt) : "—"}
                      </p>
                    </div>

                    {/* CTA — chỉ hiện với row highlighted */}
                    {isHighlighted && (
                      <Link href={`/admin/assignments/${s.assignment.id}/grade`}
                        className="flex-shrink-0 bg-primary text-on-primary text-xs font-bold px-3 py-2 rounded-xl hover:brightness-110 transition-all whitespace-nowrap">
                        Chấm ngay
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Deadlines */}
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-error" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>
              timer
            </span>
            <h2 className="font-bold text-on-surface">Deadline sắp tới</h2>
          </div>

          {loading && <div className="space-y-4">{[1,2].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>}

          {!loading && data?.deadlines.length === 0 && (
            <div className="text-center py-8">
              <p className="text-sm text-on-surface-variant">Không có deadline nào sắp tới</p>
            </div>
          )}

          {!loading && (
            <div className="space-y-4">
              {data?.deadlines.map(d => (
                <Link key={d.id} href={`/admin/assignments/${d.id}`}
                  className="block p-4 rounded-xl border border-outline-variant/20 hover:border-primary/30 hover:shadow-sm transition-all">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-sm font-bold text-on-surface leading-tight">{d.title}</p>
                    <span className={`text-[10px] font-extrabold px-2 py-1 rounded-full flex-shrink-0
                      ${d.urgent
                        ? "bg-error/10 text-error"
                        : "bg-surface-container text-on-surface-variant"}`}>
                      CÒN {d.daysLeft} NGÀY
                    </span>
                  </div>

                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-on-surface-variant">Tiến độ nộp bài</p>
                    <p className={`text-sm font-bold ${d.urgent ? "text-error" : "text-primary"}`}>
                      {d.pct}%
                    </p>
                  </div>

                  <div className="h-1.5 bg-surface-container rounded-full overflow-hidden mb-2">
                    <div
                      className={`h-full rounded-full transition-all ${d.urgent ? "bg-error" : "bg-primary"}`}
                      style={{ width: `${d.pct}%` }}
                    />
                  </div>

                  {d.urgent && (
                    <div className="flex items-center gap-1.5 text-xs text-error">
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>warning</span>
                      Tỉ lệ nộp bài thấp (Cần nhắc nhở)
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom: chart + class progress ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Weekly activity chart */}
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-bold text-on-surface">Hoạt động học viên (7 ngày)</h2>
            <button className="text-xs text-on-surface-variant border border-outline-variant/30 px-3 py-1.5 rounded-lg flex items-center gap-1">
              Tuần này
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>expand_more</span>
            </button>
          </div>
          <p className="text-xs text-on-surface-variant mb-4">Theo dõi lượng truy cập hàng ngày</p>

          {loading
            ? <Skeleton className="h-40 w-full" />
            : <BarChart data={data?.weeklyActivity ?? []} />
          }
        </div>

        {/* Class progress */}
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-5">
          <div className="mb-4">
            <h2 className="font-bold text-on-surface">Tiến độ các lớp học</h2>
            <p className="text-xs text-on-surface-variant mt-0.5">Quản lý lộ trình đào tạo hiện tại</p>
          </div>

          {loading && <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>}

          {!loading && (
            <div>
              {/* Header */}
              <div className="grid grid-cols-12 text-xs font-bold text-on-surface-variant uppercase tracking-wider pb-2 border-b border-outline-variant/10 mb-3">
                <span className="col-span-5">Tên lớp</span>
                <span className="col-span-5">Tiến độ</span>
                <span className="col-span-2 text-right">Trạng thái</span>
              </div>

              <div className="space-y-4">
                {data?.classProgress.length === 0 && (
                  <p className="text-sm text-on-surface-variant text-center py-6">Chưa có lớp học nào</p>
                )}
                {data?.classProgress.map(cls => (
                  <Link key={cls.id} href={`/admin/classes/${cls.id}`}
                    className="grid grid-cols-12 items-center gap-2 hover:bg-surface-container -mx-2 px-2 py-1.5 rounded-xl transition-colors">
                    <div className="col-span-5">
                      <p className="text-sm font-semibold text-on-surface truncate">{cls.name}</p>
                      <p className="text-xs text-on-surface-variant">{cls.total} học viên</p>
                    </div>
                    <div className="col-span-5">
                      <div className="h-1.5 bg-surface-container rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all
                            ${cls.status === "done" ? "bg-secondary" :
                              cls.status === "good" ? "bg-primary" : "bg-primary/40"}`}
                          style={{ width: `${cls.pct}%` }}
                        />
                      </div>
                    </div>
                    <div className="col-span-2 flex justify-end">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full
                        ${cls.status === "done" ? "bg-secondary/10 text-secondary" :
                          cls.status === "good" ? "bg-primary/10 text-primary" :
                          "bg-amber-100 text-amber-700"}`}>
                        {cls.status === "done" ? "Hoàn tất" :
                         cls.status === "good" ? "Tốt" : "Cần nhắc"}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
