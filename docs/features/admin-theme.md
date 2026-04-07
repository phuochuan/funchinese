# Admin Theme System

## Overview

Admin panel có hệ thống 7 bảng màu (palettes) được lưu trong database và áp dụng qua CSS custom properties. User chọn theme, áp dụng ngay lập tức.

## Data Model

### AppSetting
```
id: "global"  (single-row key)
theme: String  // "red" | "blue" | "green" | "purple" | "orange" | "teal" | "pink"
themeMode: String  // "light" | "dark" | "system"
updatedAt: DateTime
```

## 7 Color Palettes

| Theme | primary | secondary | tertiary | surface | accent |
|---|---|---|---|---|---|
| **red** | `#B91C1C` | `#991B1B` | `#DC2626` | `#FEF2F2` | `#FEE2E2` |
| **blue** | `#005684` | `#00456F` | `#006BAC` | `#F0F8FF` | `#E0F0FF` |
| **green** | `#006C4E` | `#005A40` | `#008563` | `#F0FDF4` | `#DCFCE7` |
| **purple** | `#7C3AED` | `#6D28D9` | `#8B5CF6` | `#FAF5FF` | `#EDE9FE` |
| **orange** | `#C2410C` | `#9A3412` | `#EA580C` | `#FFF7ED` | `#FED7AA` |
| **teal** | `#0F766E` | `#0D5F58` | `#14817A` | `#F0FDFA` | `#CCFBF1` |
| **pink** | `#DB2777` | `#BE185D` | `#EC4899` | `#FDF2F8` | `#FCE7F3` |

**Dark mode** có giá trị khác (darker variants).

## How It Works

### 1. Server: Fetch Theme
**`GET /api/admin/settings/theme`**
```ts
Response: { theme: string, themeMode: string }
```

### 2. Client: Apply CSS Variables
Hook `useAdminTheme`:
```tsx
function useAdminTheme() {
  const { data } = useSWR('/api/admin/settings/theme', fetcher)

  useEffect(() => {
    if (!data) return
    const palette = PALETTES[data.theme]
    const root = document.documentElement

    root.style.setProperty('--primary', palette.primary)
    root.style.setProperty('--secondary', palette.secondary)
    root.style.setProperty('--tertiary', palette.tertiary)
    root.style.setProperty('--surface-container', palette.surface)

    // Dark mode
    if (data.themeMode === 'dark') {
      applyDarkMode(palette)
    }

    sessionStorage.setItem('adminTheme', JSON.stringify(data))
  }, [data])
}
```

### 3. SSR-Safe: Apply Before Hydration
`darkModeScript.ts` (inlined in `<head>`):
```tsx
// Đọc từ sessionStorage, apply CSS vars TRƯỚC React hydrate
// Tránh flash of wrong theme (FOWT)
const saved = sessionStorage.getItem('adminTheme')
if (saved) {
  const { theme, themeMode } = JSON.parse(saved)
  applyPalette(theme)
  if (themeMode === 'dark') applyDarkMode()
}
```

### 4. Update Theme
**`PUT /api/admin/settings/theme`**
```ts
Request: { theme?: string, themeMode?: string }
```
→ Update `AppSetting` row → return new values → hook re-fetches

## CSS Custom Properties

Trong `globals.css`:
```css
:root {
  --primary: #005684;
  --secondary: #006c4e;
  --tertiary: #774700;
  --surface-container: #f8f9fe;
  --on-primary: white;
  --on-surface: #1f2937;
}

:root[data-theme="dark"] {
  --primary: #3b82f6;
  --surface-container: #0f172a;
  --on-surface: #f1f5f9;
}
```

Component dùng:
```tsx
<div className="bg-surface-container text-primary">
  {/* Tự động áp dụng theme */}
</div>
```

## Admin Theme Provider

**`/admin/layout.tsx`** wrap:
```tsx
<AdminThemeProvider>
  <div className="flex min-h-screen bg-surface-container">
    <AdminSidebar />
    <main className="flex-1">
      <AdminTopbar />
      {children}
    </main>
  </div>
</AdminThemeProvider>
```

## Settings UI

**`/admin/settings`**:
- Theme picker: 7 color swatches (click để chọn)
- Theme mode: Light / Dark / System
- Preview: mini dashboard preview thay đổi màu real-time
- Save button → `PUT /api/admin/settings/theme`

## Storage Strategy

- **sessionStorage** (not localStorage): theme chỉ sống trong tab
- Reason: teacher có thể share computer, không muốn ảnh hưởng user khác
- Đọc ở server render → inline script → apply trước hydrate
