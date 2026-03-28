"use client";

import Link from "next/link";
import Image from "next/image";
import { keycloakSignOut } from "@/actions/auth";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { useDashboard } from "@/hooks/useDashboard";

// ─── Nav config ───────────────────────────────────────────────────────────────
const NAV = [
  { href: "/home/student",             icon: "dashboard",         label: "Bảng điều khiển" },
    { href: "/home/student/schedule", icon: "calendar_month", label: "Lịch học" },
  { href: "/home/student/courses",     icon: "menu_book",         label: "Chương trình"    },
  // { href: "/home/student/practice",    icon: "record_voice_over", label: "Luyện tập"       },
  { href: "/home/student/assignments", icon: "favorite",           label: "Bài tập"         },
  { href: "/home/student/quiz",   icon: "circle",             label: "Quiz"       },
];

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();

  async function handleLogout() {
    try {
      const keys = Object.keys(sessionStorage);
      for (const key of keys) {
        if (key.startsWith("quiz_result_")) sessionStorage.removeItem(key);
      }
    } catch {}
    await keycloakSignOut();
    window.location.href = "/api/auth/logout";
  }

  // Active nếu pathname bắt đầu bằng href (để /courses/[id] vẫn highlight Lộ trình học)
  const isActive = (href: string) =>
    href === "/home/student"
      ? pathname === href
      : pathname.startsWith(href);

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/30 z-30 lg:hidden" onClick={onClose} />
      )}

      <aside className={`
        fixed top-0 left-0 h-full z-40 w-64
        bg-surface-container-lowest border-r border-outline-variant/20
        flex flex-col transition-transform duration-300
        lg:sticky lg:w-56 lg:translate-x-0 lg:z-auto lg:flex-shrink-0
        ${open ? "translate-x-0" : "-translate-x-full"}
      `}>
        {/* Logo */}
        <div className="px-5 py-5 border-b border-outline-variant/10 flex items-center justify-between">
          <Link href="/home/student" className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="funchinese" width={36} height={36} className="object-contain" />
            <div>
              <p className="font-extrabold text-sm text-on-surface leading-none">funchinese</p>
              <p className="text-xs text-on-surface-variant mt-0.5">Học tiếng Trung</p>
            </div>
          </Link>
          <button onClick={onClose}
            className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container">
            <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all
                ${isActive(item.href)
                  ? "bg-primary text-on-primary"
                  : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"}`}>
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{item.icon}</span>
              {item.label}
            </Link>
          ))}

          {/* <Link href="/home/student/vocabulary" onClick={onClose}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all
              ${isActive("/home/student/vocabulary")
                ? "bg-primary text-on-primary"
                : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"}`}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>library_books</span>
            Kho từ vựng
          </Link> */}
        </nav>

        {/* Premium upsell */}
        {/* <div className="mx-3 mb-3 p-4 bg-primary-container rounded-2xl">
          <p className="text-xs font-bold text-on-primary-container mb-1">Sẵn sàng bứt phá?</p>
          <button className="w-full bg-primary text-on-primary text-xs font-bold py-2 rounded-lg hover:brightness-110 transition-all mt-1">
            Nâng cấp Premium
          </button>
        </div> */}

        {/* Footer */}
        <div className="border-t border-outline-variant/10 px-3 py-3 space-y-0.5">
          <Link href="/home/student/settings" onClick={onClose}
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-on-surface-variant hover:bg-surface-container transition-all">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>settings</span>
            Cài đặt
          </Link>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-on-surface-variant hover:bg-surface-container transition-all">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>logout</span>
            Đăng xuất
          </button>
        </div>
      </aside>
    </>
  );
}

