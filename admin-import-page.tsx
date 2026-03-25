"use client";
import { useState, useRef, useCallback } from "react";
import Link from "next/link";

interface PreviewRow {
  hanzi: string; pinyin: string; meaningVi: string;
  category: string; hskLevel: string; type: string;
  status: "ready" | "error"; error?: string;
}

// Parse CSV string → array of objects
function parseCSV(text: string): PreviewRow[] {
  const lines = text.split("\n").filter(l => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/[^a-z]/g, ""));
  const rows: PreviewRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map(c => c.trim().replace(/^"|"$/g, ""));
    const row: any = {};
    headers.forEach((h, j) => { row[h] = cols[j] ?? ""; });

    const hanzi     = row.hanzi || row.source || row.character || "";
    const pinyin    = row.pinyin || row.pronunciation || "";
    const meaningVi = row.vietnamese || row.meaning || row.meaningvi || "";
    const category  = row.category || "";
    const hskLevel  = row.hsklevel || row.hsk || row.level || "1";

    const error = !hanzi ? "Thiếu chữ Hán" : undefined;
    rows.push({ hanzi, pinyin, meaningVi, category, hskLevel, type: "MULTIPLE_CHOICE", status: error ? "error" : "ready", error });
  }

  return rows;
}

export default function AdminImportPage() {
  const [rows,              setRows]              = useState<PreviewRow[]>([]);
  const [dragging,          setDragging]          = useState(false);
  const [fileName,          setFileName]          = useState("");
  const [autoAudio,         setAutoAudio]         = useState(true);
  const [strictValidation,  setStrictValidation]  = useState(false);
  const [importing,         setImporting]         = useState(false);
  const [result,            setResult]            = useState<{ success: number; skipped: number; errors: string[] } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const readyCount  = rows.filter(r => r.status === "ready").length;
  const errorCount  = rows.filter(r => r.status === "error").length;
  const hasErrors   = errorCount > 0;

  const handleFile = useCallback((file: File) => {
    setFileName(file.name);
    setResult(null);
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      setRows(parseCSV(text));
    };
    reader.readAsText(file, "utf-8");
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const importQuestions = async () => {
    const toImport = strictValidation ? rows : rows.filter(r => r.status === "ready");
    if (!toImport.length) return;

    setImporting(true);
    const res  = await fetch("/api/admin/questions/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows: toImport, autoGenerateAudio: autoAudio }),
    });
    const data = await res.json();
    setResult(data.results);
    setImporting(false);
  };

  const downloadTemplate = () => {
    const csv = `hanzi,pinyin,vietnamese,category,hskLevel
学习,xué xí,Học tập,Verbs,1
书院,shū yuàn,Học viện / Thư viện,Places,2
墨水,mò shuǐ,Mực nhúng,Objects,3`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a"); a.href = url; a.download = "hsk-template.csv"; a.click();
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* Nav */}
      <div className="flex items-center gap-2 text-sm text-on-surface-variant mb-4">
        <Link href="/admin/questions" className="hover:text-primary transition-colors">Questions</Link>
        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>chevron_right</span>
        <span className="font-semibold text-on-surface">Bulk Import</span>
      </div>

      <h1 className="text-3xl font-extrabold text-on-surface mb-1">Bulk Import</h1>
      <p className="text-sm text-on-surface-variant mb-8 max-w-xl">
        Expand your curriculum by importing structured CSV files. The Scholar's Atelier supports
        dual-language character sets and automated phonetic generation.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Left — upload + settings */}
        <div className="space-y-4">
          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all
              ${dragging ? "border-primary bg-primary/5" : "border-outline-variant/30 hover:border-primary/40 hover:bg-surface-container"}`}>
            <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mb-3">
              <span className="material-symbols-outlined text-primary" style={{ fontSize: 28 }}>upload_file</span>
            </div>
            <p className="font-semibold text-on-surface mb-1">Upload CSV File</p>
            <p className="text-xs text-on-surface-variant">Drop your file here or click to browse.</p>
            {fileName && (
              <p className="text-xs text-primary font-bold mt-2">📄 {fileName}</p>
            )}
            <button onClick={e => { e.stopPropagation(); downloadTemplate(); }}
              className="mt-3 text-xs text-primary font-bold hover:underline flex items-center gap-1">
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>download</span>
              Download Template
            </button>
          </div>

          <input ref={inputRef} type="file" accept=".csv,.txt" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

          {/* Import settings */}
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-5">
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-4">Import Settings</p>

            <div className="space-y-4">
              {/* Auto audio */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold text-on-surface">Auto generate audio</p>
                  <button onClick={() => setAutoAudio(!autoAudio)}
                    className={`w-11 h-6 rounded-full relative transition-colors ${autoAudio ? "bg-primary" : "bg-surface-container-high"}`}>
                    <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${autoAudio ? "right-0.5" : "left-0.5"}`} />
                  </button>
                </div>
                <p className="text-xs text-on-surface-variant">Uses AI for high-fidelity pronounciation</p>
              </div>

              {/* Strict validation */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold text-on-surface">Strict Validation</p>
                  <button onClick={() => setStrictValidation(!strictValidation)}
                    className={`w-11 h-6 rounded-full relative transition-colors ${strictValidation ? "bg-primary" : "bg-surface-container-high"}`}>
                    <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${strictValidation ? "right-0.5" : "left-0.5"}`} />
                  </button>
                </div>
                <p className="text-xs text-on-surface-variant">Rejects file if any row has errors</p>
              </div>
            </div>

            {/* Import readiness */}
            <div className="mt-4 pt-4 border-t border-outline-variant/10">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-on-surface-variant uppercase">Import Readiness</p>
                <span className="text-xs text-on-surface-variant">
                  {rows.length === 0 ? "Pending upload" : `${readyCount} ready${errorCount > 0 ? `, ${errorCount} errors` : ""}`}
                </span>
              </div>
              {rows.length > 0 && (
                <div className="h-1.5 bg-surface-container rounded-full overflow-hidden">
                  <div className="h-full bg-secondary rounded-full transition-all"
                    style={{ width: `${(readyCount / rows.length) * 100}%` }} />
                </div>
              )}
            </div>

            <button onClick={importQuestions}
              disabled={importing || rows.length === 0 || (strictValidation && hasErrors)}
              className="mt-4 w-full flex items-center justify-center gap-2 bg-primary text-on-primary py-3 rounded-xl text-sm font-bold hover:brightness-110 disabled:opacity-50 transition-all">
              {importing
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <span className="material-symbols-outlined" style={{ fontSize: 18 }}>upload</span>
              }
              {importing ? "Đang import..." : "Import Questions"}
            </button>
          </div>

          {/* Result */}
          {result && (
            <div className={`rounded-2xl border p-4 ${result.errors.length === 0 ? "bg-secondary/5 border-secondary/20" : "bg-amber-50 border-amber-200"}`}>
              <p className={`font-bold text-sm mb-2 ${result.errors.length === 0 ? "text-secondary" : "text-amber-700"}`}>
                {result.errors.length === 0 ? "✓ Import thành công!" : "⚠ Import hoàn tất với lỗi"}
              </p>
              <p className="text-xs text-on-surface-variant">{result.success} thành công</p>
              {result.errors.slice(0, 3).map((e, i) => (
                <p key={i} className="text-xs text-error mt-1">{e}</p>
              ))}
            </div>
          )}
        </div>

        {/* Right — Data preview */}
        <div className="lg:col-span-2">
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/10">
              <h3 className="font-bold text-on-surface">Data Preview</h3>
              {readyCount > 0 && (
                <span className="text-xs font-bold px-3 py-1 bg-secondary text-white rounded-full">
                  {readyCount} Ready for Import
                </span>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-outline-variant/10 bg-surface-container">
                    {["Source (Hanzi)","Pinyin","Vietnamese","Category","Status"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-16">
                        <span className="material-symbols-outlined text-4xl text-on-surface-variant/20 block mb-3">table_rows</span>
                        <p className="text-sm text-on-surface-variant italic">Awaiting additional file rows...</p>
                      </td>
                    </tr>
                  ) : rows.map((row, i) => (
                    <tr key={i} className={`border-b border-outline-variant/10 ${row.status === "error" ? "bg-error/5" : "hover:bg-surface-container/40"} transition-colors`}>
                      <td className="px-4 py-3">
                        <span className="chinese-text text-lg font-bold text-on-surface">{row.hanzi}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-primary italic">{row.pinyin}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-on-surface">{row.meaningVi}</span>
                      </td>
                      <td className="px-4 py-3">
                        {row.category && (
                          <span className="text-xs px-2 py-0.5 bg-surface-container rounded-lg text-on-surface-variant font-medium">
                            {row.category}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {row.status === "ready" ? (
                          <span className="material-symbols-outlined text-secondary" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-error" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>cancel</span>
                            <span className="text-xs text-error">{row.error}</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-primary rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute right-4 bottom-0 text-[6rem] chinese-text font-bold text-white/10 leading-none select-none">標</div>
          <h3 className="text-xl font-extrabold text-white mb-3">The Scholar's Standard</h3>
          <p className="text-sm text-white/70 leading-relaxed mb-4">
            Our engine automatically formats Hanzi with the correct stroke-order breathing room.
            When importing, ensure your CSV uses UTF-8 encoding to preserve the integrity of complex calligraphy.
          </p>
          <div className="flex gap-2">
            <span className="text-xs px-3 py-1.5 bg-white/10 text-white rounded-xl font-bold flex items-center gap-1.5">
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>brush</span>
              Auto-Stroke Mapping
            </span>
            <span className="text-xs px-3 py-1.5 bg-white/10 text-white rounded-xl font-bold flex items-center gap-1.5">
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>graphic_eq</span>
              AI Phonation
            </span>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-6">
          <h3 className="font-bold text-on-surface mb-4">Quy trình import</h3>
          <div className="space-y-3">
            {[
              { step: 1, label: "Prepare CSV", desc: "Tải template, điền dữ liệu theo đúng format" },
              { step: 2, label: "Review Preview", desc: "Kiểm tra data trước khi import" },
              { step: 3, label: "Confirm Atelier Sync", desc: "Import và sync với hệ thống" },
            ].map(s => (
              <div key={s.step} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 text-xs font-extrabold">
                  {s.step}
                </div>
                <div>
                  <p className="text-sm font-bold text-on-surface">{s.label}</p>
                  <p className="text-xs text-on-surface-variant">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
