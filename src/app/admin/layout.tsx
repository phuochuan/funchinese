"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/admin",                       icon: "dashboard",    label: "Tổng quan"  },
  // { href: "/admin/classes",               icon: "school",       label: "Lớp học"    },
  { href: "/admin/classes", icon: "school", label: "Lớp học" },
  { href: "/admin/content/courses",       icon: "menu_book",    label: "Khoá học"   },
  { href: "/admin/content/vocabulary",    icon: "library_books",label: "Từ vựng"    }, // ← thêm
  { href: "/admin/assignments",           icon: "assignment",   label: "Bài tập"    },
  // { href: "/admin/reports",               icon: "bar_chart",    label: "Báo cáo"    },
];

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/admin" ? pathname === href : pathname.startsWith(href);

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/30 z-30 lg:hidden" onClick={onClose} />
      )}

      <aside className={`
        fixed top-0 left-0 h-full z-40 w-64
        bg-on-surface text-inverse-on-surface
        flex flex-col transition-transform duration-300
        lg:sticky lg:w-56 lg:translate-x-0 lg:z-auto lg:flex-shrink-0
        ${open ? "translate-x-0" : "-translate-x-full"}
      `}>
        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/10 flex items-center justify-between">
          <div>
            <p className="font-extrabold text-white leading-none">funchinese</p>
            <p className="text-xs text-white/50 mt-0.5 uppercase tracking-wider">Hệ thống quản lý</p>
          </div>
          <button onClick={onClose} className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10">
            <span className="material-symbols-outlined text-white/70" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all
                ${isActive(item.href)
                  ? "bg-white/15 text-white"
                  : "text-white/60 hover:bg-white/10 hover:text-white"}`}>
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Create course CTA */}
        <div className="mx-3 mb-3">
          <Link href="/admin/content/courses"
            className="flex items-center gap-2 w-full bg-primary text-on-primary px-4 py-3 rounded-xl text-sm font-bold hover:brightness-110 transition-all">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
            Tạo khóa học
          </Link>
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 px-3 py-3 space-y-0.5">
          <Link href="/admin/settings" onClick={onClose}
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-white/60 hover:bg-white/10 hover:text-white transition-all">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>settings</span>
            Cài đặt
          </Link>
          <button onClick={() => signOut({ callbackUrl: "/" })}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-white/60 hover:bg-white/10 hover:text-white transition-all">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>logout</span>
            Đăng xuất
          </button>
        </div>
      </aside>
    </>
  );
}

function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header className="h-14 border-b border-outline-variant/10 bg-surface-container-lowest flex items-center px-4 md:px-6 gap-3 sticky top-0 z-20">
      <button onClick={onMenuClick}
        className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl hover:bg-surface-container transition-colors flex-shrink-0">
        <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 22 }}>menu</span>
      </button>

      {/* Search */}
      <div className="flex-1 max-w-sm">
        <div className="flex items-center gap-2 bg-surface-container px-3 py-2 rounded-xl">
          <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 18 }}>search</span>
          <input type="text" placeholder="Tìm kiếm nội dung..."
            className="bg-transparent text-sm text-on-surface placeholder:text-on-surface-variant/60 outline-none flex-1 min-w-0 w-0" />
        </div>
      </div>

      <div className="ml-auto flex items-center gap-3">
        {/* Grade button */}
        <Link href="/admin/assignments/grade"
          className="hidden sm:flex items-center gap-2 bg-primary text-on-primary px-4 py-2 rounded-xl text-sm font-bold hover:brightness-110 transition-all">
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>grading</span>
          Chấm bài
        </Link>

        {/* Notifications */}
        <button className="relative w-9 h-9 rounded-xl hover:bg-surface-container flex items-center justify-center transition-colors">
          <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 20 }}>notifications</span>
        </button>

        {/* Settings */}
        <Link href="/admin/settings"
          className="w-9 h-9 rounded-xl hover:bg-surface-container flex items-center justify-center transition-colors">
          <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 20 }}>settings</span>
        </Link>

        {/* Avatar */}
        <div className="flex items-center gap-2">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-on-surface leading-none">Giáo viên</p>
            <p className="text-xs text-on-surface-variant">Giảng viên cao cấp</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary text-xs font-bold">
            GV
          </div>
        </div>
      </div>
    </header>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-surface-container-low overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
