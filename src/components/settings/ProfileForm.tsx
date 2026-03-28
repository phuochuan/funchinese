"use client";

import { useEffect, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
type Gender = "male" | "female" | "other" | "prefer_not_to_say";

interface UserProfile {
  id:    string;
  name:  string;
  email: string;
  image: string | null;  // Keycloak avatar (fallback only)
  role:  string;
  profile: {
    id:          string;
    bio:         string | null;
    phone:       string | null;
    dateOfBirth: string | null;
    gender:      Gender | null;
    avatar:      string | null;  // App-managed avatar
  } | null;
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-sm font-semibold text-on-surface mb-1.5">
      {children}
    </label>
  );
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-on-surface-variant mt-1">{children}</p>;
}

function inputClass(error?: boolean) {
  return [
    "w-full bg-surface-container px-4 py-2.5 rounded-xl text-sm text-on-surface",
    "placeholder:text-on-surface-variant/60 outline-none",
    "border transition-colors",
    error
      ? "border-error focus:border-error"
      : "border-transparent focus:border-primary",
    "disabled:opacity-50 disabled:cursor-not-allowed",
  ].join(" ");
}

// ─── Avatar Upload ────────────────────────────────────────────────────────────
function AvatarUpload({
  avatar,
  name,
  onSuccess,
}: {
  avatar:  string | null;
  name:    string;
  onSuccess: (url: string | null) => void;
}) {
  const [preview,   setPreview]   = useState<string | null>(avatar);
  const [uploading, setUploading] = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync when prop changes
  useEffect(() => { setPreview(avatar); }, [avatar]);

  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  async function handleFile(file: File) {
    setError(null);

    if (!["image/jpeg","image/png","image/webp","image/gif"].includes(file.type)) {
      setError("Chỉ hỗ trợ JPEG, PNG, WebP, GIF.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Kích thước tối đa là 2 MB.");
      return;
    }

    // Optimistic preview
    setPreview(URL.createObjectURL(file));

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("avatar", file);
      const res = await fetch("/api/profile/avatar", { method: "PATCH", body: fd });
      const json = await res.json();

      if (!res.ok) throw new Error(json.error ?? "Upload thất bại.");

      onSuccess(json.avatar); // null = removed
    } catch (err: any) {
      setError(err.message);
      setPreview(avatar); // revert on error
    } finally {
      setUploading(false);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Avatar circle */}
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className={[
          "relative w-24 h-24 rounded-full overflow-hidden cursor-pointer",
          "bg-primary flex items-center justify-center",
          "text-on-primary text-2xl font-extrabold",
          "ring-2 ring-inset ring-outline-variant",
          "transition-all select-none group",
          uploading ? "opacity-60 cursor-wait" : "hover:ring-primary",
        ].join(" ")}
        title="Nhấn hoặc kéo ảnh vào để đổi ảnh đại diện"
      >
        {/* Loading spinner overlay */}
        {uploading && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
            <span className="material-symbols-outlined text-white animate-spin">progress_activity</span>
          </div>
        )}

        {/* Upload hint overlay */}
        {!uploading && (
          <div className="absolute inset-0 bg-black/40 flex-col items-center justify-center hidden group-hover:flex rounded-full">
            <span className="material-symbols-outlined text-white text-lg">upload</span>
            <span className="text-white text-[10px] font-bold mt-0.5">Đổi ảnh</span>
          </div>
        )}

        {preview ? (
          <img src={preview} alt={name} className="w-full h-full object-cover" />
        ) : (
          initials
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleChange}
      />

      {error && <p className="text-xs text-error">{error}</p>}

      <div className="text-center">
        <p className="text-xs font-semibold text-on-surface">Nhấn hoặc kéo ảnh vào để đổi</p>
        <p className="text-[11px] text-on-surface-variant mt-0.5">JPEG, PNG, WebP, GIF · Tối đa 2 MB</p>
      </div>

      {preview && (
        <button
          type="button"
          onClick={() => {
            setPreview(null);
            fetch("/api/profile/avatar", { method: "PATCH", body: new FormData() })
              .then((r) => r.json())
              .then((j) => onSuccess(j.avatar));
          }}
          className="text-xs text-on-surface-variant hover:text-error transition-colors flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-base">delete</span>
          Xoá ảnh đại diện
        </button>
      )}
    </div>
  );
}

