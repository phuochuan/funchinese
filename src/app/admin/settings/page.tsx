'use client';

import { useState } from 'react';
import { useAdminTheme, THEME_PALETTES, type ThemeName } from '@/hooks/useAdminTheme';
import { Check } from 'lucide-react';

const THEMES: { key: ThemeName; label: string; preview: string; previewText: string }[] = [
  { key: 'red',    label: 'Đỏ đậm',   preview: '#7C0000', previewText: '#ffdada' },
  { key: 'blue',   label: 'Xanh dương', preview: '#005684', previewText: '#cde5ff' },
  { key: 'green',  label: 'Xanh lá',    preview: '#006c4e', previewText: '#83f5c6' },
  { key: 'purple', label: 'Tím',        preview: '#6B21A8', previewText: '#f3e8ff' },
  { key: 'orange', label: 'Cam',        preview: '#C2410C', previewText: '#ffdab3' },
  { key: 'teal',   label: 'Ngọc lam',   preview: '#0D9488', previewText: '#ccfbf1' },
  { key: 'pink',   label: 'Hồng',       preview: '#be185d', previewText: '#fce7f3' },
];

export default function AdminSettingsPage() {
  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      <PageHeader />
      <ThemeSection />
    </div>
  );
}

function PageHeader() {
  return (
    <div>
      <h1 className="text-2xl font-extrabold text-on-surface">Cài đặt</h1>
      <p className="text-sm text-on-surface-variant mt-1">
        Quản lý cài đặt hệ thống và giao diện.
      </p>
    </div>
  );
}

function ThemeSection() {
  const { theme, setTheme } = useAdminTheme();
  const [saving, setSaving] = useState(false);

  async function handleSelect(t: ThemeName) {
    if (t === theme) return;
    setSaving(true);
    await setTheme(t);
    setSaving(false);
  }

  return (
    <section className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 overflow-hidden">
      {/* Section header */}
      <div className="px-6 py-4 border-b border-outline-variant/10">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary" style={{ fontSize: 20 }}>palette</span>
          <div>
            <h2 className="text-sm font-bold text-on-surface">Màu chủ đạo</h2>
            <p className="text-xs text-on-surface-variant mt-0.5">Chọn màu giao diện cho toàn bộ hệ thống</p>
          </div>
          {saving && (
            <div className="ml-auto w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          )}
        </div>
      </div>

      {/* Theme grid */}
      <div className="p-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {THEMES.map((t) => {
            const isActive = theme === t.key;
            const p = THEME_PALETTES[t.key];

            return (
              <button
                key={t.key}
                onClick={() => handleSelect(t.key)}
                className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                  isActive
                    ? 'border-[var(--primary)] bg-[var(--primary-container)] shadow-sm'
                    : 'border-outline-variant/30 bg-surface-container hover:border-outline hover:shadow-sm'
                }`}
              >
                {/* Color preview circle */}
                <div
                  className="w-10 h-10 rounded-full border-2 border-white shadow-sm flex-shrink-0"
                  style={{ backgroundColor: p.primary }}
                />
                {/* Inner accent */}
                <div
                  className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                  style={{ backgroundColor: p.primaryContainer }}
                />

                {/* Label */}
                <div className="text-center">
                  <div className="text-xs font-bold text-on-surface">{t.label}</div>
                  <div className="text-[10px] text-on-surface-variant mt-0.5">{p.primary}</div>
                </div>

                {/* Active check */}
                {isActive && (
                  <div
                    className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: p.primary }}
                  >
                    <Check className="w-3 h-3 text-white" strokeWidth={3} />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Preview bar */}
      <div className="px-6 py-4 border-t border-outline-variant/10 bg-surface-container">
        <p className="text-xs text-on-surface-variant mb-3 font-semibold">Xem trước</p>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            className="px-4 py-2 rounded-xl text-sm font-bold text-[var(--on-primary)] bg-[var(--primary)] hover:brightness-110 transition-all"
          >
            Nút chính
          </button>
          <button
            className="px-4 py-2 rounded-xl text-sm font-bold bg-[var(--primary-container)] text-[var(--on-primary-container)] border border-[var(--primary)] hover:brightness-105 transition-all"
          >
            Nút phụ
          </button>
          <span className="text-xs font-bold text-[var(--primary)]">
            Chữ màu chính
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-[var(--primary-container)] text-[var(--on-primary-container)]">
            Badge
          </span>
          <div className="h-2 flex-1 min-w-16 bg-[var(--primary-container)] rounded-full overflow-hidden">
            <div className="h-full bg-[var(--primary)]" style={{ width: '60%' }} />
          </div>
        </div>
      </div>
    </section>
  );
}
