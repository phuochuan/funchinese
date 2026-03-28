"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────
interface SessionSlot {
  scheduleId: string; sessionId: string | null;
  classId: string; className: string;
  teacherName: string; teacherImage: string | null;
  date: string; startTime: string; endTime: string;
  location: string | null; isOnline: boolean;
  status: "SCHEDULED" | "ONGOING" | "TODAY" | "COMPLETED" | "CANCELLED";
  cancelReason: string | null;
}

interface ScheduleData {
  week: { monday: string; sunday: string };
  days: Record<string, SessionSlot[]>;
  userStreak: number; userXP: number;
  classes: { id: string; name: string }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
// dayOfWeek: 1=CN 2=T2 3=T3 4=T4 5=T5 6=T6 7=T7
const DAYS = [
  { idx: 1, label: "CHỦ NHẬT"  },  // idx 1 = CN  (Sun) — dayOfWeek 1
  { idx: 2, label: "THỨ HAI"   },  // idx 2 = T2  (Mon) — dayOfWeek 2
  { idx: 3, label: "THỨ BA"    },  // idx 3 = T3  (Tue) — dayOfWeek 3
  { idx: 4, label: "THỨ TƯ"    },  // idx 4 = T4  (Wed) — dayOfWeek 4
  { idx: 5, label: "THỨ NĂM"   },  // idx 5 = T5  (Thu) — dayOfWeek 5
  { idx: 6, label: "THỨ SÁU"   },  // idx 6 = T6  (Fri) — dayOfWeek 6
  { idx: 7, label: "THỨ BẢY"   },  // idx 7 = T7  (Sat) — dayOfWeek 7
];

const STATUS_CONFIG: Record<string, { label: string; cls: string; textCls: string }> = {
  TODAY:     { label: "HÔM NAY",  cls: "bg-primary/10 border-l-4 border-primary",   textCls: "bg-primary text-on-primary"          },
  SCHEDULED: { label: "SẮP TỚI", cls: "bg-surface-container-lowest border border-outline-variant/20", textCls: "bg-surface-container text-on-surface-variant" },
  ONGOING:   { label: "ĐANG HỌC",cls: "bg-primary/10 border-l-4 border-primary",   textCls: "bg-primary text-on-primary"          },
  COMPLETED: { label: "ĐÃ HỌC",  cls: "bg-secondary/5 border border-secondary/20", textCls: "bg-secondary/20 text-secondary"      },
  CANCELLED: { label: "ĐÃ HUỶ",  cls: "bg-error/5 border border-error/20 opacity-70", textCls: "bg-error/20 text-error"           },
};

function getMonday(d: Date) {
  const date = new Date(d);
  const day  = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatWeek(monday: Date, sunday: Date) {
  const fmt = (d: Date) => `${d.getDate()} Tháng ${d.getMonth() + 1}`;
  return `${fmt(monday)} – ${fmt(sunday)}, ${monday.getFullYear()}`;
}

// ─── Join Class Modal ─────────────────────────────────────────────────────────
function JoinClassModal({ onClose, onJoined }: { onClose: () => void; onJoined: () => void }) {
  const [code,    setCode]    = useState("");
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error,   setError]   = useState("");

  const lookupCode = async () => {
    if (code.length < 4) return;
    setLoading(true); setError(""); setPreview(null);
    const res  = await fetch(`/api/classes/join?code=${code.toUpperCase()}`);
    const data = await res.json();
    if (res.ok) setPreview(data.preview);
    else        setError(data.error ?? "Mã không hợp lệ");
    setLoading(false);
  };

  const join = async () => {
    setJoining(true);
    const res = await fetch("/api/classes/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ joinCode: code }),
    });
    const data = await res.json();
    if (res.ok) { onJoined(); onClose(); }
    else        { setError(data.error ?? "Lỗi tham gia lớp"); }
    setJoining(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-surface-container-lowest rounded-2xl shadow-2xl w-full max-w-sm border border-outline-variant/20">
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/10">
          <h2 className="font-bold text-on-surface">Tham gia lớp học</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container">
            <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>
        <div className="p-6 space-y-4">
          {error && <p className="text-xs text-error bg-error/10 px-3 py-2 rounded-lg">{error}</p>}

          <div>
            <label className="text-xs font-bold text-on-surface-variant uppercase mb-1.5 block">Mã tham gia (6 ký tự)</label>
            <div className="flex gap-2">
              <input value={code} onChange={e => { setCode(e.target.value.toUpperCase()); setPreview(null); }}
                maxLength={6} placeholder="VD: HSK2A"
                className="flex-1 border border-outline-variant/30 rounded-xl px-4 py-3 text-sm font-bold tracking-widest outline-none focus:border-primary transition-colors uppercase" />
              <button onClick={lookupCode} disabled={code.length < 4 || loading}
                className="px-4 py-3 bg-surface-container rounded-xl text-sm font-bold text-on-surface hover:bg-surface-container-high disabled:opacity-40 transition-all">
                {loading ? "..." : "Tìm"}
              </button>
            </div>
          </div>

          {/* Preview */}
          {preview && (
            <div className="p-4 bg-primary/5 rounded-2xl border border-primary/20">
              <p className="font-bold text-on-surface mb-1">{preview.name}</p>
              <p className="text-sm text-on-surface-variant mb-2">Giáo viên: {preview.teacherName}</p>
              <div className="flex flex-wrap gap-2">
                {preview.schedules?.map((s: any) => (
                  <span key={s.id} className="text-xs px-2.5 py-1 bg-primary/10 text-primary rounded-lg font-semibold">
                    {s.dayOfWeek === 1 ? "CN" : "T" + (s.dayOfWeek - 1)} {s.startTime}–{s.endTime}
                  </span>
                ))}
              </div>
              <p className="text-xs text-on-surface-variant mt-2">{preview.studentCount} học viên đang tham gia</p>
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-outline-variant/10 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 border border-outline-variant/40 rounded-xl text-sm font-bold text-on-surface hover:bg-surface-container">Huỷ</button>
          <button onClick={join} disabled={!preview || joining}
            className="px-5 py-2.5 bg-primary text-on-primary rounded-xl text-sm font-bold hover:brightness-110 disabled:opacity-50 transition-all">
            {joining ? "Đang tham gia..." : "Xác nhận tham gia"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Session Card ─────────────────────────────────────────────────────────────
function SessionCard({ slot }: { slot: SessionSlot }) {
  const cfg = STATUS_CONFIG[slot.status] ?? STATUS_CONFIG.SCHEDULED;

  return (
    <div className={`rounded-2xl p-4 ${cfg.cls}`}>
      <div className="flex items-start justify-between mb-2">
        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${cfg.textCls}`}>
          {cfg.label}
        </span>
      </div>
      <p className="chinese-text text-xl font-bold text-on-surface leading-tight mb-1 line-clamp-2">
        {slot.className}
      </p>
      <p className="text-xs text-on-surface-variant mb-3 line-clamp-1">{slot.teacherName}</p>
      <div className="space-y-1">
        <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
          <span className="material-symbols-outlined" style={{ fontSize: 13 }}>schedule</span>
          {slot.startTime} – {slot.endTime}
        </div>
        {slot.location && (
          <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
            <span className="material-symbols-outlined" style={{ fontSize: 13 }}>{slot.isOnline ? "videocam" : "location_on"}</span>
            {slot.isOnline ? "Trực tuyến (Zoom)" : slot.location}
          </div>
        )}
        {slot.status === "COMPLETED" && (
          <div className="flex items-center gap-1 text-xs text-secondary mt-1">
            <span className="material-symbols-outlined" style={{ fontSize: 13 }}>check_circle</span>
            Hoàn thành
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function StudentSchedulePage() {
  const [data,    setData]    = useState<ScheduleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [monday,  setMonday]  = useState(() => getMonday(new Date()));
  const [joinModal, setJoinModal] = useState(false);

  const fetchSchedule = async (mon: Date) => {
    setLoading(true);
    const res  = await fetch(`/api/student/schedule?week=${mon.toISOString().slice(0,10)}`);
    const d    = await res.json();
    setData(d);
    setLoading(false);
  };

  useEffect(() => { fetchSchedule(monday); }, [monday]);

  const prevWeek = () => { const m = new Date(monday); m.setDate(m.getDate() - 7); setMonday(m); };
  const nextWeek = () => { const m = new Date(monday); m.setDate(m.getDate() + 7); setMonday(m); };

  const sunday       = new Date(monday); sunday.setDate(monday.getDate() + 6);
  // JS getDay(): 0=Sun 1=Mon...6=Sat → schema: 1=CN 2=T2...7=T7
  const todayDayIdx  = (() => {
    const d = new Date().getDay(); // 0=Sun
    return d === 0 ? 7 : d;
  })();
  const [selectedDay, setSelectedDay] = useState(todayDayIdx);

  // dayIdx: 1=CN(Sun)...7=T7(Sat) — Monday is at idx 2
  const getDayDate = (dayIdx: number) => {
    const d = new Date(monday); d.setDate(monday.getDate() + (dayIdx - 2)); return d;
  };

  const isToday = (dayIdx: number) => {
    const d = getDayDate(dayIdx);
    return d.toDateString() === new Date().toDateString();
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {joinModal && (
        <JoinClassModal onClose={() => setJoinModal(false)} onJoined={() => fetchSchedule(monday)} />
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
        <div>
          <p className="text-xs font-bold text-primary uppercase tracking-wider mb-1">Personal Learning Path</p>
          <h1 className="text-3xl font-extrabold text-on-surface mb-1">Lịch học tuần này</h1>
          <p className="text-sm text-on-surface-variant max-w-md">
            Tiếp tục hành trình chinh phục ngôn ngữ tại không gian học tập riêng của bạn.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Week nav */}
          <div className="flex items-center gap-2 bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-2 py-1.5">
            <button onClick={prevWeek}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-surface-container transition-colors">
              <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 20 }}>chevron_left</span>
            </button>
            <span className="text-sm font-bold text-on-surface px-2 whitespace-nowrap">
              {formatWeek(monday, sunday)}
            </span>
            <button onClick={nextWeek}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-surface-container transition-colors">
              <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 20 }}>chevron_right</span>
            </button>
          </div>

          {/* Join class */}
          <button onClick={() => setJoinModal(true)}
            className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2.5 rounded-xl text-sm font-bold hover:brightness-110 transition-all">
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
            Tham gia lớp
          </button>
        </div>
      </div>

      {/* Day selector */}
      <div className="grid grid-cols-7 gap-2 mb-6">
        {DAYS.map(d => {
          const dayDate  = getDayDate(d.idx);
          const hasClass = data?.days[d.idx]?.length > 0;
          const today    = isToday(d.idx);
          const selected = selectedDay === d.idx;

          return (
            <button key={d.idx} onClick={() => setSelectedDay(d.idx)}
              className={`flex flex-col items-center gap-1 py-3 px-1 rounded-2xl transition-all
                ${selected  ? "bg-primary text-on-primary shadow-md" :
                  today     ? "bg-primary/10 border-2 border-primary text-primary" :
                  "bg-surface-container-lowest border border-outline-variant/20 text-on-surface hover:border-primary/30"}`}>
              <span className="text-[10px] font-bold uppercase leading-none">{d.label.split(" ")[0]}<br/>{d.label.split(" ")[1]}</span>
              <span className="text-xl font-extrabold leading-none">{dayDate.getDate()}</span>
              {hasClass && !selected && (
                <div className={`w-1.5 h-1.5 rounded-full ${today ? "bg-primary" : "bg-primary/40"}`} />
              )}
            </button>
          );
        })}
      </div>

      {/* Sessions for selected day */}
      <div className="mb-8">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1,2,3].map(i => (
              <div key={i} className="animate-pulse bg-surface-container rounded-2xl h-40" />
            ))}
          </div>
        ) : (
          (() => {
            const slots = data?.days[selectedDay] ?? [];
            if (slots.length === 0) {
              return (
                <div className="text-center py-12 bg-surface-container-lowest rounded-2xl border border-outline-variant/20">
                  <span className="material-symbols-outlined text-4xl text-on-surface-variant/20 block mb-2">event_available</span>
                  <p className="text-sm text-on-surface-variant">Không có tiết học</p>
                </div>
              );
            }
            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {slots.map((slot, i) => <SessionCard key={i} slot={slot} />)}
              </div>
            );
          })()
        )}
      </div>

    </div>
  );
}
