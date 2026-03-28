"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────
interface VocabItem {
  id: string;
  hanzi: string;
  pinyin: string;
  hanViet: string | null;
  meaningVi: string;
  wordType: string | null;
  exampleSentence: string | null;
  exampleVi: string | null;
  audioUrl: string | null;
  alreadyLearned: boolean;
}

interface ContentBlock {
  id: string;
  type: "grammar" | "dialogue" | "hanviet" | "text" | "image";
  data: any;
}

interface LessonData {
   lesson: {
    id: string;
    title: string;
    titleChinese: string | null;
    pinyin: string | null;
    durationMins: number;
    thumbnail: string | null;      // ← thêm
    content: { blocks: ContentBlock[] } | null;
    vocabularies: VocabItem[];
  };
  chapter: { id: string; title: string };
  course:  { id: string; title: string; hskLevel: string };
  progress: { completed: boolean; completedAt: string | null };
  navigation: {
    prev: { id: string; title: string } | null;
    next: { id: string; title: string } | null;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const TONE_COLORS: Record<string, string> = {
  "1": "text-blue-600",
  "2": "text-green-600",
  "3": "text-amber-600",
  "4": "text-red-600",
  "5": "text-on-surface-variant",
};

function getTone(pinyin: string): string {
  if (pinyin.match(/[āēīōūǖ]/)) return "1";
  if (pinyin.match(/[áéíóúǘ]/)) return "2";
  if (pinyin.match(/[ǎěǐǒǔǚ]/)) return "3";
  if (pinyin.match(/[àèìòùǜ]/)) return "4";
  return "5";
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-surface-container rounded-xl ${className}`} />;
}

function ImageBlock({ block }: { block: ContentBlock }) {
  if (!block.data.url) return null;
  return (
    <div className="rounded-2xl overflow-hidden border border-outline-variant/20">
      <img
        src={block.data.url}
        alt={block.data.caption ?? ""}
        className="w-full object-cover max-h-80"
      />
      {block.data.caption && (
        <p className="text-xs text-on-surface-variant text-center px-4 py-2 bg-surface-container italic">
          {block.data.caption}
        </p>
      )}
    </div>
  );
}

// ─── Vocab card ───────────────────────────────────────────────────────────────
function VocabCard({ vocab }: { vocab: VocabItem }) {
  const [flipped, setFlipped] = useState(false);
  const tone = getTone(vocab.pinyin);

  return (
    <div
      onClick={() => setFlipped(!flipped)}
      className={`relative p-4 rounded-2xl border cursor-pointer transition-all hover:shadow-md select-none
        ${vocab.alreadyLearned
          ? "border-secondary/30 bg-secondary/5"
          : "border-outline-variant/20 bg-surface-container-lowest"}`}
    >
      {/* Learned badge */}
      {vocab.alreadyLearned && (
        <div className="absolute top-3 right-3 w-5 h-5 bg-secondary rounded-full flex items-center justify-center">
          <span className="material-symbols-outlined text-white" style={{ fontSize: 12 }}>check</span>
        </div>
      )}

      {/* Word type badge */}
      {vocab.wordType && (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant mb-2 inline-block">
          {vocab.wordType}
        </span>
      )}

      {!flipped ? (
        <>
          {/* Front */}
          <div className="text-4xl chinese-text font-bold text-on-surface mb-1">{vocab.hanzi}</div>
          <div className={`text-sm font-medium mb-0.5 ${TONE_COLORS[tone]}`}>{vocab.pinyin}</div>
          {vocab.hanViet && (
            <div className="text-xs text-on-surface-variant italic">{vocab.hanViet}</div>
          )}
          <div className="mt-3 text-xs text-on-surface-variant/60 flex items-center gap-1">
            <span className="material-symbols-outlined" style={{ fontSize: 12 }}>touch_app</span>
            Chạm để xem nghĩa
          </div>
        </>
      ) : (
        <>
          {/* Back */}
          <div className="text-lg font-bold text-on-surface mb-1">{vocab.meaningVi}</div>
          {vocab.exampleSentence && (
            <div className="mt-3 p-3 bg-surface-container rounded-xl">
              <p className="chinese-text text-sm text-on-surface mb-1">{vocab.exampleSentence}</p>
              {vocab.exampleVi && (
                <p className="text-xs text-on-surface-variant italic">{vocab.exampleVi}</p>
              )}
            </div>
          )}
          {vocab.audioUrl && (
            <button
              onClick={e => {
                e.stopPropagation();
                const audio = new Audio(vocab.audioUrl!);
                audio.play().catch(() => {});
              }}
              className="mt-3 flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/70 transition-colors">
              <span className="material-symbols-outlined" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>
                volume_up
              </span>
              Nghe phát âm
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ─── Content block renderers ──────────────────────────────────────────────────
function GrammarBlock({ block }: { block: ContentBlock }) {
  return (
    <div className="rounded-2xl overflow-hidden border border-blue-200">
      <div className="px-5 py-3 bg-blue-50 flex items-center gap-2">
        <span className="material-symbols-outlined text-blue-600" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>lightbulb</span>
        <span className="text-xs font-extrabold text-blue-700 uppercase tracking-wider">Ngữ pháp</span>
        {block.data.title && (
          <span className="text-sm font-bold text-blue-800 ml-1">{block.data.title}</span>
        )}
      </div>
      <div className="px-5 py-4 bg-white">
        {block.data.content && (
          <p className="text-sm text-on-surface leading-relaxed mb-3">{block.data.content}</p>
        )}
        {block.data.example && (
          <div className="border-l-4 border-primary/30 pl-4 py-1">
            <p className="text-sm text-primary italic">{block.data.example}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function DialogueBlock({ block }: { block: ContentBlock }) {
  const lines: { speaker: string; chinese: string; vietnamese: string }[] = block.data.lines ?? [];
  return (
    <div className="rounded-2xl overflow-hidden border border-green-200">
      <div className="px-5 py-3 bg-green-50 flex items-center gap-2">
        <span className="material-symbols-outlined text-green-600" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>forum</span>
        <span className="text-xs font-extrabold text-green-700 uppercase tracking-wider">Hội thoại</span>
        {block.data.title && (
          <span className="text-sm font-bold text-green-800 ml-1">{block.data.title}</span>
        )}
      </div>
      <div className="px-5 py-4 bg-white space-y-4">
        {lines.map((line, idx) => (
          <div key={idx} className={`flex gap-3 ${line.speaker === "B" ? "flex-row-reverse" : ""}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white
              ${line.speaker === "A" ? "bg-primary" : "bg-secondary"}`}>
              {line.speaker}
            </div>
            <div className={`max-w-[75%] ${line.speaker === "B" ? "items-end" : "items-start"} flex flex-col gap-1`}>
              <div className={`px-4 py-2.5 rounded-2xl
                ${line.speaker === "A" ? "bg-surface-container rounded-tl-none" : "bg-primary/10 rounded-tr-none"}`}>
                <p className="chinese-text text-base text-on-surface">{line.chinese}</p>
              </div>
              {line.vietnamese && (
                <p className="text-xs text-on-surface-variant px-1 italic">{line.vietnamese}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HanvietBlock({ block }: { block: ContentBlock }) {
  return (
    <div className="rounded-2xl overflow-hidden border border-amber-200 bg-amber-50">
      <div className="px-5 py-3 flex items-center gap-2">
        <span className="material-symbols-outlined text-amber-600" style={{ fontSize: 18 }}>translate</span>
        <span className="text-xs font-extrabold text-amber-700 uppercase tracking-wider">Ghi chú Hán Việt</span>
      </div>
      <div className="px-5 pb-4">
        {block.data.main && (
          <p className="text-sm font-bold text-amber-800 mb-2">{block.data.main}</p>
        )}
        {block.data.tip && (
          <p className="text-sm text-amber-700 leading-relaxed">{block.data.tip}</p>
        )}
        {block.data.content && (
          <p className="text-sm text-amber-700 leading-relaxed">{block.data.content}</p>
        )}
      </div>
    </div>
  );
}

function TextBlock({ block }: { block: ContentBlock }) {
  return (
    <div className="text-sm text-on-surface leading-relaxed">
      {block.data.content}
    </div>
  );
}

function BlockRenderer({ block }: { block: ContentBlock }) {
  if (block.type === "grammar")  return <GrammarBlock  block={block} />;
  if (block.type === "dialogue") return <DialogueBlock block={block} />;
  if (block.type === "hanviet")  return <HanvietBlock  block={block} />;
  if (block.type === "image")    return <ImageBlock    block={block} />; // ← thêm
  return <TextBlock block={block} />;
}

// ─── Complete button ──────────────────────────────────────────────────────────
function CompleteButton({
  lessonId,
  completed,
  nextLesson,
}: {
  lessonId: string;
  completed: boolean;
  nextLesson: { id: string; title: string } | null;
}) {
  const router  = useRouter();
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(completed);
  const [result,  setResult]  = useState<{ xpEarned: number; wordsLearned: number } | null>(null);

  const handleComplete = async () => {
    if (done) return;
    setLoading(true);
    const res  = await fetch(`/api/lessons/${lessonId}/complete`, { method: "POST" });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      setDone(true);
      setResult({ xpEarned: data.xpEarned, wordsLearned: data.wordsLearned });
    }
  };

  if (done && result) {
    return (
      <div className="bg-secondary/10 border border-secondary/20 rounded-2xl p-6 text-center space-y-4">
        <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto">
          <span className="material-symbols-outlined text-white text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
            check_circle
          </span>
        </div>
        <div>
          <h3 className="text-lg font-extrabold text-on-surface">Bài học hoàn thành! 🎉</h3>
          <p className="text-sm text-on-surface-variant mt-1">Xuất sắc! Bạn đã học xong bài này.</p>
        </div>
        <div className="flex justify-center gap-6">
          <div className="text-center">
            <p className="text-2xl font-extrabold text-primary">+{result.xpEarned}</p>
            <p className="text-xs text-on-surface-variant">XP kiếm được</p>
          </div>
          <div className="w-px bg-outline-variant/20" />
          <div className="text-center">
            <p className="text-2xl font-extrabold text-secondary">{result.wordsLearned}</p>
            <p className="text-xs text-on-surface-variant">Từ đã học</p>
          </div>
        </div>
        {nextLesson ? (
          <Link href={`/home/student/lessons/${nextLesson.id}`}
            className="flex items-center justify-center gap-2 w-full bg-primary text-on-primary font-bold py-3 rounded-xl hover:brightness-110 transition-all">
            Bài tiếp theo: {nextLesson.title}
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
          </Link>
        ) : (
          <Link href="/home/student/courses"
            className="flex items-center justify-center gap-2 w-full bg-primary text-on-primary font-bold py-3 rounded-xl hover:brightness-110 transition-all">
            Về trang khoá học
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>home</span>
          </Link>
        )}
      </div>
    );
  }

  if (done) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-secondary text-sm font-bold p-3 bg-secondary/10 rounded-xl">
          <span className="material-symbols-outlined" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
          Bạn đã hoàn thành bài học này
        </div>
        {nextLesson && (
          <Link href={`/home/student/lessons/${nextLesson.id}`}
            className="flex items-center justify-center gap-2 w-full bg-primary text-on-primary font-bold py-3 rounded-xl hover:brightness-110 transition-all">
            Bài tiếp theo
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
          </Link>
        )}
      </div>
    );
  }

  return (
    <button onClick={handleComplete} disabled={loading}
      className="w-full bg-primary text-on-primary font-bold py-3.5 rounded-xl hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2">
      {loading ? (
        <>
          <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z"/>
          </svg>
          Đang xử lý...
        </>
      ) : (
        <>
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>check_circle</span>
          Hoàn thành bài học · Nhận {20} XP
        </>
      )}
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LessonPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const { lessonId } = use(params);
  const [data, setData]           = useState<LessonData | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"content" | "vocab">("content");
  const [showAllVocab, setShowAllVocab] = useState(false);

  useEffect(() => {
    fetch(`/api/lessons/${lessonId}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) throw new Error(d.error);
        setData(d);
      })
      .catch(() => setError("Không thể tải bài học"))
      .finally(() => setLoading(false));
  }, [lessonId]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <span className="material-symbols-outlined text-4xl text-error block mb-2">error</span>
          <p className="text-sm text-on-surface-variant mb-4">{error}</p>
          <Link href="/home/student/courses"
            className="px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-bold">
            Quay lại
          </Link>
        </div>
      </div>
    );
  }

  const blocks   = data?.lesson.content?.blocks ?? [];
  const vocabs   = data?.lesson.vocabularies ?? [];
  const showVocabs = showAllVocab ? vocabs : vocabs.slice(0, 6);

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 pb-28 lg:pb-8">

      {/* ── Breadcrumb ── */}
      <div className="py-4 flex items-center gap-1.5 text-xs text-on-surface-variant">
        <Link href="/home/student/courses" className="hover:text-primary transition-colors">
          Chương trình
        </Link>
        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>chevron_right</span>
        {loading ? <Skeleton className="h-3 w-24 inline-block" /> : (
          <Link href={`/home/student/courses/${data?.course.id}`} className="hover:text-primary transition-colors">
            {data?.course.title}
          </Link>
        )}
        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>chevron_right</span>
        {loading ? <Skeleton className="h-3 w-20 inline-block" /> : (
          <span className="text-on-surface font-semibold truncate max-w-[120px]">{data?.lesson.title}</span>
        )}
      </div>

      {/* ── Lesson header ── */}
      <div className="mb-6">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-72" />
            <Skeleton className="h-12 w-32" />
          </div>
        ) : (
          <>
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
              {data?.chapter.title}
            </p>
            <h1 className="text-2xl md:text-3xl font-extrabold text-on-surface mb-2">
              {data?.lesson.title}
            </h1>
            {data?.lesson.titleChinese && (
              <p className="chinese-text text-3xl text-primary mb-1">{data.lesson.titleChinese}</p>
            )}
            {data?.lesson.pinyin && (
              <p className="text-sm text-on-surface-variant italic mb-3">{data.lesson.pinyin}</p>
            )}
            <div className="flex items-center gap-4 text-sm text-on-surface-variant flex-wrap">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>schedule</span>
                {data?.lesson.durationMins} phút
              </span>
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>translate</span>
                {vocabs.length} từ vựng
              </span>
              {data?.progress.completed && (
                <span className="flex items-center gap-1 text-secondary font-semibold">
                  <span className="material-symbols-outlined" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  Đã hoàn thành
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {data?.lesson.thumbnail && (
        <div className="rounded-2xl overflow-hidden border border-outline-variant/20 mb-4 max-h-64">
          <img
            src={data.lesson.thumbnail}
            alt={data.lesson.title}
            className="w-full h-64 object-cover"
          />
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="flex border-b border-outline-variant/20 mb-6 gap-1">
        {[
          { key: "content", label: "Nội dung bài học", icon: "article"    },
          { key: "vocab",   label: `Từ vựng (${vocabs.length})`, icon: "library_books" },
        ].map(tab => (
          <button key={tab.key}
            onClick={() => setActiveTab(tab.key as "content" | "vocab")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all
              ${activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-on-surface-variant hover:text-on-surface"}`}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Nội dung ── */}
      {activeTab === "content" && (
        <div className="space-y-5">
          {loading && [1,2,3].map(i => <Skeleton key={i} className="h-32 w-full" />)}

          {!loading && blocks.length === 0 && (
            <div className="text-center py-16 border-2 border-dashed border-outline-variant/20 rounded-2xl">
              <span className="material-symbols-outlined text-5xl text-on-surface-variant/20 block mb-3">article</span>
              <p className="text-sm text-on-surface-variant">Bài học chưa có nội dung</p>
            </div>
          )}

          {!loading && blocks.map(block => (
            <BlockRenderer key={block.id} block={block} />
          ))}

          {/* Vocab preview ở cuối content */}
          {!loading && vocabs.length > 0 && (
            <div className="rounded-2xl border border-outline-variant/20 p-5 bg-surface-container-lowest">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary" style={{ fontSize: 20 }}>translate</span>
                  Từ vựng trong bài ({vocabs.length})
                </h3>
                <button onClick={() => setActiveTab("vocab")}
                  className="text-xs font-bold text-primary hover:underline">
                  Xem tất cả →
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {vocabs.slice(0, 8).map(v => (
                  <div key={v.id} className="flex items-center gap-2 px-3 py-1.5 bg-surface-container rounded-xl">
                    <span className="chinese-text font-bold text-on-surface">{v.hanzi}</span>
                    <span className="text-xs text-on-surface-variant">{v.meaningVi}</span>
                  </div>
                ))}
                {vocabs.length > 8 && (
                  <div className="flex items-center px-3 py-1.5 bg-surface-container rounded-xl text-xs text-on-surface-variant">
                    +{vocabs.length - 8} từ nữa
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Complete button */}
          {!loading && (
            <div className="pt-2">
              <CompleteButton
                lessonId={lessonId}
                completed={data?.progress.completed ?? false}
                nextLesson={data?.navigation.next ?? null}
              />
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Từ vựng ── */}
      {activeTab === "vocab" && (
        <div className="space-y-4">
          {loading && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-36" />)}
            </div>
          )}

          {!loading && vocabs.length === 0 && (
            <div className="text-center py-12">
              <span className="material-symbols-outlined text-4xl text-on-surface-variant/30 block mb-2">translate</span>
              <p className="text-sm text-on-surface-variant">Bài học chưa có từ vựng</p>
            </div>
          )}

          {!loading && (
            <>
              {/* Stats */}
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1.5 text-secondary font-semibold">
                  <span className="material-symbols-outlined" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  {vocabs.filter(v => v.alreadyLearned).length} đã học
                </span>
                <span className="text-on-surface-variant">
                  {vocabs.filter(v => !v.alreadyLearned).length} chưa học
                </span>
              </div>

              {/* Cards grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {showVocabs.map(vocab => (
                  <VocabCard key={vocab.id} vocab={vocab} />
                ))}
              </div>

              {vocabs.length > 6 && (
                <button onClick={() => setShowAllVocab(!showAllVocab)}
                  className="w-full py-2.5 border border-outline-variant/30 rounded-xl text-sm font-bold text-on-surface-variant hover:bg-surface-container transition-colors">
                  {showAllVocab ? "Thu gọn" : `Xem thêm ${vocabs.length - 6} từ`}
                </button>
              )}

              {/* Practice CTA */}
              <div className="bg-primary-container rounded-2xl p-5 flex items-center justify-between gap-4">
                <div>
                  <p className="font-bold text-on-primary-container">Luyện tập ngay?</p>
                  <p className="text-sm text-on-primary-container/70 mt-0.5">
                    Vào phòng tập để ôn lại {vocabs.length} từ vựng bài này
                  </p>
                </div>
                <Link href={`/home/student/practice?lesson=${lessonId}`}
                  className="flex-shrink-0 bg-primary text-on-primary font-bold text-sm px-5 py-2.5 rounded-xl hover:brightness-110 transition-all flex items-center gap-2">
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>psychology</span>
                  Luyện tập
                </Link>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Bottom navigation ── */}
      {!loading && (
        <div className="fixed bottom-16 lg:bottom-0 left-0 right-0 lg:relative lg:mt-8 bg-surface-container-lowest lg:bg-transparent border-t border-outline-variant/10 lg:border-0 px-4 py-3 lg:px-0 lg:py-0 z-10">
          <div className="max-w-4xl mx-auto flex gap-3">
            {data?.navigation.prev ? (
              <Link href={`/home/student/lessons/${data.navigation.prev.id}`}
                className="flex-1 flex items-center gap-2 px-4 py-2.5 border border-outline-variant/30 rounded-xl text-sm font-bold text-on-surface hover:bg-surface-container transition-all min-w-0">
                <span className="material-symbols-outlined flex-shrink-0" style={{ fontSize: 18 }}>arrow_back</span>
                <span className="truncate">{data.navigation.prev.title}</span>
              </Link>
            ) : <div className="flex-1" />}

            {data?.navigation.next && (
              <Link href={`/home/student/lessons/${data.navigation.next.id}`}
                className="flex-1 flex items-center justify-end gap-2 px-4 py-2.5 bg-primary text-on-primary rounded-xl text-sm font-bold hover:brightness-110 transition-all min-w-0">
                <span className="truncate text-right">{data.navigation.next.title}</span>
                <span className="material-symbols-outlined flex-shrink-0" style={{ fontSize: 18 }}>arrow_forward</span>
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
