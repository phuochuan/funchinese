"use client";

import Link from "next/link";
import { useDashboard, type DashboardData } from "@/hooks/useDashboard";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDeadline(iso: string) {
  const d = new Date(iso);
  const diffH = Math.round((d.getTime() - Date.now()) / 3600000);
  if (diffH < 24) return { day: "Hnay", date: "", urgent: true };
  return {
    day: ["CN","T2","T3","T4","T5","T6","T7"][d.getDay()],
    date: String(d.getDate()).padStart(2, "0"),
    urgent: false,
  };
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60)  return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h} giờ trước`;
  return `${Math.floor(h / 24)} ngày trước`;
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-surface-container rounded-lg ${className}`} />;
}

// ─── Nav items ────────────────────────────────────────────────────────────────
const NAV = [
  { href: "/home/student",             icon: "dashboard",         label: "Bảng điều khiển" },
  { href: "/home/student/courses",     icon: "menu_book",         label: "Chương trình học"    },
  // { href: "/home/student/practice",    icon: "record_voice_over", label: "Luyện tập"       },
  { href: "/home/student/assignments", icon: "assignment",        label: "Bài tập"         },
  { href: "/home/student/community",   icon: "group",             label: "Cộng đồng"       },
];

// ─── Sidebar (desktop only) ───────────────────────────────────────────────────


// ─── Bottom nav (mobile only) ─────────────────────────────────────────────────


// ─── Topbar ───────────────────────────────────────────────────────────────────


