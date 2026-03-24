"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

interface ClassItem { id: string; name: string; scheduleNote: string | null; members: { userId: string }[]; }

function ImageUploadZone({ images, onChange }: { images: string[]; onChange: (urls: string[]) => void }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFiles = async (files: FileList) => {
    setUploading(true);
    const uploaded: string[] = [];
    for (const file of Array.from(files)) {
      const fd = new FormData(); fd.append("file", file); fd.append("type", "image");
      const res  = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.url) uploaded.push(data.url);
    }
    onChange([...images, ...uploaded]);
    setUploading(false);
  };

  return (
    <div>
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all
          ${dragging ? "border-primary bg-primary/5" : "border-outline-variant/30 hover:border-primary/40 hover:bg-surface-container"}`}>
        {uploading ? (
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mb-3">
              <span className="material-symbols-outlined text-primary" style={{ fontSize: 28 }}>cloud_upload</span>
            </div>
            <p className="font-semibold text-on-surface mb-1">Tải ảnh hoặc tài liệu lên</p>
            <p className="text-sm text-on-surface-variant">Kéo thả tệp tin vào đây hoặc <span className="text-primary font-bold">duyệt thư mục</span></p>
            <p className="text-xs text-on-surface-variant mt-1">Tối đa 20MB (JPG, PNG, PDF)</p>
          </>
        )}
      </div>
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {images.map((url, i) => (
            <div key={i} className="relative group">
              <img src={url} alt="" className="w-20 h-20 object-cover rounded-xl border border-outline-variant/20" />
              <button onClick={() => onChange(images.filter((_, j) => j !== i))}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-error rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="material-symbols-outlined text-white" style={{ fontSize: 12 }}>close</span>
              </button>
            </div>
          ))}
        </div>
      )}
      <input ref={inputRef} type="file" multiple accept="image/*,.pdf" className="hidden"
        onChange={e => e.target.files && handleFiles(e.target.files)} />
    </div>
  );
}

export default function AdminAssignmentCreatePage() {
  const router = useRouter();
  const [classes, setClasses] = useState<ClassItem[]>([]);

  // Form state
  const [title,       setTitle]       = useState("");
  const [description, setDescription] = useState("");
  const [imageUrls,   setImageUrls]   = useState<string[]>([]);
  const [deadline,    setDeadline]    = useState("");
  const [deadlineTime,setDeadlineTime]= useState("23:59");
  const [maxAttempts, setMaxAttempts] = useState<number | "">("");
  const [allowLate,   setAllowLate]   = useState(true);
  const [xpReward,    setXpReward]    = useState(50);
  const [assignType,  setAssignType]  = useState<"CLASS" | "INDIVIDUAL">("CLASS");
  const [selectedClass, setSelectedClass] = useState("");
  const [saving,      setSaving]      = useState(false);
  const [saveMode,    setSaveMode]    = useState<"draft" | "publish">("publish");

  useEffect(() => {
    fetch("/api/admin/classes").then(r => r.json()).then(d => setClasses(d.classes ?? []));
  }, []);

  const selectedCls = classes.find(c => c.id === selectedClass);

  const submit = async (mode: "draft" | "publish") => {
    if (!title.trim()) { alert("Nhập tiêu đề bài tập"); return; }
    setSaving(true);

    const deadlineISO = deadline
      ? new Date(`${deadline}T${deadlineTime}`).toISOString()
      : null;

    const res = await fetch("/api/admin/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title, description, imageUrls,
        deadline: deadlineISO,
        maxAttempts: maxAttempts === "" ? null : maxAttempts,
        allowLate, xpReward,
        assignType,
        classId: selectedClass || null,  // ← dùng selectedClass, đặt key là classId
      }),
    });

    setSaving(false);
    if (res.ok) router.push("/admin/assignments");
  };

  return (
    <div className="min-h-screen">
      {/* Topbar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-outline-variant/10 bg-surface-container-lowest sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container transition-colors">
            <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 20 }}>arrow_back</span>
          </button>
          <span className="text-sm text-on-surface-variant font-semibold">Assignment Management</span>
        </div>
        <div className="flex gap-2 items-center">
          <div className="flex items-center gap-2 border border-outline-variant/30 rounded-xl px-3 py-2 focus-within:border-primary hidden md:flex">
            <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 16 }}>search</span>
            <input placeholder="Tìm kiếm bài tập..." className="text-sm outline-none bg-transparent w-36" />
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <p className="text-xs font-bold text-primary uppercase tracking-wider mb-2">Quản lý học tập</p>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-extrabold text-on-surface">Tạo bài tập mới</h1>
          <div className="flex gap-3">
            <button onClick={() => submit("draft")} disabled={saving}
              className="px-5 py-2.5 border border-outline-variant/40 rounded-xl text-sm font-bold text-on-surface hover:bg-surface-container transition-all disabled:opacity-50">
              Lưu nháp
            </button>
            <button onClick={() => submit("publish")} disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary rounded-xl text-sm font-bold hover:brightness-110 transition-all disabled:opacity-50 shadow-md">
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
              Giao bài
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left — content */}
          <div className="lg:col-span-2 space-y-5">
            {/* Title */}
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 overflow-hidden">
              <div className="px-1">
                <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider px-5 pt-4 pb-2">Tiêu đề bài tập</p>
                <input value={title} onChange={e => setTitle(e.target.value)}
                  placeholder="Ví dụ: Phân tích cấu trúc bộ Thủ trong Chữ Hán"
                  className="w-full text-xl font-bold text-on-surface outline-none px-5 pb-4 bg-transparent placeholder:text-on-surface-variant/30" />
              </div>
            </div>

            {/* Description */}
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-outline-variant/10">
                <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Nội dung yêu cầu</p>
                <div className="flex gap-2">
                  {["format_bold","format_italic","format_list_bulleted"].map(icon => (
                    <button key={icon} className="w-7 h-7 flex items-center justify-center rounded hover:bg-surface-container transition-colors">
                      <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 16 }}>{icon}</span>
                    </button>
                  ))}
                  <span className="text-on-surface-variant">大a</span>
                </div>
              </div>
              <textarea value={description} onChange={e => setDescription(e.target.value)}
                rows={8} placeholder="Nhập nội dung yêu cầu bài tập..."
                className="w-full px-5 py-4 text-sm text-on-surface outline-none resize-none bg-transparent" />
            </div>

            {/* Attachments */}
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-5">
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-4">Tài liệu đính kèm</p>
              <ImageUploadZone images={imageUrls} onChange={setImageUrls} />
            </div>
          </div>

          {/* Right — settings */}
          <div className="space-y-4">
            {/* Deadline */}
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-5">
              <h3 className="font-bold text-on-surface flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-primary" style={{ fontSize: 18 }}>calendar_month</span>
                Thời hạn nộp bài
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-on-surface-variant uppercase mb-1 block">Ngày hết hạn</label>
                  <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)}
                    className="w-full border border-outline-variant/30 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="text-xs font-bold text-on-surface-variant uppercase mb-1 block">Giờ</label>
                  <input type="time" value={deadlineTime} onChange={e => setDeadlineTime(e.target.value)}
                    className="w-full border border-outline-variant/30 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary" />
                </div>
              </div>
            </div>

            {/* Assign target */}
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-5">
              <h3 className="font-bold text-on-surface flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-primary" style={{ fontSize: 18 }}>group_add</span>
                Đối tượng
              </h3>
              {/* Class selector */}
              <div className="space-y-2 mb-3">
                {classes.slice(0, 3).map(cls => (
                  <button key={cls.id} onClick={() => { setAssignType("CLASS"); setSelectedClass(cls.id); }}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left
                      ${selectedClass === cls.id && assignType === "CLASS"
                        ? "border-primary bg-primary/5"
                        : "border-outline-variant/20 hover:border-primary/30"}`}>
                    <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-extrabold text-on-primary">{cls.name.slice(0,2).toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-on-surface truncate">{cls.name}</p>
                      <p className="text-xs text-on-surface-variant">{cls.scheduleNote ?? "—"}</p>
                    </div>
                    {selectedClass === cls.id && assignType === "CLASS" && (
                      <span className="material-symbols-outlined text-primary flex-shrink-0" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    )}
                  </button>
                ))}

                {/* All students option */}
                {selectedClass && (
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-outline-variant/20 bg-surface-container">
                    <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-extrabold text-white">ALL</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-on-surface">Tất cả học viên</p>
                      <p className="text-xs text-on-surface-variant">
                        {selectedCls?.studentCount ?? 0} Học sinh
                      </p>
                    </div>
                    <span className="material-symbols-outlined text-secondary" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  </div>
                )}
              </div>
            </div>

            {/* Options */}
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-5">
              <h3 className="font-bold text-on-surface flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-primary" style={{ fontSize: 18 }}>tune</span>
                Tùy chọn khác
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-on-surface">Số lần nộp tối đa</p>
                  <input type="number" min={1} value={maxAttempts} onChange={e => setMaxAttempts(e.target.value === "" ? "" : +e.target.value)}
                    placeholder="Không giới hạn"
                    className="w-32 border border-outline-variant/30 rounded-lg px-3 py-1.5 text-sm text-right outline-none focus:border-primary" />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-on-surface">Cho phép nộp muộn</p>
                  <button onClick={() => setAllowLate(!allowLate)}
                    className={`w-11 h-6 rounded-full relative transition-colors ${allowLate ? "bg-primary" : "bg-surface-container-high"}`}>
                    <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${allowLate ? "right-0.5" : "left-0.5"}`} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-on-surface">Chấm điểm tự động</p>
                  <div className="w-11 h-6 rounded-full bg-surface-container-high relative">
                    <div className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow" />
                  </div>
                </div>
              </div>
            </div>

            {/* XP reward */}
            <div className="bg-primary rounded-2xl p-5 relative overflow-hidden">
              <div className="absolute right-2 bottom-0 text-[5rem] chinese-text font-bold text-white/10 leading-none select-none">奖</div>
              <p className="text-xs font-bold text-white/60 uppercase tracking-wider mb-1">Thưởng hoàn thành</p>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-extrabold text-white">+{xpReward} XP</span>
                <span className="text-xs px-2 py-0.5 bg-white/20 text-white rounded-full font-bold">LEVEL UP BOOST</span>
              </div>
              <input type="range" min={10} max={200} step={10} value={xpReward}
                onChange={e => setXpReward(+e.target.value)}
                className="w-full mt-3 accent-white" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
