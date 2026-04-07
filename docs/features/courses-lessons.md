# Courses & Lessons

## Overview

Hệ thống khóa học HSK có cấu trúc: **Course → Chapter → Lesson**. Mỗi lesson chứa content blocks và vocabulary.

## Data Model

### Course
```
id, title, description, hskLevel (HSK1-6),
thumbnail, isPublished (Boolean), sortOrder
```

### Chapter
```
id, courseId, title, sortOrder
```

### Lesson
```
id, chapterId, title, titleChinese, pinyin,
content (Json?), durationMins (Int, default 15),
sortOrder, isPublished, thumbnail
```

### LessonVocabulary (join)
```
lessonId, vocabularyId, sortOrder
```

### LessonProgress
```
userId, lessonId, completed (Boolean),
completedAt (DateTime?), lastViewedAt (DateTime)
@@unique([userId, lessonId])
```

## Content Block Format (Lesson.content)

`Lesson.content` là JSON array của block objects:

```ts
type Block =
  | { type: "GRAMMAR";   text: string; }
  | { type: "DIALOGUE";  text: string; pinyin: string; translation: string; }
  | { type: "HANVIET";   text: string; hanViet: string; meaning: string; }
  | { type: "IMAGE";     url: string; caption?: string; }
  | { type: "TEXT";      text: string; }
  | { type: "VOCAB";     items: { hanzi: string; pinyin: string; meaning: string }[]; }
  | { type: "AUDIO";     url: string; transcript?: string; }
  | { type: "NOTE";      text: string; }  // highlight box
```

## Student API Flow

### Browse Courses
**`GET /api/courses`**
```ts
Response: {
  items: CourseWithProgress[],  // isPublished=true, link hoặc public
  // Với mỗi course: enrolled (bool), progress (%)
}
```
- `?hsk=HSK2` filter
- Include chapters + lessons count

### Course Detail
**`GET /api/courses/[courseId]`**
```ts
Response: {
  course: Course,
  chapters: {
    id, title, sortOrder,
    lessons: {
      id, title, titleChinese, durationMins,
      status: "locked" | "available" | "in_progress" | "completed"
    }[]
  }[],
  stats: { total, completed, inProgress }
}
```

**Lesson locking logic:**
- Lesson đầu tiên trong chapter đầu tiên → always available
- Next lesson → available if previous lesson is completed
- Lesson có thể force unlock bởi teacher (ClassLesson)

### View Lesson
**`GET /api/lessons/[lessonId]`**
```ts
Response: {
  lesson: Lesson,  // content blocks as JSON
  vocabularies: Vocabulary[],
  progress: LessonProgress | null,
  prevLesson: { id, title } | null,
  nextLesson: { id, title } | null
}
```

### Complete Lesson
**`POST /api/lessons/[lessonId]/complete`**
```ts
// 1. Upsert LessonProgress (completed=true, completedAt=now)
await prisma.lessonProgress.upsert({
  where: { userId_lessonId },
  create: { userId, lessonId, completed: true, completedAt: now },
  update: { completed: true, completedAt: now }
})

// 2. Seed vocabulary (upsert UserVocabulary, không overwrite SM-2 data)
for each vocab in lesson:
  await prisma.userVocabulary.upsert({
    where: { userId_vocabularyId },
    create: {
      userId, vocabularyId,
      easeFactor: 2.5, interval: 1, nextReviewAt: now
    }
    // Note: skip update - không overwrite existing spaced repetition data
  })

// 3. XP
await addXP(prisma, userId, XP_REWARDS.LESSON_COMPLETE)  // +20 XP

// 4. Check course completion
// Nếu tất cả lessons completed → award XP_REWARDS.COURSE_COMPLETE
```

### Update Progress (while viewing)
**`PATCH /api/lessons/[lessonId]/progress`**
```ts
// Cập nhật lastViewedAt (để track "in progress")
upsert LessonProgress { lastViewedAt: now }
```

## Admin API Flow

### Manage Courses
**`GET /api/admin/courses`** — list all (published + draft)
**`POST /api/admin/courses`** — create
**`PUT /api/admin/courses/[courseId]`** — update
**`DELETE /api/admin/courses/[courseId]`** — delete (cascade chapters + lessons)

### Manage Chapters
**`POST /api/admin/courses/[courseId]/chapters`** — add chapter
**`PUT /api/admin/chapters/[chapterId]`** — rename / reorder
**`DELETE /api/admin/chapters/[chapterId]`** — delete (cascade lessons)

### Manage Lessons
**`POST /api/admin/chapters/[chapterId]/lessons`** — add lesson
**`GET/PUT/DELETE /api/admin/lessons/[lessonId]`** — CRUD

### Assign Vocabulary to Lesson
**`PUT /api/admin/lessons/[lessonId]`**
```ts
Request: {
  // lesson fields: title, titleChinese, pinyin, content (JSON), ...
  vocabularies: string[]  // array of vocabularyIds (sorted)
}
```
- Xóa LessonVocabulary cũ
- Tạo mới theo sortOrder

## UI Pages

### Student: Course Browser (`/home/student/courses`)
- Grid card: HSK level badge, title, thumbnail, progress bar
- Filter by HSK level
- Lock overlay nếu chưa enrolled

### Student: Course Detail (`/home/student/courses/[id]`)
- Chapter accordion (expand/collapse)
- Lesson rows: status icon (lock/complete/play), title, duration
- Stats: X/Y lessons completed

### Student: Lesson Viewer (`/home/student/lessons/[id]`)
- **Focus mode:** ẩn sidebar/topbar (full-screen)
- Block renderer: hiển thị từng block theo type
- Vocabulary cards: flip card (hanzi → meaning) + TTS + pinyin
- Complete button: gọi `POST /api/lessons/[id]/complete`
- Prev/Next navigation

### Admin: Course Editor (`/admin/content/courses/[id]/edit`)
- Course title, description, thumbnail, HSK level
- Chapter list: add / rename / reorder / delete
- Lesson list: add / edit / reorder / delete
- Publish/unpublish toggle

### Admin: Lesson Editor (`/admin/content/courses/[id]/lessons/[id]/edit`)
- Title, titleChinese, pinyin
- Duration (minutes)
- **Block editor:** drag-drop blocks, add/remove blocks
- **Vocabulary selector:** search + add from vocabulary bank
- Preview button

## Class Lesson Tracking

Khi teacher đánh dấu lesson đã dạy cho lớp:
**`PUT /api/admin/classes/[classId]/lessons`**
```ts
Request: { lessonId: string, completedAt?: Date, note?: string }
// upsert ClassLesson
// seed UserVocabulary cho TẤT CẢ class members
```
→ Tự động unlock lesson cho các student trong lớp đó.