// ─── Welcome Banner ───────────────────────────────────────────────────────────
function WelcomeBanner({ data }: { data: DashboardData | null }) {
  const xpEarned = data?.xpToday.earned ?? 0;
  const xpGoal   = data?.xpToday.goal   ?? 50;
  const pct      = Math.min(Math.round((xpEarned / xpGoal) * 100), 100);
  const streak   = data?.user.streakDays ?? 0;
  const lesson   = data?.continueLesson;

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "buổi sáng";
    if (h < 18) return "buổi chiều";
    return "buổi tối";
  };

  return (
    <div className="bg-primary rounded-2xl p-5 md:p-6 flex flex-col lg:flex-row gap-5 overflow-hidden relative">
      <div className="absolute right-32 top-0 text-[8rem] md:text-[10rem] chinese-text font-bold text-white/5 leading-none select-none pointer-events-none">学</div>

      <div className="flex-1">
        {data ? (
          <>
            <h2 className="text-lg md:text-xl font-extrabold text-on-primary mb-1">
              Chào {greeting()}, {data.user.name.split(" ").pop()}! 👋
            </h2>
            <p className="text-xs md:text-sm text-on-primary/80 leading-relaxed mb-4 max-w-sm">
              {pct >= 100
                ? `Tuyệt vời! Bạn đã đạt mục tiêu hôm nay. Chuỗi ${streak} ngày đang tiến!`
                : `Bạn đã hoàn thành ${pct}% mục tiêu hàng ngày. Chỉ còn một chút nữa để giữ chuỗi ${streak} ngày!`}
            </p>
          </>
        ) : (
          <>
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-full max-w-xs mb-4" />
          </>
        )}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-on-primary/70">XP hôm nay</span>
            <span className="text-xs font-bold text-on-primary">{xpEarned} / {xpGoal} XP</span>
          </div>
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-secondary-fixed rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      {/* Continue lesson — full width on mobile, fixed width on lg */}
      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 md:p-5 lg:w-60 flex-shrink-0 border border-white/20">
        <p className="text-xs font-bold text-on-primary/60 uppercase tracking-wider mb-2">Tiếp tục học tập</p>
        {lesson ? (
          <>
            <h3 className="font-bold text-on-primary mb-1 text-sm line-clamp-2">{lesson.title}</h3>
            {lesson.titleChinese && (
              <p className="chinese-text text-xl text-on-primary mb-0.5">{lesson.titleChinese}</p>
            )}
            {lesson.pinyin && (
              <p className="text-xs text-on-primary/70 mb-3">{lesson.pinyin}</p>
            )}
            <Link href={`/home/student/lessons/${lesson.id}`}
              className="flex items-center justify-center gap-2 w-full bg-on-primary text-primary font-bold text-sm py-2.5 rounded-xl hover:bg-primary-fixed transition-all">
              Học ngay
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
            </Link>
          </>
        ) : data ? (
          <div className="text-center py-3">
            <p className="text-sm text-on-primary/70 mb-3">Chưa có bài đang học</p>
            <Link href="/home/student/courses"
              className="inline-flex items-center gap-1 bg-on-primary text-primary font-bold text-xs py-2 px-4 rounded-xl">
              Bắt đầu học
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>arrow_forward</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-9 w-full mt-2" />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Stats ────────────────────────────────────────────────────────────────────
function StatsRow({ data }: { data: DashboardData | null }) {
  const stats = [
    { icon: "translate",   label: "Từ đã học",    value: data?.stats.wordsLearned.toLocaleString("vi-VN"),    color: "text-primary"    },
    { icon: "task_alt",    label: "Bài tập xong", value: data?.stats.assignmentsGraded,                       color: "text-secondary"  },
    { icon: "quiz",        label: "Điểm quiz TB", value: data?.stats.quizAvgScore,                            color: "text-tertiary"   },
    { icon: "leaderboard", label: "Hạng",         value: data ? `#${data.stats.leaderboardRank}` : undefined, color: "text-on-surface" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {stats.map((s) => (
        <div key={s.label} className="bg-surface-container-lowest rounded-2xl p-4 md:p-5 border border-outline-variant/10">
          <span className={`material-symbols-outlined ${s.color} mb-2 md:mb-3 block`} style={{ fontSize: 22 }}>{s.icon}</span>
          <p className="text-xs text-on-surface-variant mb-1">{s.label}</p>
          {s.value !== undefined
            ? <p className="text-xl md:text-2xl font-extrabold text-on-surface">{s.value}</p>
            : <Skeleton className="h-7 w-14 mt-1" />}
        </div>
      ))}
    </div>
  );
}

// ─── Calendar ─────────────────────────────────────────────────────────────────
function CalendarSection({ data }: { data: DashboardData | null }) {
  const now     = new Date();
  const year    = now.getFullYear();
  const month   = now.getMonth();
  const today   = now.getDate();
  const daysInMonth  = new Date(year, month + 1, 0).getDate();
  const firstDay     = new Date(year, month, 1).getDay();
  const startOffset  = (firstDay + 6) % 7;

  const studiedDays = new Set(
    (data?.dailyActivity ?? [])
      .filter((a) => a.xpEarned > 0)
      .map((a) => new Date(a.date).getDate())
  );

  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const monthNames = ["Tháng 1","Tháng 2","Tháng 3","Tháng 4","Tháng 5","Tháng 6",
                      "Tháng 7","Tháng 8","Tháng 9","Tháng 10","Tháng 11","Tháng 12"];

  return (
    <div className="bg-surface-container-lowest rounded-2xl p-5 md:p-6 border border-outline-variant/10">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-on-surface">Lịch học</h3>
        <span className="text-xs text-on-surface-variant">{monthNames[month]}, {year}</span>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {["T2","T3","T4","T5","T6","T7","CN"].map((h) => (
          <div key={h} className="text-center text-xs font-semibold text-on-surface-variant py-1">{h}</div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {cells.map((d, i) => (
          <div key={i} className="flex items-center justify-center py-0.5">
            {d ? (
              <div className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-semibold transition-colors
                ${d === today        ? "bg-primary text-on-primary" :
                  studiedDays.has(d) ? "bg-primary/15 text-primary"  :
                  "text-on-surface"}`}>
                {d}
              </div>
            ) : <div className="w-7 h-7" />}
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-4 text-xs text-on-surface-variant">
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-primary" /><span>Hôm nay</span></div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-primary/15" /><span>Đã học</span></div>
      </div>
    </div>
  );
}

// ─── Flashcard Review Section ─────────────────────────────────────────────────
type LevelData = {
  level: number;
  label: string;
  sub: string;
  color: string;
  colorText: string;
  count: number;
};

type FlashcardStats = {
  levels: LevelData[];
  totalLearned: number;
  totalVocab: number;
  newWords: number;
};

// 6 levels matching API response
const LEVEL_COLORS: Record<number, { bar: string; text: string; dot: string }> = {
  0: { bar: 'bg-gray-300',  text: 'text-gray-400',   dot: 'bg-gray-300'   },
  1: { bar: 'bg-red-500',   text: 'text-red-500',    dot: 'bg-red-500'    },
  2: { bar: 'bg-orange-500',text: 'text-orange-500',  dot: 'bg-orange-500' },
  3: { bar: 'bg-amber-500', text: 'text-amber-600',  dot: 'bg-amber-500'  },
  4: { bar: 'bg-green-500', text: 'text-green-600',  dot: 'bg-green-500'  },
  5: { bar: 'bg-blue-500',  text: 'text-blue-500',   dot: 'bg-blue-500'   },
};

function FlashcardSection() {
  const router = useRouter();
  const [stats, setStats] = useState<FlashcardStats | null>(null);

  useEffect(() => {
    fetch('/api/student/flashcard/stats')
      .then(r => r.json())
      .then(d => setStats(d))
      .catch(() => {});
  }, []);

  const levels = stats?.levels ?? [];
  const totalLearned = stats?.totalLearned ?? 0;
  const totalVocab   = stats?.totalVocab  ?? 0;
  const overdue      = stats?.levels.find(l => l.level === 1)?.count ?? 0;
  const maxCount     = Math.max(...levels.map(l => l.count), 1);

  return (
    <div className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/10">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary" style={{ fontSize: 20 }}>school</span>
          <h3 className="font-bold text-on-surface">Mức độ ghi nhớ</h3>
          {overdue > 0 && (
            <span className="text-xs font-bold text-white bg-red-500 px-2 py-0.5 rounded-full">
              {overdue} cần ôn
            </span>
          )}
        </div>
        <button
          onClick={() => router.push('/home/student/flashcard')}
          className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
        >
          Chi tiết
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>chevron_right</span>
        </button>
      </div>

      {/* Horizontal bar chart */}
      <div className="space-y-2 mb-4">
        {levels.map((lvl) => {
          const c = LEVEL_COLORS[lvl.level] ?? LEVEL_COLORS[0];
          const pct = Math.max(Math.round((lvl.count / maxCount) * 100), lvl.count > 0 ? 4 : 0);
          const isNew = lvl.level === 0;

          return (
            <button
              key={lvl.level}
              onClick={() => router.push(`/home/student/flashcard/all`)}
              className="w-full flex items-center gap-2 group"
              title={`${lvl.label}: ${lvl.count} từ`}
            >
              {/* Label */}
              <div className={`w-14 text-right flex-shrink-0 ${c.text}`}>
                <div className="text-xs font-bold">{lvl.label}</div>
                <div className="text-[10px] opacity-60">{lvl.sub}</div>
              </div>

              {/* Bar */}
              <div className="flex-1 h-6 bg-surface-container rounded-lg overflow-hidden">
                <div
                  className={`h-full rounded-lg transition-all duration-500 group-hover:brightness-110 ${c.bar} ${
                    lvl.count === 0 ? 'opacity-20' : ''
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              {/* Count */}
              <div className={`w-7 text-right text-xs font-extrabold flex-shrink-0 ${c.text}`}>
                {lvl.count}
              </div>
            </button>
          );
        })}
      </div>

      {/* Progress + link */}
      <div className="flex items-center justify-between pt-3 border-t border-outline-variant/10">
        <span className="text-xs text-on-surface-variant">
          {totalLearned}/{totalVocab} từ đã học
        </span>
        <button
          onClick={() => router.push('/home/student/flashcard')}
          className="text-xs font-bold text-primary hover:underline flex items-center gap-0.5"
        >
          Xem thư viện
          <span className="material-symbols-outlined" style={{ fontSize: 12 }}>chevron_right</span>
        </button>
      </div>
    </div>
  );
}

// ─── Upcoming Assignments ─────────────────────────────────────────────────────
function UpcomingAssignments({ data }: { data: DashboardData | null }) {
  if (!data) {
    return (
      <div className="bg-surface-container-lowest rounded-2xl p-5 md:p-6 border border-outline-variant/10 space-y-3">
        <Skeleton className="h-5 w-36" />
        {[1,2,3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
      </div>
    );
  }

  return (
    <div className="bg-surface-container-lowest rounded-2xl p-5 md:p-6 border border-outline-variant/10">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-on-surface">Bài tập sắp tới</h3>
        <Link href="/home/student/assignments" className="text-xs font-semibold text-primary hover:underline">
          Xem tất cả
        </Link>
      </div>

      {data.upcomingAssignments.length === 0 ? (
        <div className="text-center py-8">
          <span className="material-symbols-outlined text-4xl text-on-surface-variant/30 block mb-2">assignment_turned_in</span>
          <p className="text-sm text-on-surface-variant">Không có bài tập nào sắp tới</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.upcomingAssignments.map((a) => {
            const dl = formatDeadline(a.deadline);
            return (
              <div key={a.id}
                className="flex items-center gap-3 p-3 md:p-4 rounded-xl border border-outline-variant/10 hover:border-primary/20 transition-all">
                <div className={`w-11 h-11 md:w-12 md:h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0 font-bold text-center
                  ${dl.urgent ? "bg-error/10 text-error" : "bg-surface-container text-on-surface-variant"}`}>
                  {dl.urgent ? (
                    <span className="text-[10px] font-extrabold">Hnay</span>
                  ) : (
                    <>
                      <span className="text-[10px] leading-none">{dl.day}</span>
                      <span className="text-sm font-extrabold leading-none">{dl.date}</span>
                    </>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-on-surface truncate">{a.title}</p>
                  <p className="text-xs text-on-surface-variant mt-0.5 truncate">
                    {a.class.name} · {a._count.questions} câu
                  </p>
                </div>

                <Link href={`/home/student/assignments/${a.id}`}
                  className={`text-xs font-bold px-3 py-2 rounded-xl flex-shrink-0 transition-all whitespace-nowrap
                    ${dl.urgent
                      ? "bg-primary text-on-primary"
                      : "border border-outline-variant/40 text-on-surface hover:bg-surface-container"}`}>
                  {dl.urgent ? "Làm ngay" : "Xem"}
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function StudentDashboard() {
  const { data, error } = useDashboard();

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <span className="material-symbols-outlined text-4xl text-error block mb-2">error</span>
          <p className="text-on-surface-variant text-sm mb-4">{error}</p>
          <button onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-bold">
            Thử lại
          </button>
        </div>
      </div>
    );
  }

    return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <WelcomeBanner data={data} />
      <StatsRow data={data} />
      <FlashcardSection />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <CalendarSection data={data} />
        <UpcomingAssignments data={data} />
      </div>
    </div>
  );
}
