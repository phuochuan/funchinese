'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Trophy, Flame, Target, ArrowLeft } from 'lucide-react';

export default function PracticeReview() {
  const { sessionId } = useParams() as { sessionId: string };
  const router = useRouter();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/practice/${sessionId}/submit`) // hoặc lưu tạm data, nhưng để đơn giản fetch lại
      .then(res => res.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading || !data) return <div className="min-h-screen flex items-center justify-center">Đang tải kết quả...</div>;

  const accuracy = data.score || 85; // từ API

  return (
    <div className="min-h-screen bg-[#f8fafc] py-12">
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 bg-green-100 text-green-700 px-6 py-2 rounded-full text-sm font-medium">
            ✓ SESSION COMPLETE
          </div>
          <h1 className="text-5xl font-bold mt-6 mb-3 text-[#1e3a8a]">Vượt Qua Thử Thách</h1>
          <p className="text-xl text-gray-600">Bạn đã hoàn thành xuất sắc buổi luyện tập hôm nay.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-3xl p-8 text-center">
            <div className="text-7xl font-bold text-blue-600 mb-2">{accuracy}%</div>
            <div className="text-sm text-gray-500">Độ chính xác</div>
            <div className="h-2 bg-gray-100 rounded mt-6">
              <div className="h-2 bg-blue-600 rounded w-[85%]" />
            </div>
          </div>

          <div className="bg-white rounded-3xl p-8 text-center flex flex-col items-center justify-center">
            <Trophy className="w-12 h-12 text-amber-500 mb-3" />
            <div className="text-5xl font-bold">1,240</div>
            <div className="text-sm text-gray-500">Tổng điểm XP</div>
          </div>

          <div className="bg-white rounded-3xl p-8 text-center flex flex-col items-center justify-center">
            <Flame className="w-12 h-12 text-orange-500 mb-3" />
            <div className="text-5xl font-bold">12</div>
            <div className="text-sm text-gray-500">Chuỗi dài nhất</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Correct / Wrong */}
          <div className="md:col-span-5 bg-white rounded-3xl p-8">
            <div className="flex gap-8">
              <div className="flex-1 text-center">
                <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center text-4xl mb-4">✅</div>
                <div className="text-6xl font-bold text-green-600">34</div>
                <div className="text-sm text-gray-500 mt-1">CHÍNH XÁC</div>
              </div>
              <div className="flex-1 text-center">
                <div className="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center text-4xl mb-4">❌</div>
                <div className="text-6xl font-bold text-red-500">6</div>
                <div className="text-sm text-gray-500 mt-1">SAI SÓT</div>
              </div>
            </div>
          </div>

          {/* Lời khuyên */}
          <div className="md:col-span-7 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-3xl p-8">
            <h3 className="font-semibold text-lg mb-4">Lời khuyên của Học giả</h3>
            <p>Bạn đang gặp khó khăn với các bộ thủ liên quan đến "Nước" (氵). Hãy dành thêm 5 phút xem lại danh sách từ vựng bên dưới.</p>
          </div>
        </div>

        {/* Cần xem lại */}
        <div className="mt-16">
          <div className="flex justify-between items-end mb-6">
            <div>
              <h2 className="text-2xl font-bold">Cần xem lại</h2>
              <p className="text-gray-500">Những từ bạn đã bỏ lỡ trong phiên này</p>
            </div>
            <button className="text-blue-600 font-medium flex items-center gap-1">
              Xem tất cả →
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { hanzi: '大海', vi: 'Đại hải', meaning: 'Biển khơi' },
              { hanzi: '河流', vi: 'Hà lưu', meaning: 'Dòng sông' },
              { hanzi: '游泳', vi: 'Du vịnh', meaning: 'Bơi lội' },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100">
                <div className="text-4xl mb-4">{item.hanzi}</div>
                <div className="font-medium">{item.vi}</div>
                <div className="text-sm text-gray-500">{item.meaning}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-4 mt-16 justify-center">
          <button
            onClick={() => router.push('/practice')}
            className="px-10 py-4 bg-white border-2 border-gray-300 rounded-2xl font-medium hover:bg-gray-50"
          >
            ← Về Trang chủ
          </button>
          <button
            onClick={() => router.push('/practice')}
            className="px-10 py-4 bg-blue-600 text-white rounded-2xl font-semibold hover:bg-blue-700"
          >
            Luyện tập lại
          </button>
        </div>
      </div>
    </div>
  );
}