// ─── Bottom nav (mobile) ──────────────────────────────────────────────────────
function BottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/home/student"
      ? pathname === href
      : pathname.startsWith(href);

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-surface-container-lowest border-t border-outline-variant/20 flex">
      {NAV.map((item) => {
        const active     = isActive(item.href);
        const isPractice = item.href === "/home/student/practice";
        return (
          <Link key={item.href} href={item.href}
            className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors
              ${active ? "text-primary" : "text-on-surface-variant"}`}>
            {isPractice ? (
              <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center -mt-5 shadow-lg">
                <span className="material-symbols-outlined text-on-primary" style={{ fontSize: 22 }}>
                  {item.icon}
                </span>
              </div>
            ) : (
              <span className="material-symbols-outlined" style={{
                fontSize: 22,
                fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0",
              }}>
                {item.icon}
              </span>
            )}
            <span className={`text-[10px] font-semibold leading-none ${isPractice ? "mt-1" : ""}`}>
              {item.label.split(" ").pop()}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

// ─── Topbar ───────────────────────────────────────────────────────────────────
function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { data } = useDashboard();
  const [showNotif, setShowNotif] = useState(false);
  const unread = data?.notifications?.length ?? 0;

  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 60)  return `${m} phút trước`;
    const h = Math.floor(m / 60);
    if (h < 24)  return `${h} giờ trước`;
    return `${Math.floor(h / 24)} ngày trước`;
  }

  return (
    <header className="h-14 border-b border-outline-variant/10 bg-surface-container-lowest flex items-center px-4 md:px-6 gap-3 sticky top-0 z-20">
      <button onClick={onMenuClick}
        className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl hover:bg-surface-container transition-colors flex-shrink-0">
        <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 22 }}>menu</span>
      </button>

      {/* Search */}
      <div className="flex-1 max-w-xs md:max-w-sm">
        <div className="flex items-center gap-2 bg-surface-container px-3 py-2 rounded-xl">
          <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 18 }}>search</span>
          <input type="text" placeholder="Tìm kiếm bài học, từ vựng..."
            className="bg-transparent text-sm text-on-surface placeholder:text-on-surface-variant/60 outline-none flex-1 min-w-0 w-0" />
        </div>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {/* Streak */}
        <div className="flex items-center gap-1 bg-surface-container px-2.5 py-1.5 rounded-xl">
          <span className="material-symbols-outlined text-tertiary"
            style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
          <span className="text-sm font-bold text-on-surface">{data?.user.streakDays ?? "—"}</span>
        </div>

        {/* XP */}
        <div className="hidden sm:flex items-center gap-1 bg-surface-container px-2.5 py-1.5 rounded-xl">
          <span className="material-symbols-outlined text-secondary"
            style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>military_tech</span>
          <span className="text-sm font-bold text-on-surface">
            {data ? data.user.xp.toLocaleString("vi-VN") : "—"}
          </span>
        </div>

        {/* Notifications */}
        <div className="relative">
          <button onClick={() => setShowNotif(!showNotif)}
            className="relative w-9 h-9 rounded-xl hover:bg-surface-container flex items-center justify-center transition-colors">
            <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 20 }}>notifications</span>
            {unread > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-error rounded-full text-white text-[10px] font-bold flex items-center justify-center">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>

          {showNotif && (
            <div className="absolute right-0 top-11 w-72 md:w-80 bg-surface-container-lowest rounded-2xl shadow-xl border border-outline-variant/20 overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-outline-variant/10 flex items-center justify-between">
                <span className="font-bold text-sm">Thông báo</span>
                <button className="text-xs text-primary hover:underline">Đánh dấu đã đọc</button>
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-outline-variant/10">
                {!data?.notifications.length && (
                  <p className="text-sm text-on-surface-variant p-4 text-center">Không có thông báo mới</p>
                )}
                {data?.notifications.map((n) => (
                  <Link key={n.id} href={n.link ?? "#"} onClick={() => setShowNotif(false)}
                    className="flex gap-3 px-4 py-3 hover:bg-surface-container transition-colors">
                    <div className="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-primary text-sm">
                        {n.type === "graded" ? "grade" : n.type === "badge" ? "military_tech" : "assignment"}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-on-surface truncate">{n.title}</p>
                      <p className="text-xs text-on-surface-variant truncate">{n.body}</p>
                      <p className="text-xs text-on-surface-variant/60 mt-0.5">{timeAgo(n.createdAt)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary text-xs font-bold overflow-hidden flex-shrink-0">
          {data?.user.image
            ? <img src={data.user.image} alt="" className="w-full h-full object-cover" />
            : (data?.user.name?.slice(0, 2).toUpperCase() ?? "FC")
          }
        </div>
      </div>
    </header>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────
export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-surface-container-low overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />

        {/* pb-20 để không bị bottom nav che trên mobile */}
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
          {children}
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
