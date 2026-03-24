"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Word {
  id: string; hanzi: string; pinyin: string; hanViet: string | null;
  meaningVi: string; exampleSentence: string | null; exampleVi: string | null;
  audioUrl: string | null; wordType: string | null;
  timesCorrect: number; timesWrong: number; needsReview: boolean;
}
interface SessionData {
  sessionTitle: string; sessionSubtitle: string;
  words: Word[]; userStreak: number;
}
type Mode   = "flashcard" | "quiz" | "listening" | "writing";
type Screen = "select" | "practice" | "result";
interface QR { vocabId: string; correct: boolean; timeMs: number; }
interface FinalResult {
  xpEarned: number; correctQ: number; totalQ: number;
  accuracy: number; newStreak: number; weakWords: any[]; durationSec: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const shuffle = <T,>(a: T[]) => [...a].sort(() => Math.random() - 0.5);
const play    = (url: string | null) => { if (url) new Audio(url).play().catch(() => {}); };
const fmtTime = (s: number) => `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;
const Spin    = () => (
  <div className="min-h-screen flex items-center justify-center bg-surface">
    <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

// ─── Screen 1: Mode Select ────────────────────────────────────────────────────
function ModeSelect({ streak, lessonId, onSelect }: {
  streak: number; lessonId: string; onSelect: (m: Mode) => void;
}) {
  return (
    <div className="min-h-screen" style={{ background: "#f5f7fa" }}>
      {/* Topbar */}
      <header className="flex items-center justify-between px-8 py-4 bg-white border-b border-gray-100">
        <span className="font-extrabold text-primary text-lg">funchinese</span>
        <nav className="hidden md:flex gap-8 text-sm font-semibold text-gray-500">
          {(["Flashcards","Quiz","Listening","Writing"] as const).map((label, i) => (
            <button key={label}
              onClick={() => onSelect((["flashcard","quiz","listening","writing"] as Mode[])[i])}
              className={`hover:text-primary transition-colors pb-0.5 ${i===1 ? "text-primary border-b-2 border-primary" : ""}`}>
              {label}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 flex items-center justify-center">
            <span className="material-symbols-outlined text-gray-400" style={{ fontSize:22, fontVariationSettings:"'FILL' 1" }}>local_fire_department</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">HV</div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-14">
        <p className="text-xs font-bold text-primary uppercase tracking-widest mb-3">Hành trình học thuật</p>
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">Chọn chế độ luyện tập</h1>
        <p className="text-gray-500 leading-relaxed mb-12 max-w-xl">
          Mỗi chế độ được thiết kế để rèn luyện một khía cạnh cụ thể của ngôn ngữ.<br />
          Hãy chọn con đường phù hợp nhất với mục tiêu hiện tại của bạn.
        </p>

        {/* Top row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Flashcard — big */}
          <button onClick={() => onSelect("flashcard")}
            className="md:row-span-2 bg-white rounded-2xl border border-gray-200 p-8 relative overflow-hidden hover:shadow-md transition-all text-left group">
            <div className="absolute right-0 top-0 bottom-0 flex items-center justify-center w-52 opacity-10 select-none pointer-events-none">
              <span className="chinese-text text-[9rem] font-bold text-gray-400 leading-none">字</span>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-blue-500" style={{ fontSize:26, fontVariationSettings:"'FILL' 1" }}>style</span>
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900 mb-3">Flashcards</h2>
            <p className="text-sm text-gray-500 leading-relaxed mb-10 max-w-xs">
              Lật thẻ để ôn tập từ vựng. Nhìn chữ Hán, đoán nghĩa và cách phát âm.
              Phương pháp tối ưu cho trí nhớ dài hạn.
            </p>
            <div className="flex items-center gap-3">
              <span className="chinese-text text-xl text-gray-300 font-bold">学习</span>
              <span className="text-sm font-bold text-primary group-hover:translate-x-1 transition-transform">Bắt đầu luyện tập →</span>
            </div>
          </button>

          {/* Quiz */}
          <button onClick={() => onSelect("quiz")}
            className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-md transition-all text-left relative overflow-hidden group">
            <div className="absolute right-4 top-4 w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-teal-600" style={{ fontSize:20, fontVariationSettings:"'FILL' 1" }}>quiz</span>
            </div>
            <div className="w-10 h-10 bg-teal-500 rounded-xl flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-white" style={{ fontSize:20, fontVariationSettings:"'FILL' 1" }}>quiz</span>
            </div>
            <h2 className="text-xl font-extrabold text-gray-900 mb-2">Trắc nghiệm</h2>
            <p className="text-sm text-gray-500 mb-4">Thử thách khả năng nhận diện với 4 đáp án. Rèn luyện phản xạ nhanh chóng.</p>
            <span className="text-sm font-bold text-teal-600">Khám phá ngay →</span>
          </button>

          {/* Listening + Writing in a row */}
          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => onSelect("listening")}
              className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md transition-all text-left">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center mb-3">
                <span className="material-symbols-outlined text-orange-500" style={{ fontSize:20, fontVariationSettings:"'FILL' 1" }}>hearing</span>
              </div>
              <h3 className="text-base font-extrabold text-gray-900 mb-1">Nghe & chọn</h3>
              <p className="text-xs text-gray-500 mb-3">Nghe audio chuẩn từ người bản xứ và chọn chữ Hán tương ứng. Hoàn thiện kỹ năng nghe hiểu.</p>
              <span className="text-xs font-bold text-orange-500">Luyện thính giác →</span>
            </button>

            <button onClick={() => onSelect("writing")}
              className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md transition-all text-left relative overflow-hidden">
              <div className="absolute right-3 bottom-3 flex flex-col items-center bg-gray-50 rounded-xl px-3 py-2">
                <span className="chinese-text text-2xl font-bold text-gray-700">书写</span>
                <span className="text-[9px] font-bold text-gray-400 uppercase">CẤP ĐỘ: KHÓ</span>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mb-3">
                <span className="material-symbols-outlined text-blue-500" style={{ fontSize:20 }}>edit</span>
              </div>
              <h3 className="text-base font-extrabold text-gray-900 mb-1">Viết lại</h3>
              <p className="text-xs text-gray-500 mb-3">Thử thách gõ Pinyin hoặc viết tay dựa trên ý nghĩa tiếng Việt. Chế độ nâng cao dành cho học giả thực thụ.</p>
              <span className="text-xs font-bold text-blue-500">Bắt đầu viết →</span>
            </button>
          </div>
        </div>

        {/* Streak banner */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-orange-500" style={{ fontSize:26, fontVariationSettings:"'FILL' 1" }}>local_fire_department</span>
          </div>
          <div className="flex-1">
            <p className="font-bold text-gray-900">Chuỗi học tập: {streak} ngày</p>
            <p className="text-sm text-gray-500 mt-0.5">Bạn đang làm rất tốt! Chỉ cần 15 phút luyện tập để duy trì chuỗi.</p>
          </div>
          {lessonId && (
            <Link href={`/home/student/lessons/${lessonId}`}
              className="flex-shrink-0 bg-primary text-white font-bold text-sm px-5 py-2.5 rounded-xl hover:brightness-110 transition-all">
              Tiếp tục bài học
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Practice Header ──────────────────────────────────────────────────────────
function PracticeHeader({ title, subtitle, idx, total, streak, onExit }: {
  title: string; subtitle: string; idx: number; total: number;
  streak: number; onExit: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const pct = total > 0 ? (idx / total) * 100 : 0;

  return (
    <>
      <header className="flex items-center gap-4 px-5 py-3 bg-white border-b border-gray-100">
        <button onClick={() => setConfirm(true)}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0">
          <span className="material-symbols-outlined text-gray-500" style={{ fontSize:22 }}>close</span>
        </button>
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-900 leading-none">{title}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex-1 mx-4">
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${pct}%` }} />
          </div>
        </div>
        <span className="text-sm font-semibold text-gray-600 whitespace-nowrap flex-shrink-0">{idx + 1}/{total}</span>
        <div className="flex items-center gap-1.5 bg-orange-50 px-3 py-1.5 rounded-xl flex-shrink-0">
          <span className="material-symbols-outlined text-orange-500" style={{ fontSize:16, fontVariationSettings:"'FILL' 1" }}>local_fire_department</span>
          <span className="text-sm font-bold text-orange-700">{streak}</span>
        </div>
      </header>

      {/* Confirm dialog */}
      {confirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="font-bold text-gray-900 mb-2 text-lg">Thoát luyện tập?</h3>
            <p className="text-sm text-gray-500 mb-6">Tiến độ phiên này sẽ không được lưu.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirm(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all">
                Tiếp tục học
              </button>
              <button onClick={onExit}
                className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-bold hover:brightness-110 transition-all">
                Thoát
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Screen 2a: Flashcard ─────────────────────────────────────────────────────
function Flashcard({ words, title, subtitle, streak, onFinish }: {
  words: Word[]; title: string; subtitle: string;
  streak: number; onFinish: (r: QR[]) => void;
}) {
  const [idx, setIdx]         = useState(0);
  const [flipped, setFlipped] = useState(false);
  const resultsRef            = useRef<QR[]>([]);
  const startRef              = useRef(Date.now());
  const word = words[idx];

  const answer = (correct: boolean) => {
    resultsRef.current = [...resultsRef.current, { vocabId: word.id, correct, timeMs: Date.now() - startRef.current }];
    if (idx + 1 >= words.length) { onFinish(resultsRef.current); return; }
    setIdx(i => i + 1); setFlipped(false); startRef.current = Date.now();
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#f0f4f8" }}>
      <PracticeHeader title={title} subtitle={subtitle} idx={idx} total={words.length}
        streak={streak} onExit={() => onFinish(resultsRef.current)} />

      <div className="flex-1 flex items-center justify-center px-6 py-8">
        {/* Flashcard */}
        <div
          onClick={() => { setFlipped(f => !f); if (!flipped) play(word.audioUrl); }}
          className="w-full max-w-xl bg-white rounded-3xl shadow-lg cursor-pointer select-none hover:shadow-xl transition-shadow relative"
          style={{ minHeight: 380 }}
        >
          {!flipped ? (
            /* ── FRONT ── */
            <div className="flex flex-col items-center justify-center h-full p-10 gap-5 min-h-[380px]">
              <div className="absolute top-5 right-5 flex items-center gap-1 text-xs text-gray-300 font-medium">
                CHẠM ĐỂ LẬT
                <span className="material-symbols-outlined text-gray-300" style={{ fontSize:14 }}>autorenew</span>
              </div>
              {/* Hanzi */}
              <p className="text-[7rem] md:text-[8rem] chinese-text font-bold text-gray-900 leading-none">
                {word.hanzi}
              </p>
              {/* Pinyin + audio */}
              <div className="flex items-center gap-3">
                <span className="text-base font-bold text-primary tracking-[0.15em] uppercase">
                  {word.pinyin.toUpperCase()}
                </span>
                <button onClick={e => { e.stopPropagation(); play(word.audioUrl); }}
                  className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center hover:bg-blue-100 transition-colors">
                  <span className="material-symbols-outlined text-primary" style={{ fontSize:18, fontVariationSettings:"'FILL' 1" }}>volume_up</span>
                </button>
              </div>
            </div>
          ) : (
            /* ── BACK ── */
            <div className="flex flex-col items-center justify-center h-full p-8 gap-4 min-h-[380px]">
              {/* Pinyin + audio */}
              <div className="flex items-center gap-3">
                <span className="text-base font-bold text-primary tracking-[0.15em] uppercase">
                  {word.pinyin.toUpperCase()}
                </span>
                <button onClick={e => { e.stopPropagation(); play(word.audioUrl); }}
                  className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center hover:bg-blue-100 transition-colors">
                  <span className="material-symbols-outlined text-primary" style={{ fontSize:18, fontVariationSettings:"'FILL' 1" }}>volume_up</span>
                </button>
              </div>
              {/* Meaning */}
              <p className="text-2xl font-extrabold text-gray-900 text-center">{word.meaningVi}</p>
              {/* HanViet */}
              {word.hanViet && (
                <p className="text-sm text-gray-400 italic">Âm Hán Việt: {word.hanViet}</p>
              )}
              {/* Example */}
              {(word.exampleSentence || word.exampleVi) && (
                <div className="mt-2 p-4 bg-gray-50 rounded-2xl w-full text-center border border-gray-100">
                  {word.exampleSentence && (
                    <p className="chinese-text text-base text-gray-700 mb-1">{word.exampleSentence}</p>
                  )}
                  {word.exampleVi && (
                    <p className="text-sm text-gray-400 italic">{word.exampleVi}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom buttons */}
      <div className="pb-8 px-6">
        <div className="flex gap-4 max-w-xl mx-auto mb-4">
          <button onClick={() => answer(false)}
            className="flex-1 py-5 bg-gray-100 rounded-2xl font-bold hover:bg-gray-200 transition-all flex flex-col items-center gap-1.5">
            <span className="text-xl text-red-400">✕</span>
            <span className="text-xs font-bold uppercase tracking-widest text-gray-500">Chưa nhớ</span>
          </button>
          <button onClick={() => answer(true)}
            className="flex-1 py-5 bg-primary rounded-2xl font-bold hover:brightness-110 transition-all flex flex-col items-center gap-1.5">
            <span className="text-xl text-white">✓</span>
            <span className="text-xs font-bold uppercase tracking-widest text-white">Đã nhớ</span>
          </button>
        </div>
        <p className="text-center text-xs text-gray-300 uppercase tracking-widest">
          Kỹ thuật lặp lại ngắt quãng (SRS) đang được áp dụng
        </p>
      </div>
    </div>
  );
}

// ─── Screen 2b: Quiz ──────────────────────────────────────────────────────────
function Quiz({ words, title, subtitle, streak, onFinish }: {
  words: Word[]; title: string; subtitle: string;
  streak: number; onFinish: (r: QR[]) => void;
}) {
  const [idx, setIdx]           = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(10);
  const [options, setOptions]   = useState<Word[]>([]);
  const resultsRef = useRef<QR[]>([]);
  const startRef   = useRef(Date.now());
  const timerRef   = useRef<ReturnType<typeof setInterval>>();
  const word = words[idx];

  useEffect(() => {
    const others = shuffle(words.filter(w => w.id !== word.id)).slice(0, 3);
    setOptions(shuffle([word, ...others]));
    setSelected(null); setTimeLeft(10);
    startRef.current = Date.now();
  }, [idx]);

  useEffect(() => {
    if (selected !== null) { clearInterval(timerRef.current); return; }
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current); pick("__timeout__"); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [idx, selected]);

  const pick = (id: string) => {
    clearInterval(timerRef.current);
    if (selected !== null) return;
    setSelected(id);
  };

  const next = () => {
    const correct = selected === word.id;
    resultsRef.current = [...resultsRef.current, { vocabId: word.id, correct, timeMs: Date.now() - startRef.current }];
    if (idx + 1 >= words.length) { onFinish(resultsRef.current); return; }
    setIdx(i => i + 1);
  };

  const LABELS = ["A","B","C","D"];
  const isCorrect = selected === word.id;
  const pct = (timeLeft / 10) * 100;

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <PracticeHeader title={title} subtitle={subtitle} idx={idx} total={words.length}
        streak={streak} onExit={() => onFinish(resultsRef.current)} />

      <div className="flex-1 max-w-2xl mx-auto w-full px-6 py-8 flex flex-col">
        {/* Badge + Question */}
        <div className="flex items-start justify-between mb-8 gap-4">
          <div>
            <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-teal-100 text-teal-700 mb-4 inline-block tracking-wider">
              NGHĨA CỦA TỪ
            </span>
            <p className="text-gray-500 text-sm mb-3">Chọn ý nghĩa đúng của từ sau:</p>
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="text-5xl chinese-text font-bold text-gray-900">{word.hanzi}</span>
              <span className="text-gray-400 text-xl italic">/ {word.pinyin} /</span>
            </div>
          </div>

          {/* Timer circle */}
          <div className="relative w-16 h-16 flex-shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15" fill="none" stroke="#f3f4f6" strokeWidth="3"/>
              <circle cx="18" cy="18" r="15" fill="none"
                stroke={timeLeft <= 3 ? "#ef4444" : "#0f766e"}
                strokeWidth="3" strokeLinecap="round"
                strokeDasharray={`${pct * 0.942} 94.2`}
                style={{ transition: "stroke-dasharray 1s linear" }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-extrabold text-gray-800 leading-none">{timeLeft}</span>
              <span className="text-[9px] text-gray-400 uppercase font-semibold">giây</span>
            </div>
          </div>
        </div>

        {/* Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6 flex-1">
          {options.map((opt, i) => {
            const isRight  = opt.id === word.id;
            const isPicked = selected === opt.id;
            let borderCls  = "border-gray-200 hover:border-teal-400 hover:shadow-sm cursor-pointer bg-white";
            if (selected) {
              if (isRight)        borderCls = "border-teal-400 bg-teal-50";
              else if (isPicked)  borderCls = "border-red-300 bg-red-50";
              else                borderCls = "border-gray-100 bg-white opacity-50";
            }
            return (
              <button key={opt.id} onClick={() => pick(opt.id)} disabled={!!selected}
                className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${borderCls}`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm transition-all
                  ${selected && isRight  ? "bg-teal-500 text-white" :
                    selected && isPicked && !isRight ? "bg-red-400 text-white" :
                    "bg-gray-100 text-gray-500"}`}>
                  {selected && isRight
                    ? <span className="material-symbols-outlined text-white" style={{ fontSize:18 }}>check</span>
                    : LABELS[i]}
                </div>
                <div>
                  <p className="font-bold text-gray-900">{opt.meaningVi}</p>
                  {opt.hanViet && <p className="text-xs text-gray-400 italic mt-0.5">{opt.hanViet}</p>}
                </div>
              </button>
            );
          })}
        </div>

        {/* Feedback bar */}
        {selected && (
          <div className={`rounded-2xl p-4 flex items-center justify-between gap-4
            ${isCorrect ? "bg-teal-50 border border-teal-200" : "bg-red-50 border border-red-200"}`}>
            <div className="flex items-start gap-3 min-w-0">
              <span className={`material-symbols-outlined flex-shrink-0 mt-0.5 ${isCorrect ? "text-teal-500" : "text-red-400"}`}
                style={{ fontSize:22, fontVariationSettings:"'FILL' 1" }}>
                {isCorrect ? "check_circle" : "cancel"}
              </span>
              <div className="min-w-0">
                <p className={`font-extrabold text-sm uppercase tracking-wide ${isCorrect ? "text-teal-700" : "text-red-600"}`}>
                  {isCorrect ? "Chính xác!" : "Chưa đúng!"}
                </p>
                <p className={`text-xs mt-1 ${isCorrect ? "text-teal-600" : "text-red-500"}`}>
                  {isCorrect
                    ? `"${word.hanzi}" (${word.pinyin}) kết hợp từ các thành phần: ${word.meaningVi}.`
                    : `Đáp án đúng là: ${word.meaningVi}`}
                </p>
              </div>
            </div>
            <button onClick={next}
              className="flex-shrink-0 flex items-center gap-2 bg-primary text-white font-bold text-sm px-5 py-2.5 rounded-xl hover:brightness-110 whitespace-nowrap">
              Tiếp theo
              <span className="material-symbols-outlined" style={{ fontSize:16 }}>arrow_forward</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Screen 2c: Listening ─────────────────────────────────────────────────────
function Listening({ words, title, subtitle, streak, onFinish }: {
  words: Word[]; title: string; subtitle: string;
  streak: number; onFinish: (r: QR[]) => void;
}) {
  const [idx, setIdx]           = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [options, setOptions]   = useState<Word[]>([]);
  const [played, setPlayed]     = useState(false);
  const resultsRef = useRef<QR[]>([]);
  const startRef   = useRef(Date.now());
  const word = words[idx];

  useEffect(() => {
    const others = shuffle(words.filter(w => w.id !== word.id)).slice(0, 3);
    setOptions(shuffle([word, ...others]));
    setSelected(null); setPlayed(false);
    startRef.current = Date.now();
    setTimeout(() => { if (word.audioUrl) { play(word.audioUrl); setPlayed(true); } }, 500);
  }, [idx]);

  const next = () => {
    const correct = selected === word.id;
    resultsRef.current = [...resultsRef.current, { vocabId: word.id, correct, timeMs: Date.now() - startRef.current }];
    if (idx + 1 >= words.length) { onFinish(resultsRef.current); return; }
    setIdx(i => i + 1);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#fdf8f0" }}>
      <PracticeHeader title={title} subtitle={subtitle} idx={idx} total={words.length}
        streak={streak} onExit={() => onFinish(resultsRef.current)} />

      <div className="flex-1 flex flex-col items-center justify-center px-6 max-w-lg mx-auto w-full gap-8 py-8">
        <div className="text-center">
          <p className="text-sm text-gray-500 mb-6">Nghe và chọn chữ Hán tương ứng</p>
          <button onClick={() => { play(word.audioUrl); setPlayed(true); }}
            className="w-24 h-24 rounded-full bg-orange-400 text-white flex items-center justify-center shadow-xl hover:brightness-110 active:scale-95 transition-all mx-auto">
            <span className="material-symbols-outlined" style={{ fontSize:44, fontVariationSettings:"'FILL' 1" }}>
              {played ? "replay" : "volume_up"}
            </span>
          </button>
          {!played && <p className="text-xs text-gray-400 mt-3">Nhấn để nghe</p>}
        </div>

        <div className="grid grid-cols-2 gap-3 w-full">
          {options.map(opt => {
            const isRight  = opt.id === word.id;
            const isPicked = selected === opt.id;
            let cls = "border-gray-200 hover:border-orange-300 cursor-pointer bg-white";
            if (selected) {
              if (isRight)        cls = "border-teal-400 bg-teal-50";
              else if (isPicked)  cls = "border-red-300 bg-red-50";
              else                cls = "border-gray-100 bg-white opacity-50";
            }
            return (
              <button key={opt.id} onClick={() => { if (!selected) setSelected(opt.id); }} disabled={!!selected}
                className={`p-5 rounded-2xl border-2 text-center transition-all ${cls}`}>
                <p className="text-3xl chinese-text font-bold text-gray-900">{opt.hanzi}</p>
                <p className="text-xs text-gray-400 mt-1">{opt.pinyin}</p>
              </button>
            );
          })}
        </div>

        {selected && (
          <button onClick={next}
            className="flex items-center gap-2 bg-primary text-white font-bold px-8 py-3 rounded-xl hover:brightness-110 transition-all">
            {idx + 1 >= words.length ? "Xem kết quả" : "Tiếp theo"}
            <span className="material-symbols-outlined" style={{ fontSize:16 }}>arrow_forward</span>
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Screen 2d: Writing ───────────────────────────────────────────────────────
function Writing({ words, title, subtitle, streak, onFinish }: {
  words: Word[]; title: string; subtitle: string;
  streak: number; onFinish: (r: QR[]) => void;
}) {
  const [idx, setIdx]         = useState(0);
  const [input, setInput]     = useState("");
  const [checked, setChecked] = useState(false);
  const resultsRef = useRef<QR[]>([]);
  const startRef   = useRef(Date.now());
  const inputRef   = useRef<HTMLInputElement>(null);
  const word = words[idx];

  useEffect(() => {
    setInput(""); setChecked(false);
    startRef.current = Date.now();
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [idx]);

  const next = () => {
    const correct = input.trim().toLowerCase() === word.pinyin.toLowerCase();
    resultsRef.current = [...resultsRef.current, { vocabId: word.id, correct, timeMs: Date.now() - startRef.current }];
    if (idx + 1 >= words.length) { onFinish(resultsRef.current); return; }
    setIdx(i => i + 1);
  };

  const isCorrect = input.trim().toLowerCase() === word.pinyin.toLowerCase();

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#f8f5ff" }}>
      <PracticeHeader title={title} subtitle={subtitle} idx={idx} total={words.length}
        streak={streak} onExit={() => onFinish(resultsRef.current)} />

      <div className="flex-1 flex flex-col items-center justify-center px-6 max-w-lg mx-auto w-full gap-5 py-8">
        <p className="text-sm text-gray-500">Nhìn nghĩa, gõ Pinyin của từ này:</p>
        <p className="text-2xl font-extrabold text-gray-900 text-center">{word.meaningVi}</p>
        {word.hanViet && (
          <p className="text-sm text-gray-400 italic">Âm Hán Việt: {word.hanViet}</p>
        )}

        <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && (checked ? next() : input.trim() && setChecked(true))}
          disabled={checked} placeholder="Gõ Pinyin (VD: xuéxí)..."
          className={`w-full text-center text-2xl font-bold py-4 px-6 border-2 rounded-2xl outline-none transition-all mt-2
            ${checked
              ? isCorrect ? "border-teal-400 bg-teal-50 text-teal-700" : "border-red-300 bg-red-50 text-red-600"
              : "border-gray-200 focus:border-primary bg-white"}`} />

        {!checked ? (
          <button onClick={() => input.trim() && setChecked(true)} disabled={!input.trim()}
            className="w-full py-3.5 bg-primary text-white font-bold rounded-2xl hover:brightness-110 disabled:opacity-40 transition-all">
            Kiểm tra
          </button>
        ) : (
          <div className={`w-full rounded-2xl p-4 border ${isCorrect ? "bg-teal-50 border-teal-200" : "bg-red-50 border-red-200"}`}>
            <p className={`font-bold text-sm mb-1 ${isCorrect ? "text-teal-700" : "text-red-600"}`}>
              {isCorrect ? "✓ Chính xác!" : `✗ Đáp án đúng: ${word.pinyin}`}
            </p>
            <p className="text-sm text-gray-500 mb-3">
              <span className="chinese-text font-bold text-gray-800">{word.hanzi}</span>
              {" = "}{word.pinyin} = {word.meaningVi}
            </p>
            <button onClick={next}
              className="w-full py-2.5 bg-primary text-white font-bold rounded-xl text-sm hover:brightness-110 transition-all">
              {idx + 1 >= words.length ? "Xem kết quả" : "Tiếp theo →"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Screen 3: Result ─────────────────────────────────────────────────────────
function ResultScreen({ result, lessonId, onRetry }: {
  result: FinalResult; lessonId: string; onRetry: () => void;
}) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
        <span className="font-extrabold text-primary text-base">funchinese</span>
        <Link href={lessonId ? `/home/student/lessons/${lessonId}` : "/home/student"}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
          <span className="material-symbols-outlined text-gray-400" style={{ fontSize:22 }}>close</span>
        </Link>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 max-w-2xl mx-auto w-full py-10">
        {/* Icon */}
        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-5">
          <span className="text-3xl">🎉</span>
        </div>
        <h1 className="text-4xl font-extrabold text-gray-900 mb-2">🎉 Hoàn thành!</h1>
        <p className="text-gray-400 text-sm mb-10">Bạn đã hoàn thành xuất sắc phiên luyện tập hôm nay.</p>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full mb-8">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Điểm XP</p>
            <p className="text-3xl font-extrabold text-primary">+{result.xpEarned}</p>
            <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-bold mt-1 inline-block">Kỷ lục</span>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Độ chính xác</p>
            <p className="text-3xl font-extrabold text-gray-900">{result.correctQ}/{result.totalQ}</p>
            <div className="h-1.5 bg-gray-100 rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: `${result.accuracy}%` }} />
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Thời gian</p>
            <p className="text-3xl font-extrabold text-gray-900">{fmtTime(result.durationSec)}</p>
            <span className="material-symbols-outlined text-gray-300 mt-1" style={{ fontSize:16 }}>timer</span>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Chuỗi</p>
            <div className="flex items-center justify-center gap-1">
              <p className="text-3xl font-extrabold text-orange-500">{result.newStreak}</p>
              <span className="material-symbols-outlined text-orange-400" style={{ fontSize:22, fontVariationSettings:"'FILL' 1" }}>local_fire_department</span>
            </div>
            <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full font-bold mt-1 inline-block">Tiếp tục nào!</span>
          </div>
        </div>

        {/* Weak words */}
        {result.weakWords.length > 0 && (
          <div className="w-full bg-gray-50 rounded-2xl border border-gray-100 p-5 mb-8">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-1 h-5 bg-red-400 rounded-full" />
              Từ cần ôn lại
            </h3>
            <div className="space-y-2">
              {result.weakWords.map((w: any) => (
                <div key={w.id} className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100">
                  <span className="material-symbols-outlined text-red-400" style={{ fontSize:20, fontVariationSettings:"'FILL' 1" }}>cancel</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-xl chinese-text font-bold text-gray-900">{w.hanzi}</span>
                    <span className="text-sm text-gray-400 ml-2">{w.pinyin}</span>
                  </div>
                  <span className="text-sm text-gray-400 italic">{w.meaningVi}</span>
                  {w.audioUrl && (
                    <button onClick={() => play(w.audioUrl)}
                      className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 flex-shrink-0 transition-colors">
                      <span className="material-symbols-outlined text-gray-500" style={{ fontSize:16, fontVariationSettings:"'FILL' 1" }}>volume_up</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-4 w-full max-w-sm">
          <button onClick={onRetry}
            className="flex-1 flex items-center justify-center gap-2 bg-primary text-white font-bold py-3.5 rounded-xl hover:brightness-110 transition-all">
            <span className="material-symbols-outlined" style={{ fontSize:18 }}>refresh</span>
            Luyện lại
          </button>
          <Link href={lessonId ? `/home/student/lessons/${lessonId}` : "/home/student"}
            className="flex-1 flex items-center justify-center gap-2 bg-gray-100 text-gray-700 font-bold py-3.5 rounded-xl hover:bg-gray-200 transition-all">
            <span className="material-symbols-outlined" style={{ fontSize:18 }}>home</span>
            Về trang bài học
          </Link>
        </div>
      </div>

      {/* Footer decor */}
      <div className="text-center py-6 select-none pointer-events-none">
        <span className="text-3xl chinese-text font-bold tracking-widest" style={{ color: "rgba(0,0,0,0.04)" }}>
          書道 · 学問 · 芸術
        </span>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
function PracticeContent() {
  const sp       = useSearchParams();
  const lessonId = sp.get("lesson")  ?? "";
  const hskParam = sp.get("hsk")     ?? "";
  const srcParam = sp.get("source")  ?? "";

  const [data,    setData]    = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [screen,  setScreen]  = useState<Screen>("select");
  const [mode,    setMode]    = useState<Mode>("flashcard");
  const [words,   setWords]   = useState<Word[]>([]);
  const [result,  setResult]  = useState<FinalResult | null>(null);
  const modeRef  = useRef<Mode>("flashcard");
  const startRef = useRef(Date.now());

  const apiUrl = lessonId ? `/api/practice/session?lessonId=${lessonId}`
    : hskParam             ? `/api/practice/session?hsk=${hskParam}`
    : srcParam             ? `/api/practice/session?source=${srcParam}`
    : null;

  useEffect(() => {
    if (!apiUrl) { setLoading(false); return; }
    fetch(apiUrl)
      .then(r => r.json())
      .then(d => {
        if (d.error) throw new Error(d.error);
        setData(d);
        const shuffled = shuffle(d.words);
        setWords(shuffled);
        // Nếu có lessonId → skip mode select, vào thẳng flashcard
        if (lessonId) {
          modeRef.current = "flashcard";
          setMode("flashcard");
          startRef.current = Date.now();
          setScreen("practice");
        }
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const startPractice = (m: Mode) => {
    if (!data) return;
    modeRef.current = m;
    setMode(m);
    setWords(shuffle(data.words));
    startRef.current = Date.now();
    setScreen("practice");
  };

  const finish = async (results: QR[]) => {
    if (results.length === 0) { setScreen("select"); return; }
    const durationSec = Math.round((Date.now() - startRef.current) / 1000);
    try {
      const res = await fetch("/api/practice/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId, mode: modeRef.current, results, durationSec }),
      });
      const d = await res.json();
      setResult({ ...d, durationSec });
    } catch {
      const correctQ = results.filter(r => r.correct).length;
      setResult({
        xpEarned: correctQ * 5, correctQ, totalQ: results.length,
        accuracy: Math.round((correctQ / results.length) * 100),
        newStreak: data?.userStreak ?? 0, weakWords: [], durationSec,
      });
    }
    setScreen("result");
  };

  const retry = () => {
    if (!data) return;
    setWords(shuffle(data.words));
    startRef.current = Date.now();
    setScreen("practice");
  };

  if (loading) return <Spin />;
  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <p className="text-4xl mb-4">😕</p>
        <p className="text-gray-500 mb-4">{error}</p>
        <Link href="/home/student" className="px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-bold">
          Quay lại
        </Link>
      </div>
    </div>
  );

  if (screen === "select") return (
    <ModeSelect streak={data?.userStreak ?? 0} lessonId={lessonId} onSelect={startPractice} />
  );

  if (screen === "result" && result) return (
    <ResultScreen result={result} lessonId={lessonId} onRetry={retry} />
  );

  if (!data || !words.length) return <Spin />;

  const props = {
    words, title: data.sessionTitle, subtitle: data.sessionSubtitle,
    streak: data.userStreak, onFinish: finish,
  };

  if (mode === "flashcard") return <Flashcard  {...props} />;
  if (mode === "quiz")      return <Quiz       {...props} />;
  if (mode === "listening") return <Listening  {...props} />;
  if (mode === "writing")   return <Writing    {...props} />;
  return null;
}

export default function PracticePage() {
  return (
    <Suspense fallback={<Spin />}>
      <PracticeContent />
    </Suspense>
  );
}
