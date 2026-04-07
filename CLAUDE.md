# FunChinese — Claude Code Context

## Project Overview

**FunChinese** là nền tảng học tiếng Trung HSK trực tuyến, 3 nhóm người dùng:
- **Student** — học sinh: học bài, quiz, flashcard, bài tập, lịch học
- **Teacher** — giáo viên: quản lý lớp, ra bài tập, chấm điểm
- **Admin** — panel quản trị teacher tại `/admin/`

**Stack:**
- Next.js 15 (App Router) + TypeScript
- Tailwind CSS v3 + custom MD3 color palette
- Prisma + PostgreSQL (Supabase, PgBouncer pooling)
- NextAuth v5 (Keycloak SSO)
- Supabase Storage (upload ảnh/audio)
- edge-tts (TTS tiếng Trung, cache MP3 tại `public/audio/zh/`)
- Claude API (sinh câu hỏi AI)

---

## ⚠️ Breaking Changes

Đây là **Next.js 15 App Router** — APIs có thể khác với tài liệu thông thường. Đọc `node_modules/next/dist/docs/` trước khi viết code mới nếu cần.

---

## Auth Pattern (BẮT BUỘC)

Mọi API route phải check auth. Có 2 pattern:

```ts
// Route student — dùng auth() + keycloakId
const session = await auth();
if (!session?.user?.keycloakId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const dbUser = await prisma.user.findUnique({ where: { keycloakId: session.user.keycloakId }, select: { id: true } });
if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });
const userId = dbUser.id;

// Route teacher/admin — thêm check role
if (session?.user?.role !== "teacher") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
```

### Error Response Pattern
```ts
return NextResponse.json({ error: "Human-readable message" }, { status: 400 | 401 | 403 | 404 });
```

---

## Key Imports

| Alias | Thực | Mô tả |
|---|---|---|
| `@/` | `src/` | Root src |
| `@/auth` | `src/auth.ts` | `auth`, `signIn`, `signOut`, `handlers` |
| `@/lib/prisma` | `src/lib/prisma.ts` | Prisma singleton |
| `@/lib/utils` | `src/lib/utils.ts` | `cn()`, `formatDate()` |
| `@/lib/xp` | `src/lib/xp.ts` | `addXP`, `updateStreak`, `LEVELS`, `XP_REWARDS` |

---

## Database (Prisma)

### Enums

```prisma
enum Role         { student  teacher }
enum HskLevel     { HSK1 HSK2 HSK3 HSK4 HSK5 HSK6 }
enum QuestionType { MULTIPLE_CHOICE FILL_BLANK MATCHING WORD_ORDER FREE_WRITE TRANSLATION SPEAKING LISTENING }
enum AssignType   { CLASS  INDIVIDUAL }
enum SubmissionStatus { DRAFT SUBMITTED GRADED }
enum SessionStatus { SCHEDULED ONGOING COMPLETED CANCELLED }
enum Gender       { male female other prefer_not_to_say }
```

### Key Models

