"use client";

import { useEffect, useState, use, useRef, useCallback } from "react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ContentBlock {
  id: string;
  type: "grammar" | "dialogue" | "hanviet" | "text" | "image";
  data: any;
}

interface VocabItem {
  id: string;
  hanzi: string;
  pinyin: string;
  hanViet: string | null;
  meaningVi: string;
  wordType: string | null;
  audioUrl: string | null;
}

interface LessonDetail {
  id: string;
  title: string;
  titleChinese: string | null;
  pinyin: string | null;
  durationMins: number;
  isPublished: boolean;
  content: { blocks: ContentBlock[] } | null;
  vocabularies: { vocabulary: VocabItem; sortOrder: number }[];
  chapter: {
    id: string; title: string;
    course: { id: string; title: string };
  };
}

const BLOCK_TYPES = [
  { type: "text",     icon: "format_align_left", label: "Văn bản"   },
  { type: "dialogue", icon: "forum",              label: "Hội thoại" },
  { type: "grammar",  icon: "lightbulb",          label: "Ngữ pháp"  },
  { type: "image",    icon: "image",              label: "Hình ảnh"  },
  { type: "hanviet",  icon: "translate",          label: "Hán Việt"  },
];

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-surface-container rounded-xl ${className}`} />;
}

// ─── Upload hook ──────────────────────────────────────────────────────────────
function useUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const upload = async (file: File, type: "image" | "audio") => {
    setUploading(true);
    setError(null);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("type", type);
    try {
      const res  = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Lỗi upload"); return null; }
      return data as { url: string; fileName: string };
    } catch {
      setError("Lỗi kết nối");
      return null;
    } finally {
      setUploading(false);
    }
  };

  return { upload, uploading, error, clearError: () => setError(null) };
}

// ─── Image Upload Component ───────────────────────────────────────────────────
function ImageUpload({
  value, onChange, label = "Hình ảnh",
}: {
  value: string | null;
  onChange: (url: string) => void;
  label?: string;
}) {
  const { upload, uploading, error } = useUpload();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    const result = await upload(file, "image");
    if (result) onChange(result.url);
  }, [upload, onChange]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div className="space-y-2">
      {label && <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block">{label}</label>}

      {value ? (
        <div className="relative group rounded-xl overflow-hidden border border-outline-variant/20">
          <img src={value} alt="" className="w-full h-40 object-cover" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <button onClick={() => inputRef.current?.click()}
              className="w-9 h-9 bg-white rounded-full flex items-center justify-center hover:bg-surface-container transition-colors">
              <span className="material-symbols-outlined text-on-surface" style={{ fontSize: 18 }}>edit</span>
            </button>
            <button onClick={() => onChange("")}
              className="w-9 h-9 bg-white rounded-full flex items-center justify-center hover:bg-error/10 transition-colors">
              <span className="material-symbols-outlined text-error" style={{ fontSize: 18 }}>delete</span>
            </button>
          </div>
          {uploading && (
            <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
              <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      ) : (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all
            ${dragging ? "border-primary bg-primary/5" : "border-outline-variant/40 hover:border-primary/50 hover:bg-surface-container"}`}
        >
          {uploading ? (
            <>
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2" />
              <p className="text-xs text-on-surface-variant">Đang tải lên...</p>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-on-surface-variant mb-2" style={{ fontSize: 32 }}>cloud_upload</span>
              <p className="text-sm font-semibold text-on-surface">Kéo thả hoặc click để tải ảnh</p>
              <p className="text-xs text-on-surface-variant mt-1">JPG, PNG, WebP · Tối đa 5MB</p>
            </>
          )}
        </div>
      )}

      {error && <p className="text-xs text-error">{error}</p>}

      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
    </div>
  );
}

