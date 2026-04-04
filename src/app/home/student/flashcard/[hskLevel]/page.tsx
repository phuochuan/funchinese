'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Volume2, ChevronLeft, Trophy, CheckCircle2, XCircle } from 'lucide-react';

type FlashcardWord = {
  id: string;
  hanzi: string;
  pinyin: string;
  hanViet: string;
  meaningVi: string;
  exampleSentence: string | null;
  examplePinyin: string | null;
  exampleVi: string | null;
  audioUrl: string | null;
  wordType: string | null;
  hskLevel: string;
  timesCorrect: number;
  timesWrong: number;
  easeFactor: number;
  interval: number;
  nextReviewAt: string;
  needsReview: boolean;
  bucket: string;
};

type BucketCounts = {
  overdue: number;
  oneDay: number;
  twoThreeDays: number;
  oneWeek: number;
  oneMonth: number;
};

type SessionResult = {
  correct: number;
  total: number;
  xpEarned: number;
  wrongWords: { id: string; hanzi: string; meaningVi: string }[];
};

type SessionState = {
  queue: FlashcardWord[];   // words still to answer
  done: FlashcardWord[];    // words answered correctly
  wrong: FlashcardWord[];   // words answered incorrectly this session
  currentIdx: number;
  flipped: boolean;
  submitting: boolean;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function playAudio(url: string) {
  if (url) new Audio(url).play().catch(() => {});
}

function playTTS(text: string) {
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'zh-CN';
  speechSynthesis.speak(u);
}

const BUCKET_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  overdue:      { label: '10 phút',  color: 'text-red-500',    dot: 'bg-red-500'    },
  oneDay:       { label: '1 ngày',   color: 'text-orange-500', dot: 'bg-orange-500' },
  twoThreeDays: { label: '2-3 ngày', color: 'text-amber-500',  dot: 'bg-amber-500'  },
  oneWeek:      { label: '1 tuần',   color: 'text-green-600',   dot: 'bg-green-600' },
  oneMonth:     { label: '1 tháng',  color: 'text-blue-600',   dot: 'bg-blue-600'  },
};

const WORD_TYPE_COLORS: Record<string, string> = {
  '名': 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
  '动': 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
  '形': 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
  '副': 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300',
  '数': 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300',
  '代': 'bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-300',
  '介': 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300',
  '连': 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300',
  '助': 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300',
  '叹': 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300',
};