| Model | Key Fields | Notes |
|---|---|---|
| `User` | keycloakId, role, xp, level, streakDays, maxStreak, lastStudyDate | keycloakId = SSO link |
| `UserProfile` | userId, bio, phone, dateOfBirth, gender, avatar | |
| `Vocabulary` | hanzi, pinyin, hanViet, meaningVi, exampleSentence, audioUrl, hskLevel, wordType | HSK word bank |
| `UserVocabulary` | userId, vocabularyId, easeFactor, interval, nextReviewAt, timesCorrect, timesWrong | **SM-2 spaced repetition** |
| `Course` | title, hskLevel, isPublished, sortOrder | HSK khóa học |
| `Chapter` | courseId, title, sortOrder | Chương trong khóa |
| `Lesson` | chapterId, title, titleChinese, pinyin, content:Json, isPublished | Bài học JSON content |
| `LessonVocabulary` | lessonId, vocabularyId, sortOrder | Join bài ↔ từ vựng |
| `LessonProgress` | userId, lessonId, completed, completedAt, lastViewedAt | Tiến độ học |
| `HskQuestion` | code(Q-NNNN), hanzi, pinyin, meaningVi, options:Json, answer, hskLevel | Ngân hàng đề HSK |
| `AiQuestion` | vocabularyId, questionText, options:Json, correctAnswer, status(pending/approved/rejected) | AI quiz questions |
| `PracticeSession` | userId, level, durationSelected, expiresAt, questions:Json, status, results:Json | Phiên quiz có timer |
| `QuizSession` | userId, mode, source, totalQ, correctQ, xpEarned, durationSec, results:Json | Lịch sử quiz |
| `Class` | name, joinCode(6-char), teacherId, courseId | Lớp học |
| `ClassMember` | classId, userId | Join lớp ↔ học sinh |
| `ClassSchedule` | classId, dayOfWeek(1=T2…7=CN), startTime, endTime, location, isOnline | Lịch hàng tuần |
| `ClassSession` | scheduleId, date, status | Buổi học cụ thể |
| `ClassLesson` | classId, lessonId, completedAt, note | Bài đã dạy trong lớp |
| `Assignment` | classId, title, deadline, xpReward, assignType, maxAttempts, allowLate | Bài tập |
| `AssignmentAssignee` | assignmentId, userId | Giao bài cá nhân |
| `Submission` | assignmentId, userId, status, answers:Json, textContent, mediaUrls, attempt | Nộp bài |
| `Grade` | submissionId, teacherId, scores:Json, totalScore, passed, comment, reassign | Điểm |
| `Question` | type, content, options:Json, correctAnswer, explanation, audioUrl | Câu hỏi generic |
| `AssignmentQuestion` | assignmentId, questionId, sortOrder | Câu hỏi trong bài tập |
| `DailyActivity` | userId, date, xpEarned, wordsLearned, minutesStudied | Heatmap học tập |
| `Badge` | name, iconUrl, condition:Json | Thành tích |
| `UserBadge` | userId, badgeId, earnedAt | Đạt được badge |
| `Notification` | userId, type, title, body, link, read | Thông báo |
| `AppSetting` | id="global", theme, themeMode | App settings (theme: 7 palettes) |

---

## File Structure

```
src/
├── auth.ts                       # NextAuth v5 + Keycloak config
├── middleware.ts                 # Role-based route protection
├── actions/auth.ts               # Server Action: keycloakSignOut()
│
├── app/
│   ├── page.tsx                  # Landing page (public)
│   ├── login/page.tsx            # SSO login (Keycloak + Google)
│   ├── layout.tsx                # Root: fonts, DarkModeProvider, darkModeScript
│   ├── globals.css               # Tailwind + .chinese-text, .glass-panel
│   │
│   ├── home/student/
│   │   ├── layout.tsx           # Shell: Sidebar + Topbar + BottomNav
│   │   ├── page.tsx             # Dashboard
│   │   ├── courses/             # Course browsing
│   │   ├── lessons/[id]/        # Lesson viewer
│   │   ├── quiz/                # HSK timed quiz
│   │   ├── flashcard/           # Flashcard library + SM-2 session
│   │   ├── assignments/         # Student submission
│   │   ├── schedule/            # Weekly class schedule
│   │   ├── ai-quiz/             # AI-generated vocabulary quiz
│   │   └── settings/            # Profile settings
│   │
│   ├── home/teacher/page.tsx    # Redirect → /admin
│   │
│   ├── admin/                   # Teacher-only panel
│   │   ├── layout.tsx           # Admin sidebar + AdminThemeProvider
│   │   ├── page.tsx             # Dashboard
│   │   ├── classes/             # Class management
│   │   ├── content/courses/     # Course/chapter/lesson CRUD
│   │   ├── vocabulary/           # Vocabulary CRUD + bulk import
│   │   ├── questions/           # HSK question bank + AI
│   │   ├── ai-questions/        # AI question management
│   │   ├── assignments/         # Create + grade assignments
│   │   └── settings/            # App theme
│   │
│   └── api/
│       ├── auth/[...nextauth]    # NextAuth handler
│       ├── auth/logout/          # Keycloak logout
│       ├── admin/               # Teacher admin APIs
│       ├── student/              # Student APIs
│       ├── practice/             # HSK timed quiz sessions
│       ├── courses/              # Public course + lesson APIs
│       └── classes/              # Class join APIs
│
├── components/
│   ├── ui/                      # button, input, select, badge, dialog, table
│   ├── auth/LoginButton.tsx     # Server Component (use server)
│   └── settings/ProfileForm.tsx
│
├── hooks/
│   ├── useDarkMode.tsx           # Dark mode + system preference
│   ├── useAdminTheme.tsx         # 7-palette admin theme (DB → CSS vars)
│   ├── useDashboard.ts           # Student dashboard data
│   ├── useUpload.ts              # File upload hook
│   └── darkModeScript.ts         # SSR-safe dark mode (prevents flash)
│
└── lib/
    ├── prisma.ts                # Prisma singleton (PgBouncer: pool_timeout=20)
    ├── xp.ts                    # addXP(), updateStreak(), LEVELS, XP_REWARDS
    ├── tts.ts                   # generateZhAudio() via edge-tts
    └── utils.ts                 # cn(), formatDate()
```

