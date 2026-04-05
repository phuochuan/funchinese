"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Zap } from "lucide-react";

interface QuizMode {
  hskLevel: number;
  count: number;
}

export default function AiQuizSetup() {
  const router = useRouter();
  const [modes, setModes] = useState<{ totalApproved: number; totalVocab: number; byLevel: QuizMode[] }>({
    totalApproved: 0,
    totalVocab: 0,
    byLevel: [],
  });
  const [loading, setLoading] = useState(true);
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [duration, setDuration] = useState(10);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/student/ai-quiz")
      .then(r => r.json())
      .then(d => setModes(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const startQuiz = async () => {
    setStarting(true);
    setError("");
    const res = await fetch("/api/student/ai-quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hskLevel: selectedLevel,
        durationMinutes: duration,
        limit: 10,
      }),
    });
    const data = await res.json();
    setStarting(false);

    if (data.sessionId) {
      // Lưu questions vào sessionStorage để quiz page đọc
      sessionStorage.setItem(`ai_quiz_questions_${data.sessionId}`, JSON.stringify(data.questions));
      sessionStorage.setItem(`ai_quiz_result_${data.sessionId}`, ""); // reset
      router.push(`/home/student/ai-quiz/${data.sessionId}`);
    } else {
      setError(data.error ?? "Không thể bắt đầu quiz");
    }
  };

  const HSK_COLORS = [
    "", "text-green-600", "text-teal-600", "text-blue-600",
    "text-indigo-600", "text-purple-600", "text-red-600",
  ];
  const HSK_BG = [
    "", "bg-green-50 border-green-200", "bg-teal-50 border-teal-200",
    "bg-blue-50 border-blue-200", "bg-indigo-50 border-indigo-200",
    "bg-purple-50 border-purple-200", "bg-red-50 border-red-200",
  ];

  return (
    <div className="min-h-screen bg-surface-container pb-12">
      <div className="max-w-5xl mx-auto px-6 pt-8">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-purple-100 text-purple-700 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              AI-POWERED
            </div>
          </div>
          <h1 className="text-3xl font-bold text-on-surface">Luyện tập theo Từ vựng cá nhân</h1>
          <p className="text-on-surface-variant mt-1">
            Quiz được tạo bởi AI cho từng từ vựng riêng của bạn. Câu hỏi gắn liền với từ bạn đã học.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-5 border border-outline-variant/20 shadow-sm">
            <div className="text-3xl font-extrabold text-purple-600">{loading ? "—" : modes.totalVocab}</div>
            <div className="text-xs text-on-surface-variant mt-1">Từ vựng đã học</div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-outline-variant/20 shadow-sm">
            <div className="text-3xl font-extrabold text-green-600">{loading ? "—" : modes.totalApproved}</div>
            <div className="text-xs text-on-surface-variant mt-1">Câu hỏi AI sẵn sàng</div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-outline-variant/20 shadow-sm">
            <div className="text-3xl font-extrabold text-amber-600">
              {loading ? "—" : (modes.totalVocab > 0 ? Math.round((modes.totalApproved / modes.totalVocab) * 100) + "%" : "—")}
            </div>
            <div className="text-xs text-on-surface-variant mt-1">Tỷ lệ có quiz</div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* Main card */}
        <div className="bg-white rounded-3xl p-8 border border-outline-variant/20 shadow-sm mb-8">
          {modes.totalApproved === 0 && !loading ? (
            <div className="text-center py-8">
              <div className="text-5xl mb-4">🤖</div>
              <h3 className="text-xl font-bold text-on-surface mb-2">Chưa có câu hỏi AI nào</h3>
              <p className="text-sm text-on-surface-variant max-w-sm mx-auto">
                Giáo viên cần tạo và duyệt câu hỏi AI cho từ vựng của bạn trước.
                Hãy học bài và quay lại sau nhé!
              </p>
            </div>
          ) : (
            <>
              {/* HSK Level selector */}
              <div className="mb-8">
                <label className="block text-sm font-medium text-on-surface-variant mb-3">
                  Chọn cấp độ HSK (hoặc chọn tất cả)
                </label>
                <div className="grid grid-cols-4 gap-3">
                  <button
                    onClick={() => setSelectedLevel(null)}
                    className={`py-4 rounded-2xl font-semibold transition-all text-sm border-2 ${
                      selectedLevel === null
                        ? "bg-primary text-on-primary border-primary shadow-md"
                        : "bg-white text-on-surface border-outline-variant/30 hover:border-primary/40"
                    }`}
                  >
                    Tất cả
                    {modes.totalApproved > 0 && (
                      <span className="block text-xs opacity-70 mt-0.5">{modes.totalApproved} câu</span>
                    )}
                  </button>
                  {modes.byLevel.map(l => (
                    <button
                      key={l.hskLevel}
                      onClick={() => setSelectedLevel(l.hskLevel)}
                      className={`py-4 rounded-2xl font-semibold transition-all text-sm border-2 ${
                        selectedLevel === l.hskLevel
                          ? "bg-primary text-on-primary border-primary shadow-md"
                          : `bg-white text-on-surface border-outline-variant/30 hover:border-primary/40 ${HSK_BG[l.hskLevel]?.split(" ")[0] ?? ""}`
                      }`}
                    >
                      HSK {l.hskLevel}
                      <span className="block text-xs opacity-70 mt-0.5">{l.count} câu</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration */}
              <div className="mb-8">
                <label className="block text-sm font-medium text-on-surface-variant mb-3">
                  Thời lượng
                </label>
                <div className="grid grid-cols-3 gap-4">
                  {[5, 10, 15].map(min => (
                    <button
                      key={min}
                      onClick={() => setDuration(min)}
                      className={`py-5 rounded-2xl font-semibold text-lg transition-all border-2 ${
                        duration === min
                          ? "bg-primary text-on-primary border-primary shadow-lg"
                          : "bg-white text-on-surface border-outline-variant/30 hover:border-primary/40"
                      }`}
                    >
                      {min} phút
                    </button>
                  ))}
                </div>
              </div>

              {/* Start */}
              <button
                onClick={startQuiz}
                disabled={starting || modes.totalApproved === 0}
                className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl text-lg transition-all shadow-lg"
              >
                {starting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Đang khởi tạo...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Bắt đầu AI Quiz →
                  </>
                )}
              </button>
            </>
          )}
        </div>

        {/* Info box */}
        <div className="bg-purple-50 border border-purple-100 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <Zap className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-purple-800 mb-1">Cách thức hoạt động</p>
              <p className="text-xs text-purple-700 leading-relaxed">
                Mỗi câu hỏi AI được tạo cho <strong>một từ vựng cụ thể</strong> mà bạn đã học.
                Khi bạn hoàn thành một bài học hoặc học flashcard, giáo viên có thể tạo câu hỏi
                từ các từ đó. Sau khi duyệt, câu hỏi sẽ xuất hiện trong quiz này.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