// ─── Audio Upload Component ───────────────────────────────────────────────────
function AudioUpload({
  value, onChange, label = "Audio phát âm",
}: {
  value: string | null;
  onChange: (url: string) => void;
  label?: string;
}) {
  const { upload, uploading, error } = useUpload();
  const inputRef = useRef<HTMLInputElement>(null);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleFile = useCallback(async (file: File) => {
    const result = await upload(file, "audio");
    if (result) onChange(result.url);
  }, [upload, onChange]);

  const togglePlay = () => {
    if (!value) return;
    if (!audioRef.current) {
      audioRef.current = new Audio(value);
      audioRef.current.onended = () => setPlaying(false);
    }
    if (playing) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setPlaying(false);
    } else {
      audioRef.current.play();
      setPlaying(true);
    }
  };

  return (
    <div className="space-y-2">
      {label && <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block">{label}</label>}

      <div className="flex items-center gap-3 p-3 border border-outline-variant/30 rounded-xl bg-surface-container">
        {/* Play button */}
        <button onClick={togglePlay} disabled={!value || uploading}
          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all
            ${value ? "bg-secondary text-white hover:brightness-110" : "bg-surface-container-high text-on-surface-variant/40"}`}>
          <span className="material-symbols-outlined" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>
            {playing ? "pause" : "play_arrow"}
          </span>
        </button>

        {/* File info */}
        <div className="flex-1 min-w-0">
          {value ? (
            <>
              <p className="text-xs font-semibold text-on-surface truncate">
                {value.split("/").pop()}
              </p>
              <p className="text-xs text-on-surface-variant">Audio đã tải lên</p>
            </>
          ) : (
            <p className="text-xs text-on-surface-variant">Chưa có audio</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-1.5">
          <button onClick={() => inputRef.current?.click()} disabled={uploading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-high rounded-lg text-xs font-bold text-on-surface hover:bg-surface-container-highest transition-colors disabled:opacity-50">
            {uploading ? (
              <div className="w-3 h-3 border border-primary border-t-transparent rounded-full animate-spin" />
            ) : (
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>upload</span>
            )}
            {uploading ? "Đang tải..." : "Tải lên"}
          </button>
          {value && (
            <button onClick={() => { onChange(""); audioRef.current = null; setPlaying(false); }}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-error/10 transition-colors">
              <span className="material-symbols-outlined text-error" style={{ fontSize: 14 }}>close</span>
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-xs text-error">{error}</p>}

      <input ref={inputRef} type="file" accept="audio/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
    </div>
  );
}

// ─── Vocab Management ─────────────────────────────────────────────────────────
function VocabManager({
  lessonVocabs,
  onChange,
}: {
  lessonVocabs: { vocabulary: VocabItem; sortOrder: number }[];
  onChange: (vocabs: { vocabulary: VocabItem; sortOrder: number }[]) => void;
}) {
  const [search, setSearch]           = useState("");
  const [results, setResults]         = useState<VocabItem[]>([]);
  const [searching, setSearching]     = useState(false);
  const [editingAudio, setEditingAudio] = useState<string | null>(null); // vocabId
  const { upload, uploading: audioUploading } = useUpload();
  const audioInputRef = useRef<HTMLInputElement>(null);
  const activeVocabRef = useRef<string | null>(null);

  // Debounce search
  useEffect(() => {
    if (!search.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      const res  = await fetch(`/api/admin/vocabulary?q=${encodeURIComponent(search)}&limit=8`);
      const data = await res.json();
      setResults(data.vocabulary ?? []);
      setSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const addVocab = (vocab: VocabItem) => {
    if (lessonVocabs.some(lv => lv.vocabulary.id === vocab.id)) return;
    onChange([...lessonVocabs, { vocabulary: vocab, sortOrder: lessonVocabs.length }]);
    setSearch("");
    setResults([]);
  };

  const removeVocab = (id: string) => {
    onChange(lessonVocabs.filter(lv => lv.vocabulary.id !== id));
  };

  const handleAudioUpload = async (file: File, vocabId: string) => {
    const result = await upload(file, "audio");
    if (!result) return;
    // Cập nhật audioUrl trong vocab
    await fetch(`/api/admin/vocabulary/${vocabId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audioUrl: result.url }),
    });
    // Cập nhật local state
    onChange(lessonVocabs.map(lv =>
      lv.vocabulary.id === vocabId
        ? { ...lv, vocabulary: { ...lv.vocabulary, audioUrl: result.url } }
        : lv
    ));
    setEditingAudio(null);
  };

  return (
    <div className="space-y-4">
      {/* Search box */}
      <div className="relative">
        <div className="flex items-center gap-2 border border-outline-variant/30 rounded-xl px-3 py-2.5 focus-within:border-primary transition-colors">
          <span className="material-symbols-outlined text-on-surface-variant flex-shrink-0" style={{ fontSize: 18 }}>search</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm từ Hán, Pinyin, nghĩa..."
            className="flex-1 text-sm text-on-surface outline-none bg-transparent"
          />
          {search && (
            <button onClick={() => { setSearch(""); setResults([]); }}
              className="text-on-surface-variant hover:text-on-surface">
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
            </button>
          )}
        </div>

        {/* Dropdown results */}
        {(results.length > 0 || searching) && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-surface-container-lowest rounded-xl border border-outline-variant/20 shadow-xl z-20 overflow-hidden">
            {searching && (
              <div className="flex items-center gap-2 px-4 py-3 text-xs text-on-surface-variant">
                <div className="w-3 h-3 border border-primary border-t-transparent rounded-full animate-spin" />
                Đang tìm...
              </div>
            )}
            {results.map(vocab => {
              const alreadyAdded = lessonVocabs.some(lv => lv.vocabulary.id === vocab.id);
              return (
                <button key={vocab.id} onClick={() => addVocab(vocab)} disabled={alreadyAdded}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-container transition-colors text-left
                    ${alreadyAdded ? "opacity-50 cursor-not-allowed" : ""}`}>
                  <span className="text-2xl chinese-text font-bold text-on-surface w-10 flex-shrink-0">{vocab.hanzi}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-primary">{vocab.pinyin}</span>
                      {vocab.wordType && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-surface-container rounded text-on-surface-variant">
                          {vocab.wordType}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-on-surface-variant truncate">{vocab.meaningVi}</p>
                  </div>
                  <div className="flex-shrink-0">
                    {alreadyAdded ? (
                      <span className="material-symbols-outlined text-secondary" style={{ fontSize: 18 }}>check</span>
                    ) : (
                      <span className="material-symbols-outlined text-primary" style={{ fontSize: 18 }}>add</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Vocab list */}
      {lessonVocabs.length === 0 ? (
        <div className="text-center py-10 border-2 border-dashed border-outline-variant/20 rounded-2xl">
          <span className="material-symbols-outlined text-4xl text-on-surface-variant/30 block mb-2">library_books</span>
          <p className="text-sm text-on-surface-variant">Chưa có từ vựng. Tìm và thêm từ ở trên.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-on-surface-variant">{lessonVocabs.length} từ vựng trong bài</p>
          {lessonVocabs.map(({ vocabulary: v }, idx) => (
            <div key={v.id}
              className="border border-outline-variant/20 rounded-xl overflow-hidden bg-surface-container-lowest">
              {/* Main row */}
              <div className="flex items-center gap-3 p-3">
                <span className="material-symbols-outlined text-on-surface-variant cursor-grab" style={{ fontSize: 18 }}>
                  drag_indicator
                </span>

                {/* Hanzi */}
                <div className="w-12 text-center flex-shrink-0">
                  <span className="text-2xl chinese-text font-bold text-on-surface">{v.hanzi}</span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-primary">{v.pinyin}</span>
                    {v.hanViet && (
                      <span className="text-xs text-on-surface-variant/60 italic">{v.hanViet}</span>
                    )}
                    {v.wordType && (
                      <span className="text-[10px] px-2 py-0.5 bg-surface-container rounded-full text-on-surface-variant">
                        {v.wordType}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-on-surface-variant truncate">{v.meaningVi}</p>
                </div>

                {/* Audio status */}
                <button
                  onClick={() => setEditingAudio(editingAudio === v.id ? null : v.id)}
                  className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors
                    ${v.audioUrl ? "bg-secondary/10 text-secondary hover:bg-secondary/20" :
                      "bg-surface-container text-on-surface-variant/40 hover:bg-surface-container-high hover:text-on-surface-variant"}`}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>
                    {v.audioUrl ? "volume_up" : "volume_off"}
                  </span>
                </button>

                {/* Remove */}
                <button onClick={() => removeVocab(v.id)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-error/10 transition-colors flex-shrink-0">
                  <span className="material-symbols-outlined text-error" style={{ fontSize: 14 }}>close</span>
                </button>
              </div>

              {/* Inline audio section */}
              {editingAudio === v.id && (
                <div className="border-t border-outline-variant/10 px-4 py-3 bg-surface-container/50">
                  <AudioUpload
                    value={v.audioUrl}
                    label="Audio phát âm"
                    onChange={url => {
                      // Update inline
                      onChange(lessonVocabs.map(lv =>
                        lv.vocabulary.id === v.id
                          ? { ...lv, vocabulary: { ...lv.vocabulary, audioUrl: url } }
                          : lv
                      ));
                      // Persist to DB
                      fetch(`/api/admin/vocabulary/${v.id}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ audioUrl: url }),
                      });
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Hidden audio file input */}
      <input ref={audioInputRef} type="file" accept="audio/*" className="hidden"
        onChange={e => {
          const f = e.target.files?.[0];
          if (f && activeVocabRef.current) handleAudioUpload(f, activeVocabRef.current);
        }} />
    </div>
  );
}

// ─── Block editors ────────────────────────────────────────────────────────────
function GrammarBlock({ block, onChange, onDelete }: {
  block: ContentBlock;
  onChange: (id: string, data: any) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="border border-blue-200 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50">
        <span className="material-symbols-outlined text-blue-600" style={{ fontSize: 16 }}>lightbulb</span>
        <span className="text-[10px] font-extrabold text-blue-700 tracking-wider uppercase">Ngữ pháp</span>
        <div className="flex-1" />
        <button onClick={() => onDelete(block.id)}
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-blue-100">
          <span className="material-symbols-outlined text-blue-500" style={{ fontSize: 14 }}>close</span>
        </button>
      </div>
      <div className="p-4 space-y-3 bg-white">
        <input value={block.data.title ?? ""} placeholder="Tiêu đề ngữ pháp..."
          onChange={e => onChange(block.id, { ...block.data, title: e.target.value })}
          className="w-full font-bold text-sm text-on-surface outline-none border-b border-outline-variant/20 pb-2" />
        <textarea value={block.data.content ?? ""} placeholder="Giải thích bằng tiếng Việt..." rows={2}
          onChange={e => onChange(block.id, { ...block.data, content: e.target.value })}
          className="w-full text-sm text-on-surface-variant outline-none resize-none" />
        <div className="border-l-4 border-primary/30 pl-3">
          <input value={block.data.example ?? ""} placeholder="Ví dụ câu..."
            onChange={e => onChange(block.id, { ...block.data, example: e.target.value })}
            className="w-full text-sm text-primary outline-none italic chinese-text" />
        </div>
      </div>
    </div>
  );
}

function DialogueBlock({ block, onChange, onDelete }: {
  block: ContentBlock;
  onChange: (id: string, data: any) => void;
  onDelete: (id: string) => void;
}) {
  const lines: { speaker: string; chinese: string; vietnamese: string }[] = block.data.lines ?? [];

  return (
    <div className="border border-green-200 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-green-50">
        <span className="material-symbols-outlined text-green-600" style={{ fontSize: 16 }}>forum</span>
        <input value={block.data.title ?? ""} placeholder="Tên tình huống..."
          onChange={e => onChange(block.id, { ...block.data, title: e.target.value })}
          className="flex-1 text-sm font-bold text-green-800 bg-transparent outline-none" />
        <button onClick={() => onDelete(block.id)}
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-green-100">
          <span className="material-symbols-outlined text-green-500" style={{ fontSize: 14 }}>close</span>
        </button>
      </div>
      <div className="p-4 space-y-2 bg-white">
        {lines.map((line, idx) => (
          <div key={idx} className="flex items-start gap-2">
            <select value={line.speaker}
              onChange={e => {
                const newLines = lines.map((l, i) => i === idx ? { ...l, speaker: e.target.value } : l);
                onChange(block.id, { ...block.data, lines: newLines });
              }}
              className="text-xs font-bold border border-outline-variant/20 rounded px-1.5 py-1 w-12 mt-1">
              <option value="A">A</option>
              <option value="B">B</option>
            </select>
            <div className="flex-1 space-y-1">
              <input value={line.chinese} placeholder="Câu tiếng Trung..."
                onChange={e => {
                  const newLines = lines.map((l, i) => i === idx ? { ...l, chinese: e.target.value } : l);
                  onChange(block.id, { ...block.data, lines: newLines });
                }}
                className="w-full chinese-text text-sm outline-none border-b border-outline-variant/10 pb-0.5" />
              <input value={line.vietnamese} placeholder="Dịch tiếng Việt..."
                onChange={e => {
                  const newLines = lines.map((l, i) => i === idx ? { ...l, vietnamese: e.target.value } : l);
                  onChange(block.id, { ...block.data, lines: newLines });
                }}
                className="w-full text-xs text-on-surface-variant outline-none" />
            </div>
            <button onClick={() => onChange(block.id, { ...block.data, lines: lines.filter((_, i) => i !== idx) })}
              className="w-5 h-5 flex items-center justify-center mt-1 hover:text-error transition-colors">
              <span className="material-symbols-outlined text-on-surface-variant/40" style={{ fontSize: 14 }}>close</span>
            </button>
          </div>
        ))}
        <button onClick={() => onChange(block.id, {
          ...block.data,
          lines: [...lines, { speaker: lines.length % 2 === 0 ? "A" : "B", chinese: "", vietnamese: "" }]
        })}
          className="w-full text-xs font-bold text-green-700 py-2 border border-dashed border-green-300 rounded-xl hover:bg-green-50 transition-colors">
          + Thêm lượt thoại
        </button>
      </div>
    </div>
  );
}

function ImageBlock({ block, onChange, onDelete }: {
  block: ContentBlock;
  onChange: (id: string, data: any) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="border border-purple-200 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-purple-50">
        <span className="material-symbols-outlined text-purple-600" style={{ fontSize: 16 }}>image</span>
        <span className="text-[10px] font-extrabold text-purple-700 tracking-wider uppercase">Hình ảnh</span>
        <div className="flex-1" />
        <button onClick={() => onDelete(block.id)}
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-purple-100">
          <span className="material-symbols-outlined text-purple-500" style={{ fontSize: 14 }}>close</span>
        </button>
      </div>
      <div className="p-4 space-y-3 bg-white">
        <ImageUpload
          value={block.data.url ?? null}
          onChange={url => onChange(block.id, { ...block.data, url })}
          label=""
        />
        <input value={block.data.caption ?? ""} placeholder="Chú thích ảnh (không bắt buộc)..."
          onChange={e => onChange(block.id, { ...block.data, caption: e.target.value })}
          className="w-full text-xs text-on-surface-variant outline-none border-b border-outline-variant/10 pb-1 italic" />
      </div>
    </div>
  );
}

function HanvietBlock({ block, onChange, onDelete }: {
  block: ContentBlock;
  onChange: (id: string, data: any) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="border border-amber-200 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50">
        <span className="material-symbols-outlined text-amber-600" style={{ fontSize: 16 }}>translate</span>
        <span className="text-[10px] font-extrabold text-amber-700 tracking-wider uppercase">Hán Việt</span>
        <div className="flex-1" />
        <button onClick={() => onDelete(block.id)}
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-amber-100">
          <span className="material-symbols-outlined text-amber-500" style={{ fontSize: 14 }}>close</span>
        </button>
      </div>
      <div className="p-4 space-y-3 bg-white">
        <input value={block.data.main ?? ""} placeholder="Từ Hán Việt chính (VD: Danh + Tự)"
          onChange={e => onChange(block.id, { ...block.data, main: e.target.value })}
          className="w-full text-sm font-bold text-on-surface outline-none border-b border-outline-variant/20 pb-2" />
        <textarea value={block.data.tip ?? ""} placeholder="Mẹo nhớ liên quan đến Hán Việt..." rows={2}
          onChange={e => onChange(block.id, { ...block.data, tip: e.target.value })}
          className="w-full text-sm text-on-surface-variant outline-none resize-none" />
      </div>
    </div>
  );
}

function TextBlock({ block, onChange, onDelete }: {
  block: ContentBlock;
  onChange: (id: string, data: any) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="border border-outline-variant/20 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-surface-container">
        <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 16 }}>format_align_left</span>
        <span className="text-[10px] font-extrabold text-on-surface-variant tracking-wider uppercase">Văn bản</span>
        <div className="flex-1" />
        <button onClick={() => onDelete(block.id)}
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-surface-container-high">
          <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 14 }}>close</span>
        </button>
      </div>
      <div className="p-4 bg-white">
        <textarea value={block.data.content ?? ""} placeholder="Nhập nội dung văn bản..." rows={3}
          onChange={e => onChange(block.id, { ...block.data, content: e.target.value })}
          className="w-full text-sm text-on-surface outline-none resize-none" />
      </div>
    </div>
  );
}

function BlockRenderer({ block, onChange, onDelete }: {
  block: ContentBlock;
  onChange: (id: string, data: any) => void;
  onDelete: (id: string) => void;
}) {
  if (block.type === "grammar")  return <GrammarBlock  block={block} onChange={onChange} onDelete={onDelete} />;
  if (block.type === "dialogue") return <DialogueBlock block={block} onChange={onChange} onDelete={onDelete} />;
  if (block.type === "image")    return <ImageBlock    block={block} onChange={onChange} onDelete={onDelete} />;
  if (block.type === "hanviet")  return <HanvietBlock  block={block} onChange={onChange} onDelete={onDelete} />;
  return <TextBlock block={block} onChange={onChange} onDelete={onDelete} />;
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LessonEditorPage({
  params,
}: {
  params: Promise<{ courseId: string; lessonId: string }>;
}) {
  const { courseId, lessonId } = use(params);

  const [lesson, setLesson]   = useState<LessonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [activeTab, setActiveTab] = useState<"info" | "vocab" | "content" | "advanced">("info");

  const [title, setTitle]               = useState("");
  const [titleChinese, setTitleChinese] = useState("");
  const [pinyin, setPinyin]             = useState("");
  const [durationMins, setDurationMins] = useState(15);
  const [isPublished, setIsPublished]   = useState(false);
  const [blocks, setBlocks]             = useState<ContentBlock[]>([]);
  const [lessonVocabs, setLessonVocabs] = useState<{ vocabulary: VocabItem; sortOrder: number }[]>([]);
  const [lessonImage, setLessonImage]   = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/lessons/${lessonId}`)
      .then(r => r.json())
      .then(d => {
        const l = d.lesson;
        setLesson(l);
        setTitle(l.title);
        setTitleChinese(l.titleChinese ?? "");
        setPinyin(l.pinyin ?? "");
        setDurationMins(l.durationMins);
        setIsPublished(l.isPublished);
        setBlocks((l.content as any)?.blocks ?? []);
        setLessonVocabs(l.vocabularies ?? []);
        setLessonImage(l.thumbnail ?? null);
      })
      .finally(() => setLoading(false));
  }, [lessonId]);

  const addBlock = (type: ContentBlock["type"]) => {
    const newBlock: ContentBlock = {
      id: `${Date.now()}`,
      type,
      data: type === "dialogue" ? { title: "", lines: [] }
          : type === "grammar"  ? { title: "", content: "", example: "" }
          : type === "image"    ? { url: "", caption: "" }
          : type === "hanviet"  ? { main: "", tip: "" }
          : { content: "" },
    };
    setBlocks(prev => [...prev, newBlock]);
  };

  const updateBlock = (id: string, data: any) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, data } : b));
  };

  const deleteBlock = (id: string) => {
    setBlocks(prev => prev.filter(b => b.id !== id));
  };

  const handleSave = async (publish = false) => {
    setSaving(true);
    await fetch(`/api/admin/lessons/${lessonId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title, titleChinese, pinyin, durationMins,
        isPublished: publish ? true : isPublished,
        content: { blocks },
        thumbnail: lessonImage,          // ← thêm dòng này
        vocabularyIds: lessonVocabs.map((lv, i) => ({
          vocabId: lv.vocabulary.id, sortOrder: i,
        })),
      }),
    });
    if (publish) setIsPublished(true);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const TABS = [
    { key: "info",     label: "Thông tin cơ bản" },
    { key: "vocab",    label: `Từ vựng (${lessonVocabs.length})` },
    { key: "content",  label: "Nội dung bài học"  },
    { key: "advanced", label: "Nâng cao"           },
  ] as const;

  return (
    <div className="h-full flex flex-col">
      {/* Topbar */}
      <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-outline-variant/10 bg-surface-container-lowest sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <Link href={`/admin/content/courses/${courseId}/edit`}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container transition-colors">
            <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 20 }}>arrow_back</span>
          </Link>
          <span className="font-bold text-on-surface text-sm">Soạn thảo Bài học</span>
          {saved && (
            <span className="flex items-center gap-1 text-xs text-secondary font-semibold">
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>check_circle</span>
              Đã lưu
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={() => handleSave(false)} disabled={saving}
            className="px-4 py-2 border border-outline-variant/40 rounded-xl text-sm font-bold text-on-surface hover:bg-surface-container disabled:opacity-50 transition-all">
            {saving ? "Đang lưu..." : "Lưu nháp"}
          </button>
          <button onClick={() => handleSave(true)} disabled={saving}
            className="px-4 py-2 bg-primary text-on-primary rounded-xl text-sm font-bold disabled:opacity-50 hover:brightness-110 transition-all">
            Xuất bản
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-6">
          {/* Title */}
          {loading ? (
            <Skeleton className="h-10 w-72 mb-6" />
          ) : (
            <div className="mb-6">
              <p className="text-xs font-bold text-on-surface-variant uppercase mb-1">
                {lesson?.chapter.course.title} · {lesson?.chapter.title}
              </p>
              <h1 className="text-2xl font-extrabold text-on-surface italic">
                {title || "Bài học chưa đặt tên"}
              </h1>
              <div className="flex items-center gap-3 mt-1">
                <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${isPublished ? "bg-secondary/10 text-secondary" : "bg-surface-container text-on-surface-variant"}`}>
                  {isPublished ? "Đang công khai" : "Bản nháp"}
                </span>
                <span className="text-xs text-on-surface-variant">{durationMins} phút · {lessonVocabs.length} từ vựng</span>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex border-b border-outline-variant/20 mb-6 overflow-x-auto gap-1">
            {TABS.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-all
                  ${activeTab === tab.key
                    ? "border-primary text-primary"
                    : "border-transparent text-on-surface-variant hover:text-on-surface"}`}>
                {tab.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main */}
            <div className="lg:col-span-2">

              {/* ── Tab: Thông tin ── */}
              {activeTab === "info" && (
                <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-6 space-y-4">
                  <h2 className="font-bold text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary" style={{ fontSize: 18 }}>edit_note</span>
                    Định danh bài học
                  </h2>

                  {loading ? <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12" />)}</div> : (
                    <>
                      <div>
                        <label className="text-xs font-bold text-on-surface-variant uppercase mb-1.5 block">Tên bài học (tiếng Việt)</label>
                        <input value={title} onChange={e => setTitle(e.target.value)}
                          className="w-full border border-outline-variant/30 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary transition-colors"
                          placeholder="VD: Chào hỏi và Giới thiệu bản thân" />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-bold text-on-surface-variant uppercase mb-1.5 block">Chữ Hán</label>
                          <input value={titleChinese} onChange={e => setTitleChinese(e.target.value)}
                            className="w-full border border-outline-variant/30 rounded-xl px-4 py-3 chinese-text text-lg outline-none focus:border-primary transition-colors"
                            placeholder="你好" />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-on-surface-variant uppercase mb-1.5 block">Pinyin</label>
                          <input value={pinyin} onChange={e => setPinyin(e.target.value)}
                            className="w-full border border-outline-variant/30 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary transition-colors"
                            placeholder="nǐ hǎo" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-bold text-on-surface-variant uppercase mb-1.5 block">Thời lượng (phút)</label>
                          <div className="flex items-center border border-outline-variant/30 rounded-xl overflow-hidden focus-within:border-primary transition-colors">
                            <input type="number" min={5} max={180} value={durationMins} onChange={e => setDurationMins(Number(e.target.value))}
                              className="flex-1 px-4 py-3 text-sm outline-none" />
                            <span className="px-3 text-sm text-on-surface-variant bg-surface-container">phút</span>
                          </div>
                        </div>
                        <div className="flex flex-col justify-end">
                          <label className="text-xs font-bold text-on-surface-variant uppercase mb-1.5 block">Trạng thái</label>
                          <button onClick={() => setIsPublished(!isPublished)}
                            className="flex items-center justify-between px-4 py-3 border border-outline-variant/30 rounded-xl hover:bg-surface-container transition-colors">
                            <span className="text-sm">{isPublished ? "Công khai" : "Ẩn (Draft)"}</span>
                            <div className={`w-10 h-5 rounded-full relative transition-colors ${isPublished ? "bg-secondary" : "bg-surface-container-high"}`}>
                              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${isPublished ? "right-0.5" : "left-0.5"}`} />
                            </div>
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ── Tab: Từ vựng ── */}
              {activeTab === "vocab" && (
                <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-6">
                  <h2 className="font-bold text-on-surface mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary" style={{ fontSize: 18 }}>library_books</span>
                    Quản lý từ vựng bài học
                  </h2>
                  <VocabManager lessonVocabs={lessonVocabs} onChange={setLessonVocabs} />
                </div>
              )}

              {/* ── Tab: Nội dung ── */}
              {activeTab === "content" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="font-bold text-on-surface">Cấu trúc nội dung ({blocks.length} blocks)</h2>
                  </div>

                  {blocks.length === 0 && (
                    <div className="text-center py-12 border-2 border-dashed border-outline-variant/20 rounded-2xl">
                      <span className="material-symbols-outlined text-4xl text-on-surface-variant/20 block mb-2">add_box</span>
                      <p className="text-sm text-on-surface-variant">Thêm block nội dung bên dưới</p>
                    </div>
                  )}

                  {blocks.map((block, idx) => (
                    <div key={block.id} className="relative group">
                      {/* Move buttons */}
                      <div className="absolute -left-8 top-1/2 -translate-y-1/2 hidden group-hover:flex flex-col gap-1">
                        <button disabled={idx === 0}
                          onClick={() => {
                            const newBlocks = [...blocks];
                            [newBlocks[idx-1], newBlocks[idx]] = [newBlocks[idx], newBlocks[idx-1]];
                            setBlocks(newBlocks);
                          }}
                          className="w-6 h-6 flex items-center justify-center rounded bg-surface-container disabled:opacity-30">
                          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>expand_less</span>
                        </button>
                        <button disabled={idx === blocks.length - 1}
                          onClick={() => {
                            const newBlocks = [...blocks];
                            [newBlocks[idx], newBlocks[idx+1]] = [newBlocks[idx+1], newBlocks[idx]];
                            setBlocks(newBlocks);
                          }}
                          className="w-6 h-6 flex items-center justify-center rounded bg-surface-container disabled:opacity-30">
                          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>expand_more</span>
                        </button>
                      </div>
                      <BlockRenderer block={block} onChange={updateBlock} onDelete={deleteBlock} />
                    </div>
                  ))}

                  {/* Add block toolbar */}
                  <div className="bg-surface-container rounded-2xl border border-outline-variant/10 p-4">
                    <p className="text-xs font-bold text-on-surface-variant uppercase mb-3">Thêm block</p>
                    <div className="flex flex-wrap gap-2">
                      {BLOCK_TYPES.map(bt => (
                        <button key={bt.type}
                          onClick={() => addBlock(bt.type as ContentBlock["type"])}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-container-lowest border border-outline-variant/20 hover:border-primary hover:text-primary transition-all text-sm font-semibold text-on-surface-variant">
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{bt.icon}</span>
                          {bt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Tab: Nâng cao ── */}
              {activeTab === "advanced" && (
                <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-6 text-sm text-on-surface-variant">
                  Tính năng đang phát triển...
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Lesson thumbnail */}
              <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-green-100 rounded-xl flex items-center justify-center">
                    <span className="material-symbols-outlined text-green-600" style={{ fontSize: 16 }}>image</span>
                  </div>
                  <h3 className="font-bold text-on-surface text-sm">Hình ảnh minh họa</h3>
                </div>
                <ImageUpload
                  value={lessonImage}
                  onChange={setLessonImage}
                  label=""
                />
              </div>

              {/* Hán Việt notes sidebar */}
              <div className="bg-amber-50 rounded-2xl border border-amber-200 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center">
                    <span className="material-symbols-outlined text-amber-600" style={{ fontSize: 16 }}>translate</span>
                  </div>
                  <h3 className="font-bold text-amber-800 text-sm">Ghi chú Hán Việt</h3>
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs font-bold text-amber-700 uppercase mb-1 block">Từ Hán Việt chính</label>
                    <input className="w-full text-sm bg-white border border-amber-200 rounded-lg px-3 py-2 outline-none focus:border-amber-400 text-amber-900"
                      placeholder="VD: Danh (Tên) + Tự (Chữ)" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-amber-700 uppercase mb-1 block">Mẹo nhớ</label>
                    <textarea rows={3} className="w-full text-sm bg-white border border-amber-200 rounded-lg px-3 py-2 outline-none focus:border-amber-400 resize-none text-amber-900"
                      placeholder="Mẹo ghi nhớ Hán Việt..." />
                  </div>
                </div>
              </div>

              {/* Quick stats */}
              <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-5 space-y-2">
                <h3 className="font-bold text-on-surface text-sm mb-3">Thống kê nhanh</h3>
                {[
                  { label: "Số blocks nội dung", value: blocks.length },
                  { label: "Số từ vựng",          value: lessonVocabs.length },
                  { label: "Từ có audio",          value: lessonVocabs.filter(lv => lv.vocabulary.audioUrl).length },
                  { label: "Thời lượng",           value: `${durationMins} phút` },
                ].map(s => (
                  <div key={s.label} className="flex justify-between text-sm">
                    <span className="text-on-surface-variant">{s.label}</span>
                    <span className="font-bold text-on-surface">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
