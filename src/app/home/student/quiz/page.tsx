'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Target } from 'lucide-react';

export default function PracticeSetup() {
  const router = useRouter();

  const [duration, setDuration] = useState(10);
  const [level, setLevel] = useState(3);
  const [loading, setLoading] = useState(false);

  const startPractice = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/practice/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          durationMinutes: duration,
          level,
        }),
      });

      const data = await res.json();

      if (data.sessionId) {
        router.push(`/home/student/quiz/${data.sessionId}`);
      } else {
        alert('Không tạo được phiên luyện tập!');
      }
    } catch (err) {
      console.log(err);
      alert('Có lỗi xảy ra, vui lòng thử lại!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-container pb-12">
      <div className="max-w-5xl mx-auto px-6 pt-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold text-on-surface">Practice</h1>
            <p className="text-on-surface-variant">Luyện tập theo trình độ HSK</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-surface-container-lowest px-4 py-2 rounded-xl shadow-sm border border-outline-variant/20 flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              <div>
                <div className="text-sm font-medium text-on-surface">HSK {level}</div>
                <div className="text-xs text-on-surface-variant">Tiến độ học tập</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left */}
          <div className="lg:col-span-5">
            <div className="bg-surface-container-lowest rounded-3xl p-8 shadow-sm border border-outline-variant/20">
              <div className="text-center mb-6">
                <div className="inline-block bg-primary/10 text-primary text-xs font-medium px-3 py-1 rounded-full mb-3">
                  CHARACTER OF THE DAY
                </div>
                <div className="text-8xl mb-4 chinese-text">书</div>
                <div className="text-2xl font-semibold text-on-surface">Thư / Book</div>
                <p className="text-on-surface-variant mt-2">
                  Tập trung vào sự cân bằng giữa nét ngang và nét dọc hôm nay.
                </p>
              </div>
            </div>
          </div>

          {/* Right */}
          <div className="lg:col-span-7 space-y-8">
            <div className="bg-surface-container-lowest rounded-3xl p-8 shadow-sm border border-outline-variant/20">
              <h2 className="text-2xl font-bold text-on-surface mb-6">
                Thiết lập buổi luyện tập
              </h2>

              {/* LEVEL */}
              <div className="mb-8">
                <label className="block text-sm font-medium text-on-surface-variant mb-3">
                  Trình độ HSK
                </label>

                <div className="grid grid-cols-3 gap-4">
                  {[1, 2, 3, 4, 5, 6].map((lv) => (
                    <button
                      key={lv}
                      onClick={() => setLevel(lv)}
                      className={`py-4 rounded-2xl font-semibold transition-all ${
                        level === lv
                          ? 'bg-primary text-on-primary shadow-md scale-105'
                          : 'bg-surface-container hover:bg-surface-container-high text-on-surface'
                      }`}
                    >
                      HSK {lv}
                    </button>
                  ))}
                </div>
              </div>

              {/* DURATION */}
              <div className="mb-8">
                <label className="block text-sm font-medium text-on-surface-variant mb-3">
                  Thời lượng buổi học
                </label>

                <div className="grid grid-cols-3 gap-4">
                  {[5, 10, 15].map((min) => (
                    <button
                      key={min}
                      onClick={() => setDuration(min)}
                      className={`py-6 rounded-2xl font-semibold text-lg transition-all ${
                        duration === min
                          ? 'bg-primary text-on-primary shadow-lg scale-105'
                          : 'bg-surface-container hover:bg-surface-container-high text-on-surface'
                      }`}
                    >
                      {min} phút
                    </button>
                  ))}
                </div>
              </div>

              {/* START BUTTON */}
              <button
                onClick={startPractice}
                disabled={loading}
                className="w-full bg-primary hover:brightness-110 disabled:opacity-50 text-on-primary font-semibold py-4 rounded-2xl text-lg flex items-center justify-center gap-3 transition"
              >
                {loading ? 'Đang chuẩn bị...' : 'Bắt đầu luyện tập →'}
              </button>

              <p className="text-center text-xs text-on-surface-variant mt-6 italic">
                "Hành trình vạn dặm bắt đầu từ một bước chân."
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/20">
                <div className="text-4xl font-bold text-secondary">92%</div>
                <div className="text-sm text-on-surface-variant">
                  Độ chính xác trung bình HSK {level}
                </div>
              </div>

              <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/20">
                <div className="flex items-center gap-2">
                  <div className="text-4xl">🔥</div>
                  <div>
                    <div className="text-3xl font-bold text-on-surface">12</div>
                    <div className="text-sm text-on-surface-variant">
                      ngày streak
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}