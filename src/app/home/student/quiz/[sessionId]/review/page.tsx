'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Trophy, Flame, CheckCircle2, XCircle, Volume2, ChevronRight, BookOpen } from 'lucide-react';

type ReviewResult = {
  questionId: string;
  hanzi: string;
  pinyin: string | null;
  meaningVi: string | null;
  questionText: string | null;
  options: string[] | null;
  audioUrl: string | null;
  type: string;
  userAnswer: string | undefined;
  correctAnswer: string;
  isCorrect: boolean;
};

type SessionData = {
  score: number;
  correctCount: number;
  total: number;
  xpEarned: number;
  newXP: number;
  newStreak: number;
  accuracy: number;
  results: ReviewResult[];
  weakWords: { id: string; hanzi: string; correctAnswer: string; userAnswer: string | undefined }[];
};

// SSR-safe sessionStorage read
const getStoredResult = (sessionId: string): SessionData | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(`quiz_result_${sessionId}`);
    return raw ? (JSON.parse(raw) as SessionData) : null;
  } catch { return null; }
};

function playAudio(url: string) {
  new Audio(url).play().catch(() => {});
}

function playTTS(text: string) {
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'zh-CN';
  speechSynthesis.speak(utter);
}

function QuestionCard({ r, index }: { r: ReviewResult; index: number }) {
  const isWrong = !r.isCorrect;
  const options: string[] = r.options ?? [];

  // Find the letter of the user's answer in options
  const userAnswerIdx = options.findIndex(o => {
    const clean = o.replace(/^[A-D]\.\s*/, '');
    return clean === r.userAnswer;
  });
  const userLetter = userAnswerIdx >= 0 ? String.fromCharCode(65 + userAnswerIdx) : null;

  // Find the letter of the correct answer in options
  const correctAnswerIdx = options.findIndex(o => {
    const clean = o.replace(/^[A-D]\.\s*/, '');
    return clean === r.correctAnswer;
  });
  const correctLetter = correctAnswerIdx >= 0 ? String.fromCharCode(65 + correctAnswerIdx) : null;

  return (
    <div className={`rounded-2xl border overflow-hidden transition-all ${
      isWrong
        ? 'bg-error/5 border-error/20 shadow-sm dark:bg-error/10'
        : 'bg-surface-container-lowest border-outline-variant/20 shadow-sm'
    }`}>

      {/* ── Header ── */}
      <div className={`flex items-center gap-3 px-4 py-3 ${isWrong ? 'bg-error/10 border-b border-error/20 dark:bg-error/20' : 'bg-surface-container border-b border-outline-variant/20'}`}>
        {/* Status badge */}
        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
          isWrong ? 'bg-error/10' : 'bg-secondary/10'
        }`}>
          {isWrong
            ? <XCircle className="w-4 h-4 text-error" />
            : <CheckCircle2 className="w-4 h-4 text-secondary" />
          }
        </div>

        {/* Word info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-2xl font-bold text-on-surface">{r.hanzi}</span>
            {r.pinyin && (
              <span className="text-sm text-on-surface-variant italic">{r.pinyin}</span>
            )}
          </div>
          {r.meaningVi && (
            <p className="text-xs text-on-surface-variant mt-0.5">{r.meaningVi}</p>
          )}
        </div>

        {/* Audio */}
        {(r.audioUrl || r.hanzi) && (
          <div className="flex gap-1 flex-shrink-0">
            {r.audioUrl && (
              <button
                onClick={() => playAudio(r.audioUrl!)}
                className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors"
                title="Phát âm"
              >
                <Volume2 className="w-3.5 h-3.5 text-primary" />
              </button>
            )}
            {!r.audioUrl && (
              <button
                onClick={() => playTTS(r.hanzi)}
                className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors"
                title="Phát âm (TTS)"
              >
                <Volume2 className="w-3.5 h-3.5 text-primary" />
              </button>
            )}
          </div>
        )}

        {/* Question index */}
        <span className="text-xs text-on-surface-variant font-semibold flex-shrink-0">#{index + 1}</span>
      </div>

      {/* ── Question text ── */}
      {r.questionText && (
        <div className="px-4 pt-3 pb-1">
          <p className="text-sm text-on-surface-variant">{r.questionText}</p>
        </div>
      )}

      {/* ── Options (for MULTIPLE_CHOICE) ── */}
      {r.type !== 'FILL_BLANK' && options.length > 0 && (
        <div className="px-4 py-3 space-y-2">
          {options.map((opt, i) => {
            const letter = String.fromCharCode(65 + i);
            const cleanOpt = opt.replace(/^[A-D]\.\s*/, '');
            const isUserChoice = cleanOpt === r.userAnswer;
            const isCorrectChoice = cleanOpt === r.correctAnswer;

            let bgClass = 'bg-surface-container border-outline-variant/20';
            let textClass = 'text-on-surface';
            let badge = null;

            if (isCorrectChoice) {
              bgClass = 'bg-secondary/10 border-secondary/30';
              textClass = 'text-secondary font-semibold';
              badge = <span className="text-xs font-bold text-secondary bg-secondary/10 px-1.5 py-0.5 rounded-full ml-2">Đáp án đúng</span>;
            } else if (isWrong && isUserChoice) {
              bgClass = 'bg-error/10 border-error/30';
              textClass = 'text-error font-semibold';
              badge = <span className="text-xs font-bold text-error bg-error/10 px-1.5 py-0.5 rounded-full ml-2">Bạn chọn</span>;
            }

            return (
              <div
                key={i}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm transition-all ${bgClass} ${textClass}`}
              >
                <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  isCorrectChoice ? 'bg-secondary/20 text-secondary' :
                  isUserChoice ? 'bg-error/20 text-error' :
                  'bg-surface-container-high text-on-surface-variant'
                }`}>
                  {letter}.
                </span>
                <span className="break-words flex-1">{cleanOpt}</span>
                {badge}
              </div>
            );
          })}

          {/* Fill-blank type: show answer comparison inline */}
          {r.type === 'FILL_BLANK' && isWrong && (
            <div className="mt-2 p-3 bg-error/10 border border-error/20 rounded-xl">
              <div className="text-xs text-error mb-1">Bạn nhập:</div>
              <div className="text-error font-semibold">{r.userAnswer || <em className="text-on-surface-variant">—</em>}</div>
              <div className="text-xs text-secondary mt-2 mb-1">Đáp án đúng:</div>
              <div className="text-secondary font-semibold">{r.correctAnswer}</div>
            </div>
          )}
        </div>
      )}

      {/* ── FILL_BLANK result ── */}
      {r.type === 'FILL_BLANK' && !isWrong && (
        <div className="px-4 py-3">
          <div className="p-3 bg-secondary/10 border border-secondary/20 rounded-xl">
            <div className="text-xs text-secondary mb-1">Đáp án:</div>
            <div className="text-secondary font-semibold text-lg">{r.correctAnswer}</div>
          </div>
        </div>
      )}

      {/* ── Wrong summary strip ── */}
      {isWrong && !r.options && (
        <div className="px-4 pb-3">
          <div className="flex items-center gap-3 text-sm">
            {r.userAnswer ? (
              <div className="flex items-center gap-1.5">
                <span className="text-on-surface-variant">Bạn:</span>
                <span className="text-error font-semibold line-through">{r.userAnswer}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="text-on-surface-variant">Bạn:</span>
                <span className="text-on-surface-variant italic">— chưa trả lời</span>
              </div>
            )}
            <ChevronRight className="w-3 h-3 text-on-surface-variant" />
            <div className="flex items-center gap-1.5">
              <span className="text-on-surface-variant">Đúng:</span>
              <span className="text-secondary font-semibold">{r.correctAnswer}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function QuizReview() {
  const { sessionId } = useParams() as { sessionId: string };
  const initialData = getStoredResult(sessionId);
  const [data, setData] = useState<SessionData | null>(initialData);
  const [loading, setLoading] = useState(initialData === null);
  const [activeTab, setActiveTab] = useState<'all' | 'wrong' | 'correct'>('all');

  useEffect(() => {
    if (data !== null) {
      sessionStorage.removeItem(`quiz_result_${sessionId}`);
      return;
    }
    setLoading(true);
    fetch(`/api/practice/${sessionId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d && Array.isArray(d.results) && d.results.length > 0) {
          const results = d.results as ReviewResult[];
          const correctCount = results.filter((r: ReviewResult) => r.isCorrect).length;
          setData({
            score: d.score ?? 0,
            correctCount,
            total: d.totalQuestions ?? results.length,
            xpEarned: d.xpEarned ?? 0,
            newXP: d.xpEarned ?? 0,
            newStreak: 0,
            accuracy: d.score ?? 0,
            results,
            weakWords: results
              .filter((r: ReviewResult) => !r.isCorrect)
              .map(r => ({ id: r.questionId, hanzi: r.hanzi, correctAnswer: r.correctAnswer, userAnswer: r.userAnswer })),
          });
        } else {
          setData(null);
        }
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface-container">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-on-surface-variant">Đang tải kết quả...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface-container-lowest">
        <p className="text-5xl mb-4">😕</p>
        <p className="text-on-surface-variant mb-6">Không tìm thấy kết quả bài quiz.</p>
        <Link href="/home/student" className="px-6 py-3 bg-primary text-on-primary rounded-xl font-bold hover:brightness-110">
          Về trang chủ
        </Link>
      </div>
    );
  }

  const score       = data.score       ?? 0;
  const correctCount = data.correctCount ?? 0;
  const total       = data.total       ?? 0;
  const xpEarned    = data.xpEarned    ?? 0;
  const newStreak   = data.newStreak   ?? 0;
  const accuracy    = data.accuracy    ?? 0;
  const results     = data.results     ?? [];
  const weakWords   = data.weakWords  ?? [];
  const wrongCount  = total - correctCount;

  const getInsight = () => {
    if (accuracy >= 90) {
      return { emoji: '🏆', title: 'Xuất sắc!',
        text: 'Bạn nắm vững kiến thức bài học. Hãy thử thử thách ở cấp độ khó hơn để tiến bộ!',
        bg: 'from-amber-400 to-orange-500' };
    } else if (accuracy >= 70) {
      return { emoji: '💪', title: 'Khá tốt!',
        text: `Bạn sai ${wrongCount} từ. Hãy ôn lại những từ bên dưới để cải thiện điểm số.`,
        bg: 'from-blue-500 to-indigo-600' };
    } else if (accuracy >= 40) {
      return { emoji: '📚', title: 'Cần luyện thêm',
        text: 'Đừng nản lòng! Hãy quay lại bài học, ôn từ vựng rồi thử lại.',
        bg: 'from-purple-500 to-pink-600' };
    } else {
      return { emoji: '🌱', title: 'Bắt đầu thôi!',
        text: 'Mỗi lần sai là một cơ hội học. Hãy ôn lại từ vựng và thử lại nhé!',
        bg: 'from-teal-500 to-emerald-600' };
    }
  };

  const insight = getInsight();

  const displayedResults = activeTab === 'all'
    ? results
    : activeTab === 'wrong'
    ? results.filter(r => !r.isCorrect)
    : results.filter(r => r.isCorrect);

  return (
    <div className="min-h-screen bg-surface-container">

      {/* ── Header ─────────────────────────────────────────────────────────────── */}
      <div className={`bg-gradient-to-r ${insight.bg} text-white`}>
        <div className="max-w-3xl mx-auto px-6 py-10 text-center">
          <div className="text-5xl mb-3">{insight.emoji}</div>
          <div className="inline-block bg-white/20 text-white text-xs font-bold px-4 py-1 rounded-full mb-4">
            ✨ SESSION COMPLETE
          </div>
          <h1 className="text-4xl font-extrabold mb-2">{insight.title}</h1>
          <p className="text-white/80 text-base max-w-sm mx-auto">{insight.text}</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">

        {/* ── Stats Row ───────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-surface-container-lowest rounded-2xl p-5 text-center shadow-sm border border-outline-variant/20">
            <div className="text-4xl font-extrabold text-primary">{accuracy}%</div>
            <div className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mt-1">Độ chính xác</div>
            <div className="h-1.5 bg-surface-container rounded-full mt-3 overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${accuracy}%` }} />
            </div>
          </div>
          <div className="bg-surface-container-lowest rounded-2xl p-5 text-center shadow-sm border border-outline-variant/20 flex flex-col items-center justify-center">
            <Trophy className="w-7 h-7 text-tertiary mb-2" />
            <div className="text-3xl font-extrabold text-on-surface">+{xpEarned}</div>
            <div className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mt-1">Điểm XP</div>
          </div>
          <div className="bg-surface-container-lowest rounded-2xl p-5 text-center shadow-sm border border-outline-variant/20 flex flex-col items-center justify-center">
            <Flame className="w-7 h-7 text-error mb-2" />
            <div className="text-3xl font-extrabold text-on-surface">{newStreak}</div>
            <div className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mt-1">Chuỗi ngày</div>
          </div>
        </div>

        {/* ── Correct / Wrong breakdown ──────────────────────────────────────── */}
        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/20">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-4 bg-secondary/10 dark:bg-secondary/20 rounded-xl p-4">
              <div className="w-12 h-12 bg-secondary/20 dark:bg-secondary/30 rounded-full flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-6 h-6 text-secondary" />
              </div>
              <div>
                <div className="text-3xl font-extrabold text-secondary">{correctCount}</div>
                <div className="text-xs font-semibold text-secondary uppercase tracking-wider">Chính xác</div>
              </div>
            </div>
            <div className="flex items-center gap-4 bg-error/10 dark:bg-error/20 rounded-xl p-4">
              <div className="w-12 h-12 bg-error/20 dark:bg-error/30 rounded-full flex items-center justify-center flex-shrink-0">
                <XCircle className="w-6 h-6 text-error" />
              </div>
              <div>
                <div className="text-3xl font-extrabold text-error">{wrongCount}</div>
                <div className="text-xs font-semibold text-error uppercase tracking-wider">Sai sót</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Detailed Review ──────────────────────────────────────────────────── */}
        {(results?.length ?? 0) > 0 && (
          <div className="space-y-3">
            {/* Tab header */}
            <div className="bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/20 overflow-hidden">
              <div className="flex border-b border-outline-variant/20">
                {([
                  { key: 'all',     label: 'Tất cả',     count: results.length },
                  { key: 'correct', label: 'Đúng',        count: correctCount },
                  { key: 'wrong',   label: 'Sai',         count: wrongCount },
                ] as const).map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex-1 py-3.5 text-sm font-bold transition-colors ${
                      activeTab === tab.key
                        ? tab.key === 'wrong'   ? 'text-error border-b-2 border-error' :
                          tab.key === 'correct' ? 'text-secondary border-b-2 border-secondary' :
                                                   'text-primary border-b-2 border-primary'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    {tab.label} ({tab.count})
                  </button>
                ))}
              </div>
            </div>

            {/* Cards */}
            {displayedResults.length === 0 ? (
              <div className="text-center py-10 text-on-surface-variant text-sm">
                {activeTab === 'correct' ? 'Chưa có câu nào đúng.' : 'Chưa có câu nào sai.'}
              </div>
            ) : (
              displayedResults.map((r, i) => (
                <QuestionCard key={r.questionId} r={r} index={results.indexOf(r)} />
              ))
            )}
          </div>
        )}

        {/* ── Weak Words Quick Review ─────────────────────────────────────────── */}
        {(weakWords?.length ?? 0) > 0 && (
          <div className="bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/20 p-5">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="w-4 h-4 text-error" />
              <h2 className="font-bold text-on-surface text-sm">Từ cần ôn lại</h2>
              <span className="ml-auto text-xs font-bold text-error bg-error/10 px-2.5 py-1 rounded-full">
                {weakWords?.length ?? 0} từ
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {weakWords?.map((w) => (
                <div key={w.id} className="flex items-center gap-3 bg-surface-container rounded-xl px-4 py-3 border border-outline-variant/20">
                  <span className="text-xl font-bold text-on-surface chinese-text">{w.hanzi}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-on-surface truncate">{w.correctAnswer}</p>
                  </div>
                  <button
                    onClick={() => playTTS(w.hanzi)}
                    className="w-7 h-7 rounded-full bg-surface-container-lowest flex items-center justify-center hover:bg-surface-container-high border border-outline-variant/30 transition-colors flex-shrink-0"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-on-surface-variant" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Actions ─────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <Link
            href="/home/student/quiz"
            className="flex items-center justify-center gap-2 bg-primary text-on-primary font-bold py-4 rounded-2xl hover:brightness-110 transition-all"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>refresh</span>
            Luyện tập lại
          </Link>
          <Link
            href="/home/student"
            className="flex items-center justify-center gap-2 bg-surface-container text-on-surface font-bold py-4 rounded-2xl hover:bg-surface-container-high transition-all"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>home</span>
            Về trang chủ
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Decorative footer */}
        <div className="text-center py-6 select-none pointer-events-none">
          <span className="text-2xl chinese-text font-bold tracking-widest text-on-surface/5">
            繼續努力 · 加油
          </span>
        </div>
      </div>
    </div>
  );
}
