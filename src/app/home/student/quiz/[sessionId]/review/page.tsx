'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Trophy, Flame, CheckCircle2, XCircle, Volume2, ChevronRight } from 'lucide-react';

type ReviewResult = {
  questionId: string;
  hanzi: string;
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

export default function QuizReview() {
  const { sessionId } = useParams() as { sessionId: string };
  const initialData = getStoredResult(sessionId);
  const [data, setData] = useState<SessionData | null>(initialData);
  const [loading, setLoading] = useState(initialData === null);
  const [activeTab, setActiveTab] = useState<'all' | 'wrong'>('all');

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
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8fafc]">
        <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-gray-500">Đang tải kết quả...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <p className="text-5xl mb-4">😕</p>
        <p className="text-gray-500 mb-6">Không tìm thấy kết quả bài quiz.</p>
        <Link href="/home/student" className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700">
          Về trang chủ
        </Link>
      </div>
    );
  }

  const score        = data.score        ?? 0;
  const correctCount  = data.correctCount  ?? 0;
  const total        = data.total        ?? 0;
  const xpEarned     = data.xpEarned     ?? 0;
  const newStreak    = data.newStreak    ?? 0;
  const accuracy     = data.accuracy     ?? 0;
  const results     = data.results     ?? [];
  const weakWords   = data.weakWords   ?? [];
  const wrongCount  = total - correctCount;

  // Generate contextual advice based on performance
  const getInsight = () => {
    if (accuracy >= 90) {
      return {
        emoji: '🏆',
        title: 'Xuất sắc!',
        text: 'Bạn nắm vững kiến thức bài học. Hãy thử thử thách ở cấp độ khó hơn để tiến bộ!',
        bg: 'from-amber-400 to-orange-500',
      };
    } else if (accuracy >= 70) {
      return {
        emoji: '💪',
        title: 'Khá tốt!',
        text: `Bạn sai ${wrongCount} từ. Hãy ôn lại những từ bên dưới để cải thiện điểm số.`,
        bg: 'from-blue-500 to-indigo-600',
      };
    } else if (accuracy >= 40) {
      return {
        emoji: '📚',
        title: 'Cần luyện thêm',
        text: 'Đừng nản lòng! Hãy quay lại bài học, ôn từ vựng rồi thử lại.',
        bg: 'from-purple-500 to-pink-600',
      };
    } else {
      return {
        emoji: '🌱',
        title: 'Bắt đầu thôi!',
        text: 'Mỗi lần sai là một cơ hội học. Hãy ôn lại từ vựng và thử lại nhé!',
        bg: 'from-teal-500 to-emerald-600',
      };
    }
  };

  const insight = getInsight();
  const displayedResults = activeTab === 'all' ? (results ?? []) : (results ?? []).filter(r => !r.isCorrect);

  const playAudio = (hanzi: string) => {
    // Try to find audio URL from practice session vocabulary
    // For now, use browser TTS as fallback
    const utter = new SpeechSynthesisUtterance(hanzi);
    utter.lang = 'zh-CN';
    speechSynthesis.speak(utter);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc]">
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
          <div className="bg-white rounded-2xl p-5 text-center shadow-sm border border-gray-100">
            <div className="text-4xl font-extrabold text-blue-600">{accuracy}%</div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-1">Độ chính xác</div>
            <div className="h-1.5 bg-gray-100 rounded-full mt-3 overflow-hidden">
              <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${accuracy}%` }} />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 text-center shadow-sm border border-gray-100 flex flex-col items-center justify-center">
            <Trophy className="w-7 h-7 text-amber-500 mb-2" />
            <div className="text-3xl font-extrabold text-gray-900">+{xpEarned}</div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-1">Điểm XP</div>
          </div>

          <div className="bg-white rounded-2xl p-5 text-center shadow-sm border border-gray-100 flex flex-col items-center justify-center">
            <Flame className="w-7 h-7 text-orange-500 mb-2" />
            <div className="text-3xl font-extrabold text-gray-900">{newStreak}</div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-1">Chuỗi ngày</div>
          </div>
        </div>

        {/* ── Correct / Wrong breakdown ──────────────────────────────────────── */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-4 bg-green-50 rounded-xl p-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <div className="text-3xl font-extrabold text-green-600">{correctCount}</div>
                <div className="text-xs font-semibold text-green-700 uppercase tracking-wider">Chính xác</div>
              </div>
            </div>
            <div className="flex items-center gap-4 bg-red-50 rounded-xl p-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <XCircle className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <div className="text-3xl font-extrabold text-red-500">{wrongCount}</div>
                <div className="text-xs font-semibold text-red-600 uppercase tracking-wider">Sai sót</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Detailed Review ──────────────────────────────────────────────────── */}
        {(results?.length ?? 0) > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Tab header */}
            <div className="flex border-b border-gray-100">
              <button
                onClick={() => setActiveTab('all')}
                className={`flex-1 py-4 text-sm font-bold transition-colors ${
                  activeTab === 'all' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                Tất cả ({results?.length ?? 0})
              </button>
              <button
                onClick={() => setActiveTab('wrong')}
                className={`flex-1 py-4 text-sm font-bold transition-colors ${
                  activeTab === 'wrong' ? 'text-red-500 border-b-2 border-red-500' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                Sai ({wrongCount})
              </button>
            </div>

            {/* Result items */}
            <div className="divide-y divide-gray-50">
              {(displayedResults?.length ?? 0) === 0 && (
                <p className="text-center text-gray-400 py-8 text-sm">Không có kết quả nào.</p>
              )}
              {displayedResults?.map((r, i) => (
                <div key={r.questionId} className={`flex items-start gap-4 p-4 ${r.isCorrect ? '' : 'bg-red-50/50'}`}>
                  {/* Status icon */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    r.isCorrect ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    {r.isCorrect
                      ? <CheckCircle2 className="w-5 h-5 text-green-600" />
                      : <XCircle className="w-5 h-5 text-red-400" />
                    }
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-3 flex-wrap">
                      <span className="text-2xl font-bold text-gray-900">{r.hanzi}</span>
                      <span className="text-gray-400 text-sm italic">Câu {i + 1}</span>
                    </div>

                    {!r.isCorrect && (
                      <div className="mt-2 space-y-1.5">
                        {r.userAnswer && (
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-gray-400 w-16 flex-shrink-0">Bạn chọn:</span>
                            <span className="text-red-500 font-medium">{r.userAnswer}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-400 w-16 flex-shrink-0">Đáp án:</span>
                          <span className="text-green-600 font-bold">{r.correctAnswer}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => playAudio(r.hanzi)}
                    className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 hover:bg-gray-200 transition-colors"
                    title="Phát âm"
                  >
                    <Volume2 className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Weak Words Quick Review ─────────────────────────────────────────── */}
        {(weakWords?.length ?? 0) > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-1 h-5 bg-red-400 rounded-full inline-block" />
              <h2 className="font-bold text-gray-900">Từ cần ôn lại</h2>
              <span className="ml-auto text-xs font-bold text-red-400 bg-red-50 px-2.5 py-1 rounded-full">
                {weakWords?.length ?? 0} từ
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {weakWords?.map((w) => (
                <div key={w.id} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                  <span className="text-2xl font-bold text-gray-900 chinese-text">{w.hanzi}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">{w.correctAnswer}</p>
                  </div>
                  <button
                    onClick={() => playAudio(w.hanzi)}
                    className="w-7 h-7 rounded-full bg-white flex items-center justify-center hover:bg-gray-100 border border-gray-200 transition-colors flex-shrink-0"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Actions ─────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <Link
            href="/home/student/practice"
            className="flex items-center justify-center gap-2 bg-primary text-white font-bold py-4 rounded-2xl hover:brightness-110 transition-all"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>refresh</span>
            Luyện tập lại
          </Link>
          <Link
            href="/home/student"
            className="flex items-center justify-center gap-2 bg-gray-100 text-gray-700 font-bold py-4 rounded-2xl hover:bg-gray-200 transition-all"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>home</span>
            Về trang chủ
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Decorative footer */}
        <div className="text-center py-6 select-none pointer-events-none">
          <span className="text-2xl chinese-text font-bold tracking-widest" style={{ color: 'rgba(0,0,0,0.04)' }}>
            繼續努力 · 加油
          </span>
        </div>
      </div>
    </div>
  );
}
