# FunChinese — Claude Code Context

## Project Overview

FunChinese là nền tảng học tiếng Trung HSK trực tuyến, có 3 nhóm người dùng:
- **Student** — học sinh học bài, làm quiz, flashcard
- **Teacher** — giáo viên quản lý lớp, ra bài tập, chấm điểm
- **Admin** — panel quản trị cho teacher (chung route `/admin/`)

**Stack:**
- Next.js 15 (App Router) + TypeScript
- Tailwind CSS v3 + custom MD3 color palette
- Prisma + PostgreSQL (Supabase)
- NextAuth v5 (Keycloak SSO)
- Supabase Storage (file uploads)
- edge-tts (TTS tiếng Trung, cached in `public/audio/zh/`)

---

## Critical Conventions

### ⚠️ This is NOT standard Next.js

This codebase uses **breaking changes** from the latest Next.js version. APIs, conventions, and file structure may all differ from your training data. Before writing any code, read the relevant guide in `node_modules/next/dist/docs/`.

### Auth Pattern (CRITICAL)

**Every API route MUST check auth.** Two patterns:

```ts
// Student routes (use auth() + keycloakId lookup)
const session = await auth();
if (!session?.user?.keycloakId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const dbUser = await prisma.user.findUnique({ where: { keycloakId: session.user.keycloakId }, select: { id: true } });
if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });
const userId = dbUser.id;

// Teacher/Admin routes — use requireTeacher() helper pattern
async function requireTeacher() {
  const session = await auth();
  if (!session?.user?.keycloakId || session.user.role !== "teacher") return null;
  return true; // or return prisma.user.findUnique(...)
}
```

### Error Response Pattern
```ts
return NextResponse.json({ error: "Human-readable message" }, { status: 400 });
return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
return NextResponse.json({ error: "Not found" }, { status: 404 });
```

### No Magic Imports
- `@/` maps to `src/`
- `@/auth` = `src/auth.ts` (exports `auth`, `signIn`, `signOut`, `handlers`)
- `@/lib/prisma` = `src/lib/prisma.ts` (exports singleton `prisma`)
- `@/lib/utils` = `src/lib/utils.ts` (exports `cn()`, `formatDate()`)
- `@/lib/xp` = `src/lib/xp.ts` (exports `addXP`, `updateStreak`, `LEVELS`, `XP_REWARDS`)

---

## File Structure

```
src/
├── actions/auth.ts          # Server Action: keycloakSignOut()
├── app/
│   ├── page.tsx             # Landing page (public)
│   ├── login/page.tsx       # Login (Keycloak SSO + Google)
│   ├── globals.css          # Tailwind + .chinese-text, .glass-panel utilities
│   ├── layout.tsx           # Root: Inter + Noto Sans SC + Material Symbols fonts
│   ├── middleware.ts        # Role-based route protection
│   │
│   ├── home/
│   │   ├── student/
│   │   │   ├── layout.tsx  # Shell: Sidebar + Topbar + BottomNav
│   │   │   ├── page.tsx     # Dashboard
│   │   │   ├── courses/     # Course + lesson browsing
│   │   │   ├── flashcard/   # Flashcard library + learning UI
│   │   │   ├── quiz/        # Timed quiz + review
│   │   │   ├── assignments/ # Student assignment submission
│   │   │   ├── schedule/    # Class schedule view
│   │   │   └── settings/    # Profile settings
│   │   └── teacher/
│   │       └── page.tsx     # Teacher dashboard
│   │
│   ├── admin/               # Teacher-only admin panel
│   │   ├── assignments/     # Create + grade assignments
│   │   ├── classes/         # Class management
│   │   ├── content/
│   │   │   ├── courses/     # Course/chapter/lesson CRUD
│   │   │   └── vocabulary/  # Vocabulary CRUD + bulk import
│   │   ├── questions/       # HSK question bank + import
│   │   └── settings/
│   │
│   └── api/
│       ├── auth/           # NextAuth handler + logout
│       ├── admin/          # Teacher admin APIs
│       ├── student/        # Student APIs
│       ├── practice/       # Timed quiz sessions
│       ├── lessons/        # Lesson completion + progress
│       └── quiz/           # Quiz sessions
│
├── components/
│   ├── ui/                 # shadcn-style: button, input, badge, dialog, select, table
│   ├── auth/LoginButton.tsx # Server Component (use server)
│   └── settings/ProfileForm.tsx
├── hooks/
│   ├── useDashboard.ts     # useDashboard() hook
│   └── useUpload.ts        # useUpload() hook
└── lib/
    ├── prisma.ts           # Singleton PrismaClient
    ├── utils.ts            # cn(), formatDate()
    ├── xp.ts               # addXP(), updateStreak(), LEVELS, XP_REWARDS
    └── tts.ts              # generateZhAudio() via edge-tts
```

