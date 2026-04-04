'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, BookOpen, Volume2, Zap, Clock, Layers, CheckCircle2, Star } from 'lucide-react';

type LevelData = {
  level: number;
  label: string;
  sub: string;
  color: string;
  colorText: string;
  count: number;
};

type StatsData = {
  levels: LevelData[];
  totalLearned: number;
  totalVocab: number;
  newWords: number;
  byHsk: Record<string, { total: number; overdue: number }>;
  newWordsByHsk: Record<string, number>;
};

const HSK_LEVELS = [
  { key: 'HSK1', label: 'HSK 1', color: 'text-green-600',   dot: 'bg-green-500'    },
  { key: 'HSK2', label: 'HSK 2', color: 'text-teal-600',    dot: 'bg-teal-500'     },
  { key: 'HSK3', label: 'HSK 3', color: 'text-blue-600',     dot: 'bg-blue-500'     },
  { key: 'HSK4', label: 'HSK 4', color: 'text-indigo-600',  dot: 'bg-indigo-500'   },
  { key: 'HSK5', label: 'HSK 5', color: 'text-purple-600',  dot: 'bg-purple-500'   },
  { key: 'HSK6', label: 'HSK 6', color: 'text-red-600',     dot: 'bg-red-500'      },
];

// ─── Bar Chart ────────────────────────────────────────────────────────────────
function MemoryBarChart({ levels }: { levels: LevelData[] }) {
  const maxCount = Math.max(...levels.map(l => l.count), 1);

  return (
    <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-bold text-on-surface">Mức độ ghi nhớ</h3>
          <p className="text-xs text-on-surface-variant mt-0.5">Biểu đồ phân bố từ vựng theo cấp độ trí nhớ</p>
        </div>
        <div className="flex items-center gap-1 text-xs text-on-surface-variant">
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>insights</span>
          Spaced Repetition
        </div>
      </div>

      {/* Bars */}
      <div className="space-y-2.5">
        {levels.map((lvl) => {
          const pct = maxCount > 0 ? Math.round((lvl.count / maxCount) * 100) : 0;
          const isZero = lvl.count === 0;

          return (
            <div key={lvl.level} className="flex items-center gap-3">
              {/* Label */}
              <div className="w-20 flex-shrink-0">
                <div className={`text-sm font-bold ${isZero ? 'text-on-surface/30' : lvl.colorText}`}>
                  {lvl.label}
                </div>
                <div className={`text-[10px] ${isZero ? 'text-on-surface/30' : 'text-on-surface-variant'}`}>
                  {lvl.sub}
                </div>
              </div>

              {/* Bar track */}
              <div className="flex-1 h-7 bg-surface-container rounded-xl overflow-hidden relative">
                <div
                  className={`h-full rounded-xl transition-all duration-700 flex items-center px-3 ${lvl.color} ${isZero ? 'opacity-20' : ''}`}
                  style={{ width: `${Math.max(pct, isZero ? 0 : 4)}%` }}
                >
                  {pct >= 20 && (
                    <span className="text-white text-xs font-extrabold drop-shadow-sm whitespace-nowrap">
                      {lvl.count}
                    </span>
                  )}
                </div>
              </div>

              {/* Count */}
              <div className={`w-8 text-right text-sm font-extrabold flex-shrink-0 ${
                isZero ? 'text-on-surface/30' : lvl.colorText
              }`}>
                {lvl.count}
              </div>
            </div>
          );
        })}
      </div>

      {/* Total */}
      <div className="mt-4 pt-4 border-t border-outline-variant/20 flex items-center justify-between">
        <span className="text-xs text-on-surface-variant">Tổng đã học</span>
        <span className="text-sm font-extrabold text-on-surface">
          {levels.reduce((s, l) => s + l.count, 0)} từ
        </span>
      </div>
    </div>
  );
}

