"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface AssignmentItem {
  id: string; title: string; assignType: string;
  className: string | null; assignees: { id: string; name: string }[];
  deadline: string | null; deadlineStatus: string; diffHrs: number | null;
  submitted: number; totalAssignees: number; pct: number; hasPending: boolean;
}
interface Stats { pendingCount: number; gradedCount: number; total: number; }

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-surface-container rounded-xl ${className}`} />;
}

function DeadlineBadge({ status, diffHrs }: { status: string; diffHrs: number | null }) {
  if (status === "overdue") return <span className="text-xs font-bold text-error">ĐÃ QUÁ HẠN</span>;
  if (status === "urgent")  return <span className="text-xs font-bold text-error">HẾT HẠN SAU {diffHrs}H</span>;
  if (status === "soon")    return <span className="text-xs text-amber-600 font-bold">CÒN {Math.ceil((diffHrs??0)/24)} NGÀY</span>;
  return null;
}

export default function AdminAssignmentsPage() {
  const [items,   setItems]   = useState<AssignmentItem[]>([]);
  const [stats,   setStats]   = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState("pending");
  const [search,  setSearch]  = useState("");
  const [searchQ, setSearchQ] = useState("");

  const fetch_ = async (f = filter, q = searchQ) => {
    setLoading(true);
    const res  = await fetch(`/api/admin/assignments?filter=${f}&q=${encodeURIComponent(q)}`);
    const data = await res.json();
    setItems(data.assignments ?? []);
    setStats(data.stats ?? null);
    setLoading(false);
  };

  useEffect(() => { fetch_(); }, []);
  useEffect(() => { const t = setTimeout(() => { setSearchQ(search); fetch_(filter, search); }, 350); return () => clearTimeout(t); }, [search]);

  const handleFilter = (f: string) => { setFilter(f); fetch_(f, searchQ); };

  const formatDeadline = (dl: string | null) => {
    if (!dl) return "—";
    const d = new Date(dl);
    return `Ngày ${d.getDate()} Th${d.getMonth()+1}`;
  };

  return (
    <div className="p-4 md:p-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Chưa chấm",   value: stats?.pendingCount ?? "—", sub: "⚠ Cần hoàn thành sớm", subCls: "text-error",    icon: "assignment_late", iconBg: "bg-error/10",     iconCls: "text-error"     },
          { label: "Đã chấm",     value: stats?.gradedCount  ?? "—", sub: "+5 bài hôm nay",        subCls: "text-secondary", icon: "task_alt",        iconBg: "bg-secondary/10", iconCls: "text-secondary" },
          { label: "Tổng bài tập",value: stats?.total        ?? "—", sub: "Học kỳ 1 • 2024",       subCls: "text-on-surface-variant", icon: "bookmark", iconBg: "bg-primary/10", iconCls: "text-primary"  },
        ].map(s => (
          <div key={s.label} className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-5 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${s.iconBg}`}>
              <span className={`material-symbols-outlined ${s.iconCls}`} style={{ fontSize: 22, fontVariationSettings: "'FILL' 1" }}>{s.icon}</span>
            </div>
            <div>
              <p className="text-xs text-on-surface-variant mb-0.5">{s.label}</p>
              {loading ? <Skeleton className="h-8 w-12" /> : (
                <>
                  <p className="text-3xl font-extrabold text-on-surface">{s.value}</p>
                  <p className={`text-xs ${s.subCls}`}>{s.sub}</p>
                </>
              )}
            </div>
          </div>
        ))}

        <Link href="/admin/assignments/new"
          className="flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-xl text-sm font-bold hover:brightness-110 transition-all shadow-md">
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
          Tạo bài mới
        </Link>
      </div>

      {/* Filter + Search */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
        <div className="flex bg-surface-container rounded-xl p-1 gap-1">
          {[
            { key: "pending", label: "Chưa chấm xong" },
            { key: "all",     label: "Tất cả bài tập"  },
            { key: "closed",  label: "Đã đóng"         },
          ].map(f => (
            <button key={f.key} onClick={() => handleFilter(f.key)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all
                ${filter === f.key ? "bg-surface-container-lowest shadow text-on-surface" : "text-on-surface-variant hover:text-on-surface"}`}>
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <div className="flex items-center gap-2 border border-outline-variant/30 rounded-xl px-3 py-2 bg-surface-container-lowest focus-within:border-primary transition-colors">
            <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 18 }}>search</span>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Tìm kiếm bài tập..."
              className="text-sm outline-none bg-transparent w-36 text-on-surface" />
          </div>
          <select className="border border-outline-variant/30 rounded-xl px-3 py-2 text-sm bg-surface-container-lowest outline-none text-on-surface">
            <option>Hạn chót gần nhất</option>
            <option>Mới nhất</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 overflow-hidden mb-6">
        <table className="w-full">
          <thead>
            <tr className="border-b border-outline-variant/10 bg-surface-container">
              {["Tên bài tập","Lớp / Học viên","Hạn chót","Tiến độ nộp","Thao tác"].map(h => (
                <th key={h} className="px-5 py-3 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && [1,2,3].map(i => (
              <tr key={i} className="border-b border-outline-variant/10">
                {[1,2,3,4,5].map(j => <td key={j} className="px-5 py-4"><Skeleton className="h-5 w-full" /></td>)}
              </tr>
            ))}
            {!loading && items.length === 0 && (
              <tr><td colSpan={5} className="text-center py-14 text-sm text-on-surface-variant">Không có bài tập nào</td></tr>
            )}
            {!loading && items.map(a => (
              <tr key={a.id} className="border-b border-outline-variant/10 hover:bg-surface-container/40 transition-colors">
                <td className="px-5 py-4">
                  <div className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 bg-primary" />
                    <div>
                      <Link href={`/admin/assignments/${a.id}/grade`}
                        className="chinese-text font-bold text-on-surface hover:text-primary transition-colors text-sm">
                        {a.title}
                      </Link>
                      <p className="text-xs text-on-surface-variant mt-0.5">Kỹ năng</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${a.hasPending ? "bg-primary" : "bg-secondary"}`} />
                    <span className="text-sm text-on-surface">
                      {a.assignType === "CLASS"
                        ? (a.className ?? "—")
                        : `Kèm 1-1: ${a.assignees[0]?.name ?? "—"}`}
                    </span>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <p className="text-sm text-on-surface">{formatDeadline(a.deadline)}</p>
                  <DeadlineBadge status={a.deadlineStatus} diffHrs={a.diffHrs} />
                </td>
                <td className="px-5 py-4 w-40">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-surface-container rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${a.pct >= 80 ? "bg-secondary" : a.pct >= 40 ? "bg-primary" : "bg-amber-500"}`}
                        style={{ width: `${a.pct}%` }} />
                    </div>
                    <span className="text-xs font-bold text-on-surface whitespace-nowrap">
                      {a.submitted}/{a.totalAssignees} {a.pct}%
                    </span>
                  </div>
                </td>
                <td className="px-5 py-4">
                  {a.hasPending ? (
                    <Link href={`/admin/assignments/${a.id}/grade`}
                      className="inline-flex items-center gap-1 bg-primary text-on-primary text-xs font-bold px-3 py-2 rounded-xl hover:brightness-110 transition-all">
                      Chấm ngay
                    </Link>
                  ) : a.deadlineStatus === "overdue" ? (
                    <button className="inline-flex items-center gap-1 border border-outline-variant/40 text-on-surface-variant text-xs font-bold px-3 py-2 rounded-xl hover:bg-surface-container transition-all">
                      Nhắc nhở
                    </button>
                  ) : (
                    <Link href={`/admin/assignments/${a.id}/grade`}
                      className="inline-flex items-center gap-1 border border-outline-variant/40 text-on-surface text-xs font-bold px-3 py-2 rounded-xl hover:bg-surface-container transition-all">
                      Xem chi tiết
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!loading && items.length > 0 && (
          <div className="px-5 py-3 border-t border-outline-variant/10 text-xs text-on-surface-variant">
            Hiển thị {items.length} bài tập cần chấm
          </div>
        )}
      </div>
    </div>
  );
}
