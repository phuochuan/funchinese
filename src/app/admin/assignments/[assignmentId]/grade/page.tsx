"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";

interface Submission {
  id: string; status: string; textContent: string | null; mediaUrls: string[];
  submittedAt: string | null; attempt: number;
  user: { id: string; name: string; email: string; image: string | null };
  grade: { passed: boolean; score: number | null; comment: string | null; reassign: boolean; teacher: { name: string } } | null;
}
interface AssignmentDetail {
  id: string; title: string; description: string | null; imageUrls: string[];
  deadline: string | null; maxAttempts: number;
  class: { id: string; name: string } | null;
  submissions: Submission[];
}

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  DRAFT:      { label: "Chưa nộp",   cls: "bg-surface-container text-on-surface-variant" },
  SUBMITTED:  { label: "Đã nộp",     cls: "bg-primary/10 text-primary"                   },
  GRADED:     { label: "Đã chấm",    cls: "bg-secondary/10 text-secondary"               },
  REASSIGNED: { label: "Nộp lại",    cls: "bg-amber-100 text-amber-700"                  },
};

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-surface-container rounded-xl ${className}`} />;
}

function VideoPlayer({ url }: { url: string }) {
  return (
    <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
      <video src={url} controls className="w-full h-full" />
    </div>
  );
}

export default function AdminGradePage({ params }: { params: Promise<{ assignmentId: string }> }) {
  const { assignmentId } = use(params);
  const [assignment,   setAssignment]   = useState<AssignmentDetail | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [selected,     setSelected]     = useState<Submission | null>(null);
  const [grading,      setGrading]      = useState(false);
  const [comment,      setComment]      = useState("");
  const [reassign,     setReassign]     = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const res  = await fetch(`/api/admin/assignments/${assignmentId}`);
    const data = await res.json();
    setAssignment(data.assignment);
    // Auto-select first SUBMITTED
    const firstPending = data.assignment?.submissions.find((s: Submission) => s.status === "SUBMITTED");
    if (firstPending) { setSelected(firstPending); setComment(firstPending.grade?.comment ?? ""); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [assignmentId]);

  const selectSub = (s: Submission) => {
    setSelected(s);
    setComment(s.grade?.comment ?? "");
    setReassign(s.grade?.reassign ?? false);
  };

  const grade = async (passed: boolean) => {
    if (!selected) return;
    setGrading(true);
    await fetch(`/api/admin/assignments/${assignmentId}/grade/${selected.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passed, comment, reassign }),
    });
    setGrading(false);
    fetchData();
  };

  const isVideo = (url: string) => /\.(mp4|mov|webm|avi)$/i.test(url);

  const formatTimeAgo = (iso: string | null) => {
    if (!iso) return "—";
    const diff = Date.now() - new Date(iso).getTime();
    const h = Math.floor(diff / 3600000);
    if (h < 24) return `${h} giờ trước`;
    return `${Math.floor(h/24)} ngày trước`;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-outline-variant/10 bg-surface-container-lowest">
        <Link href="/admin/assignments"
          className="text-xs text-on-surface-variant hover:text-primary transition-colors">
          Assignment Management
        </Link>
        <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 14 }}>chevron_right</span>
        <span className="text-xs font-semibold text-on-surface truncate max-w-xs">
          {loading ? "..." : assignment?.class?.name ?? "Bài tập"}
        </span>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: assignment info + student list */}
        <div className="w-96 flex-shrink-0 border-r border-outline-variant/10 flex flex-col overflow-hidden">
          {/* Assignment info */}
          <div className="p-5 border-b border-outline-variant/10">
            {loading ? <Skeleton className="h-6 w-48 mb-2" /> : (
              <>
                <span className="text-xs font-bold px-2 py-0.5 bg-primary/10 text-primary rounded-full mb-2 inline-block">
                  BÀI TẬP {assignment?.submissions.findIndex(s => s.id === selected?.id) !== undefined
                    ? `${(assignment?.submissions.findIndex(s => s.id === selected?.id) ?? 0) + 1}`
                    : ""}
                </span>
                <p className="text-xs text-on-surface-variant mb-1">
                  Hạn nộp: {assignment?.deadline ? new Date(assignment.deadline).toLocaleDateString("vi-VN") : "Không có"}
                </p>
                <h2 className="text-lg font-extrabold text-on-surface mb-2 chinese-text">{assignment?.title}</h2>
                {assignment?.description && (
                  <p className="text-xs text-on-surface-variant leading-relaxed line-clamp-3">{assignment.description}</p>
                )}
              </>
            )}
          </div>

          {/* Student list */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-outline-variant/10">
            <p className="text-xs font-bold text-on-surface-variant uppercase">
              Danh sách học sinh ({assignment?.submissions.length ?? 0})
            </p>
            <button className="w-6 h-6 flex items-center justify-center rounded hover:bg-surface-container">
              <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 16 }}>filter_list</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? [1,2,3,4].map(i => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-outline-variant/10">
                <Skeleton className="w-9 h-9 rounded-full" />
                <div className="flex-1 space-y-1"><Skeleton className="h-3 w-24" /><Skeleton className="h-3 w-16" /></div>
              </div>
            )) : assignment?.submissions.map(s => (
              <button key={s.id} onClick={() => selectSub(s)}
                className={`w-full flex items-center gap-3 px-4 py-3 border-b border-outline-variant/10 text-left transition-colors
                  ${selected?.id === s.id ? "bg-primary/5 border-l-2 border-primary" : "hover:bg-surface-container"}`}>
                <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center flex-shrink-0 text-on-primary text-xs font-bold overflow-hidden">
                  {s.user.image
                    ? <img src={s.user.image} alt="" className="w-full h-full object-cover" />
                    : s.user.name.split(" ").pop()?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-on-surface truncate">{s.user.name}</p>
                  <p className="text-xs text-on-surface-variant">
                    {s.status === "SUBMITTED" ? `Nộp ${formatTimeAgo(s.submittedAt)}` :
                     s.grade ? `Đạt: ${s.grade.score}/10` :
                     "Chưa chấm"}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  {s.status === "GRADED" && s.grade?.passed && (
                    <span className="material-symbols-outlined text-secondary" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  )}
                  {s.status === "SUBMITTED" && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_CONFIG.SUBMITTED.cls}`}>
                      {STATUS_CONFIG.SUBMITTED.label}
                    </span>
                  )}
                  {s.status === "DRAFT" && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_CONFIG.DRAFT.cls}`}>
                      {STATUS_CONFIG.DRAFT.label}
                    </span>
                  )}
                  {s.status === "REASSIGNED" && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full text-error border border-error/30`}>
                      TRỄ {1} ngày
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right: submission content + grading */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <span className="material-symbols-outlined text-5xl text-on-surface-variant/20 block mb-3">grading</span>
                <p className="text-sm text-on-surface-variant">Chọn học sinh để xem bài làm</p>
              </div>
            </div>
          ) : (
            <>
              {/* Content area */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-3xl">
                  {/* Student header */}
                  <div className="flex items-center gap-2 mb-4">
                    <span className="material-symbols-outlined text-primary" style={{ fontSize: 16 }}>description</span>
                    <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                      Bài làm của {selected.user.name.split(" ").slice(-2).join(" ").toUpperCase()}
                    </span>
                  </div>

                  {selected.status === "DRAFT" ? (
                    <div className="text-center py-16 border-2 border-dashed border-outline-variant/20 rounded-2xl">
                      <span className="material-symbols-outlined text-4xl text-on-surface-variant/20 block mb-2">pending</span>
                      <p className="text-sm text-on-surface-variant">Học sinh chưa nộp bài</p>
                    </div>
                  ) : (
                    <>
                      {/* Text content */}
                      {selected.textContent && (
                        <div className="mb-6">
                          <h3 className="text-xl font-extrabold text-on-surface mb-3">{selected.textContent.slice(0, 40)}</h3>
                          <p className="text-sm text-on-surface leading-relaxed whitespace-pre-wrap">{selected.textContent}</p>
                        </div>
                      )}

                      {/* Media */}
                      {selected.mediaUrls.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                          {selected.mediaUrls.map((url, i) => (
                            isVideo(url) ? (
                              <VideoPlayer key={i} url={url} />
                            ) : (
                              <div key={i}>
                                <img src={url} alt="" className="w-full rounded-2xl border border-outline-variant/20 object-cover max-h-80" />
                                <p className="text-xs text-on-surface-variant mt-1 text-center">
                                  {url.split("/").pop()}
                                </p>
                              </div>
                            )
                          ))}
                        </div>
                      )}

                      {/* Previous grade result */}
                      {selected.grade && (
                        <div className="border-l-4 border-secondary bg-secondary/5 rounded-r-2xl p-4">
                          <p className="text-xs font-bold text-secondary uppercase mb-1">Kết quả đã chấm</p>
                          <p className="text-sm text-on-surface italic">"{selected.grade.comment}"</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Grading bar */}
              {(selected.status === "SUBMITTED" || !selected.grade) && selected.status !== "DRAFT" && (
                <div className="border-t border-outline-variant/10 bg-surface-container-lowest p-4">
                  <div className="max-w-3xl mx-auto">
                    {/* Comment */}
                    <div className="mb-3">
                      <textarea value={comment} onChange={e => setComment(e.target.value)}
                        rows={2} placeholder="Nhận xét cho học sinh (không bắt buộc)..."
                        className="w-full border border-outline-variant/20 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary resize-none bg-surface-container" />
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                      {/* Passed */}
                      <button onClick={() => grade(true)} disabled={grading}
                        className="flex items-center gap-2 bg-secondary text-white font-bold text-sm px-5 py-2.5 rounded-xl hover:brightness-110 disabled:opacity-50 transition-all">
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>check</span>
                        Đạt
                      </button>

                      {/* Not passed */}
                      <button onClick={() => grade(false)} disabled={grading}
                        className="flex items-center gap-2 border border-error/40 text-error font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-error/5 disabled:opacity-50 transition-all">
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
                        Không đạt
                      </button>

                      {/* Emoji reaction */}
                      <button className="flex items-center gap-1 border border-outline-variant/30 text-on-surface-variant text-sm px-4 py-2.5 rounded-xl hover:bg-surface-container transition-all">
                        <span style={{ fontSize: 16 }}>😊</span>
                        <span className="text-xs">Th</span>
                      </button>

                      {/* Reassign */}
                      <label className="flex items-center gap-2 cursor-pointer ml-auto">
                        <input type="checkbox" checked={reassign} onChange={e => setReassign(e.target.checked)}
                          className="w-4 h-4 rounded accent-primary" />
                        <span className="text-sm text-on-surface-variant">Yêu cầu nộp lại</span>
                      </label>

                      {/* Send */}
                      <button onClick={() => grade(selected.grade?.passed ?? true)} disabled={grading}
                        className="flex items-center gap-2 bg-primary text-on-primary font-bold text-sm px-5 py-2.5 rounded-xl hover:brightness-110 disabled:opacity-50 transition-all">
                        {grading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                        Gửi kết quả
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Already graded */}
              {selected.status === "GRADED" && selected.grade && (
                <div className="border-t border-outline-variant/10 bg-secondary/5 p-4">
                  <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-secondary" style={{ fontSize: 24, fontVariationSettings: "'FILL' 1" }}>task_alt</span>
                      <div>
                        <p className="text-sm font-bold text-on-surface">
                          {selected.grade.passed ? "Đạt ✓" : "Không đạt ✗"} {selected.grade.score ? `— ${selected.grade.score}/10` : ""}
                        </p>
                        <p className="text-xs text-on-surface-variant">Đã chấm bởi {selected.grade.teacher?.name}</p>
                      </div>
                    </div>
                    <button onClick={() => {
                      // Re-enable grading
                      setSelected({ ...selected, status: "SUBMITTED" });
                    }}
                      className="text-sm font-bold text-primary hover:underline">
                      Chấm lại
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