// ─── Daily Task Card ──────────────────────────────────────────────────────────
function DailyTaskCard({ stats }: { stats: StatsData }) {
  const router = useRouter();

  const overdueCount  = stats.levels[1]?.count ?? 0; // level 1 = cần ôn
  const newCount      = stats.levels[0]?.count ?? 0; // level 0 = từ mới
  const dueToday      = overdueCount + newCount;
  const totalLearned  = stats.totalLearned;
  const totalVocab   = stats.totalVocab;
  const masteryPct    = totalVocab > 0 ? Math.round((totalLearned / totalVocab) * 100) : 0;

  // Suggested action
  const primaryAction = dueToday > 0
    ? { label: `Ôn ngay (${dueToday} từ)`, tier: 'overdue', color: 'bg-red-500', hsk: null }
    : { label: 'Tiếp tục học', tier: 'new', color: 'bg-green-500', hsk: null };

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-5 text-white overflow-hidden relative">
      {/* Background decoration */}
      <div className="absolute right-0 top-0 text-[7rem] leading-none chinese-text font-bold text-white/[0.03] select-none pointer-events-none">
        学
      </div>

      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
          <Zap className="w-4 h-4 text-yellow-400" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">Nhiệm vụ hôm nay</h3>
          <p className="text-xs text-white/50">
            {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-white/10 rounded-xl p-3 text-center">
          <div className="text-2xl font-extrabold text-red-400">{dueToday}</div>
          <div className="text-[10px] text-white/50 mt-0.5">Cần ôn hôm nay</div>
        </div>
        <div className="bg-white/10 rounded-xl p-3 text-center">
          <div className="text-2xl font-extrabold text-blue-400">{newCount}</div>
          <div className="text-[10px] text-white/50 mt-0.5">Từ mới chưa học</div>
        </div>
        <div className="bg-white/10 rounded-xl p-3 text-center">
          <div className="text-2xl font-extrabold text-green-400">{masteryPct}%</div>
          <div className="text-[10px] text-white/50 mt-0.5">Tổng tiến độ</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-5">
        <div className="flex justify-between text-[10px] text-white/40 mb-1.5">
          <span>Tiến độ học</span>
          <span>{totalLearned}/{totalVocab} từ</span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all"
            style={{ width: `${masteryPct}%` }}
          />
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        {dueToday > 0 && (
          <button
            onClick={() => router.push(`/home/student/flashcard/all?tier=overdue`)}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-500 hover:bg-red-400 rounded-xl text-white font-bold text-sm transition-all"
          >
            <Zap className="w-4 h-4" />
            Ôn ngay {dueToday} từ
          </button>
        )}
        {overdueCount === 0 && dueToday === 0 && (
          <button
            onClick={() => router.push(`/home/student/flashcard/all`)}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-white font-bold text-sm transition-all"
          >
            <CheckCircle2 className="w-4 h-4" />
            Học thêm từ mới
          </button>
        )}
        {overdueCount > 0 && newCount === 0 && (
          <button
            onClick={() => router.push(`/home/student/flashcard/all`)}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-white font-bold text-sm transition-all"
          >
            <Star className="w-4 h-4" />
            Học từ mới
          </button>
        )}
      </div>

      {dueToday === 0 && overdueCount === 0 && newCount > 0 && (
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => router.push(`/home/student/flashcard/all`)}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-white font-bold text-sm transition-all"
          >
            <BookOpen className="w-4 h-4" />
            Học từ mới
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Per-HSK Breakdown ───────────────────────────────────────────────────────
function HskBreakdown({ stats }: { stats: StatsData }) {
  return (
    <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 overflow-hidden">
      <div className="px-5 py-4 border-b border-outline-variant/20">
        <h3 className="text-sm font-bold text-on-surface">Chi tiết từng cấp độ</h3>
      </div>
      {HSK_LEVELS.map((lvl, i) => {
        const data    = stats.byHsk[lvl.key];
        const overdue = data?.overdue ?? 0;
        const total   = data?.total ?? 0;
        const newCnt  = stats.newWordsByHsk[lvl.key] ?? 0;
        const learned = total - newCnt;
        const pct     = total > 0 ? Math.round((learned / total) * 100) : 0;

        return (
          <Link
            key={lvl.key}
            href={`/home/student/flashcard/${lvl.key}`}
            className={`flex items-center gap-3 px-5 py-3.5 hover:bg-surface-container transition-colors ${
              i > 0 ? 'border-t border-outline-variant/10' : ''
            }`}
          >
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${lvl.dot}`} />
            <span className={`text-sm font-bold w-14 ${lvl.color}`}>{lvl.label}</span>

            <div className="flex-1">
              <div className="h-1.5 bg-surface-container rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${lvl.dot}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            <span className="text-xs text-on-surface-variant w-14 text-right">
              {learned}/{total}
            </span>

            {overdue > 0 && (
              <span className="text-[10px] font-bold text-red-500 bg-red-50 dark:bg-red-900/30 px-1.5 py-0.5 rounded-full flex-shrink-0">
                {overdue} cần ôn
              </span>
            )}

            <ChevronRight className="w-4 h-4 text-on-surface-variant flex-shrink-0" />
          </Link>
        );
      })}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function FlashcardLibrary() {
  const router = useRouter();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/student/flashcard/stats')
      .then(r => r.json())
      .then(d => { setStats(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-container flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-surface-container flex flex-col items-center justify-center">
        <p className="text-on-surface-variant mb-4">Không thể tải dữ liệu</p>
        <button onClick={() => window.location.reload()} className="px-4 py-2 bg-primary text-on-primary rounded-xl font-bold">
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-container">

      {/* ── Header ── */}
      <div className="bg-surface-container-lowest border-b border-outline-variant/20 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/home/student" className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-surface-container transition-colors">
            <ChevronRight className="w-5 h-5 text-on-surface-variant rotate-180" />
          </Link>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary" style={{ fontSize: 20 }}>school</span>
            </div>
            <div>
              <h1 className="text-base font-extrabold text-on-surface">Thư viện từ vựng</h1>
              <p className="text-xs text-on-surface-variant">
                {stats.totalLearned}/{stats.totalVocab} từ đã học · Spaced Repetition
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-6 space-y-5">

        {/* ── Daily Task ── */}
        <DailyTaskCard stats={stats} />

        {/* ── Bar Chart ── */}
        {stats.levels.length > 0 && (
          <MemoryBarChart levels={stats.levels} />
        )}

        {/* ── HSK Breakdown ── */}
        <HskBreakdown stats={stats} />

        {/* ── Memory Level Legend ── */}
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-4">
          <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-3">
            Giải thích cấp độ trí nhớ
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { color: 'bg-on-surface/20',   text: 'text-on-surface',   label: 'Từ mới',    desc: 'Chưa bao giờ gặp' },
              { color: 'bg-red-500',          text: 'text-red-600',      label: 'Cần ôn',    desc: 'Quá hạn hoặc ngày 1' },
              { color: 'bg-orange-500',        text: 'text-orange-600',   label: '1 ngày',    desc: 'Ôn lại sau 1 ngày' },
              { color: 'bg-amber-500',         text: 'text-amber-700',    label: '2–3 ngày',  desc: 'Ôn lại sau 2–3 ngày' },
              { color: 'bg-green-500',         text: 'text-green-700',    label: '1 tuần',    desc: 'Ôn lại sau 1 tuần' },
              { color: 'bg-blue-500',          text: 'text-blue-700',     label: '1 tháng+',  desc: 'Đã vững trí nhớ' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-sm ${item.color} flex-shrink-0`} />
                <div>
                  <span className={`text-xs font-bold ${item.text}`}>{item.label}</span>
                  <p className="text-[10px] text-on-surface-variant">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── How it works ── */}
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-5">
          <h3 className="text-sm font-bold text-on-surface mb-4">Cách hoạt động</h3>
          <div className="space-y-3">
            {[
              { icon: '📖', title: 'Mỗi từ có lịch riêng', desc: 'Hệ thống tự tính thời điểm bạn cần ôn từ tiếp theo dựa trên mức độ nhớ của bạn.' },
              { icon: '📈', title: 'Đúng → lên cấp độ cao hơn', desc: 'Khi bạn đánh dấu ĐÚNG, từ đó được sắp xếp ôn sau nhiều ngày hơn (SM-2).' },
              { icon: '🔁', title: 'Sai → quay lại cấp 1', desc: 'Khi đánh dấu SAI, từ quay lại cấp độ 1 (cần ôn ngay).' },
              { icon: '🧠', title: 'Trí nhớ dài hạn', desc: 'Sau vài lần đúng liên tiếp, từ sẽ lên cấp 5 và chỉ cần ôn lại sau 1 tháng.' },
            ].map(item => (
              <div key={item.title} className="flex gap-3">
                <div className="w-8 h-8 rounded-xl bg-surface-container flex items-center justify-center flex-shrink-0 text-base">
                  {item.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold text-on-surface">{item.title}</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
