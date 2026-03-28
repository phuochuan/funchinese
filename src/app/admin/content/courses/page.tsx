"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface CourseItem {
  id: string;
  title: string;
  description: string | null;
  hskLevel: string;
  isPublished: boolean;
  totalChapters: number;
  totalLessons: number;
  enrolledCount: number;
}

const HSK_COLORS: Record<string, { bg: string; text: string }> = {
  HSK1: { bg: "bg-green-100",  text: "text-green-700"  },
  HSK2: { bg: "bg-blue-100",   text: "text-blue-700"   },
  HSK3: { bg: "bg-violet-100", text: "text-violet-700" },
  HSK4: { bg: "bg-amber-100",  text: "text-amber-700"  },
  HSK5: { bg: "bg-orange-100", text: "text-orange-700" },
  HSK6: { bg: "bg-red-100",    text: "text-red-700"    },
};

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-surface-container rounded-xl ${className}`} />;
}

export default function AdminCoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch("/api/admin/courses")
      .then(r => r.json())
      .then(d => setCourses(d.courses ?? []))
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    setCreating(true);
    const res = await fetch("/api/admin/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Khoá học mới", hskLevel: "HSK1" }),
    });
    const data = await res.json();
    setCreating(false);
    if (!res.ok) {
      alert(data.error ?? "Không thể tạo khoá học");
      return;
    }
    router.push(`/admin/content/courses/${data.course.id}/edit`);
  };

  const handleTogglePublish = async (id: string, current: boolean) => {
    await fetch(`/api/admin/courses/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublished: !current }),
    });
    setCourses(prev => prev.map(c => c.id === id ? { ...c, isPublished: !current } : c));
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Xoá khoá học này? Toàn bộ chương và bài học cũng sẽ bị xoá.")) return;
    await fetch(`/api/admin/courses/${id}`, { method: "DELETE" });
    setCourses(prev => prev.filter(c => c.id !== id));
  };

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-on-surface">Quản lý Khoá học</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            {courses.length} khoá học · {courses.filter(c => c.isPublished).length} đang công khai
          </p>
        </div>
        <button onClick={handleCreate} disabled={creating}
          className="flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 hover:brightness-110 transition-all">
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
          {creating ? "Đang tạo..." : "Tạo khoá học mới"}
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Tổng khoá học",    value: courses.length,                           icon: "menu_book",  color: "text-primary"   },
          { label: "Đang công khai",   value: courses.filter(c => c.isPublished).length, icon: "public",     color: "text-secondary" },
          { label: "Tổng bài học",     value: courses.reduce((a, c) => a + c.totalLessons, 0), icon: "description", color: "text-tertiary" },
          { label: "Học viên đang học",value: courses.reduce((a, c) => a + c.enrolledCount, 0), icon: "group",       color: "text-on-surface"},
        ].map(s => (
          <div key={s.label} className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 p-4">
            <span className={`material-symbols-outlined ${s.color} mb-2 block`} style={{ fontSize: 20 }}>{s.icon}</span>
            <p className="text-xs text-on-surface-variant mb-1">{s.label}</p>
            <p className="text-xl font-extrabold text-on-surface">{loading ? "—" : s.value}</p>
          </div>
        ))}
      </div>

      {/* Courses list */}
      <div className="space-y-4">
        {loading && [1,2,3].map(i => <Skeleton key={i} className="h-32 w-full" />)}

        {!loading && courses.length === 0 && (
          <div className="text-center py-16 bg-surface-container-lowest rounded-2xl border border-outline-variant/10">
            <span className="material-symbols-outlined text-5xl text-on-surface-variant/30 block mb-3">menu_book</span>
            <p className="font-bold text-on-surface mb-1">Chưa có khoá học nào</p>
            <p className="text-sm text-on-surface-variant mb-4">Tạo khoá học đầu tiên để bắt đầu</p>
            <button onClick={handleCreate}
              className="px-5 py-2.5 bg-primary text-on-primary rounded-xl text-sm font-bold hover:brightness-110 transition-all">
              + Tạo khoá học
            </button>
          </div>
        )}

        {!loading && courses.map(course => {
          const color = HSK_COLORS[course.hskLevel] ?? HSK_COLORS.HSK1;
          return (
            <div key={course.id}
              className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-5 hover:shadow-sm transition-all">
              <div className="flex items-start gap-4">
                {/* HSK badge */}
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color.bg}`}>
                  <span className={`text-sm font-extrabold ${color.text}`}>
                    {course.hskLevel.replace("HSK", "")}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h2 className="font-bold text-on-surface">{course.title}</h2>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold
                      ${course.isPublished
                        ? "bg-secondary/10 text-secondary"
                        : "bg-surface-container text-on-surface-variant"}`}>
                      {course.isPublished ? "Công khai" : "Bản nháp"}
                    </span>
                  </div>
                  {course.description && (
                    <p className="text-sm text-on-surface-variant line-clamp-1 mb-2">{course.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-on-surface-variant">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>layers</span>
                      {course.totalChapters} chương
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>description</span>
                      {course.totalLessons} bài học
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>group</span>
                      {course.enrolledCount} học viên
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleTogglePublish(course.id, course.isPublished)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all
                      ${course.isPublished
                        ? "border-outline-variant/40 text-on-surface hover:bg-surface-container"
                        : "bg-secondary/10 text-secondary border-secondary/20 hover:bg-secondary/20"}`}>
                    {course.isPublished ? "Ẩn" : "Công khai"}
                  </button>
                  <Link href={`/admin/content/courses/${course.id}/edit`}
                    className="px-3 py-1.5 bg-primary text-on-primary rounded-lg text-xs font-bold hover:brightness-110 transition-all">
                    Chỉnh sửa
                  </Link>
                  <button onClick={() => handleDelete(course.id)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-error/10 transition-colors">
                    <span className="material-symbols-outlined text-error" style={{ fontSize: 16 }}>delete</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
