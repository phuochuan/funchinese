"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";

interface Question {
  id: string; code: string; hanzi: string; pinyin: string | null;
  meaningVi: string | null; hskLevel: number; type: string;
  category: string | null; audioUrl: string | null; createdAt: string; options: Array<string> | null,
  answer: string | null, explanation: string | null;
   // NEW
  questionText?: string | null;
  questionImageUrl?: string | null;
}
interface Stats { level: number; count: number; }

const TYPE_CONFIG: Record<string, { label: string; cls: string }> = {
  MULTIPLE_CHOICE: { label: "Multiple Choice", cls: "bg-primary/10 text-primary" },
  FILL_BLANK:      { label: "Fill Blanks",     cls: "bg-amber-100 text-amber-700" },
  SPEAKING:        { label: "Speaking",         cls: "bg-purple-100 text-purple-700" },
  LISTENING:       { label: "Listening",        cls: "bg-teal-100 text-teal-700" },
};

const HSK_COLORS = ["","bg-green-500","bg-teal-500","bg-blue-500","bg-indigo-500","bg-purple-500","bg-red-500"];

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-surface-container rounded-xl ${className}`} />;
}

// ─── Question Modal ───────────────────────────────────────────────────────────
function QuestionModal({ initial, onClose, onSaved }: {
  initial?: Question | null; onClose: () => void; onSaved: () => void;
}) {
  console.log("initial ", initial?.options);

  const isEdit = !!initial;

  const [form, setForm] = useState({
    hanzi:       initial?.hanzi       ?? "",
    pinyin:      initial?.pinyin      ?? "",
    meaningVi:   initial?.meaningVi   ?? "",
    hskLevel:    initial?.hskLevel    ?? 1,
    type:        initial?.type        ?? "MULTIPLE_CHOICE",
    category:    initial?.category    ?? "",

    optionA:     initial?.options?.[0] ?? "",
    optionB:     initial?.options?.[1] ?? "",
    optionC:     initial?.options?.[2] ?? "",
    optionD:     initial?.options?.[3] ?? "",

    answer:      initial?.answer ?? "",
    explanation: initial?.explanation ?? "",

    // NEW
    questionText:     initial?.questionText     ?? "",
    questionImageUrl: initial?.questionImageUrl ?? "",
  });
  const [saving,          setSaving]          = useState(false);
  const [error,           setError]           = useState("");
  const [generatingAudio, setGeneratingAudio] = useState(false);
  const [audioUrl,        setAudioUrl]        = useState(initial?.audioUrl ?? "");

  const f = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(p => ({ ...p, [k]: e.target.value }));

  const generateAudio = async () => {
    if (!form.hanzi) return;
    setGeneratingAudio(true);
    const res  = await fetch("/api/admin/questions/generate-audio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: form.hanzi }),
    });
    const data = await res.json();
    if (data.url) setAudioUrl(data.url);
    setGeneratingAudio(false);
  };

  const submit = async () => {
    // if (!form.hanzi) { setError("Nhập Chữ Hán"); return; }
    setSaving(true);
    const options = form.optionA
      ? [form.optionA, form.optionB, form.optionC, form.optionD].filter(Boolean)
      : null;

    const url    = isEdit ? `/api/admin/questions/${initial!.id}` : "/api/admin/questions";
    const method = isEdit ? "PUT" : "POST";
    const res    = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, options, audioUrl: audioUrl || null ,   // NEW (optional normalize)
        questionText: form.questionText || null,
        questionImageUrl: form.questionImageUrl || null,
      }),
    });
    setSaving(false);
    if (res.ok) { onSaved(); onClose(); }
    else setError("Lỗi khi lưu");
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-surface-container-lowest rounded-2xl shadow-2xl w-full max-w-2xl border border-outline-variant/20 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/10 sticky top-0 bg-surface-container-lowest">
          <h2 className="font-bold text-on-surface">{isEdit ? "Sửa câu hỏi" : "Thêm câu hỏi mới"}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container">
            <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && <p className="text-xs text-error bg-error/10 px-3 py-2 rounded-lg">{error}</p>}

          {/* Question Text */}
          <div>
            <label className="text-xs font-bold text-on-surface-variant uppercase mb-1 block">
              Nội dung câu hỏi
            </label>
            <textarea
              value={form.questionText}
              onChange={f("questionText")}
              rows={2}
              className="w-full border border-outline-variant/30 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary resize-none"
              placeholder="Ví dụ: Chọn đáp án đúng..."
            />
          </div>

          {/* Question Image */}
          <div>
            <label className="text-xs font-bold text-on-surface-variant uppercase mb-1 block">
              Image URL
            </label>
            <input
              value={form.questionImageUrl}
              onChange={f("questionImageUrl")}
              className="w-full border border-outline-variant/30 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary"
              placeholder="https://..."
            />

            {form.questionImageUrl && (
              <img
                src={form.questionImageUrl}
                alt="preview"
                className="mt-2 max-h-40 rounded-lg border border-outline-variant/20"
              />
            )}
          </div>

          {/* Hanzi + Audio */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-bold text-on-surface-variant uppercase mb-1 block">Chữ Hán *</label>
              <input value={form.hanzi} onChange={f("hanzi")}
                className="w-full border border-outline-variant/30 rounded-xl px-4 py-3 chinese-text text-2xl outline-none focus:border-primary"
                placeholder="学习" />
            </div>
            <div>
              <label className="text-xs font-bold text-on-surface-variant uppercase mb-1 block">Audio</label>
              <div className="flex gap-2 h-[50px]">
                <button onClick={generateAudio} disabled={generatingAudio || !form.hanzi}
                  className="flex-1 flex items-center justify-center gap-1.5 border border-outline-variant/30 rounded-xl text-xs font-bold text-on-surface hover:bg-surface-container disabled:opacity-40 transition-all">
                  {generatingAudio
                    ? <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    : <span className="material-symbols-outlined" style={{ fontSize: 16 }}>auto_fix_high</span>
                  }
                  {generatingAudio ? "..." : "Generate"}
                </button>
                {audioUrl && (
                  <button onClick={() => new Audio(audioUrl).play()}
                    className="w-10 h-full flex items-center justify-center rounded-xl bg-secondary/10 text-secondary hover:bg-secondary/20">
                    <span className="material-symbols-outlined" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>volume_up</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Pinyin + Nghĩa */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-on-surface-variant uppercase mb-1 block">Pinyin</label>
              <input value={form.pinyin} onChange={f("pinyin")}
                className="w-full border border-outline-variant/30 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary"
                placeholder="xuéxí" />
            </div>
            <div>
              <label className="text-xs font-bold text-on-surface-variant uppercase mb-1 block">Nghĩa tiếng Việt</label>
              <input value={form.meaningVi} onChange={f("meaningVi")}
                className="w-full border border-outline-variant/30 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary"
                placeholder="Học tập" />
            </div>
          </div>

          {/* HSK + Type + Category */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-on-surface-variant uppercase mb-1 block">HSK Level</label>
              <select value={form.hskLevel} onChange={f("hskLevel")}
                className="w-full border border-outline-variant/30 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary">
                {[1,2,3,4,5,6].map(l => <option key={l} value={l}>HSK {l}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-on-surface-variant uppercase mb-1 block">Loại câu hỏi</label>
              <select value={form.type} onChange={f("type")}
                className="w-full border border-outline-variant/30 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary">
                <option value="MULTIPLE_CHOICE">Multiple Choice</option>
                <option value="FILL_BLANK">Fill Blanks</option>
                <option value="SPEAKING">Speaking</option>
                <option value="LISTENING">Listening</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-on-surface-variant uppercase mb-1 block">Danh mục</label>
              <input value={form.category} onChange={f("category")}
                className="w-full border border-outline-variant/30 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary"
                placeholder="Verbs, Places..." />
            </div>
          </div>

          {/* Options (nếu Multiple Choice) */}
          {form.type === "MULTIPLE_CHOICE" && (
            <div>
              <label className="text-xs font-bold text-on-surface-variant uppercase mb-2 block">Đáp án (A B C D)</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: "optionA" as const, label: "A" },
                  { key: "optionB" as const, label: "B" },
                  { key: "optionC" as const, label: "C" },
                  { key: "optionD" as const, label: "D" },
                ].map(opt => (
                  <div key={opt.key} className="flex items-center gap-2 border border-outline-variant/30 rounded-xl px-3 py-2">
                    <span className="w-6 h-6 bg-surface-container rounded-lg flex items-center justify-center text-xs font-bold text-on-surface-variant flex-shrink-0">
                      {opt.label}
                    </span>
                    <input value={form[opt.key]} onChange={f(opt.key)}
                      placeholder={`Đáp án ${opt.label}`}
                      className="flex-1 text-sm outline-none bg-transparent" />
                  </div>
                ))}
              </div>
              <div className="mt-2">
                <label className="text-xs font-bold text-on-surface-variant uppercase mb-1 block">Đáp án đúng</label>
                <select value={form.answer} onChange={f("answer")}
                  className="w-full border border-outline-variant/30 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary">
                  <option value="">Chọn đáp án đúng</option>
                  {["A","B","C","D"].map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Explanation */}
          <div>
            <label className="text-xs font-bold text-on-surface-variant uppercase mb-1 block">Giải thích</label>
            <textarea value={form.explanation} onChange={f("explanation")} rows={2}
              className="w-full border border-outline-variant/30 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary resize-none"
              placeholder="Giải thích ngữ pháp hoặc từ vựng..." />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-outline-variant/10 flex justify-end gap-3 sticky bottom-0 bg-surface-container-lowest">
          <button onClick={onClose}
            className="px-5 py-2.5 border border-outline-variant/40 rounded-xl text-sm font-bold text-on-surface hover:bg-surface-container">
            Huỷ
          </button>
          <button onClick={submit} disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary rounded-xl text-sm font-bold hover:brightness-110 disabled:opacity-50">
            {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {isEdit ? "Lưu thay đổi" : "Thêm câu hỏi"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AdminQuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [stats,     setStats]     = useState<Stats[]>([]);
  const [total,     setTotal]     = useState(0);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [searchQ,   setSearchQ]   = useState("");
  const [hskFilter, setHskFilter] = useState("");
  const [typeFilter,setTypeFilter]= useState("");
  const [page,      setPage]      = useState(1);
  const [modal,     setModal]     = useState<"add" | "edit" | null>(null);
  const [editing,   setEditing]   = useState<Question | null>(null);

  const fetchQ = async (q = searchQ, hsk = hskFilter, type = typeFilter, p = page) => {
    setLoading(true);
    const params = new URLSearchParams({ q, page: String(p), limit: "20" });
    if (hsk)  params.set("hsk",  hsk);
    if (type) params.set("type", type);
    const res  = await fetch(`/api/admin/questions?${params}`);
    const data = await res.json();
    setQuestions(data.questions ?? []);
    setStats(data.stats ?? []);
    setTotal(data.pagination?.total ?? 0);
    setLoading(false);
  };

  useEffect(() => { fetchQ(); }, []);

  useEffect(() => {
    const t = setTimeout(() => { setSearchQ(search); setPage(1); fetchQ(search, hskFilter, typeFilter, 1); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const handleDelete = async (id: string) => {
    if (!confirm("Xoá câu hỏi này?")) return;
    await fetch(`/api/admin/questions/${id}`, { method: "DELETE" });
    fetchQ();
  };

  const openEdit = (q: Question) => { setEditing(q); setModal("edit"); };

  const totalInPool = stats.reduce((a, s) => a + s.count, 0);

  return (
    <div className="p-4 md:p-6">
      {modal && (
        <QuestionModal
          initial={modal === "edit" ? editing : null}
          onClose={() => { setModal(null); setEditing(null); }}
          onSaved={fetchQ}
        />
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
        <div>
          <p className="text-xs font-bold text-primary uppercase tracking-wider mb-1">Repository Control</p>
          <h1 className="text-3xl font-extrabold text-on-surface">Question Management</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Curate and organize the digital atelier's central knowledge base for HSK proficiency levels.
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/questions/import"
            className="flex items-center gap-2 border border-outline-variant/40 px-4 py-2.5 rounded-xl text-sm font-bold text-on-surface hover:bg-surface-container transition-all">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>upload</span>
            Bulk Import
          </Link>
          <button onClick={() => setModal("add")}
            className="flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-xl text-sm font-bold hover:brightness-110 transition-all shadow-md">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
            Add New Question
          </button>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col md:flex-row gap-3 mb-5">
        <div className="flex items-center gap-2 flex-1 border border-outline-variant/30 rounded-xl px-3 py-2.5 bg-surface-container-lowest focus-within:border-primary transition-colors">
          <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 18 }}>search</span>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by character, pinyin, or translation..."
            className="flex-1 text-sm outline-none bg-transparent text-on-surface" />
        </div>

        <select value={hskFilter} onChange={e => { setHskFilter(e.target.value); setPage(1); fetchQ(searchQ, e.target.value, typeFilter, 1); }}
          className="border border-outline-variant/30 rounded-xl px-4 py-2.5 text-sm bg-surface-container-lowest outline-none">
          <option value="">HSK Level (All)</option>
          {[1,2,3,4,5,6].map(l => <option key={l} value={l}>HSK {l}</option>)}
        </select>

        <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); fetchQ(searchQ, hskFilter, e.target.value, 1); }}
          className="border border-outline-variant/30 rounded-xl px-4 py-2.5 text-sm bg-surface-container-lowest outline-none">
          <option value="">Question Type (All)</option>
          <option value="MULTIPLE_CHOICE">Multiple Choice</option>
          <option value="FILL_BLANK">Fill Blanks</option>
          <option value="SPEAKING">Speaking</option>
          <option value="LISTENING">Listening</option>
        </select>

        <button onClick={() => fetchQ()}
          className="w-10 h-10 flex items-center justify-center border border-outline-variant/30 rounded-xl hover:bg-surface-container transition-colors flex-shrink-0">
          <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 18 }}>refresh</span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 overflow-x-auto mb-6">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="border-b border-outline-variant/10 bg-surface-container">
              {["ID","Question Content","Type","Level","Actions"].map(h => (
                <th key={h} className="px-5 py-3 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && [1,2,3,4].map(i => (
              <tr key={i} className="border-b border-outline-variant/10">
                {[1,2,3,4,5].map(j => <td key={j} className="px-5 py-4"><Skeleton className="h-5 w-full" /></td>)}
              </tr>
            ))}

            {!loading && questions.map(q => (
              <tr key={q.id} className="border-b border-outline-variant/10 hover:bg-surface-container/40 transition-colors">
                <td className="px-5 py-4">
                  <span className="text-xs font-mono text-on-surface-variant">{q.code}</span>
                </td>
                <td className="px-5 py-4 max-w-xs">
                  {/* Question image thumbnail */}
                  {q.questionImageUrl && (
                    <img
                      src={q.questionImageUrl}
                      alt="img"
                      className="w-12 h-12 rounded-lg object-cover border border-outline-variant/20 mb-1.5"
                    />
                  )}
                  {/* Question text */}
                  {q.questionText ? (
                    <p className="text-xs text-on-surface line-clamp-2">{q.questionText}</p>
                  ) : (
                    <p className="chinese-text font-bold text-on-surface">{q.hanzi}</p>
                  )}
                  {/* Audio */}
                  {q.audioUrl && (
                    <button onClick={() => new Audio(q.audioUrl!).play()}
                      className="w-6 h-6 rounded-full bg-secondary/10 flex items-center justify-center hover:bg-secondary/20 mt-1 transition-colors">
                      <span className="material-symbols-outlined text-secondary" style={{ fontSize: 13, fontVariationSettings: "'FILL' 1" }}>volume_up</span>
                    </button>
                  )}
                </td>
                <td className="px-5 py-4">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${TYPE_CONFIG[q.type]?.cls ?? "bg-surface-container text-on-surface-variant"}`}>
                    {TYPE_CONFIG[q.type]?.label ?? q.type}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${HSK_COLORS[q.hskLevel] ?? "bg-gray-400"}`} />
                    <span className="text-sm font-semibold text-on-surface">HSK {q.hskLevel}</span>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(q)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container transition-colors">
                      <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 16 }}>edit</span>
                    </button>
                    <button onClick={() => handleDelete(q.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-error/10 transition-colors">
                      <span className="material-symbols-outlined text-error" style={{ fontSize: 16 }}>delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {!loading && questions.length === 0 && (
              <tr><td colSpan={5} className="text-center py-14 text-sm text-on-surface-variant">
                Không tìm thấy câu hỏi nào
              </td></tr>
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {!loading && total > 0 && (
          <div className="px-5 py-3 border-t border-outline-variant/10 flex items-center justify-between">
            <p className="text-xs text-on-surface-variant">
              Showing <strong>{Math.min((page-1)*20+1, total)}–{Math.min(page*20, total)}</strong> of <strong>{total.toLocaleString()}</strong> questions
            </p>
            <div className="flex gap-1">
              <button onClick={() => { setPage(p => p-1); fetchQ(searchQ, hskFilter, typeFilter, page-1); }} disabled={page === 1}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container disabled:opacity-30">
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chevron_left</span>
              </button>
              {Array.from({ length: Math.min(5, Math.ceil(total/20)) }, (_, i) => {
                const p = Math.max(1, Math.min(Math.ceil(total/20)-4, page-2)) + i;
                return (
                  <button key={p} onClick={() => { setPage(p); fetchQ(searchQ, hskFilter, typeFilter, p); }}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-semibold transition-colors
                      ${p === page ? "bg-primary text-on-primary" : "hover:bg-surface-container text-on-surface"}`}>
                    {p}
                  </button>
                );
              })}
              <button onClick={() => { setPage(p => p+1); fetchQ(searchQ, hskFilter, typeFilter, page+1); }}
                disabled={page >= Math.ceil(total/20)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container disabled:opacity-30">
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chevron_right</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-5">
          <p className="text-xs font-bold text-on-surface-variant uppercase mb-2">Total Pool</p>
          <p className="text-3xl font-extrabold text-primary">{totalInPool.toLocaleString()}</p>
          <p className="text-xs text-secondary mt-1">↗ +12% this month</p>
        </div>
        {stats.slice(0, 2).map(s => (
          <div key={s.level} className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-5">
            <p className="text-xs font-bold text-on-surface-variant uppercase mb-2">HSK {s.level} Level</p>
            <p className="text-3xl font-extrabold text-on-surface">{s.count}</p>
            <p className="text-xs text-amber-600 mt-1">Needs Review</p>
          </div>
        ))}
        <div className="bg-surface-container-lowest rounded-2xl border border-dashed border-outline-variant/30 p-5 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-surface-container transition-colors"
          onClick={() => window.location.href = "/admin/questions/import"}>
          <span className="material-symbols-outlined text-on-surface-variant/40" style={{ fontSize: 28 }}>upload_file</span>
          <p className="text-xs font-bold text-on-surface-variant">Bulk Import</p>
          <p className="text-[10px] text-on-surface-variant/60">CSV, Excel, or JSON</p>
        </div>
      </div>
    </div>
  );
}