---

## Styling

**CSS:** Tailwind CSS v3 với MD3 color tokens.

**Tailwind primary colors:**
```ts
primary:    "#005684"   // Deep blue — CTA, selected
secondary:  "#006c4e"   // Deep green — secondary actions
tertiary:   "#774700"   // Amber — highlights, badges
surface-container: "#f8f9fe" // Page background
```

**Custom utilities (`globals.css`):**
```css
.chinese-text { font-family: "Noto Sans SC", sans-serif; }
.glass-panel  { background: rgba(255,255,255,0.8); backdrop-filter: blur(12px); }
.material-symbols-outlined { font-family: "Material Symbols Outlined"; }
```

**UI Components:** shadcn-style tại `src/components/ui/` (Radix UI + CVA):
```tsx
<Button variant="default" size="sm">
<Button variant="outline" size="icon">   // icon square
<Badge variant="outline">
<Dialog> <Select> <Input> <Table>
```

**Icon font:** Material Symbols Outlined (Google Fonts)
**Chinese font:** Noto Sans SC
**Body font:** Inter

---

## Key Features

### 1. Flashcard / Spaced Repetition (SM-2)

**Models:** `Vocabulary` + `UserVocabulary`
**API:** `GET/POST /api/student/flashcard` — GET lấy words theo bucket, POST nhận `{ vocabId, correct }` để cập nhật SM-2

**6 Memory Levels:**
| Level | Label | Interval | Color |
|---|---|---|---|
| 0 | Từ mới | Chưa học | gray |
| 1 | Cần ôn | Hôm nay / quá hạn | red |
| 2 | 1 ngày | 1 ngày | orange |
| 3 | 2-3 ngày | 2-3 ngày | amber |
| 4 | 1 tuần | 4-7 ngày | green |
| 5 | 1 tháng+ | ≥8 ngày | blue |

**SM-2 Logic (POST flashcard):**
```ts
if (correct) {
  interval   = interval === 1 ? 3 : Math.round(interval * easeFactor)
  easeFactor = Math.max(1.3, easeFactor + 0.1)
} else {
  interval   = 1
  easeFactor = Math.max(1.3, easeFactor - 0.2)
}
nextReviewAt = now + interval * 86400000ms
```

### 2. HSK Timed Quiz

**Flow:** `POST /api/practice/start` → tạo `PracticeSession` với câu hỏi ngẫu nhiên từ `hsk_questions` → student trả lời → `POST /api/practice/[sessionId]/submit` → chấm điểm, ghi `QuizSession`, trao XP, cập nhật streak.

