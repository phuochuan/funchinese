'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Clock, Volume2 } from 'lucide-react';

type Question = {
  id: string;
  hanzi: string;
  questionText: string;
  options: string[];
  correctAnswer: string;
  audioUrl?: string | null;
  questionImageUrl?: string | null;
  type?: string;
};

export default function PracticeQuiz() {
  const { sessionId } = useParams() as { sessionId: string };
  const router = useRouter();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(600);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const hasSubmittedRef = useRef(false);

  useEffect(() => {
    fetch(`/api/practice/${sessionId}`)
      .then(res => res.json())
      .then(data => {
        setQuestions(data.questions ?? []);
        setTimeLeft(data.remainingSeconds ?? 600);
        setLoading(false);
      })
      .catch(() => alert('Lỗi tải bài tập'))
      .finally(() => setLoading(false));
  }, [sessionId]);

  const submitAndGoToReview = useCallback(async () => {
    if (hasSubmittedRef.current || submitting) return;
    hasSubmittedRef.current = true;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/practice/${sessionId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: selected }),
      });
      const data = await res.json();
      sessionStorage.setItem(`quiz_result_${sessionId}`, JSON.stringify(data));
      router.push(`/home/student/quiz/${sessionId}/review`);
    } catch {
      hasSubmittedRef.current = false;
      setSubmitting(false);
      alert('Lỗi khi nộp bài. Vui lòng thử lại.');
    }
  }, [sessionId, selected, submitting, router]);

  useEffect(() => {
    if (timeLeft <= 0) { submitAndGoToReview(); return; }
    const t = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(t);
  }, [timeLeft, submitAndGoToReview]);

  const handleSelect = (qId: string, option: string) => {
    setSelected(prev => ({ ...prev, [qId]: option }));
  };

  const fetchMore = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch('/api/practice/next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();
      if (data.done) { submitAndGoToReview(); return; }
      setQuestions(prev => {
        const existingIds = new Set(prev.map(q => q.id));
        const newOnes = (data.questions as Question[]).filter(q => !existingIds.has(q.id));
        return [...prev, ...newOnes];
      });
      setCurrentIndex(prev => prev + 1);
    } catch (err) { console.error(err); }
    finally { setLoadingMore(false); }
  };

  const isLastQuestion = currentIndex === questions.length - 1;

  const handleLastQuestionAction = async () => {
    if (isLastQuestion) await fetchMore();
    else setCurrentIndex(i => i + 1);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface-container">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-on-surface-variant text-lg">Đang tải câu hỏi...</p>
      </div>
    );
  }

  if (!questions.length) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface-container px-6">
        <p className="text-5xl mb-4">😕</p>
        <p className="text-on-surface-variant mb-6 text-center">Không có câu hỏi nào trong phiên này.</p>
        <button onClick={() => router.push('/home/student')} className="px-6 py-3 bg-primary text-on-primary rounded-xl font-bold">
          Về trang chủ
        </button>
      </div>
    );
  }

  const q = questions[currentIndex];
  const isTimeCritical = timeLeft <= 30;

  return (
    <div className="min-h-screen bg-surface-container py-4 sm:py-6">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">

        {/* ── HEADER ── */}
        <div className="flex items-center justify-between mb-4 sm:mb-6 gap-2">
          {/* Progress */}
          <div className="flex-1 min-w-0">
            <div className="text-xs sm:text-sm font-medium text-on-surface-variant">
              Câu {currentIndex + 1} / {questions.length}
            </div>
            {/* Progress bar */}
            <div className="mt-1.5 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Timer */}
          <div className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 rounded-2xl shadow-sm transition-all flex-shrink-0 ${
            isTimeCritical ? 'bg-error/10 ring-1 ring-error/30' : 'bg-surface-container-lowest'
          }`}>
            <Clock className={`w-4 h-4 sm:w-5 sm:h-5 ${isTimeCritical ? 'text-error animate-pulse' : 'text-tertiary'}`} />
            <span className={`font-mono text-sm sm:text-lg font-bold ${isTimeCritical ? 'text-error' : 'text-on-surface'}`}>
              {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
            </span>
          </div>
        </div>

        {/* ── QUESTION CARD ── */}
        <div className="bg-surface-container-lowest rounded-2xl sm:rounded-3xl p-4 sm:p-8 md:p-10 shadow-sm border border-outline-variant/20 mb-4">

          <div className="text-center mb-6 sm:mb-10">
            {/* IMAGE */}
            {q.questionImageUrl && (
              <div className="mb-4 sm:mb-5 flex justify-center">
                <img
                  src={q.questionImageUrl}
                  alt="Hình minh họa"
                  className="max-w-full max-h-32 sm:max-h-40 md:max-h-48 rounded-xl sm:rounded-2xl object-contain"
                />
              </div>
            )}

            {/* HANZI */}
            <div className="text-[60px] sm:text-[80px] md:text-[100px] leading-none mb-3 sm:mb-5 font-serif text-on-surface select-none">
              {q.hanzi}
            </div>

            {/* AUDIO */}
            {q.audioUrl && (
              <button
                onClick={() => new Audio(q.audioUrl!).play().catch(() => {})}
                className="inline-flex items-center gap-2 px-3 sm:px-5 py-2 mb-3 sm:mb-4 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm sm:text-base font-medium"
              >
                <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />
                Nghe phát âm
              </button>
            )}

            {/* QUESTION TEXT */}
            <p className="text-base sm:text-xl text-on-surface-variant px-2">{q.questionText}</p>

            {/* FILL_BLANK badge */}
            {q.type === 'FILL_BLANK' && (
              <span className="inline-block mt-2 sm:mt-3 px-2.5 sm:px-3 py-1 rounded-full bg-secondary/10 text-secondary text-xs sm:text-sm font-semibold">
                Điền từ
              </span>
            )}
          </div>

          {/* ── OPTIONS (MULTIPLE CHOICE) ── */}
          {q.type !== 'FILL_BLANK' && (
            <div className="space-y-2 sm:space-y-3">
              {q.options.map((opt, i) => {
                const letter = String.fromCharCode(65 + i);
                const cleanOpt = opt.replace(/^[A-D]\.\s*/, '');
                const chosen = selected[q.id] === cleanOpt;

                return (
                  <button
                    key={i}
                    onClick={() => handleSelect(q.id, cleanOpt)}
                    disabled={submitting}
                    className={`w-full text-left p-3 sm:p-4 md:p-5 rounded-xl sm:rounded-2xl border-2 text-sm sm:text-base md:text-lg transition-all ${
                      chosen
                        ? 'border-primary bg-primary/10 font-medium text-on-surface'
                        : 'border-outline-variant hover:border-primary/50 hover:bg-primary/5 text-on-surface'
                    } ${submitting ? 'pointer-events-none opacity-60' : ''}`}
                  >
                    <span className="font-bold mr-3 sm:mr-5 text-sm sm:text-base md:text-lg w-6 inline-block text-center">{letter}.</span>
                    <span className="break-words">{cleanOpt}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* ── FILL BLANK INPUT ── */}
          {q.type === 'FILL_BLANK' && (
            <div className="mt-2">
              <input
                type="text"
                placeholder="Nhập đáp án..."
                value={selected[q.id] ?? ''}
                onChange={e => setSelected(prev => ({ ...prev, [q.id]: e.target.value }))}
                disabled={submitting}
                className="w-full p-4 sm:p-5 rounded-xl sm:rounded-2xl border-2 border-outline-variant focus:border-primary text-base sm:text-lg text-center focus:outline-none bg-surface-container-lowest text-on-surface placeholder:text-on-surface-variant/50"
                autoComplete="off"
              />
              <p className="text-center text-xs sm:text-sm text-secondary mt-2 font-medium">
                ✓ Đáp án sẽ được chấm đúng ngay
              </p>
            </div>
          )}
        </div>

        {/* ── NAVIGATION ── */}
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          <button
            onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
            disabled={currentIndex === 0 || submitting}
            className="px-4 sm:px-6 py-3 sm:py-4 text-sm sm:text-base disabled:opacity-30 disabled:cursor-not-allowed text-on-surface-variant hover:text-on-surface"
          >
            ← Trước
          </button>

          {/* Hint */}
          <div className="flex flex-col items-center gap-1 text-center">
            {q.type === 'FILL_BLANK' && !selected[q.id] && (
              <p className="text-xs text-on-surface-variant">Nhập đáp án rồi bấm</p>
            )}
            {q.type !== 'FILL_BLANK' && !selected[q.id] && (
              <p className="text-xs text-on-surface-variant">Chưa chọn đáp án</p>
            )}
          </div>

          {/* Next / Submit */}
          {isLastQuestion ? (
            <button
              onClick={handleLastQuestionAction}
              disabled={loadingMore || submitting}
              className="px-4 sm:px-8 py-3 sm:py-4 bg-secondary text-white rounded-xl sm:rounded-2xl text-sm sm:text-base font-semibold hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
            >
              {loadingMore ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span className="hidden sm:inline">Đang tải thêm...</span>
                </>
              ) : submitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span className="hidden sm:inline">Đang nộp...</span>
                </>
              ) : (
                <>Nộp bài ✓</>
              )}
            </button>
          ) : (
            <button
              onClick={() => { if (selected[q.id]) setCurrentIndex(i => i + 1); }}
              disabled={submitting || (!selected[q.id] && q.type !== 'FILL_BLANK')}
              className="px-4 sm:px-8 py-3 sm:py-4 bg-primary text-white rounded-xl sm:rounded-2xl text-sm sm:text-base hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
            >
              Tiếp →
            </button>
          )}
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 mt-4 flex-wrap">
          {questions.map((qq, i) => (
            <div
              key={qq.id}
              className={`w-2 h-2 rounded-full transition-all ${
                i === currentIndex
                  ? 'w-4 bg-primary'
                  : selected[qq.id]
                    ? 'bg-secondary'
                    : 'bg-surface-container-high'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