function getWordTypeBadge(wordType: string | null) {
  if (!wordType) return null;
  const clean = wordType.trim();
  const firstChar = clean[0] ?? '';
  const colorClass = WORD_TYPE_COLORS[firstChar] ?? 'bg-surface-container text-on-surface-variant';
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${colorClass}`}>
      {clean}
    </span>
  );
}

// ─── Result Screen ────────────────────────────────────────────────────────────
function ResultScreen({ result, onRetry }: { result: SessionResult; onRetry: () => void }) {
  const pct = Math.round((result.correct / result.total) * 100);

  return (
    <div className="min-h-screen bg-surface-container flex flex-col">
      <div className={`flex-1 flex flex-col items-center justify-center px-6 py-12 ${
        pct >= 80 ? 'bg-gradient-to-b from-green-400 to-emerald-500' :
        pct >= 50 ? 'bg-gradient-to-b from-blue-400 to-indigo-500' :
        'bg-gradient-to-b from-amber-400 to-orange-500'
      } text-white`}>
        <Trophy className="w-16 h-16 mb-4" />
        <h1 className="text-4xl font-extrabold mb-2">
          {pct >= 80 ? 'Xuất sắc!' : pct >= 50 ? 'Tốt lắm!' : 'Cố gắng lên!'}
        </h1>
        <p className="text-white/80 text-lg mb-8">{result.total} từ đã học</p>

        <div className="flex gap-8 mb-10">
          <div className="text-center">
            <div className="text-4xl font-extrabold">{pct}%</div>
            <div className="text-white/70 text-sm">Độ chính xác</div>
          </div>
          <div className="w-px bg-white/30" />
          <div className="text-center">
            <div className="text-4xl font-extrabold">+{result.xpEarned}</div>
            <div className="text-white/70 text-sm">XP kiếm được</div>
          </div>
          <div className="w-px bg-white/30" />
          <div className="text-center">
            <div className="text-4xl font-extrabold">{result.correct}/{result.total}</div>
            <div className="text-white/70 text-sm">Đúng</div>
          </div>
        </div>

        {result.wrongWords.length > 0 && (
          <div className="w-full max-w-sm bg-white/20 rounded-2xl p-4 mb-8">
            <p className="text-sm font-bold text-white/90 mb-3">Từ cần ôn lại:</p>
            <div className="space-y-2">
              {result.wrongWords.map(w => (
                <div key={w.id} className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-2.5">
                  <span className="text-xl font-bold">{w.hanzi}</span>
                  <span className="text-white/80 text-sm flex-1">{w.meaningVi}</span>
                  <button
                    onClick={() => playTTS(w.hanzi)}
                    className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3 w-full max-w-sm">
          <button
            onClick={onRetry}
            className="flex-1 bg-white/20 hover:bg-white/30 text-white font-bold py-3.5 rounded-2xl transition-all"
          >
            Học lại
          </button>
          <Link
            href="/home/student/flashcard"
            className="flex-1 bg-white text-on-surface font-bold py-3.5 rounded-2xl text-center hover:bg-white/90 transition-all"
          >
            Thư viện
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function FlashcardPage() {
  const params = useParams() as { hskLevel: string };
  const searchParams = useSearchParams();

  const hskLevel = params.hskLevel === 'all' ? null : params.hskLevel;
  const startTier = (searchParams.get('tier') as keyof BucketCounts) || null;

  const [allWords, setAllWords] = useState<FlashcardWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionResult, setSessionResult] = useState<SessionResult | null>(null);
  const [retryKey, setRetryKey] = useState(0); // increment to reset session

  // Session state — single source of truth in one useState
  const [session, setSession] = useState<SessionState>({
    queue: [],
    done: [],
    wrong: [],
    currentIdx: 0,
    flipped: false,
    submitting: false,
  });

  // ── Load words ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const url = hskLevel
      ? `/api/student/flashcard?hsk=${hskLevel}`
      : '/api/student/flashcard';
    fetch(url)
      .then(r => r.json())
      .then(d => {
        if (!d.words || d.words.length === 0) {
          setError('Không có từ vựng để học ở cấp độ này.');
          setLoading(false);
          return;
        }
        setAllWords(d.words);

        let filtered = d.words;
        if (startTier) {
          filtered = d.words.filter((w: FlashcardWord) => w.bucket === startTier);
          if (filtered.length === 0) filtered = d.words;
        }

        setSession({
          queue: filtered,
          done: [],
          wrong: [],
          currentIdx: 0,
          flipped: false,
          submitting: false,
        });
        setLoading(false);
      })
      .catch(() => {
        setError('Không thể tải từ vựng.');
        setLoading(false);
      });
  }, [hskLevel, startTier, retryKey]);

  const currentWord = session.queue[session.currentIdx] ?? null;
  const total = allWords.length;
  const doneCnt = session.done.length;
  const wrongCnt = session.wrong.length;
  const answered = doneCnt + wrongCnt;
  const progress = total > 0 ? Math.round((answered / total) * 100) : 0;
  const bucket = currentWord ? BUCKET_CONFIG[currentWord.bucket] : null;

  // ── POST answer ─────────────────────────────────────────────────────────────
  const postAnswer = useCallback(async (vocabId: string, correct: boolean) => {
    try {
      await fetch('/api/student/flashcard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vocabId, correct }),
      });
    } catch { /* non-critical */ }
  }, []);

  // ── Handle rating ───────────────────────────────────────────────────────────
  const handleRate = useCallback(async (correct: boolean) => {
    if (!currentWord || session.submitting) return;

    setSession(s => ({ ...s, submitting: true }));
    await postAnswer(currentWord.id, correct);

    setSession(s => {
      const { queue, currentIdx, done, wrong } = s;
      const word = queue[currentIdx];

      if (correct) {
        // Remove from queue, add to done
        const newQueue = queue.filter((_, i) => i !== currentIdx);
        const newDone = [...done, word];
        const newIdx = Math.min(currentIdx, newQueue.length - 1);
        return { ...s, queue: newQueue, done: newDone, currentIdx: newIdx, flipped: false, submitting: false };
      } else {
        // Remove from current position, append to end, add to wrong
        const newQueue = queue.filter((_, i) => i !== currentIdx);
        newQueue.push(word);
        const newWrong = [...wrong, word];
        return { ...s, queue: newQueue, wrong: newWrong, flipped: false, submitting: false };
      }
    });
  }, [currentWord, session.submitting, postAnswer]);

  // ── Session end ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (session.queue.length === 0 && allWords.length > 0 && !sessionResult) {
      const xpEarned = session.done.length * 5;
      setSessionResult({
        correct: session.done.length,
        total: allWords.length,
        xpEarned,
        wrongWords: session.wrong.slice(0, 10).map(w => ({
          id: w.id, hanzi: w.hanzi, meaningVi: w.meaningVi,
        })),
      });
    }
  }, [session.queue.length, allWords.length, sessionResult, session.done, session.wrong]);

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!currentWord || session.submitting) return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        setSession(s => ({ ...s, flipped: !s.flipped }));
      }
      if (e.key === 'ArrowRight') handleRate(true);
      if (e.key === 'ArrowLeft')  handleRate(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [currentWord, session.submitting, handleRate]);

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-surface-container flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-[3px] border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-on-surface-variant">Đang tải flashcard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-surface-container flex flex-col items-center justify-center px-6">
        <p className="text-4xl mb-4">📭</p>
        <p className="text-on-surface-variant text-center mb-6">{error}</p>
        <Link href="/home/student/flashcard" className="px-6 py-3 bg-primary text-on-primary rounded-xl font-bold">
          Quay lại thư viện
        </Link>
      </div>
    );
  }

  if (sessionResult) {
    return (
      <ResultScreen
        result={sessionResult}
        onRetry={() => {
          setSessionResult(null);
          setRetryKey(k => k + 1);
        }}
      />
    );
  }

  if (!currentWord) return null;

  return (
    <div className="min-h-screen bg-surface-container flex flex-col">

      {/* ── Top bar ── */}
      <div className="bg-surface-container-lowest border-b border-outline-variant/20 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/home/student/flashcard" className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-surface-container transition-colors">
            <ChevronLeft className="w-5 h-5 text-on-surface-variant" />
          </Link>

          <div className="flex-1">
            <div className="text-xs text-on-surface-variant">
              {hskLevel ?? 'Tất cả'} · {answered}/{total}
            </div>
            <div className="h-1.5 bg-surface-container rounded-full mt-1 overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {bucket && (
            <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${bucket.color} bg-current/10`}>
              <div className={`w-1.5 h-1.5 rounded-full ${bucket.dot}`} />
              {bucket.label}
            </div>
          )}
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-6">

        {/* Progress dots */}
        <div className="flex gap-1.5 mb-6 flex-wrap justify-center max-w-sm">
          {session.queue.slice(0, 30).map((w, i) => (
            <div key={w.id + i} className={`w-2 h-2 rounded-full transition-all ${i === session.currentIdx ? 'w-4 bg-primary' : 'bg-surface-container'}`} />
          ))}
          {session.queue.length > 30 && (
            <span className="text-xs text-on-surface-variant self-center">+{session.queue.length - 30}</span>
          )}
        </div>

        {/* ── Flashcard ── */}
        <div
          className="relative w-full max-w-sm cursor-pointer select-none"
          onClick={() => setSession(s => ({ ...s, flipped: !s.flipped }))}
          style={{ perspective: 1000 }}
        >
          <div
            className="relative w-full transition-transform duration-500"
            style={{
              transformStyle: 'preserve-3d',
              transform: session.flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            }}
          >
            {/* Front */}
            <div
              className="bg-surface-container-lowest rounded-3xl shadow-lg border border-outline-variant/20 p-8 flex flex-col items-center justify-center min-h-[320px]"
              style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
            >
              {getWordTypeBadge(currentWord.wordType)}

              {/* Audio */}
              <button
                onClick={(e) => { e.stopPropagation(); playAudio(currentWord.audioUrl ?? ''); playTTS(currentWord.hanzi); }}
                className="mb-3 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors"
              >
                <Volume2 className="w-5 h-5 text-primary" />
              </button>

              {/* Hanzi */}
              <div className="text-center mb-4">
                <div className="text-7xl font-bold text-on-surface leading-none chinese-text mb-3">
                  {currentWord.hanzi}
                </div>
                <div className="text-xl text-on-surface-variant italic">{currentWord.pinyin}</div>
              </div>

              <div className="mt-2 text-sm text-on-surface-variant flex items-center gap-1">
                <span>Bấm để lật</span>
                <span className="text-xs">[Space]</span>
              </div>
            </div>

            {/* Back */}
            <div
              className="bg-surface-container-lowest rounded-3xl shadow-lg border border-outline-variant/20 p-8 flex flex-col items-center justify-center min-h-[320px] absolute inset-0"
              style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
            >
              {getWordTypeBadge(currentWord.wordType)}

              <div className="text-center mb-4">
                <div className="text-3xl font-bold text-on-surface mb-2">{currentWord.meaningVi}</div>
                {currentWord.hanViet && currentWord.hanViet !== currentWord.meaningVi && (
                  <div className="text-base text-on-surface-variant italic">{currentWord.hanViet}</div>
                )}
              </div>

              {currentWord.exampleSentence && (
                <div className="text-center mt-2 px-4">
                  <div className="text-base text-on-surface chinese-text mb-1">{currentWord.exampleSentence}</div>
                  {currentWord.examplePinyin && (
                    <div className="text-sm text-on-surface-variant italic">{currentWord.examplePinyin}</div>
                  )}
                  {currentWord.exampleVi && (
                    <div className="text-sm text-on-surface-variant mt-1">{currentWord.exampleVi}</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Rating Buttons ── */}
        <div className="mt-8 w-full max-w-sm">
          {!session.flipped ? (
            <button
              onClick={() => setSession(s => ({ ...s, flipped: true }))}
              className="w-full py-4 bg-primary text-on-primary rounded-2xl font-bold text-lg hover:brightness-110 transition-colors"
            >
              Xem đáp án
            </button>
          ) : (
            <div className="flex gap-3">
              {/* Wrong */}
              <button
                onClick={() => handleRate(false)}
                disabled={session.submitting}
                className="flex-1 flex flex-col items-center gap-1 py-4 bg-error/10 hover:bg-error/20 border-2 border-error/30 rounded-2xl text-error transition-all disabled:opacity-50"
              >
                <XCircle className="w-7 h-7" />
                <span className="font-bold text-sm">Sai</span>
                <span className="text-xs opacity-60">→ Ôn lại</span>
              </button>

              {/* Hard */}
              <button
                onClick={() => handleRate(false)}
                disabled={session.submitting}
                className="flex-1 flex flex-col items-center gap-1 py-4 bg-amber-50 dark:bg-amber-900/30 hover:bg-amber-100 dark:hover:bg-amber-900/50 border-2 border-amber-200 dark:border-amber-700 rounded-2xl text-amber-600 dark:text-amber-300 transition-all disabled:opacity-50"
              >
                <div className="text-2xl">🤔</div>
                <span className="font-bold text-sm">Khó</span>
                <span className="text-xs opacity-60">→ Cần nhớ thêm</span>
              </button>

              {/* Correct */}
              <button
                onClick={() => handleRate(true)}
                disabled={session.submitting}
                className="flex-1 flex flex-col items-center gap-1 py-4 bg-secondary/10 hover:bg-secondary/20 border-2 border-secondary/30 rounded-2xl text-secondary transition-all disabled:opacity-50"
              >
                <CheckCircle2 className="w-7 h-7" />
                <span className="font-bold text-sm">Đúng</span>
                <span className="text-xs opacity-60">→ Thuộc rồi</span>
              </button>
            </div>
          )}
        </div>

        {/* ── Keyboard hint ── */}
        <div className="mt-4 text-center text-xs text-on-surface-variant">
          ← Sai · Khó → · [Space] lật card
        </div>
      </div>
    </div>
  );
}