**Lưu ý:** `HskQuestion.answer` lưu là chữ `"A"/"B"/"C"/"D"`. API start session **normalize** thành nghĩa thực trước khi lưu vào `PracticeSession.questions`. Chấm so sánh meaning-to-meaning.

### 3. AI Quiz (Claude API)

**Flow:** Teacher duyệt `AiQuestion` (status: pending → approved/rejected) → Student chọn HSK level → `POST /api/student/ai-quiz` tạo quiz từ approved questions → submit → chấm + XP.

**AI Generation:** `POST /api/admin/ai-questions/generate-batch` gọi Claude API sinh 4-5 câu hỏi cho mỗi từ vựng (5 types: MEANING, PINYIN, FILL_IN_BLANK, USAGE, COMPARISON). HSK1-3 only, age-appropriate.

### 4. XP & Gamification (`src/lib/xp.ts`)

```ts
LEVELS: Học sinh mới(0) → Đồng(300) → Bạc(1000) → Vàng(3000) → Bạch Kim(7500) → Kim Cương(15000)

XP_REWARDS:
  LESSON_COMPLETE:    20
  QUIZ_CORRECT:         5   // mỗi đáp án đúng
  QUIZ_STREAK_BONUS:   10   // khi streak ≥ 5
  ASSIGNMENT_SUBMIT:   30
  ASSIGNMENT_PERFECT:  20   // bonus khi 100%
  DAILY_STREAK:        10
  COURSE_COMPLETE:    100
```

**Streak logic:** `updateStreak()` — nếu học đúng hôm qua → +1 streak, nếu bỏ ≥1 ngày → reset về 1.

### 5. TTS Audio

**`src/lib/tts.ts`** — `generateZhAudio(text)`:
- Voice: `zh-CN-XiaoxiaoNeural`
- Cache: `public/audio/zh/{md5(text)}.mp3`
- Trả về `/audio/zh/{filename}`
- Supabase Storage: audio cho câu hỏi lưu ở bucket `audio_question`

### 6. Assignments & Grading

- Teacher tạo `Assignment` (CLASS hoặc INDIVIDUAL type)
- CLASS: auto tạo DRAFT `Submission` cho tất cả class members
- Student nộp: text + media (video upload → `public/uploads/videos/`, max 50MB)
- Teacher chấm: `POST /api/admin/assignments/[id]/grade/[submissionId]` → tạo `Grade`, award XP nếu passed

### 7. Admin Theme System

7 palettes (red/blue/green/purple/orange/teal/pink). Lưu trong `AppSetting`. Fetch API → `sessionStorage` → apply CSS custom properties trên `:root` trước React hydrate.

---

## Common Patterns

### Tạo Student API mới
```
src/app/api/student/{feature}/route.ts
```
Luôn bắt đầu với auth pattern ở trên.

### Tạo Student Page
```
src/app/home/student/{feature}/page.tsx
```
- `'use client'`
- Tailwind với MD3 tokens: `text-primary`, `bg-surface-container`
- Material Symbols: `<span className="material-symbols-outlined">icon</span>`
- Focus routes (ẩn sidebar/topbar): `/flashcard/`, `/quiz/`, `/lessons/`, `/ai-quiz/`

### Pagination API
```
?page=1&limit=20&q=search&hsk=HSK2
Return: { items: [], pagination: { total, page, limit, totalPages } }
```

---

## Environment Variables

```env
DATABASE_URL="postgresql://..."           # Supabase (PgBouncer)
DIRECT_URL="postgresql://..."             # Supabase direct
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="..."
KEYCLOAK_CLIENT_ID="funchinese"
KEYCLOAK_CLIENT_SECRET="..."
KEYCLOAK_ISSUER="http://localhost:8080/realms/master"
RESEND_API_KEY="..."
NEXT_PUBLIC_SUPABASE_URL="https://..."
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
SUPABASE_SECRET_KEY="..."
ANTHROPIC_API_KEY="..."                   # Claude API cho AI questions
```
