"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";

const FILL = { fontVariationSettings: "'FILL' 1" };

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    // Gọi Keycloak — NextAuth lo phần redirect sau khi xác thực xong
    // callbackUrl="/" để middleware bắt và redirect đúng role
    await signIn("keycloak", { callbackUrl: "/" });
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      {/* Card */}
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <span className="text-3xl font-extrabold tracking-tight text-primary">
              fun<span className="text-secondary">chinese</span>
            </span>
          </Link>
          <p className="mt-2 text-sm text-on-surface-variant">
            Học tiếng Trung — dành riêng cho người Việt
          </p>
        </div>

        {/* Form card */}
        <div className="bg-surface-container-lowest rounded-2xl shadow-lg border border-outline-variant/20 p-8">
          <h1 className="text-2xl font-extrabold text-on-surface mb-1">
            Đăng nhập
          </h1>
          <p className="text-sm text-on-surface-variant mb-8">
            Tiếp tục lộ trình học tiếng Trung của bạn.
          </p>

          {/* Primary SSO button */}
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-primary text-on-primary py-3.5 rounded-xl font-bold shadow-md hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed mb-4"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
                </svg>
                Đang chuyển hướng...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-lg" style={FILL}>
                  shield_person
                </span>
                Đăng nhập với Keycloak SSO
              </>
            )}
          </button>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-outline-variant/20" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-surface-container-lowest px-4 text-xs text-on-surface-variant uppercase font-medium">
                Hoặc đăng nhập bằng
              </span>
            </div>
          </div>

          {/* Google button */}
          <button
            type="button"
            onClick={() => signIn("google", { callbackUrl: "/" })}
            className="w-full flex items-center justify-center gap-3 border border-outline-variant/30 py-3 rounded-xl hover:bg-surface-container-low transition-all font-semibold text-sm"
          >
            <img
              src="https://www.google.com/favicon.ico"
              alt="Google"
              className="w-4 h-4"
            />
            Tiếp tục với Google
          </button>

          {/* Register link */}
          <p className="mt-6 text-center text-sm text-on-surface-variant">
            Chưa có tài khoản?{" "}
            <Link href="/register" className="text-primary font-bold hover:underline">
              Đăng ký miễn phí
            </Link>
          </p>
        </div>

        {/* Info box */}
        <div className="mt-6 p-4 bg-primary-fixed/50 rounded-xl border border-primary/10">
          <div className="flex gap-3">
            <span className="material-symbols-outlined text-primary text-lg flex-shrink-0 mt-0.5">
              info
            </span>
            <div className="text-xs text-on-surface-variant leading-relaxed">
              <p className="font-semibold text-on-surface mb-1">Lưu ý cho học viên</p>
              <p>
                Tài khoản được cấp bởi giáo viên. Nếu chưa nhận được thông tin đăng nhập,
                liên hệ giáo viên của bạn.
              </p>
            </div>
          </div>
        </div>

        {/* Back to home */}
        <div className="mt-4 text-center">
          <Link href="/" className="text-xs text-on-surface-variant hover:text-primary transition-colors">
            ← Về trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
}
