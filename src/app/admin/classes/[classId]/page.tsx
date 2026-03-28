"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Schedule {
  id: string; dayOfWeek: number; startTime: string;
  endTime: string; location: string | null; isOnline: boolean;
}
interface Member {
  id: string; name: string; email: string;
  image: string | null; xp: number; level: number; streakDays: number;
}
interface ClassDetail {
  id: string; name: string; joinCode: string;
  scheduleNote: string | null;
  course: { id: string; title: string; hskLevel: string } | null;
  schedules: Schedule[];
  members: Member[];
  stats: { totalStudents: number; totalSessions: number; doneSessions: number; remainingSessions: number };
}

// dayOfWeek: 1=T2 2=T3 3=T4 4=T5 5=T6 6=T7 7=CN
const DAY = ["","Thứ 2","Thứ 3","Thứ 4","Thứ 5","Thứ 6","Thứ 7","Chủ Nhật"];
//                    ↑1        ↑2        ↑3        ↑4        ↑5        ↑6        ↑7

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-surface-container rounded-xl ${className}`} />;
}

// ─── Add Schedule Modal ───────────────────────────────────────────────────────
function AddScheduleModal({ classId, onClose, onSaved }: {
  classId: string; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState({
    dayOfWeek: 2, startTime: "08:00", endTime: "10:00",
    location: "", isOnline: false,
  });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    await fetch(`/api/admin/classes/${classId}/schedules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    onSaved(); onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-surface-container-lowest rounded-2xl shadow-2xl w-full max-w-md border border-outline-variant/20">
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/10">
          <h2 className="font-bold text-on-surface">Thêm buổi học</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container">
            <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs font-bold text-on-surface-variant uppercase mb-1.5 block">Thứ trong tuần</label>
            <select value={form.dayOfWeek} onChange={e => setForm(f => ({ ...f, dayOfWeek: +e.target.value }))}
              className="w-full border border-outline-variant/30 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary">
              <option value={2}>Thứ 2</option>
              <option value={3}>Thứ 3</option>
              <option value={4}>Thứ 4</option>
              <option value={5}>Thứ 5</option>
              <option value={6}>Thứ 6</option>
              <option value={7}>Thứ 7</option>
              <option value={1}>Chủ Nhật</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-on-surface-variant uppercase mb-1.5 block">Bắt đầu</label>
              <input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                className="w-full border border-outline-variant/30 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary" />
            </div>
            <div>
              <label className="text-xs font-bold text-on-surface-variant uppercase mb-1.5 block">Kết thúc</label>
              <input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
                className="w-full border border-outline-variant/30 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary" />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-on-surface-variant uppercase mb-1.5 block">Địa điểm / Link</label>
            <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
              placeholder={form.isOnline ? "Zoom ID: 882..." : "Phòng học A102"}
              className="w-full border border-outline-variant/30 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary" />
          </div>
          <button onClick={() => setForm(f => ({ ...f, isOnline: !f.isOnline }))}
            className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl border-2 transition-all text-sm font-semibold
              ${form.isOnline ? "border-primary bg-primary/5 text-primary" : "border-outline-variant/30 text-on-surface-variant"}`}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{form.isOnline ? "videocam" : "location_on"}</span>
            {form.isOnline ? "Học trực tuyến (Online)" : "Học tại chỗ (Offline)"}
          </button>
        </div>
        <div className="px-6 py-4 border-t border-outline-variant/10 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 border border-outline-variant/40 rounded-xl text-sm font-bold text-on-surface hover:bg-surface-container">Huỷ</button>
          <button onClick={submit} disabled={saving}
            className="px-5 py-2.5 bg-primary text-on-primary rounded-xl text-sm font-bold hover:brightness-110 disabled:opacity-50">
            {saving ? "Đang lưu..." : "Thêm buổi học"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Add Member Modal ─────────────────────────────────────────────────────────
function AddMemberModal({ classId, onClose, onSaved }: {
  classId: string; onClose: () => void; onSaved: () => void;
}) {
  const [email,   setEmail]   = useState("");
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");

  const submit = async () => {
    if (!email.trim()) { setError("Nhập email học sinh"); return; }
    setSaving(true);
    const res  = await fetch(`/api/admin/classes/${classId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Lỗi"); setSaving(false); return; }
    onSaved(); onClose();
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-surface-container-lowest rounded-2xl shadow-2xl w-full max-w-sm border border-outline-variant/20">
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/10">
          <h2 className="font-bold text-on-surface">Thêm học sinh</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container">
            <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>
        <div className="p-6 space-y-4">
          {error && <p className="text-xs text-error bg-error/10 px-3 py-2 rounded-lg">{error}</p>}
          <div>
            <label className="text-xs font-bold text-on-surface-variant uppercase mb-1.5 block">Email học sinh</label>
            <input value={email} onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && submit()}
              placeholder="email@example.com"
              className="w-full border border-outline-variant/30 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary" />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-outline-variant/10 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 border border-outline-variant/40 rounded-xl text-sm font-bold text-on-surface hover:bg-surface-container">Huỷ</button>
          <button onClick={submit} disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-secondary text-white rounded-xl text-sm font-bold hover:brightness-110 disabled:opacity-50">
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>person_add</span>
            {saving ? "Đang thêm..." : "Thêm học sinh"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ClassDetailPage({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = use(params);
  const [cls,     setCls]     = useState<ClassDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState<"info" | "schedule" | "students">("info");
  const [modal,   setModal]   = useState<"schedule" | "member" | null>(null);
  const [memberSearch, setMemberSearch] = useState("");

  const fetchClass = async () => {
    setLoading(true);
    const res  = await fetch(`/api/admin/classes/${classId}`);
    const data = await res.json();
    setCls(data.class);
    setLoading(false);
  };

  useEffect(() => { fetchClass(); }, [classId]);

  const deleteSchedule = async (scheduleId: string) => {
    if (!confirm("Xoá lịch học này?")) return;
    await fetch(`/api/admin/classes/${classId}/schedules/${scheduleId}`, { method: "DELETE" });
    fetchClass();
  };

  const removeMember = async (userId: string) => {
    if (!confirm("Xoá học sinh khỏi lớp?")) return;
    await fetch(`/api/admin/classes/${classId}/members`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    fetchClass();
  };

  const copyJoinCode = () => {
    if (cls) navigator.clipboard.writeText(cls.joinCode);
  };

  const filteredMembers = cls?.members.filter(m =>
    memberSearch ? m.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
      m.email.toLowerCase().includes(memberSearch.toLowerCase()) : true
  ) ?? [];

  const TABS = [
    { key: "info",     label: "Thông tin"  },
    { key: "schedule", label: "Lịch học"   },
    { key: "students", label: "Học sinh"   },
  ] as const;

  return (
    <div className="p-4 md:p-6">
      {modal === "schedule" && (
        <AddScheduleModal classId={classId} onClose={() => setModal(null)} onSaved={fetchClass} />
      )}
      {modal === "member" && (
        <AddMemberModal classId={classId} onClose={() => setModal(null)} onSaved={fetchClass} />
      )}

      {/* Breadcrumb */}
      <nav className="text-xs text-on-surface-variant mb-4 flex items-center gap-1">
        <Link href="/admin/classes" className="hover:text-primary transition-colors">Classes</Link>
        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>chevron_right</span>
        <span className="text-on-surface font-semibold truncate max-w-xs">
          {loading ? "..." : cls?.name}
        </span>
      </nav>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
        <div>
          {loading
            ? <Skeleton className="h-9 w-72 mb-2" />
            : <h1 className="text-3xl font-extrabold text-on-surface">{cls?.name}</h1>
          }
          {cls?.course && (
            <div className="flex items-center gap-2 mt-1">
              <span className="chinese-text text-lg text-primary font-bold">{cls.course.title}</span>
              <span className="text-xs px-2.5 py-1 bg-secondary/10 text-secondary rounded-full font-bold">ACTIVE</span>
            </div>
          )}
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 border border-outline-variant/40 px-4 py-2.5 rounded-xl text-sm font-bold text-on-surface hover:bg-surface-container transition-all">
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>share</span>
            Share Class
          </button>
          <button className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2.5 rounded-xl text-sm font-bold hover:brightness-110 transition-all">
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span>
            Edit Details
          </button>
        </div>
      </div>

      {/* Main layout: left tabs + right sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left */}
        <div className="lg:col-span-2">
          {/* Tabs */}
          <div className="flex border-b border-outline-variant/20 mb-6 gap-1">
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-all
                  ${tab === t.key ? "border-primary text-primary" : "border-transparent text-on-surface-variant hover:text-on-surface"}`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* ── Tab: Thông tin ── */}
          {tab === "info" && (
            <div className="space-y-5">
              {/* Basic info */}
              <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-6">
                <h3 className="font-bold text-on-surface flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-primary" style={{ fontSize: 18 }}>info</span>
                  Thông tin lớp học
                </h3>
                {loading ? <Skeleton className="h-24 w-full" /> : (
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Tên lớp</p>
                      <p className="text-sm font-semibold text-on-surface">{cls?.name}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Mã tham gia</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-extrabold text-primary tracking-widest">{cls?.joinCode}</span>
                        <button onClick={copyJoinCode}
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-surface-container transition-colors">
                          <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 16 }}>content_copy</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Course link */}
              {cls?.course && (
                <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-6">
                  <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-3">Khoá học liên kết</p>
                  <Link href={`/admin/content/courses/${cls.course.id}/edit`}
                    className="flex items-center gap-4 p-4 bg-surface-container rounded-xl hover:bg-surface-container-high transition-colors group">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="chinese-text text-xl font-bold text-primary">学</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-on-surface truncate">{cls.course.title}</p>
                      <p className="text-xs text-on-surface-variant mt-0.5">{cls.course.hskLevel}</p>
                    </div>
                    <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors" style={{ fontSize: 20 }}>chevron_right</span>
                  </Link>
                </div>
              )}

              {/* Weekly schedule preview */}
              <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary" style={{ fontSize: 18 }}>calendar_month</span>
                    Lịch học hàng tuần
                  </h3>
                  <button onClick={() => setModal("schedule")}
                    className="text-sm font-bold text-primary hover:underline flex items-center gap-1">
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
                    Thêm buổi học
                  </button>
                </div>
                {loading ? <Skeleton className="h-20 w-full" /> : cls?.schedules.length === 0 ? (
                  <p className="text-sm text-on-surface-variant text-center py-4">Chưa có lịch học</p>
                ) : (
                  <div className="space-y-3">
                    {cls?.schedules.sort((a,b) => a.dayOfWeek - b.dayOfWeek).map(s => (
                      <div key={s.id} className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex flex-col items-center justify-center flex-shrink-0">
                          <span className="text-[10px] font-bold text-primary leading-none">THỨ</span>
                          <span className="text-sm font-extrabold text-primary leading-none">{s.dayOfWeek === 1 ? "CN" : s.dayOfWeek}</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-on-surface">{s.startTime} - {s.endTime}</p>
                          <p className="text-xs text-on-surface-variant">{s.location ?? (s.isOnline ? "Trực tuyến" : "—")}</p>
                        </div>
                        <div className="flex gap-1">
                          {s.isOnline && (
                            <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full font-bold">Online</span>
                          )}
                          <button onClick={() => deleteSchedule(s.id)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-error/10 transition-colors">
                            <span className="material-symbols-outlined text-error/60 hover:text-error" style={{ fontSize: 16 }}>delete</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Tab: Lịch học ── */}
          {tab === "schedule" && (
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-on-surface">Lịch học hàng tuần</h3>
                <button onClick={() => setModal("schedule")}
                  className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2 rounded-xl text-sm font-bold hover:brightness-110 transition-all">
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
                  Thêm buổi học
                </button>
              </div>

              {cls?.schedules.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-outline-variant/20 rounded-2xl">
                  <span className="material-symbols-outlined text-4xl text-on-surface-variant/20 block mb-2">calendar_month</span>
                  <p className="text-sm text-on-surface-variant mb-4">Chưa có lịch học nào</p>
                  <button onClick={() => setModal("schedule")}
                    className="px-4 py-2 bg-primary text-on-primary rounded-xl text-sm font-bold hover:brightness-110">
                    Thêm buổi đầu tiên
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {cls?.schedules.sort((a,b) => a.dayOfWeek - b.dayOfWeek).map(s => (
                    <div key={s.id}
                      className="flex items-center gap-4 p-4 border border-outline-variant/20 rounded-2xl hover:border-primary/20 transition-colors">
                      <div className="w-12 h-12 bg-primary rounded-xl flex flex-col items-center justify-center flex-shrink-0">
                        <span className="text-[9px] font-bold text-white/70 leading-none">THỨ</span>
                        <span className="text-lg font-extrabold text-white leading-none">{s.dayOfWeek === 1 ? "CN" : s.dayOfWeek}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-on-surface">{s.startTime} - {s.endTime}</p>
                        <p className="text-sm text-on-surface-variant mt-0.5 flex items-center gap-1.5">
                          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                            {s.isOnline ? "videocam" : "location_on"}
                          </span>
                          {s.location ?? (s.isOnline ? "Trực tuyến (Zoom)" : "Chưa có địa điểm")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {s.isOnline && (
                          <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-lg font-bold">Trực tuyến</span>
                        )}
                        <button onClick={() => deleteSchedule(s.id)}
                          className="flex items-center gap-1.5 text-xs text-error/70 hover:text-error border border-error/20 hover:border-error/40 px-3 py-1.5 rounded-lg transition-all">
                          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>delete</span>
                          Xoá
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Học sinh ── */}
          {tab === "students" && (
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-on-surface">
                  Danh sách học sinh ({cls?.members.length ?? 0})
                </h3>
                <button onClick={() => setModal("member")}
                  className="flex items-center gap-2 bg-secondary text-white px-4 py-2 rounded-xl text-sm font-bold hover:brightness-110 transition-all">
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>person_add</span>
                  Thêm học sinh
                </button>
              </div>

              {/* Search */}
              <div className="flex items-center gap-2 border border-outline-variant/30 rounded-xl px-3 py-2.5 mb-4 focus-within:border-primary transition-colors">
                <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 18 }}>search</span>
                <input value={memberSearch} onChange={e => setMemberSearch(e.target.value)}
                  placeholder="Tìm bằng email hoặc tên..."
                  className="flex-1 text-sm outline-none bg-transparent text-on-surface" />
              </div>

              {filteredMembers.length === 0 ? (
                <div className="text-center py-10">
                  <span className="material-symbols-outlined text-4xl text-on-surface-variant/20 block mb-2">group</span>
                  <p className="text-sm text-on-surface-variant">
                    {memberSearch ? "Không tìm thấy học sinh" : "Lớp chưa có học sinh"}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredMembers.map(m => (
                    <div key={m.id}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-container transition-colors group">
                      <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0 text-on-primary text-sm font-bold overflow-hidden">
                        {m.image
                          ? <img src={m.image} alt="" className="w-full h-full object-cover" />
                          : m.name.split(" ").pop()?.[0]?.toUpperCase() ?? "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-on-surface truncate">{m.name}</p>
                        <p className="text-xs text-on-surface-variant truncate">{m.email}</p>
                      </div>
                      <div className="hidden md:flex items-center gap-2 text-xs text-on-surface-variant">
                        <span className="px-2 py-0.5 bg-surface-container rounded-full">Lv.{m.level}</span>
                        <span className="flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-tertiary" style={{ fontSize: 12 }}>local_fire_department</span>
                          {m.streakDays}
                        </span>
                      </div>
                      <button onClick={() => removeMember(m.id)}
                        className="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-error/10 transition-all">
                        <span className="material-symbols-outlined text-error" style={{ fontSize: 14 }}>person_remove</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* Students quick list */}
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>group</span>
                Học sinh ({cls?.stats.totalStudents ?? 0})
              </h3>
            </div>

            <div className="flex items-center gap-2 border border-outline-variant/20 rounded-xl px-3 py-2 mb-3 focus-within:border-primary transition-colors">
              <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 16 }}>search</span>
              <input placeholder="Tìm bằng email hoặc tên..."
                value={memberSearch} onChange={e => setMemberSearch(e.target.value)}
                className="flex-1 text-xs outline-none bg-transparent text-on-surface" />
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {loading ? [1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />) :
                filteredMembers.slice(0, 8).map(m => (
                  <div key={m.id} className="flex items-center gap-3 py-1.5">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 text-on-primary text-xs font-bold overflow-hidden">
                      {m.image
                        ? <img src={m.image} alt="" className="w-full h-full object-cover" />
                        : m.name.split(" ").pop()?.[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-on-surface truncate">{m.name}</p>
                      <p className="text-[10px] text-on-surface-variant truncate">{m.email}</p>
                    </div>
                  </div>
                ))
              }
              {!loading && cls && cls.members.length > 8 && (
                <button onClick={() => setTab("students")}
                  className="w-full text-xs text-primary font-bold py-1.5 hover:underline">
                  Xem tất cả {cls.members.length} học sinh →
                </button>
              )}
            </div>

            <button onClick={() => setModal("member")}
              className="mt-3 w-full flex items-center justify-center gap-2 bg-secondary text-white py-2.5 rounded-xl text-sm font-bold hover:brightness-110 transition-all">
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>person_add</span>
              Thêm học sinh
            </button>
          </div>

          {/* Stats */}
          {cls && (
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Tỷ lệ chuyên cần", value: "94.2%", color: "bg-primary text-on-primary",    icon: "check_circle" },
                { label: "Bài tập đã nộp",    value: "128",   color: "bg-surface-container-lowest border border-outline-variant/20", icon: "assignment" },
                { label: "Điểm trung bình",   value: "8.4",   color: "bg-tertiary/80 text-white",     icon: "bar_chart"    },
                { label: "Số buổi còn lại",   value: `${cls.stats.doneSessions}/${cls.stats.totalSessions || 24}`, color: "bg-secondary/80 text-white", icon: "timer" },
              ].map(s => (
                <div key={s.label} className={`rounded-2xl p-4 ${s.color}`}>
                  <p className="text-[10px] font-bold uppercase tracking-wider opacity-70 mb-1">{s.label}</p>
                  <p className="text-2xl font-extrabold">{s.value}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
