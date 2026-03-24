"use client";

import { useEffect, useState, useCallback, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Vocab {
  id: string;
  hanzi: string;
  pinyin: string;
  hanViet: string | null;
  meaningVi: string;
  exampleSentence: string | null;
  exampleVi: string | null;
  hskLevel: string;
  wordType: string | null;
  audioUrl: string | null;
}

const HSK_LEVELS = ["HSK1","HSK2","HSK3","HSK4","HSK5","HSK6"];

const WORD_TYPES = [
  "Động từ","Danh từ","Tính từ","Đại từ",
  "Phó từ","Giới từ","Liên từ","Trợ từ","Số từ","Lượng từ",
];

const TYPE_COLORS: Record<string, string> = {
  "Động từ":  "bg-blue-100 text-blue-700",
  "Danh từ":  "bg-green-100 text-green-700",
  "Tính từ":  "bg-orange-100 text-orange-700",
  "Đại từ":   "bg-purple-100 text-purple-700",
  "Phó từ":   "bg-pink-100 text-pink-700",
  "Trợ từ":   "bg-teal-100 text-teal-700",
};

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-surface-container rounded-xl ${className}`} />;
}

// ─── Add / Edit Modal ─────────────────────────────────────────────────────────
function VocabModal({
  initial,
  onClose,
  onSaved,
}: {
  initial?: Vocab | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!initial;
  const [form, setForm] = useState({
    hanzi:           initial?.hanzi           ?? "",
    pinyin:          initial?.pinyin          ?? "",
    hanViet:         initial?.hanViet         ?? "",
    meaningVi:       initial?.meaningVi       ?? "",
    exampleSentence: initial?.exampleSentence ?? "",
    exampleVi:       initial?.exampleVi       ?? "",
    hskLevel:        initial?.hskLevel        ?? "HSK1",
    wordType:        initial?.wordType        ?? "Danh từ",
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.hanzi || !form.pinyin || !form.meaningVi) {
      setError("Vui lòng điền Chữ Hán, Pinyin và Nghĩa tiếng Việt");
      return;
    }
    setSaving(true);
    const url    = isEdit ? `/api/admin/vocabulary/${initial!.id}` : "/api/admin/vocabulary";
    const method = isEdit ? "PUT" : "POST";
    const res    = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) { onSaved(); onClose(); }
    else setError("Lỗi khi lưu từ vựng");
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-surface-container-lowest rounded-2xl shadow-2xl w-full max-w-lg border border-outline-variant/20 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/10 sticky top-0 bg-surface-container-lowest">
          <h2 className="font-bold text-on-surface">
            {isEdit ? "Chỉnh sửa từ vựng" : "Thêm từ vựng mới"}
          </h2>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container transition-colors">
            <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {error && (
            <p className="text-xs text-error bg-error/10 px-3 py-2 rounded-lg border border-error/20">{error}</p>
          )}

          {/* Hanzi + Pinyin */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5 block">
                Chữ Hán <span className="text-error">*</span>
              </label>
              <input value={form.hanzi} onChange={f("hanzi")}
                className="w-full border border-outline-variant/30 rounded-xl px-4 py-3 chinese-text text-2xl outline-none focus:border-primary transition-colors font-bold"
                placeholder="学习" />
            </div>
            <div>
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5 block">
                Pinyin <span className="text-error">*</span>
              </label>
              <input value={form.pinyin} onChange={f("pinyin")}
                className="w-full border border-outline-variant/30 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary transition-colors"
                placeholder="xuéxí" />
            </div>
          </div>

          {/* Hán Việt + Nghĩa */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5 block">
                Âm Hán Việt
              </label>
              <input value={form.hanViet} onChange={f("hanViet")}
                className="w-full border border-outline-variant/30 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary transition-colors"
                placeholder="Học tập" />
            </div>
            <div>
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5 block">
                Nghĩa tiếng Việt <span className="text-error">*</span>
              </label>
              <input value={form.meaningVi} onChange={f("meaningVi")}
                className="w-full border border-outline-variant/30 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary transition-colors"
                placeholder="Học tập, học hỏi" />
            </div>
          </div>

          {/* HSK + Loại từ */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5 block">Cấp độ HSK</label>
              <select value={form.hskLevel} onChange={f("hskLevel")}
                className="w-full border border-outline-variant/30 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary transition-colors">
                {HSK_LEVELS.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5 block">Loại từ</label>
              <select value={form.wordType} onChange={f("wordType")}
                className="w-full border border-outline-variant/30 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary transition-colors">
                {WORD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* Ví dụ */}
          <div>
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5 block">
              Ví dụ câu (tiếng Trung)
            </label>
            <input value={form.exampleSentence} onChange={f("exampleSentence")}
              className="w-full border border-outline-variant/30 rounded-xl px-4 py-3 chinese-text text-sm outline-none focus:border-primary transition-colors"
              placeholder="我每天学习汉语。" />
          </div>

          <div>
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5 block">
              Dịch ví dụ (tiếng Việt)
            </label>
            <input value={form.exampleVi} onChange={f("exampleVi")}
              className="w-full border border-outline-variant/30 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary transition-colors"
              placeholder="Tôi học tiếng Trung mỗi ngày." />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-outline-variant/10 flex justify-end gap-3 sticky bottom-0 bg-surface-container-lowest">
          <button onClick={onClose}
            className="px-5 py-2.5 border border-outline-variant/40 rounded-xl text-sm font-bold text-on-surface hover:bg-surface-container transition-all">
            Hủy
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="px-5 py-2.5 bg-primary text-on-primary rounded-xl text-sm font-bold disabled:opacity-50 hover:brightness-110 transition-all flex items-center gap-2">
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Đang lưu...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                  {isEdit ? "save" : "add"}
                </span>
                {isEdit ? "Lưu thay đổi" : "Thêm từ mới"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Audio player inline ──────────────────────────────────────────────────────
function AudioBtn({ url }: { url: string | null }) {
  const [playing, setPlaying] = useState(false);
  const ref = useRef<HTMLAudioElement | null>(null);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!url) return;
    if (!ref.current) {
      ref.current = new Audio(url);
      ref.current.onended = () => setPlaying(false);
    }
    if (playing) {
      ref.current.pause();
      ref.current.currentTime = 0;
      setPlaying(false);
    } else {
      ref.current.play();
      setPlaying(true);
    }
  };

  return (
    <button onClick={toggle}
      className={`w-9 h-9 rounded-full flex items-center justify-center transition-all
        ${url
          ? playing
            ? "bg-secondary text-white scale-110"
            : "bg-secondary/10 text-secondary hover:bg-secondary/20"
          : "bg-surface-container text-on-surface-variant/30 cursor-not-allowed"}`}>
      <span className="material-symbols-outlined"
        style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>
        {url ? (playing ? "pause" : "volume_up") : "volume_off"}
      </span>
    </button>
  );
}

// ─── Vocab row ────────────────────────────────────────────────────────────────
function VocabRow({
  vocab, selected,
  onSelect, onEdit, onDelete,
}: {
  vocab: Vocab;
  selected: boolean;
  onSelect: (id: string) => void;
  onEdit: (v: Vocab) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <tr className={`border-b border-outline-variant/10 hover:bg-surface-container/50 transition-colors
      ${selected ? "bg-primary/5" : ""}`}>
      {/* Checkbox */}
      <td className="px-4 py-3 w-10">
        <input type="checkbox" checked={selected} onChange={() => onSelect(vocab.id)}
          className="w-4 h-4 rounded accent-primary cursor-pointer" />
      </td>

      {/* Hanzi + type */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl chinese-text font-bold text-on-surface leading-none">{vocab.hanzi}</span>
          {vocab.wordType && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${TYPE_COLORS[vocab.wordType] ?? "bg-surface-container text-on-surface-variant"}`}>
              {vocab.wordType}
            </span>
          )}
        </div>
        {vocab.hanViet && (
          <p className="text-xs text-on-surface-variant/60 italic mt-0.5">{vocab.hanViet}</p>
        )}
      </td>

      {/* Pinyin */}
      <td className="px-4 py-3">
        <span className="text-sm font-medium text-primary">{vocab.pinyin}</span>
      </td>

      {/* Nghĩa */}
      <td className="px-4 py-3">
        <p className="text-sm text-on-surface">{vocab.meaningVi}</p>
        {vocab.exampleSentence && (
          <p className="text-xs text-on-surface-variant/60 chinese-text mt-0.5 truncate max-w-[200px]">
            {vocab.exampleSentence}
          </p>
        )}
      </td>

      {/* Cấp độ */}
      <td className="px-4 py-3">
        <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-surface-container text-on-surface-variant">
          {vocab.hskLevel}
        </span>
      </td>

      {/* Audio */}
      <td className="px-4 py-3">
        <AudioBtn url={vocab.audioUrl} />
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <div className="flex gap-1">
          <button onClick={() => onEdit(vocab)}
            className="w-8 h-8 rounded-lg hover:bg-surface-container flex items-center justify-center transition-colors">
            <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 16 }}>edit</span>
          </button>
          <button onClick={() => onDelete(vocab.id)}
            className="w-8 h-8 rounded-lg hover:bg-error/10 flex items-center justify-center transition-colors">
            <span className="material-symbols-outlined text-error" style={{ fontSize: 16 }}>delete</span>
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function VocabularyPage() {
  const [vocabs, setVocabs]           = useState<Vocab[]>([]);
  const [total, setTotal]             = useState(0);
  const [loading, setLoading]         = useState(true);
  const [page, setPage]               = useState(1);
  const [search, setSearch]           = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [hskFilter, setHskFilter]     = useState("");
  const [audioFilter, setAudioFilter] = useState<"" | "1" | "0">("");
  const [selected, setSelected]       = useState<Set<string>>(new Set());
  const [modal, setModal]             = useState<"add" | "edit" | null>(null);
  const [editingVocab, setEditingVocab] = useState<Vocab | null>(null);

  const LIMIT = 10;

  const fetchVocabs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: String(LIMIT),
      ...(search     && { q: search }),
      ...(hskFilter  && { hsk: hskFilter }),
      ...(audioFilter && { audio: audioFilter }),
    });
    const res  = await fetch(`/api/admin/vocabulary?${params}`);
    const data = await res.json();
    setVocabs(data.vocabulary ?? []);
    setTotal(data.pagination?.total ?? 0);
    setLoading(false);
  }, [page, search, hskFilter, audioFilter]);

  useEffect(() => { fetchVocabs(); }, [fetchVocabs]);

  // Search debounce
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const handleDelete = async (id: string) => {
    if (!confirm("Xoá từ vựng này? Hành động không thể hoàn tác.")) return;
    await fetch(`/api/admin/vocabulary/${id}`, { method: "DELETE" });
    fetchVocabs();
    setSelected(prev => { const s = new Set(prev); s.delete(id); return s; });
  };

  const handleDeleteSelected = async () => {
    if (!confirm(`Xoá ${selected.size} từ vựng đã chọn?`)) return;
    await Promise.all([...selected].map(id =>
      fetch(`/api/admin/vocabulary/${id}`, { method: "DELETE" })
    ));
    setSelected(new Set());
    fetchVocabs();
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === vocabs.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(vocabs.map(v => v.id)));
    }
  };

  const openEdit = (v: Vocab) => {
    setEditingVocab(v);
    setModal("edit");
  };

  const totalPages = Math.ceil(total / LIMIT);

  const PaginationBtn = ({ onClick, disabled, children }: any) => (
    <button onClick={onClick} disabled={disabled}
      className="w-8 h-8 flex items-center justify-center rounded-lg text-sm font-semibold hover:bg-surface-container disabled:opacity-30 transition-colors">
      {children}
    </button>
  );

  return (
    <div className="p-4 md:p-6">
      {/* Modal */}
      {modal && (
        <VocabModal
          initial={modal === "edit" ? editingVocab : null}
          onClose={() => { setModal(null); setEditingVocab(null); }}
          onSaved={fetchVocabs}
        />
      )}

      {/* ── Header ── */}
      <nav className="text-xs text-on-surface-variant mb-2 flex items-center gap-1">
        <span>Nội dung</span>
        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>chevron_right</span>
        <span className="text-primary font-semibold">Quản lý từ vựng</span>
      </nav>

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-on-surface">Thư viện Từ vựng Toàn hệ thống</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Điều chỉnh và kiểm soát cơ sở dữ liệu ngôn ngữ. Tối ưu hoá cho tra cứu nhanh và chỉnh sửa hàng loạt.
          </p>
        </div>
        <div className="flex gap-3 flex-shrink-0">
          <button className="flex items-center gap-2 px-4 py-2.5 border border-outline-variant/40 rounded-xl text-sm font-bold text-on-surface hover:bg-surface-container transition-all">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>upload</span>
            Import CSV
          </button>
          <button onClick={() => setModal("add")}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-on-primary rounded-xl text-sm font-bold hover:brightness-110 transition-all shadow-md">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
            Thêm từ mới
          </button>
        </div>
      </div>

      {/* ── Filters + Stats ── */}
      <div className="flex flex-col lg:flex-row gap-4 mb-6">
        <div className="flex-1 bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-5 space-y-4">
          {/* Search */}
          <div className="flex items-center gap-2 border border-outline-variant/30 rounded-xl px-3 py-2.5 focus-within:border-primary transition-colors">
            <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 18 }}>search</span>
            <input value={searchInput} onChange={e => setSearchInput(e.target.value)}
              placeholder="Tra cứu Chữ Hán, Pinyin, Nghĩa..."
              className="flex-1 text-sm text-on-surface outline-none bg-transparent" />
            {searchInput && (
              <button onClick={() => { setSearchInput(""); setSearch(""); setPage(1); }}>
                <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 16 }}>close</span>
              </button>
            )}
          </div>

          {/* HSK filter */}
          <div>
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Cấp độ HSK</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => { setHskFilter(""); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all
                  ${!hskFilter ? "bg-primary text-on-primary border-primary" : "border-outline-variant/30 text-on-surface-variant hover:bg-surface-container"}`}>
                Tất cả
              </button>
              {HSK_LEVELS.map(h => (
                <button key={h} onClick={() => { setHskFilter(hskFilter === h ? "" : h); setPage(1); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all
                    ${hskFilter === h ? "bg-primary text-on-primary border-primary" : "border-outline-variant/30 text-on-surface-variant hover:bg-surface-container"}`}>
                  {h}
                </button>
              ))}
            </div>
          </div>

          {/* Audio filter */}
          <div>
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Trạng thái Audio</p>
            <div className="flex gap-2">
              {[
                { val: "" as const,  label: "Tất cả"  },
                { val: "1" as const, label: "Có audio" },
                { val: "0" as const, label: "Chưa có" },
              ].map(opt => (
                <button key={opt.val}
                  onClick={() => { setAudioFilter(opt.val); setPage(1); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all
                    ${audioFilter === opt.val
                      ? "bg-secondary text-white border-secondary"
                      : "border-outline-variant/30 text-on-surface-variant hover:bg-surface-container"}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Stats card */}
        <div className="bg-primary rounded-2xl p-6 min-w-[200px] flex flex-col justify-center relative overflow-hidden">
          <div className="absolute right-2 bottom-0 text-[7rem] chinese-text font-bold text-white/8 leading-none select-none pointer-events-none">詞</div>
          <p className="text-xs font-bold text-white/60 uppercase tracking-wider mb-1">Tổng cộng hệ thống</p>
          <p className="text-4xl font-extrabold text-white">
            {loading ? "—" : total.toLocaleString("vi-VN")}
          </p>
          <p className="text-sm text-white/70 mt-1">từ vựng</p>
          {hskFilter && (
            <p className="text-xs text-white/50 mt-2">Đang lọc: {hskFilter}</p>
          )}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-outline-variant/10 bg-surface-container">
                <th className="px-4 py-3 w-10">
                  <input type="checkbox"
                    checked={vocabs.length > 0 && selected.size === vocabs.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded accent-primary cursor-pointer" />
                </th>
                {["Từ vựng (chữ Hán)", "Pinyin", "Nghĩa tiếng Việt", "Cấp độ", "Audio", "Thao tác"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-outline-variant/10">
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-4 py-4">
                      <Skeleton className={`h-6 ${j === 0 ? "w-16" : j === 3 ? "w-full" : "w-20"}`} />
                    </td>
                  ))}
                </tr>
              ))}

              {!loading && vocabs.map(v => (
                <VocabRow key={v.id} vocab={v} selected={selected.has(v.id)}
                  onSelect={toggleSelect} onEdit={openEdit} onDelete={handleDelete} />
              ))}

              {!loading && vocabs.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-16">
                    <span className="material-symbols-outlined text-5xl text-on-surface-variant/20 block mb-3">library_books</span>
                    <p className="text-sm text-on-surface-variant">
                      {search ? `Không tìm thấy từ nào cho "${search}"` : "Chưa có từ vựng nào"}
                    </p>
                    {!search && (
                      <button onClick={() => setModal("add")}
                        className="mt-4 px-4 py-2 bg-primary text-on-primary rounded-xl text-sm font-bold hover:brightness-110 transition-all">
                        + Thêm từ đầu tiên
                      </button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && total > 0 && (
          <div className="px-4 py-3 border-t border-outline-variant/10 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-on-surface-variant">
              Hiển thị <strong>{Math.min((page-1)*LIMIT+1, total)}–{Math.min(page*LIMIT, total)}</strong> trong <strong>{total.toLocaleString("vi-VN")}</strong> từ vựng
            </p>
            <div className="flex items-center gap-1">
              <PaginationBtn onClick={() => setPage(1)} disabled={page === 1}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>first_page</span>
              </PaginationBtn>
              <PaginationBtn onClick={() => setPage(p => p - 1)} disabled={page === 1}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chevron_left</span>
              </PaginationBtn>

              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
                return (
                  <button key={p} onClick={() => setPage(p)}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-semibold transition-colors
                      ${p === page ? "bg-primary text-on-primary" : "hover:bg-surface-container text-on-surface"}`}>
                    {p}
                  </button>
                );
              })}

              <PaginationBtn onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chevron_right</span>
              </PaginationBtn>
              <PaginationBtn onClick={() => setPage(totalPages)} disabled={page === totalPages}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>last_page</span>
              </PaginationBtn>
            </div>
          </div>
        )}
      </div>

      {/* ── Bulk action bar ── */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30
          bg-on-surface text-inverse-on-surface px-6 py-3 rounded-2xl shadow-2xl
          flex items-center gap-4 border border-white/10">
          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-on-primary">{selected.size}</span>
          </div>
          <span className="text-sm font-bold">từ đã chọn</span>
          <div className="w-px h-4 bg-white/20" />
          <button className="text-sm font-bold text-secondary-fixed hover:opacity-80 transition-opacity flex items-center gap-1.5">
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>download</span>
            Xuất CSV
          </button>
          <button onClick={handleDeleteSelected}
            className="text-sm font-bold text-error hover:opacity-80 transition-opacity flex items-center gap-1.5">
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
            Xóa hàng loạt
          </button>
          <button onClick={() => setSelected(new Set())}
            className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors ml-2">
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
          </button>
        </div>
      )}
    </div>
  );
}
