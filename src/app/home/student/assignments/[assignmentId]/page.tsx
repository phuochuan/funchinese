"use client";
import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";

interface Assignment {
  id: string; title: string; description: string | null;
  imageUrls: string[]; deadline: string | null; maxAttempts: number; xpReward: number;
  class: { name: string } | null;
}
interface Grade {
  passed: boolean; score: number | null; comment: string | null;
  reassign: boolean; teacher: { name: string };
}
interface Submission {
  id: string; status: string; textContent: string | null;
  mediaUrls: string[]; attempt: number; submittedAt: string | null;
  grade: Grade | null;
}

function VideoPlayer({ url }: { url: string }) {
  return (
    <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
      <video src={url} controls className="w-full h-full" />
    </div>
  );
}

const isVideo = (url: string) => /\.(mp4|mov|webm|avi)$/i.test(url);

export default function StudentSubmitPage({ params }: { params: Promise<{ assignmentId: string }> }) {
  const { assignmentId } = use(params);
  const [assignment,  setAssignment]  = useState<Assignment | null>(null);
  const [submission,  setSubmission]  = useState<Submission | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [text,        setText]        = useState("");
  const [mediaUrls,   setMediaUrls]   = useState<string[]>([]);
  const [uploading,   setUploading]   = useState(false);
  const [submitting,  setSubmitting]  = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [lastSaved,   setLastSaved]   = useState<Date | null>(null);
  const imgInputRef  = useRef<HTMLInputElement>(null);
  const vidInputRef  = useRef<HTMLInputElement>(null);
  const autoSaveRef  = useRef<NodeJS.Timeout>();

  const fetchData = async () => {
    const res  = await fetch(`/api/student/assignments/${assignmentId}/submit`);
    const data = await res.json();
    setAssignment(data.assignment);
    setSubmission(data.submission);
    // Load saved draft
    if (data.submission?.textContent) setText(data.submission.textContent);
    if (data.submission?.mediaUrls)   setMediaUrls(data.submission.mediaUrls);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [assignmentId]);

  // Auto-save draft every 30s
  useEffect(() => {
    if (!text && !mediaUrls.length) return;
    clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(() => {
      setSaving(true);
      // Save to localStorage as draft
      localStorage.setItem(`draft_${assignmentId}`, JSON.stringify({ text, mediaUrls }));
      setSaving(false);
      setLastSaved(new Date());
    }, 2000);
    return () => clearTimeout(autoSaveRef.current);
  }, [text, mediaUrls]);

  const uploadFile = async (file: File, type: "image" | "audio") => {
    setUploading(true);
    const fd = new FormData(); fd.append("file", file); fd.append("type", "image"); // reuse image bucket
    const res  = await fetch("/api/admin/upload", { method: "POST", body: fd });
    const data = await res.json();
    setUploading(false);
    return data.url as string | null;
  };

  const handleImageUpload = async (files: FileList) => {
    for (const file of Array.from(files)) {
      const url = await uploadFile(file, "image");
      if (url) setMediaUrls(prev => [...prev, url]);
    }
  };

  const handleVideoUpload = async (files: FileList) => {
    for (const file of Array.from(files)) {
      setUploading(true);
      const fd = new FormData(); fd.append("file", file); fd.append("type", "audio"); // audio bucket handles video too
      const res  = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json();
      setUploading(false);
      if (data.url) setMediaUrls(prev => [...prev, data.url]);
    }
  };

  const submit = async () => {
    if (!text.trim() && mediaUrls.length === 0) {
      alert("Vui lòng nhập nội dung hoặc tải lên media");
      return;
    }
    setSubmitting(true);
    const res = await fetch(`/api/student/assignments/${assignmentId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ textContent: text, mediaUrls }),
    });
    if (res.ok) { await fetchData(); }
    setSubmitting(false);
  };

  const canSubmit = submission?.status === "DRAFT" || submission?.status === "REASSIGNED";
  const isGraded  = submission?.status === "GRADED";
  const grade     = submission?.grade;

  const formatDeadline = () => {
    if (!assignment?.deadline) return null;
    const d = new Date(assignment.deadline);
    return d.toLocaleDateString("vi-VN", { day: "numeric", month: "long", year: "numeric" });
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen pb-16" style={{ background: "#f9fafb" }}>
      {/* Topbar */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-3">
        <Link href="/home/student/assignments"
          className="text-sm text-on-surface-variant hover:text-primary transition-colors">
          Assignments
        </Link>
        <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 14 }}>chevron_right</span>
        <span className="text-sm font-semibold text-on-surface truncate max-w-xs">{assignment?.title}</span>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {/* Assignment details */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-start gap-4 p-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold px-2.5 py-1 bg-primary/10 text-primary rounded-full">
                  PHẦN 1: TỰ LUẬN
                </span>
                {assignment?.deadline && (
                  <div className="flex items-center gap-1 text-xs text-on-surface-variant">
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>schedule</span>
                    Hạn nộp: {formatDeadline()}
                  </div>
                )}
              </div>
              <h1 className="text-2xl font-extrabold text-on-surface mb-3">{assignment?.title}</h1>

              {/* Chinese subtitle if any */}
              {assignment?.description?.includes("兰亭") && (
                <div className="border-l-4 border-primary/30 pl-4 mb-4">
                  <p className="chinese-text text-xl text-on-surface">兰亭集序 — 王羲之</p>
                </div>
              )}

              {assignment?.description && (
                <p className="text-sm text-on-surface leading-relaxed whitespace-pre-wrap mb-4">
                  {assignment.description}
                </p>
              )}
            </div>

            {/* Attachment images */}
            {assignment?.imageUrls && assignment.imageUrls.length > 0 && (
              <div className="flex-shrink-0 space-y-3">
                {assignment.imageUrls.map((url, i) => (
                  <img key={i} src={url} alt="" className="w-48 h-36 object-cover rounded-xl border border-gray-200" />
                ))}
              </div>
            )}
          </div>

          
        </div>

        {/* Submission area */}
        {(canSubmit || !submission) && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-secondary/10 rounded-xl flex items-center justify-center">
                  <span className="material-symbols-outlined text-secondary" style={{ fontSize: 18 }}>edit_note</span>
                </div>
                <span className="font-bold text-on-surface">Khu vực làm bài</span>
              </div>
              {lastSaved && (
                <div className="flex items-center gap-1.5 text-xs text-secondary">
                  <div className="w-1.5 h-1.5 rounded-full bg-secondary" />
                  Tự động lưu: {lastSaved.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                </div>
              )}
            </div>

            {/* Text editor */}
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex gap-2 mb-3">
                {["format_bold","format_italic","format_underlined","format_list_bulleted","link"].map(icon => (
                  <button key={icon} className="w-7 h-7 flex items-center justify-center rounded hover:bg-surface-container transition-colors">
                    <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 16 }}>{icon}</span>
                  </button>
                ))}
              </div>
              <textarea
                value={text} onChange={e => setText(e.target.value)}
                rows={10} placeholder="Bắt đầu viết bài luận của em tại đây..."
                className="w-full text-sm text-on-surface outline-none resize-none bg-transparent leading-relaxed"
              />
            </div>

            {/* Media previews */}
            {mediaUrls.length > 0 && (
              <div className="px-6 py-4 border-b border-gray-100 grid grid-cols-2 gap-4">
                {mediaUrls.map((url, i) => (
                  <div key={i} className="relative group">
                    {isVideo(url)
                      ? <VideoPlayer url={url} />
                      : <img src={url} alt="" className="w-full h-40 object-cover rounded-xl border border-gray-200" />
                    }
                    <button onClick={() => setMediaUrls(prev => prev.filter((_, j) => j !== i))}
                      className="absolute top-2 right-2 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="material-symbols-outlined text-white" style={{ fontSize: 14 }}>close</span>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload buttons */}
            <div className="grid grid-cols-2 gap-4 p-6 border-b border-gray-100">
              <button onClick={() => imgInputRef.current?.click()} disabled={uploading}
                className="flex flex-col items-center gap-2 p-5 border-2 border-dashed border-gray-200 rounded-xl hover:border-primary/40 hover:bg-primary/5 transition-all">
                <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 28 }}>image</span>
                <div className="text-center">
                  <p className="text-sm font-semibold text-on-surface">Tải lên hình ảnh bài viết tay</p>
                  <p className="text-xs text-on-surface-variant">Hỗ trợ JPG, PNG, PDF (Tối đa 20MB)</p>
                </div>
              </button>

              <button onClick={() => vidInputRef.current?.click()} disabled={uploading}
                className="flex flex-col items-center gap-2 p-5 border-2 border-dashed border-gray-200 rounded-xl hover:border-secondary/40 hover:bg-secondary/5 transition-all">
                {uploading
                  ? <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  : <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 28 }}>videocam</span>
                }
                <div className="text-center">
                  <p className="text-sm font-semibold text-on-surface">Tải lên video thực hành</p>
                  <p className="text-xs text-on-surface-variant">Ghi lại quá trình em viết bút lông (MP4, MOV)</p>
                </div>
              </button>
            </div>

            {/* Submit buttons */}
            <div className="flex items-center justify-end gap-3 px-6 py-4">
              <button className="px-5 py-2.5 border border-outline-variant/40 rounded-xl text-sm font-bold text-on-surface hover:bg-surface-container transition-all">
                Lưu nháp
              </button>
              <button onClick={submit} disabled={submitting || (!text.trim() && mediaUrls.length === 0)}
                className="flex items-center gap-2 bg-primary text-on-primary font-bold text-sm px-6 py-2.5 rounded-xl hover:brightness-110 disabled:opacity-50 transition-all">
                {submitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                Nộp bài ▶
              </button>
            </div>

            <input ref={imgInputRef} type="file" multiple accept="image/*,.pdf" className="hidden"
              onChange={e => e.target.files && handleImageUpload(e.target.files)} />
            <input ref={vidInputRef} type="file" multiple accept="video/*" className="hidden"
              onChange={e => e.target.files && handleVideoUpload(e.target.files)} />
          </div>
        )}

        {/* Already submitted */}
        {submission?.status === "SUBMITTED" && (
          <div className="bg-white rounded-2xl border border-primary/20 p-6 text-center">
            <span className="material-symbols-outlined text-primary text-4xl block mb-2" style={{ fontVariationSettings: "'FILL' 1" }}>hourglass_top</span>
            <p className="font-bold text-on-surface mb-1">Đã nộp bài thành công</p>
            <p className="text-sm text-on-surface-variant">Đang chờ giáo viên chấm điểm...</p>
          </div>
        )}

        {/* Grade result */}
        {isGraded && grade && (
          <div className={`rounded-2xl border-l-4 p-6 ${grade.passed ? "bg-secondary/5 border-secondary" : "bg-error/5 border-error"}`}>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <span className={`material-symbols-outlined text-3xl ${grade.passed ? "text-secondary" : "text-error"}`}
                  style={{ fontVariationSettings: "'FILL' 1" }}>
                  {grade.passed ? "task_alt" : "cancel"}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-on-surface">Kết quả chấm điểm</h3>
                    <span className={`text-xs font-extrabold px-2.5 py-1 rounded-full ${grade.passed ? "bg-secondary/10 text-secondary" : "bg-error/10 text-error"}`}>
                      {grade.passed ? "ĐẠT" : "KHÔNG ĐẠT"}
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant">
                    Được chấm bởi {grade.teacher?.name} • vừa rồi
                  </p>
                </div>
              </div>
              {grade.score !== null && (
                <div className="text-right">
                  <p className="text-3xl font-extrabold text-on-surface">{grade.score}<span className="text-lg text-on-surface-variant">/10</span></p>
                  <p className="text-xs text-secondary font-bold">Điểm xuất sắc</p>
                </div>
              )}
            </div>

            {grade.comment && (
              <blockquote className="text-sm text-on-surface italic leading-relaxed border-l-2 border-on-surface-variant/20 pl-4">
                "{grade.comment}"
              </blockquote>
            )}

            {grade.reassign && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-outline-variant/10">
                <p className="text-sm text-on-surface-variant">
                  <span className="material-symbols-outlined align-middle mr-1 text-amber-500" style={{ fontSize: 16 }}>refresh</span>
                  Giảng viên đã cho phép nộp lại nếu em muốn cải thiện điểm số.
                </p>
                <button onClick={() => setSubmission(s => s ? { ...s, status: "REASSIGNED" } : s)}
                  className="flex items-center gap-2 bg-primary text-on-primary font-bold text-sm px-5 py-2.5 rounded-xl hover:brightness-110 transition-all">
                  Nộp lại bài
                </button>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-on-surface-variant py-4">
          © 2023 Scholar's Atelier – Nền tảng học tập Hán Nôm cao cấp.
        </p>
      </div>
    </div>
  );
}
