"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Clock, Volume2, Sparkles } from "lucide-react";

type Question = {
  id: string;
  vocabId: string;
  index: number;
  questionText: string;
  options: string[];
  audioUrl?: string | null;
  imageUrl?: string | null;
  type?: string;
  hanzi?: string;
  pinyin?: string;
  meaningVi?: string;
};

export default function AiQuizPage() {
  const { sessionId } = useParams() as { sessionId: string };
  const router = useRouter();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(600);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const hasSubmittedRef = useRef(false);

  useEffect(() => {
    // Fetch session status
    fetch(`/api/student/ai-quiz/${sessionId}`)
      .then(res => res.json())
      .then(data => {
        if (data.status === "submitted") {
          // Already submitted — redirect to review
          sessionStorage.setItem(`ai_quiz_result_${sessionId}`, JSON.stringify(data));
          router.push(`/home/student/ai-quiz/${sessionId}/review`);
          return;
        }
        setTimeLeft(data.remainingSeconds ?? 600);
      })
      .catch(() => {});

    // Load questions from sessionStorage (set by setup page)
    const stored = sessionStorage.getItem(`ai_quiz_questions_${sessionId}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setQuestions(parsed);
      } catch {}
    }
    setLoading(false);
  }, [sessionId, router]);

  const submitAndGoToReview = useCallback(async () => {
    if (hasSubmittedRef.current || submitting) return;
    hasSubmittedRef.current = true;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/student/ai-quiz/${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: selected }),
      });
      const data = await res.json();
      sessionStorage.setItem(`ai_quiz_result_${sessionId}`, JSON.stringify(data));
      router.push(`/home/student/ai-quiz/${sessionId}/review`);
    } catch {
      hasSubmittedRef.current = false;
      setSubmitting(false);
      alert("Lỗi khi nộp bài. Vui lòng thử lại.");
    }
  }, [sessionId, selected, submitting, router]);

  // Timer
  useEffect(() => {
    if (timeLeft <= 0) { submitAndGoToReview(); return; }
    const t = setInterval(() => setTimeLeft(prev => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(t);
  }, [timeLeft, submitAndGoToReview]);

  const handleSelect = (qId: string, option: string) => {
    setSelected(prev => ({ ...prev, [qId]: option }));
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-surface-container">
        <div className="w-12 h-12 border-[3px] border-purple-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-on-surface-variant text-lg">Đang tải quiz AI...</p>
      </div>
    );
  }

  if (!questions.length) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-surface-container px-6">
        <p className="text-5xl mb-4">🤖</p>
        <p className="text-on-surface-variant mb-2 font-semibold text-lg">Không tìm thấy câu hỏi</p>
        <p className="text-on-surface-variant text-sm mb-6 text-center">
          Có thể phiên đã hết hạn. Vui lòng bắt đầu lại.
        </p>
        <button
          onClick={() => router.push("/home/student/ai-quiz")}
          className="px-6 py-3 bg-primary text-on-primary rounded-xl font-bold hover:brightness-110 transition-all"
        >
          Quay lại
        </button>
      </div>
    );
  }

  const q = questions[currentIndex];
  const isTimeCritical = timeLeft <= 30;

  return (
    <div className="fixed inset-0 bg-surface-container flex flex-col">
      {/* Header */}
      <div className="bg-surface-container-lowest/80 backdrop-blur-md border-b border-outline-variant/20 flex-shrink-0">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <button
            onClick={() => router.push("/home/student/ai-quiz")}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-surface-container hover:bg-surface-container-high transition-colors flex-shrink-0"
            title="Thoát"
          >
            <span className="material-symbols-outlined text-on-surface" style={{ fontSize: 20 }}>close</span>
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-purple-500" />
              <span className="text-xs font-bold text-purple-600">AI QUIZ</span>
              <div className="text-xs sm:text-sm font-medium text-on-surface-variant ml-1">
                Câu {currentIndex + 1} / {questions.length}
              </div>
            </div>
            <div className="mt-1.5 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
              />
            </div>
          </div>

          <div className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl flex-shrink-0 transition-all ${
            isTimeCritical ? "bg-error/10 ring-1 ring-error/30" : "bg-surface-container"
          }`}>
            <Clock className={`w-4 h-4 ${isTimeCritical ? "text-error animate-pulse" : "text-purple-500"}`} />
            <span className={`font-mono text-base font-bold ${isTimeCritical ? "text-error" : "text-on-surface"}`}>
              {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto flex flex-col">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 flex-1 flex flex-col w-full">

          {/* Question Card */}
          <div className="bg-surface-container-lowest rounded-2xl sm:rounded-3xl p-4 sm:p-8 md:p-10 shadow-sm border border-purple-100 mb-4">
            <div className="text-center mb-6 sm:mb-10">
              {/* Hanzi display */}
              {q.hanzi && (
                <div className="text-[60px] sm:text-[80px] md:text-[100px] leading-none mb-3 sm:mb-5 chinese-text font-bold text-on-surface select-none">
                  {q.hanzi}
                </div>
              )}

              {/* Audio */}
              {q.audioUrl && (
                <button
                  onClick={() => new Audio(q.audioUrl!).play().catch(() => {})}
                  className="inline-flex items-center gap-2 px-3 sm:px-5 py-2 mb-3 sm:mb-4 rounded-full bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors text-sm sm:text-base font-medium"
                >
                  <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />
                  Nghe phát âm
                </button>
              )}

              {/* Image */}
              {q.imageUrl && (
                <div className="flex justify-center mb-3 sm:mb-4">
                  <img
                    src={q.imageUrl}
                    alt="Hình minh hoạ"
                    className="max-w-full max-h-40 sm:max-h-52 md:max-h-60 rounded-2xl object-cover shadow-sm border border-purple-100"
                    onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                </div>
              )}

              {/* Question Text */}
              <p className="text-base sm:text-xl text-on-surface-variant px-2 leading-relaxed">
                {q.questionText}
              </p>
            </div>

            {/* Options */}
            <div className="space-y-2 sm:space-y-3">
              {q.options.map((opt, i) => {
                const letter = String.fromCharCode(65 + i);
                const chosen = selected[q.id] === opt;

                return (
                  <button
                    key={i}
                    onClick={() => handleSelect(q.id, opt)}
                    disabled={submitting}
                    className={`w-full text-left p-3 sm:p-4 md:p-5 rounded-xl sm:rounded-2xl border-2 text-sm sm:text-base md:text-lg transition-all ${
                      chosen
                        ? "border-purple-500 bg-purple-50 font-medium text-on-surface"
                        : "border-outline-variant hover:border-purple-300 hover:bg-purple-50/50 text-on-surface"
                    } ${submitting ? "pointer-events-none opacity-60" : ""}`}
                  >
                    <span className={`font-bold mr-3 sm:mr-5 text-sm sm:text-base md:text-lg w-6 inline-block text-center rounded-lg px-1 ${
                      chosen ? "bg-purple-500 text-white" : "bg-surface-container text-on-surface-variant"
                    }`}>
                      {letter}
                    </span>
                    <span className="break-words">{opt}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <button
              onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
              disabled={currentIndex === 0 || submitting}
              className="px-4 sm:px-6 py-3 sm:py-4 text-sm sm:text-base disabled:opacity-30 disabled:cursor-not-allowed text-on-surface-variant hover:text-on-surface transition-colors"
            >
              ← Trước
            </button>

            <div className="flex flex-col items-center gap-1 text-center">
              {!selected[q.id] && (
                <p className="text-xs text-on-surface-variant">Chưa chọn đáp án</p>
              )}
            </div>

            {currentIndex < questions.length - 1 ? (
              <button
                onClick={() => { if (selected[q.id]) setCurrentIndex(i => i + 1); }}
                disabled={submitting || !selected[q.id]}
                className="px-4 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl sm:rounded-2xl text-sm sm:text-base hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap shadow-md transition-all"
              >
                Tiếp →
              </button>
            ) : (
              <button
                onClick={submitAndGoToReview}
                disabled={submitting}
                className="px-4 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl sm:rounded-2xl text-sm sm:text-base font-semibold hover:brightness-110 disabled:opacity-60 flex items-center gap-2 whitespace-nowrap shadow-md transition-all"
              >
                {submitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span className="hidden sm:inline">Đang nộp...</span>
                  </>
                ) : (
                  <>Nộp bài ✓</>
                )}
              </button>
            )}
          </div>

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-1.5 mt-4 flex-wrap pb-2">
            {questions.map((qq, i) => (
              <div
                key={qq.id}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === currentIndex
                    ? "w-4 bg-purple-500"
                    : selected[qq.id]
                      ? "bg-indigo-400"
                      : "bg-surface-container-high"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}