---

## Database (Prisma — prisma/schema.prisma)

### Key Enums
```prisma
enum Role       { student  teacher }
enum HskLevel   { HSK1 HSK2 HSK3 HSK4 HSK5 HSK6 }
enum QuestionType { MULTIPLE_CHOICE FILL_BLANK MATCHING WORD_ORDER FREE_WRITE TRANSLATION SPEAKING LISTENING }
enum SubmissionStatus { DRAFT SUBMITTED GRADED }
```

### Key Models

| Model | Key Fields | Notes |
|---|---|---|
| `User` | keycloakId, role, xp, level, streakDays, maxStreak | keycloakId = SSO link |
| `Vocabulary` | hanzi, pinyin, hanViet, meaningVi, hskLevel, wordType, exampleSentence, audioUrl | HSK word bank |
| `UserVocabulary` | userId, vocabularyId, easeFactor, interval, nextReviewAt, timesCorrect, timesWrong | **SM-2 spaced repetition** |
| `Lesson` | title, titleChinese, pinyin, content:Json, hskLevel | Lesson content stored as JSON blocks |
| `LessonVocabulary` | lessonId, vocabularyId, sortOrder | Join table |
| `Question` | type, content, options:Json, correctAnswer, explanation, audioUrl | Generic questions |
| `HskQuestion` | code(Q-NNNN), hanzi, pinyin, meaningVi, options:Json, answer(A/B/C/D) | **HSK quiz question bank** |
| `PracticeSession` | userId, level, durationSelected, expiresAt, questions:Json, status, results:Json | Timed quiz session |
| `QuizSession` | userId, mode, source, totalQ, correctQ, results:Json | Vocabulary quiz history |
| `Assignment` | deadline, maxAttempts, allowLate, xpReward, assignType | Homework |
| `Submission` | answers:Json, textContent, attempt | `@@unique([assignmentId, userId])` |
| `Grade` | scores:Json, totalScore, passed, reassign | Teacher grading |
| `Class` | name, joinCode(6-char), courseId | Teacher's class |
| `ClassMember` | classId, userId | Join: class ↔ student |
| `ClassSchedule` | dayOfWeek(1=T2…7=CN), startTime, endTime, isOnline, location | Weekly recurring slots |
| `DailyActivity` | userId, date, xpEarned, wordsLearned | `@@unique([userId, date])` — heatmap data |
| `Badge` | name, icon, condition:Json | Achievement definitions |
| `UserBadge` | userId, badgeId, earnedAt | Earned badges |
| `Notification` | userId, type, title, body, read | In-app notifications |

---

## Styling

**CSS Framework:** Tailwind CSS v3 with custom Material Design 3 palette.

**Tailwind config key colors:**
```ts
primary:    "#005684"   // Deep blue — main CTA, selected states
secondary:  "#006c4e"   // Deep green — secondary actions
tertiary:   "#774700"   // Amber — highlights, badges
surface-container:  "#f8f9fe"  // Page background
```

**Custom utilities (`globals.css`):**
```css
.chinese-text { font-family: "Noto Sans SC", sans-serif; }
.glass-panel  { background: rgba(255,255,255,0.8); backdrop-filter: blur(12px); }
.material-symbols-outlined { font-family: "Material Symbols Outlined"; }
```

**Icon font:** Material Symbols Outlined (Google Fonts, loaded in layout.tsx)
**Chinese font:** Noto Sans SC (Google Fonts)
**Body font:** Inter

**UI Components:** Custom shadcn-style in `src/components/ui/` using Radix UI + CVA.
```tsx
<Button variant="default" size="sm">   // primary fill
<Button variant="outline" size="icon"> // icon square button
```

