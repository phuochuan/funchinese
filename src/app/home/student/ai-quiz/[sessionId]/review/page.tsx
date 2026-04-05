"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Sparkles, CheckCircle2, XCircle, Volume2 } from "lucide-react";

interface QuizResult {
  score: number;
  correctCount: number;
  totalQuestions: number;
  xpEarned: number;
  results: {
    questionId: string;
    vocabId: string;
    correct: boolean;
    userAnswer: string | null;
    correctAnswer: string;
    explanation?: string | null;
    hanzi?: string;
    pinyin?: string;
    meaningVi?: string;
  }[];
}

interface StoredQuestion {
  id: string;
  vocabId: string;
  questionText: string;
  options: string[];
  audioUrl?: string | null;
  type?: string;
  hanzi?: string;
  pinyin?: string;
  meaningVi?: string;
}

export default function AiQuizReview() {
  const { sessionId } = useParams() as { sessionId: string };
  const router = useRouter();

  const [result, setResult] = useState<QuizResult | null>(null);
  const [questions, setQuestions] = useState<StoredQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | "correct" | "wrong">("all");

  useEffect(() => {
    // Try sessionStorage first (from quiz page)
    const storedResult = sessionStorage.getItem(`ai_quiz_result_${sessionId}`);
    const storedQuestions = sessionStorage.getItem(`ai_quiz_questions_${sessionId}`);

    if (storedResult) {
      try {
        const parsed = JSON.parse(storedResult);
        if (parsed && parsed.results) {
          setResult(parsed);
        }
      } catch {}
    }

    if (storedQuestions) {
      try {
        setQuestions(JSON.parse(storedQuestions));
      } catch {}
    }

    setLoading(false);
  }, [sessionId]);

  if (loading) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-surface-container">
        <div className="w-12 h-12 border-[3px] border-purple-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-on-surface-variant">Đang tải kết quả...</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-surface-container px-6">
        <p className="text-5xl mb-4">🤖</p>
        <p className="text-on-surface-variant mb-6">Không tìm thấy kết quả quiz.</p>
        <button onClick={() => router.push("/home/student/ai-quiz")}
          className="px-6 py-3 bg-primary text-on-primary rounded-xl font-bold">
          Quay lại
        </button>
      </div>
    );
  }

  const { score, correctCount, totalQuestions, xpEarned, results } = result;

  const accuracy = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  const emoji = accuracy >= 90 ? "🏆" : accuracy >= 70 ? "💪" : accuracy >= 40 ? "📚" : "🌱";
  const message = accuracy >= 90
    ? "Xuất sắc! Bạn nắm vững từ vựng này rồi!"
    : accuracy >= 70
    ? "Tốt lắm! Cần ôn thêm một chút nữa."
    : accuracy >= 40
    ? "Cố gắng hơn nữa nhé! Học lại từ sai."
    : "Đừng nản lòng! Hãy học lại và thử lại.";

  const filtered = tab === "all"
    ? results
    : tab === "correct"
    ? results.filter(r => r.correct)
    : results.filter(r => !r.correct);

  return (
    <div className="min-h-screen bg-surface-container pb-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-6">

        {/* Header card */}
        <div className="bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 rounded-3xl p-6 sm:p-8 mb-6 text-white shadow-lg relative overflow-hidden">
          <div className="absolute top-4 right-4 opacity-20">
            <Sparkles className="w-20 h-20" />
          </div>

          <div className="text-center mb-6">
            <div className="text-6xl mb-3">{emoji}</div>
            <h1 className="text-2xl sm:text-3xl font-extrabold mb-2">Kết quả AI Quiz</h1>
            <p className="text-white/80 text-sm sm:text-base">{message}</p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/15 rounded-2xl p-4 text-center backdrop-blur-sm">
              <div className="text-3xl font-extrabold">{accuracy}%</div>
              <div className="text-xs text-white/70 mt-1">Độ chính xác</div>
            </div>
            <div className="bg-white/15 rounded-2xl p-4 text-center backdrop-blur-sm">
              <div className="text-3xl font-extrabold">{correctCount}/{totalQuestions}</div>
              <div className="text-xs text-white/70 mt-1">Câu đúng</div>
            </div>
            <div className="bg-white/15 rounded-2xl p-4 text-center backdrop-blur-sm">
              <div className="text-3xl font-extrabold">+{xpEarned} XP</div>
              <div className="text-xs text-white/70 mt-1">Kinh nghiệm</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {(["all", "correct", "wrong"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                tab === t
                  ? t === "correct" ? "bg-green-100 text-green-700" : t === "wrong" ? "bg-red-100 text-red-700" : "bg-purple-100 text-purple-700"
                  : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
              }`}>
              {t === "all" ? `Tất cả (${totalQuestions})` : t === "correct" ? `Đúng (${correctCount})` : `Sai (${totalQuestions - correctCount})`}
            </button>
          ))}
        </div>

        {/* Question list */}
        <div className="space-y-3 pb-8">
          {filtered.map((r, i) => {
            const q = questions.find(q => q.id === r.questionId);

            return (
              <div key={r.questionId}
                className={`bg-surface-container-lowest rounded-2xl border-2 overflow-hidden transition-all ${
                  r.correct ? "border-green-200" : "border-red-200"
                }`}>
                {/* Result header */}
                <div className={`flex items-center justify-between px-4 py-3 ${
                  r.correct ? "bg-green-50" : "bg-red-50"
                }`}>
                  <div className="flex items-center gap-2">
                    {r.correct
                      ? <CheckCircle2 className="w-5 h-5 text-green-600" />
                      : <XCircle className="w-5 h-5 text-red-600" />
                    }
                    <span className={`text-sm font-bold ${r.correct ? "text-green-700" : "text-red-700"}`}>
                      {r.correct ? "Đúng" : "Sai"}
                    </span>
                  </div>
                  {q?.audioUrl && (
                    <button onClick={() => new Audio(q.audioUrl!).play().catch(() => {})}
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-white/50 hover:bg-white transition-colors">
                      <Volume2 className="w-4 h-4 text-purple-600" />
                    </button>
                  )}
                </div>

                {/* Question */}
                <div className="p-4">
                  {r.hanzi && (
                    <div className="text-4xl chinese-text font-bold text-on-surface text-center mb-3">
                      {r.hanzi}
                    </div>
                  )}
                  {q?.questionText && (
                    <p className="text-sm text-on-surface-variant text-center mb-3">
                      {q.questionText}
                    </p>
                  )}

                  {/* Your answer */}
                  <div className={`text-sm px-3 py-2 rounded-xl mb-2 ${
                    r.correct ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                  }`}>
                    <span className="font-semibold">Bạn chọn: </span>
                    <span>{r.userAnswer ?? "(không trả lời)"}</span>
                  </div>

                  {/* Correct answer */}
                  {!r.correct && (
                    <div className="text-sm px-3 py-2 rounded-xl bg-green-50 text-green-700 mb-2">
                      <span className="font-semibold">Đáp án đúng: </span>
                      <span>{r.correctAnswer}</span>
                    </div>
                  )}

                  {/* Explanation */}
                  {r.explanation && (
                    <div className="mt-3 p-3 bg-surface-container rounded-xl">
                      <p className="text-xs font-semibold text-on-surface-variant mb-1">💡 Giải thích</p>
                      <p className="text-xs text-on-surface leading-relaxed">{r.explanation}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pb-8">
          <button onClick={() => router.push("/home/student/ai-quiz")}
            className="flex-1 py-4 bg-surface-container-lowest border border-outline-variant/20 rounded-2xl font-semibold text-on-surface hover:bg-surface-container-high transition-all">
            ← Quiz khác
          </button>
          <button onClick={() => router.push("/home/student")}
            className="flex-1 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl font-bold hover:brightness-110 transition-all shadow-md">
            Về trang chủ
          </button>
        </div>
      </div>
    </div>
  );
}
