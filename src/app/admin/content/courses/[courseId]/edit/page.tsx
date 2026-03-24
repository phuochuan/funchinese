"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface LessonItem {
  id: string;
  title: string;
  titleChinese: string | null;
  durationMins: number;
  sortOrder: number;
  isPublished: boolean;
}

interface ChapterItem {
  id: string;
  title: string;
  sortOrder: number;
  lessons: LessonItem[];
}

interface CourseData {
  id: string;
  title: string;
  description: string | null;
  hskLevel: string;
  thumbnail: string | null;
  isPublished: boolean;
  chapters: ChapterItem[];
}

const HSK_OPTIONS = [
  { value: "HSK1", label: "HSK 1 – Sơ cấp" },
  { value: "HSK2", label: "HSK 2 – Sơ cấp" },
  { value: "HSK3", label: "HSK 3 – Trung cấp" },
  { value: "HSK4", label: "HSK 4 – Trung cấp" },
  { value: "HSK5", label: "HSK 5 – Cao cấp" },
  { value: "HSK6", label: "HSK 6 – Điêu luyện" },
];

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-surface-container rounded-xl ${className}`} />;
}

export default function CourseEditPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = use(params);
  const router = useRouter();

  const [course, setCourse]     = useState<CourseData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");

  // Form state
  const [title, setTitle]             = useState("");
  const [description, setDescription] = useState("");
  const [hskLevel, setHskLevel]       = useState("HSK1");
  const [isPublished, setIsPublished] = useState(false);
  const [chapters, setChapters]       = useState<ChapterItem[]>([]);
  const [openChapters, setOpenChapters] = useState<Set<string>>(new Set());

  // New chapter/lesson inputs
  const [newChapterTitle, setNewChapterTitle] = useState("");
  const [addingChapter, setAddingChapter]     = useState(false);
  const [newLessonTitles, setNewLessonTitles] = useState<Record<string, string>>({});
  const [addingLesson, setAddingLesson]       = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/courses/${courseId}`)
      .then(r => r.json())
      .then(d => {
        const c = d.course;
        setCourse(c);
        setTitle(c.title);
        setDescription(c.description ?? "");
        setHskLevel(c.hskLevel);
        setIsPublished(c.isPublished);
        setChapters(c.chapters);
        // Mở chapter đầu tiên mặc định
        if (c.chapters.length > 0) {
          setOpenChapters(new Set([c.chapters[0].id]));
        }
      })
      .catch(() => setError("Không thể tải khoá học"))
      .finally(() => setLoading(false));
  }, [courseId]);

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch(`/api/admin/courses/${courseId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, hskLevel, isPublished }),
    });
    setSaving(false);
    if (res.ok) {
      router.push("/admin/content/courses");
    } else {
      setError("Lỗi khi lưu");
    }
  };

  const handleAddChapter = async () => {
    if (!newChapterTitle.trim()) return;
    setAddingChapter(true);
    const res = await fetch(`/api/admin/courses/${courseId}/chapters`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newChapterTitle }),
    });
    const data = await res.json();
    setChapters(prev => [...prev, { ...data.chapter, lessons: [] }]);
    setOpenChapters(prev => new Set([...prev, data.chapter.id]));
    setNewChapterTitle("");
    setAddingChapter(false);
  };

  const handleDeleteChapter = async (chapterId: string) => {
    if (!confirm("Xoá chương này? Tất cả bài học trong chương cũng sẽ bị xoá.")) return;
    await fetch(`/api/admin/chapters/${chapterId}`, { method: "DELETE" });
    setChapters(prev => prev.filter(c => c.id !== chapterId));
  };

  const handleAddLesson = async (chapterId: string) => {
    const title = newLessonTitles[chapterId]?.trim();
    if (!title) return;
    setAddingLesson(chapterId);
    const res = await fetch(`/api/admin/chapters/${chapterId}/lessons`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    const data = await res.json();
    setChapters(prev => prev.map(ch =>
      ch.id === chapterId
        ? { ...ch, lessons: [...ch.lessons, data.lesson] }
        : ch
    ));
    setNewLessonTitles(prev => ({ ...prev, [chapterId]: "" }));
    setAddingLesson(null);
  };

  const handleDeleteLesson = async (chapterId: string, lessonId: string) => {
    if (!confirm("Xoá bài học này?")) return;
    await fetch(`/api/admin/lessons/${lessonId}`, { method: "DELETE" });
    setChapters(prev => prev.map(ch =>
      ch.id === chapterId
        ? { ...ch, lessons: ch.lessons.filter(l => l.id !== lessonId) }
        : ch
    ));
  };

  const toggleChapter = (id: string) => {
    setOpenChapters(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const totalLessons = chapters.reduce((a, ch) => a + ch.lessons.length, 0);
  const totalMins    = chapters.reduce(
    (a, ch) => a + ch.lessons.reduce((b, l) => b + l.durationMins, 0), 0
  );

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Breadcrumb + actions */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <nav className="text-xs text-on-surface-variant mb-1 flex items-center gap-1">
            <Link href="/admin/classes" className="hover:text-primary">Lớp học</Link>
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>chevron_right</span>
            <span className="text-primary font-semibold">Chỉnh sửa khóa học</span>
          </nav>
          <h1 className="text-2xl font-extrabold text-on-surface">Thiết lập Khóa học</h1>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/content/courses"
            className="px-5 py-2.5 border border-outline-variant/40 rounded-xl text-sm font-bold text-on-surface hover:bg-surface-container transition-all">
            Hủy bỏ
          </Link>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2.5 bg-primary text-on-primary rounded-xl text-sm font-bold disabled:opacity-50 hover:brightness-110 transition-all">
            {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-error/10 text-error text-sm rounded-xl">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: main form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Thông tin cơ bản */}
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
                <span className="material-symbols-outlined text-primary" style={{ fontSize: 20 }}>edit_note</span>
              </div>
              <h2 className="font-bold text-on-surface">Thông tin cơ bản</h2>
            </div>

            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <div className="grid grid-cols-2 gap-4">
                  <Skeleton className="h-12" />
                  <Skeleton className="h-12" />
                </div>
                <Skeleton className="h-28 w-full" />
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5 block">
                    Tên khoá học
                  </label>
                  <input value={title} onChange={e => setTitle(e.target.value)}
                    className="w-full border border-outline-variant/30 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary transition-colors"
                    placeholder="VD: HSK 1 – Nhập môn" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5 block">
                      Cấp độ HSK
                    </label>
                    <select value={hskLevel} onChange={e => setHskLevel(e.target.value)}
                      className="w-full border border-outline-variant/30 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary">
                      {HSK_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5 block">
                      Trạng thái khoá
                    </label>
                    <button onClick={() => setIsPublished(!isPublished)}
                      className="w-full border border-outline-variant/30 rounded-xl px-4 py-3 text-sm flex items-center justify-between">
                      <span>{isPublished ? "Công khai (Public)" : "Ẩn (Draft)"}</span>
                      <div className={`w-11 h-6 rounded-full relative transition-colors ${isPublished ? "bg-secondary" : "bg-surface-container-high"}`}>
                        <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${isPublished ? "right-0.5" : "left-0.5"}`} />
                      </div>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5 block">
                    Mô tả khoá học
                  </label>
                  <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4}
                    className="w-full border border-outline-variant/30 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary resize-none transition-colors"
                    placeholder="Mô tả ngắn về nội dung và mục tiêu của khoá học..." />
                </div>
              </div>
            )}
          </div>

          {/* Quản lý chương mục */}
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center">
                  <span className="material-symbols-outlined text-orange-600" style={{ fontSize: 20 }}>list</span>
                </div>
                <h2 className="font-bold text-on-surface">Quản lý chương mục</h2>
              </div>
              <button
                onClick={() => document.getElementById("new-chapter-input")?.focus()}
                className="flex items-center gap-1.5 text-sm font-bold text-primary hover:underline">
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add_circle</span>
                Thêm chương mới
              </button>
            </div>

            <div className="space-y-3">
              {loading && [1,2].map(i => <Skeleton key={i} className="h-16 w-full" />)}

              {!loading && chapters.map((chapter, idx) => (
                <div key={chapter.id} className="border border-outline-variant/20 rounded-xl overflow-hidden">
                  {/* Chapter header */}
                  <div className="flex items-center gap-3 p-4 bg-surface-container">
                    <span className="material-symbols-outlined text-on-surface-variant cursor-grab" style={{ fontSize: 20 }}>drag_indicator</span>
                    <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-extrabold text-on-surface-variant">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-on-surface text-sm">{chapter.title}</p>
                      <p className="text-xs text-on-surface-variant">
                        {chapter.lessons.length} bài học
                        {chapter.lessons.length > 0 && ` · ${chapter.lessons.reduce((a, l) => a + l.durationMins, 0)} phút`}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button className="w-8 h-8 rounded-lg hover:bg-surface-container-high flex items-center justify-center transition-colors">
                        <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 16 }}>edit</span>
                      </button>
                      <button onClick={() => toggleChapter(chapter.id)}
                        className="w-8 h-8 rounded-lg hover:bg-surface-container-high flex items-center justify-center transition-colors">
                        <span className="material-symbols-outlined text-on-surface-variant transition-transform"
                          style={{ fontSize: 16, transform: openChapters.has(chapter.id) ? "rotate(180deg)" : "rotate(0deg)" }}>
                          expand_more
                        </span>
                      </button>
                      <button onClick={() => handleDeleteChapter(chapter.id)}
                        className="w-8 h-8 rounded-lg hover:bg-error/10 flex items-center justify-center transition-colors">
                        <span className="material-symbols-outlined text-error" style={{ fontSize: 16 }}>delete</span>
                      </button>
                    </div>
                  </div>

                  {/* Lessons */}
                  {openChapters.has(chapter.id) && (
                    <div className="divide-y divide-outline-variant/10">
                      {chapter.lessons.map(lesson => (
                        <div key={lesson.id} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-container/50 transition-colors">
                          <span className="material-symbols-outlined text-on-surface-variant cursor-grab" style={{ fontSize: 18 }}>drag_indicator</span>
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ background: lesson.isPublished ? "#E1F5EE" : "#F1EFE8" }}>
                            <span className="material-symbols-outlined" style={{
                              fontSize: 14,
                              color: lesson.isPublished ? "#085041" : "#5F5E5A",
                              fontVariationSettings: "'FILL' 1",
                            }}>
                              {lesson.isPublished ? "description" : "description"}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-on-surface truncate">{lesson.title}</p>
                            {lesson.titleChinese && (
                              <p className="text-xs text-on-surface-variant chinese-text">{lesson.titleChinese}</p>
                            )}
                          </div>
                          <span className="text-xs text-on-surface-variant">{lesson.durationMins} phút</span>
                          <div className="flex gap-1">
                            <Link href={`/admin/content/courses/${courseId}/lessons/${lesson.id}/edit`}
                              className="w-7 h-7 rounded-lg hover:bg-surface-container flex items-center justify-center transition-colors">
                              <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 14 }}>visibility</span>
                            </Link>
                            <button onClick={() => handleDeleteLesson(chapter.id, lesson.id)}
                              className="w-7 h-7 rounded-lg hover:bg-error/10 flex items-center justify-center transition-colors">
                              <span className="material-symbols-outlined text-error" style={{ fontSize: 14 }}>close</span>
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Add lesson input */}
                      <div className="px-4 py-3 flex gap-2">
                        <input
                          value={newLessonTitles[chapter.id] ?? ""}
                          onChange={e => setNewLessonTitles(prev => ({ ...prev, [chapter.id]: e.target.value }))}
                          onKeyDown={e => e.key === "Enter" && handleAddLesson(chapter.id)}
                          placeholder="Tên bài học mới..."
                          className="flex-1 text-sm border border-outline-variant/30 rounded-lg px-3 py-2 outline-none focus:border-primary" />
                        <button
                          onClick={() => handleAddLesson(chapter.id)}
                          disabled={addingLesson === chapter.id}
                          className="px-3 py-2 bg-primary/10 text-primary text-xs font-bold rounded-lg hover:bg-primary/20 transition-colors disabled:opacity-50">
                          {addingLesson === chapter.id ? "..." : "+ THÊM BÀI HỌC"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Add chapter */}
              <div className="flex gap-2 pt-2">
                <input id="new-chapter-input"
                  value={newChapterTitle}
                  onChange={e => setNewChapterTitle(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleAddChapter()}
                  placeholder="Tên chương mới..."
                  className="flex-1 text-sm border border-dashed border-outline-variant/40 rounded-xl px-4 py-2.5 outline-none focus:border-primary" />
                <button onClick={handleAddChapter} disabled={addingChapter || !newChapterTitle.trim()}
                  className="px-4 py-2.5 bg-primary text-on-primary text-xs font-bold rounded-xl disabled:opacity-40 hover:brightness-110 transition-all">
                  {addingChapter ? "..." : "Thêm chương"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: sidebar */}
        <div className="space-y-4">
          {/* Thumbnail */}
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-green-100 rounded-xl flex items-center justify-center">
                <span className="material-symbols-outlined text-green-600" style={{ fontSize: 18 }}>image</span>
              </div>
              <h3 className="font-bold text-on-surface text-sm">Ảnh đại diện khóa học</h3>
            </div>
            <div className="aspect-video bg-surface-container rounded-xl overflow-hidden mb-3">
              {course?.thumbnail
                ? <img src={course.thumbnail} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-on-surface-variant/30" style={{ fontSize: 48 }}>image</span>
                  </div>
              }
            </div>
            <p className="text-xs text-on-surface-variant mb-3">
              Khuyến nghị: Tỷ lệ 16:9, kích thước tối thiểu 1280×720px. JPG, PNG hoặc WebP.
            </p>
            <button className="w-full flex items-center justify-center gap-2 border border-outline-variant/30 rounded-xl py-2.5 text-sm font-bold text-on-surface hover:bg-surface-container transition-all">
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>upload</span>
              Tải ảnh lên
            </button>
          </div>

          {/* Preview */}
          <div className="bg-primary rounded-2xl p-5 text-on-primary">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
                <span className="material-symbols-outlined text-white" style={{ fontSize: 18 }}>visibility</span>
              </div>
              <h3 className="font-bold text-sm">Xem trước hiển thị</h3>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <span className="chinese-text text-white font-bold text-sm">
                    {hskLevel.replace("HSK", "")}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="h-3 bg-white/30 rounded w-3/4 mb-1" />
                  <div className="h-2 bg-white/20 rounded w-1/2" />
                </div>
              </div>
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{hskLevel}</span>
            </div>
            <button className="w-full mt-3 py-2.5 bg-white text-primary font-bold text-sm rounded-xl hover:bg-primary-fixed transition-all">
              XEM TRANG ĐĂNG KÝ
            </button>
          </div>

          {/* Stats */}
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-5">
            <h3 className="font-bold text-on-surface text-sm mb-3">Phân loại nâng cao</h3>
            <div className="flex flex-wrap gap-2">
              {["#VănHóa", "#GiaoTiếp", "#HànNgữ"].map(tag => (
                <span key={tag} className="text-xs px-3 py-1.5 bg-primary/10 text-primary rounded-full font-semibold flex items-center gap-1">
                  {tag}
                  <span className="material-symbols-outlined" style={{ fontSize: 12 }}>close</span>
                </span>
              ))}
              <button className="text-xs px-3 py-1.5 border border-dashed border-outline-variant/40 text-on-surface-variant rounded-full hover:bg-surface-container transition-colors">
                + Gắn thẻ mới
              </button>
            </div>
          </div>

          {/* Course stats */}
          {!loading && (
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-5 space-y-3">
              <h3 className="font-bold text-on-surface text-sm">Thống kê</h3>
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">Số chương</span>
                <span className="font-bold">{chapters.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">Số bài học</span>
                <span className="font-bold">{totalLessons}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">Tổng thời lượng</span>
                <span className="font-bold">
                  {Math.floor(totalMins / 60)}h {totalMins % 60}p
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