// ─── Main Form ────────────────────────────────────────────────────────────────
export function ProfileForm() {
  const [data,   setData]   = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form fields
  const [name,        setName]        = useState("");
  const [bio,         setBio]         = useState("");
  const [phone,       setPhone]       = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender,      setGender]      = useState<Gender>("prefer_not_to_say");
  const [avatar,      setAvatar]      = useState<string | null>(null);

  // Field errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/profile", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setName(d.name ?? "");
        setBio(d.profile?.bio ?? "");
        setPhone(d.profile?.phone ?? "");
        setAvatar(d.profile?.avatar ?? null);   // app avatar (priority)
        setDateOfBirth(
          d.profile?.dateOfBirth
            ? new Date(d.profile.dateOfBirth).toISOString().split("T")[0]
            : ""
        );
        setGender(d.profile?.gender ?? "prefer_not_to_say");
      })
      .catch(() => setError("Không thể tải thông tin tài khoản."))
      .finally(() => setLoading(false));
  }, []);

  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Tên không được để trống.";
    if (phone && !/^[0-9+\-\s()]{7,15}$/.test(phone.trim())) {
      e.phone = "Số điện thoại không hợp lệ.";
    }
    if (dateOfBirth) {
      const dob = new Date(dateOfBirth);
      if (dob >= new Date()) e.dateOfBirth = "Ngày sinh không hợp lệ.";
    }
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSuccess(false);

    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});

    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/profile", {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, bio, phone, dateOfBirth, gender }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Lỗi khi lưu.");
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message ?? "Đã xảy ra lỗi không mong muốn.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-36 bg-surface-container rounded-2xl" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-14 bg-surface-container rounded-xl" />
        ))}
      </div>
    );
  }

  // Effective avatar: app avatar > Keycloak image > initials
  const displayAvatar =
    avatar ?? data?.image ?? null;
  const displayName = name || (data?.name ?? "");

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>

      {/* ── Ảnh đại diện ──────────────────────────────────────────────── */}
      <div className="bg-surface-container-low rounded-2xl p-6 flex items-center justify-center">
        <AvatarUpload
          avatar={displayAvatar}
          name={displayName}
          onSuccess={(url) => setAvatar(url)}
        />
      </div>

      {/* ── Thông tin cá nhân ─────────────────────────────────────────── */}
      <div className="bg-surface-container-low rounded-2xl p-5 space-y-5">
        <h2 className="text-sm font-bold text-on-surface">Thông tin cá nhân</h2>

        {/* Name */}
        <div>
          <FieldLabel>Họ và tên <span className="text-error">*</span></FieldLabel>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nhập họ và tên"
            className={inputClass(!!errors.name)}
          />
          {errors.name && <p className="text-xs text-error mt-1">{errors.name}</p>}
        </div>

        {/* Email — read-only, from Keycloak */}
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <FieldLabel>Email</FieldLabel>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-surface-container rounded-md text-on-surface-variant">
              Keycloak
            </span>
          </div>
          <div className="relative">
            <input
              type="email"
              value={data?.email ?? ""}
              readOnly
              disabled
              className={inputClass() + " pr-10"}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant/50 text-base select-none">
              lock
            </span>
          </div>
          <FieldHint>Email được quản lý qua Keycloak SSO.</FieldHint>
        </div>

        {/* Bio */}
        <div>
          <FieldLabel>Giới thiệu bản thân</FieldLabel>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Viết vài dòng giới thiệu về bản thân bạn..."
            rows={3}
            className={inputClass() + " resize-none"}
          />
          <FieldHint>{bio.length}/300 ký tự</FieldHint>
        </div>

        {/* Phone */}
        <div>
          <FieldLabel>Số điện thoại</FieldLabel>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0912 345 678"
            className={inputClass(!!errors.phone)}
          />
          {errors.phone && <p className="text-xs text-error mt-1">{errors.phone}</p>}
        </div>

        {/* Date of Birth */}
        <div>
          <FieldLabel>Ngày sinh</FieldLabel>
          <input
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            className={inputClass(!!errors.dateOfBirth)}
          />
          {errors.dateOfBirth && (
            <p className="text-xs text-error mt-1">{errors.dateOfBirth}</p>
          )}
        </div>

        {/* Gender */}
        <div>
          <FieldLabel>Giới tính</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {[
              { value: "male",              label: "Nam" },
              { value: "female",            label: "Nữ" },
              { value: "other",             label: "Khác" },
              { value: "prefer_not_to_say", label: "Không tiết lộ" },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setGender(opt.value as Gender)}
                className={[
                  "px-4 py-2 rounded-xl text-sm font-semibold border transition-all",
                  gender === opt.value
                    ? "bg-primary text-on-primary border-primary"
                    : "bg-surface-container text-on-surface border-transparent hover:bg-surface-container-high",
                ].join(" ")}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Status messages */}
      {error && (
        <div className="bg-error-container text-on-error-container text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-tertiary-container text-on-tertiary-container text-sm rounded-xl px-4 py-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-base">check_circle</span>
          Lưu thành công!
        </div>
      )}

      {/* Submit */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="bg-primary text-on-primary font-bold px-6 py-2.5 rounded-xl hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {saving ? (
            <>
              <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
              Đang lưu…
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-base">save</span>
              Lưu thay đổi
            </>
          )}
        </button>
      </div>
    </form>
  );
}