---

## Key Features & Patterns

### 1. Flashcard / Spaced Repetition (SM-2)

**Models:** `Vocabulary` + `UserVocabulary`
**API:** `POST /api/student/flashcard` — receives `{ vocabId, correct }`, updates SM-2
**SM-2 rules:**
```ts
if (correct) {
  interval   = interval === 1 ? 3 : Math.round(interval * easeFactor)
  easeFactor = Math.max(1.3, easeFactor + 0.1)
} else {
  interval   = 1
  easeFactor = Math.max(1.3, easeFactor - 0.2)
}
nextReviewAt = now + interval * 86400000
```

**6 Memory Levels:**
| Level | Label | Interval | Color |
|---|---|---|---|
| 0 | Từ mới | Chưa học | gray |
| 1 | Cần ôn | Hôm nay / quá hạn | red |
| 2 | 1 ngày | Sau 1 ngày | orange |
| 3 | 2-3 ngày | Sau 2-3 ngày | amber |
| 4 | 1 tuần | Sau 1 tuần | green |
| 5 | 1 tháng+ | Sau 1 tháng | blue |

### 2. Timed Quiz (Practice Sessions)

**Flow:** `/api/practice/start` → creates `PracticeSession` with random HSK questions → student answers → `POST /api/practice/[sessionId]/submit` → grades, awards XP, writes `QuizSession`

**Important:** HSK question `answer` is stored as letter `"A"/"B"/"C"/"D"`. On session start, the API **normalizes** it to the actual meaning text before saving to `PracticeSession.questions`. Grading compares meaning-to-meaning.

### 3. XP & Gamification (`src/lib/xp.ts`)

```ts
XP_REWARDS: {
  QUIZ_CORRECT:        5,   // per correct answer
  QUIZ_STREAK_BONUS:  10,   // when streak >= 5
  ASSIGNMENT_SUBMIT:   30,
  ASSIGNMENT_PERFECT: 20,
  LESSON_COMPLETE:   20,
  DAILY_STREAK:       10,
  COURSE_COMPLETE:    100,
}
```

**Levels:** Học sinh mới(0) → Đồng(300) → Bạc(1000) → Vàng(3000) → Bạch Kim(7500) → Kim Cương(15000)

### 4. TTS Audio Generation

**File:** `src/lib/tts.ts` — `generateZhAudio(text)`
- Uses `edge-tts --voice zh-CN-XiaoxiaoNeural`
- Caches as `public/audio/zh/{md5(text)}.mp3`
- Returns `/audio/zh/{filename}`

### 5. Lesson Content

Lessons use a JSON `content` block format (not rich text). Each lesson links to vocabulary via `LessonVocabulary`. When a student **completes a lesson**, the API seeds `UserVocabulary` records for all words in that lesson (upsert, does NOT overwrite existing spaced repetition data).

---

## Common Patterns to Follow

### Creating a new student API route
```
src/app/api/student/{feature}/route.ts
```
Always start with:
```ts
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
// ... GET + POST handlers following auth pattern above
```

### Creating a new student page
```
src/app/home/student/{feature}/page.tsx
```
- Use `'use client'` directive
- Import types from hooks or define inline
- Use Tailwind with MD3 color tokens (`text-primary`, `bg-surface-container`, etc.)
- Use Material Symbols via `<span className="material-symbols-outlined">icon</span>`

### Adding to admin sidebar
Check `src/app/admin/layout.tsx` for the sidebar nav structure.

### Query params for list APIs
Standard pagination: `?page=1&limit=20&q=search&hsk=HSK2`
Return: `{ items: [], pagination: { total, page, limit, totalPages } }`

---

## Environment Variables

```env
DATABASE_URL="postgresql://..."           # Supabase PostgreSQL
DIRECT_URL="postgresql://..."             # Supabase direct connection
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="..."
KEYCLOAK_CLIENT_ID="funchinese"
KEYCLOAK_CLIENT_SECRET="..."
KEYCLOAK_ISSUER="http://localhost:8080/realms/master"
RESEND_API_KEY="..."
NEXT_PUBLIC_SUPABASE_URL="https://..."
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
SUPABASE_SECRET_KEY="..."
```
