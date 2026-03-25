'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Clock, Volume2 } from 'lucide-react';

type Question = {
  id: string;
  hanzi: string;
  questionText: string;
  options: string[];
  correctAnswer: string;
};

export default function PracticeQuiz() {
  const { sessionId } = useParams() as { sessionId: string };
  const router = useRouter();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(600);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false); // 🔥 chống spam

  // 🔥 fetch thêm câu
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

      if (data.done) {
        alert('Hết câu hỏi hoặc hết thời gian!');
        return;
      }

      setQuestions(prev => [...prev, ...data.questions]);

      // 👉 auto sang câu mới luôn
      setCurrentIndex(prev => prev + 1);
    } catch (err) {
      console.log(err);
    } finally {
      setLoadingMore(false);
    }
  };

  // load initial
  useEffect(() => {
    fetch(`/api/practice/${sessionId}`)
      .then(res => res.json())
      .then(data => {
        setQuestions(data.questions);
        setTimeLeft(data.remainingSeconds || 600);
        setLoading(false);
      })
      .catch(() => alert('Lỗi tải bài tập'));
  }, [sessionId]);

  // timer
  useEffect(() => {
    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }
    const t = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(t);
  }, [timeLeft]);

  const handleSelect = (qId: string, option: string) => {
    setSelected(prev => ({ ...prev, [qId]: option }));
  };

  const handleSubmit = async () => {
    await fetch(`/api/practice/${sessionId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: selected }),
    });
    router.push(`/practice/${sessionId}/review`);
  };

  if (loading || !questions.length) {
    return (
      <div className="min-h-screen flex items-center justify-center text-2xl">
        Đang tải câu hỏi...
      </div>
    );
  }

  const q = questions[currentIndex];

  return (
    <div className="min-h-screen bg-[#f8fafc] py-8">
      <div className="max-w-4xl mx-auto px-6">
        {/* HEADER */}
        <div className="flex justify-between items-center mb-8">
          <div className="text-lg font-medium">
            Câu {currentIndex + 1} / {questions.length}
          </div>

          <div className="flex items-center gap-3 bg-white px-6 py-3 rounded-2xl shadow">
            <Clock className="w-6 h-6 text-orange-500" />
            <span className="font-mono text-xl font-bold">
              {Math.floor(timeLeft / 60)}:
              {(timeLeft % 60).toString().padStart(2, '0')}
            </span>
          </div>
        </div>

        {/* QUESTION */}
        <div className="bg-white rounded-3xl p-12 shadow">
          <div className="text-center mb-12">
            <div className="text-[120px] leading-none mb-6 font-serif">
              {q.hanzi}
            </div>
            <p className="text-2xl text-gray-700">{q.questionText}</p>
          </div>

          <div className="space-y-4">
            {q.options.map((opt, i) => {
              const letter = String.fromCharCode(65 + i);
              const chosen = selected[q.id] === opt;

              return (
                <button
                  key={i}
                  onClick={() => handleSelect(q.id, opt)}
                  className={`w-full text-left p-6 rounded-2xl border-2 text-xl transition-all ${
                    chosen
                      ? 'border-blue-600 bg-blue-50 font-medium'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="font-bold mr-6">{letter}.</span> {opt}
                </button>
              );
            })}
          </div>

          {q.hanzi && (
            <div className="flex justify-center mt-10">
              <button className="flex items-center gap-3 text-blue-600 hover:text-blue-700">
                <Volume2 className="w-6 h-6" />
                Nghe phát âm
              </button>
            </div>
          )}
        </div>

        {/* NAV */}
        <div className="flex justify-between mt-10">
          <button
            onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
            disabled={currentIndex === 0}
            className="px-8 py-4 text-lg disabled:opacity-40"
          >
            ← Câu trước
          </button>

          {/* 🔥 LOGIC QUAN TRỌNG */}
          {currentIndex < questions.length - 1 ? (
            <button
              onClick={() => setCurrentIndex(i => i + 1)}
              className="px-10 py-4 bg-blue-600 text-white rounded-2xl text-lg hover:bg-blue-700"
            >
              Câu sau →
            </button>
          ) : (
            <button
              onClick={async () => {
                if (timeLeft > 0) {
                  await fetchMore(); // 👉 load thêm thay vì submit
                } else {
                  handleSubmit();
                }
              }}
              className="px-12 py-4 bg-green-600 text-white rounded-2xl text-lg font-semibold hover:bg-green-700"
            >
              {timeLeft > 0
                ? loadingMore
                  ? 'Đang tải thêm câu...'
                  : 'Câu tiếp theo →'
                : 'Nộp bài và xem kết quả'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}