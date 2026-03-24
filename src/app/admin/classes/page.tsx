"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface ClassItem {
  id: string; name: string; joinCode: string;
  studentCount: number; scheduleNote: string | null;
  schedules: { dayOfWeek: number; startTime: string; endTime: string; isOnline: boolean }[];
  course: { title: string; hskLevel: string } | null;
  createdAt: string;
}
interface Stats { activeClasses: number; totalStudents: number; weeklySchedules: number; }

const DAY = ["","T2","T3","T4","T5","T6","T7","CN"];
const HSK_CHINESE: Record<string, string> = {
  HSK1: "初级", HSK2: "初级", HSK3: "中级", HSK4: "中级", HSK5: "高级", HSK6: "高级",
};

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-surface-container rounded-xl ${className}`} />;
}

// ─── Modal tạo lớp mới ────────────────────────────────────────────────────────
function CreateClassModal({ onClose, onCreated }: {
  onClose: () => void; onCreated: () => void;
}) {
  const [name,     setName]     = useState("");
  const [courseId, setCourseId] = useState("");
  const [courses,  setCourses]  = useState<{ id: string; title: string; hskLevel: string }[]>([]);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");

  useEffect(() => {
    fetch("/api/admin/courses")
      .then(r => r.json())
      .then(d => setCourses(d.courses ?? []));
  }, []);

  const submit = async () => {
    if (!name.trim()) { setError("Tên lớp là bắt buộc"); return; }
    setSaving(true);
    const res = await fetch("/api/admin/classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, courseId: courseId || null }),
    });
    if (res.ok) { onCreated(); onClose(); }
    else { setError("Lỗi tạo lớp"); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-surface-container-lowest rounded-2xl shadow-2xl w-full max-w-md border border-outline-variant/20">
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/10">
          <h2 className="font-bold text-on-surface">Tạo lớp học mới</h2>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container transition-colors">
            <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && <p className="text-xs text-error bg-error/10 px-3 py-2 rounded-lg">{error}</p>}

          {/* Tên lớp */}
          <div>
            <label className="text-xs font-bold text-on-surface-variant uppercase mb-1.5 block">
              Tên lớp học
            </label>
            <input value={name} onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && submit()}
              placeholder="VD: Lớp HSK 2 - Sáng Thứ 2/4"
              className="w-full border border-outline-variant/30 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary transition-colors" />
          </div>

          {/* Khoá học liên kết */}
          <div>
            <label className="text-xs font-bold text-on-surface-variant uppercase mb-1.5 block">
              Khoá học liên kết (tuỳ chọn)
            </label>
            <select value={courseId} onChange={e => setCourseId(e.target.value)}
              className="w-full border border-outline-variant/30 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary transition-colors">
              <option value="">— Không liên kết khoá học —</option>
              {courses.map(c => (
                <option key={c.id} value={c.id}>[{c.hskLevel}] {c.title}</option>
              ))}
            </select>
            {courseId && (
              <p className="text-xs text-on-surface-variant mt-1.5 flex items-center gap-1">
                <span className="material-symbols-outlined text-secondary" style={{ fontSize: 14 }}>info</span>
                Chỉ học viên trong lớp này mới thấy khoá học đó.
              </p>
            )}
          </div>

          <p className="text-xs text-on-surface-variant">
            Mã tham gia sẽ được tạo tự động sau khi lớp được tạo.
          </p>
        </div>

        <div className="px-6 py-4 border-t border-outline-variant/10 flex justify-end gap-3">
          <button onClick={onClose}
            className="px-5 py-2.5 border border-outline-variant/40 rounded-xl text-sm font-bold text-on-surface hover:bg-surface-container transition-all">
            Huỷ
          </button>
          <button onClick={submit} disabled={saving}
            className="px-5 py-2.5 bg-primary text-on-primary rounded-xl text-sm font-bold disabled:opacity-50 hover:brightness-110 transition-all flex items-center gap-2">
            {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            Tạo lớp
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AdminClassesPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [stats,   setStats]   = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [modal,   setModal]   = useState(false);

  const fetchClasses = async (q = "") => {
    setLoading(true);
    const res  = await fetch(`/api/admin/classes?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    setClasses(data.classes ?? []);
    setStats(data.stats ?? null);
    setLoading(false);
  };

  useEffect(() => { fetchClasses(); }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchClasses(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const formatSchedule = (schedules: ClassItem["schedules"]) => {
    if (!schedules.length) return "Chưa có lịch";
    return schedules.map(s => `${DAY[s.dayOfWeek]}, ${s.startTime}`).join(" · ");
  };

  return (
    <div className="p-4 md:p-6">
      {modal && (
        <CreateClassModal
          onClose={() => setModal(false)}
          onCreated={() => fetchClasses(search)}
        />
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Lớp đang hoạt động", value: stats?.activeClasses   ?? "—", color: "text-primary",   icon: "menu_book"      },
          { label: "Tổng số học viên",   value: stats?.totalStudents    ?? "—", color: "text-secondary", icon: "group"          },
          { label: "Buổi học hàng tuần", value: stats?.weeklySchedules  ?? "—", color: "text-tertiary",  icon: "calendar_month" },
        ].map(s => (
          <div key={s.label} className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-5 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
              s.color === "text-primary"   ? "bg-primary/10"   :
              s.color === "text-secondary" ? "bg-secondary/10" : "bg-tertiary/10"
            }`}>
              <span className={`material-symbols-outlined ${s.color}`}
                style={{ fontSize: 22, fontVariationSettings: "'FILL' 1" }}>{s.icon}</span>
            </div>
            <div>
              <p className="text-xs text-on-surface-variant mb-1">{s.label}</p>
              {loading
                ? <Skeleton className="h-7 w-12" />
                : <p className={`text-3xl font-extrabold ${s.color}`}>{s.value}</p>
              }
            </div>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-xl font-extrabold text-on-surface">Danh sách lớp học</h2>
          <p className="text-xs text-on-surface-variant mt-0.5">Sắp xếp theo thời gian bắt đầu gần nhất</p>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-2 border border-outline-variant/30 rounded-xl px-3 py-2 bg-surface-container-lowest focus-within:border-primary transition-colors">
            <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 18 }}>search</span>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Tìm kiếm lớp học..."
              className="text-sm outline-none bg-transparent w-40 text-on-surface" />
          </div>
          <button onClick={() => setModal(true)}
            className="flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-xl text-sm font-bold hover:brightness-110 transition-all shadow-md">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
            Tạo lớp mới
          </button>
        </div>
      </div>

      {/* Class list */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 overflow-hidden mb-6">
        {loading ? (
          <div className="p-4 space-y-3">
            {[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        ) : classes.length === 0 ? (
          <div className="text-center py-16">
            <span className="material-symbols-outlined text-5xl text-on-surface-variant/20 block mb-3">school</span>
            <p className="text-sm text-on-surface-variant mb-4">Chưa có lớp học nào</p>
            <button onClick={() => setModal(true)}
              className="px-4 py-2 bg-primary text-on-primary rounded-xl text-sm font-bold hover:brightness-110 transition-all">
              Tạo lớp đầu tiên
            </button>
          </div>
        ) : (
          <div className="divide-y divide-outline-variant/10">
            {classes.map(cls => (
              <Link key={cls.id} href={`/admin/classes/${cls.id}`}
                className="flex items-center gap-4 px-5 py-4 hover:bg-surface-container/50 transition-colors group">
                {/* Icon */}
                <div className="w-14 h-14 rounded-2xl bg-surface-container flex items-center justify-center flex-shrink-0">
                  {cls.course ? (
                    <span className="chinese-text text-2xl font-bold text-on-surface/60">
                      {HSK_CHINESE[cls.course.hskLevel] ?? "学"}
                    </span>
                  ) : (
                    <span className="material-symbols-outlined text-on-surface-variant/40" style={{ fontSize: 28 }}>school</span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="font-bold text-primary truncate group-hover:underline">{cls.name}</p>
                    <span className="text-xs px-2 py-0.5 bg-secondary/10 text-secondary rounded-full font-bold flex-shrink-0">
                      ACTIVE
                    </span>
                    {cls.course && (
                      <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full font-bold flex-shrink-0">
                        {cls.course.hskLevel}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-on-surface-variant flex-wrap">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>group</span>
                      {cls.studentCount} học viên
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>calendar_today</span>
                      {formatSchedule(cls.schedules)}
                    </span>
                    {cls.course && (
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>menu_book</span>
                        {cls.course.title}
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress */}
                <div className="hidden md:block w-24 flex-shrink-0">
                  <p className="text-[10px] text-on-surface-variant uppercase font-bold mb-1">Tiến độ</p>
                  <div className="h-1.5 bg-surface-container rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: "60%" }} />
                  </div>
                </div>

                {/* Menu */}
                <button
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container flex-shrink-0 transition-colors"
                  onClick={e => e.preventDefault()}>
                  <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 20 }}>more_vert</span>
                </button>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Bottom cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-primary rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute right-4 bottom-0 text-[6rem] chinese-text font-bold text-white/10 leading-none select-none">课</div>
          <h3 className="font-bold text-white mb-2">Tăng tốc giảng dạy</h3>
          <p className="text-sm text-white/70 leading-relaxed mb-4">
            Sử dụng kho giáo trình số có sẵn để tiết kiệm 50% thời gian soạn bài.
          </p>
          <Link href="/admin/content/courses"
            className="inline-flex items-center gap-2 border border-white/30 text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-white/10 transition-colors">
            Khám phá thư viện
          </Link>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-6 flex flex-col items-center justify-center text-center gap-3">
          <div className="w-12 h-12 bg-surface-container rounded-full flex items-center justify-center">
            <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 22 }}>add</span>
          </div>
          <h3 className="font-bold text-on-surface">Mở thêm lớp mới?</h3>
          <p className="text-sm text-on-surface-variant max-w-xs">
            Hệ thống gợi ý bạn nên mở thêm lớp HSK 2 vào tối Thứ 7 dựa trên yêu cầu từ học viên mới.
          </p>
          <button onClick={() => setModal(true)}
            className="text-sm font-bold text-primary hover:underline">
            Bắt đầu thiết lập lớp
          </button>
        </div>
      </div>
    </div>
  );
}
