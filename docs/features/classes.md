# Classes & Schedule

## Overview

Giáo viên tạo và quản lý lớp học. Học sinh tham gia lớp qua mã 6 ký tự. Lịch hàng tuần + buổi học cụ thể.

## Data Model

### Class
```
id, name, description, joinCode (unique 6-char),
teacherId, courseId, scheduleNote,
createdAt, updatedAt
```

### ClassMember
```
classId, userId, joinedAt
@@unique([classId, userId])
```

### ClassSchedule
```
id, classId, dayOfWeek (1=T2...7=CN),
startTime ("08:00"), endTime ("10:00"),
location (String?), isOnline (Boolean)
```

### ClassSession
```
id, scheduleId, classId, date (specific DateTime),
startTime, endTime, location, isOnline,
status (SCHEDULED | ONGOING | COMPLETED | CANCELLED),
cancelReason, cancelledBy
```

### ClassLesson
```
classId, lessonId, completedAt, note
@@unique([classId, lessonId])
```

## Class Flow (Teacher)

### 1. Create Class
**`POST /api/admin/classes`**
```ts
Request: { name, description?, courseId?, scheduleNote? }
// Auto-generate joinCode (6 random alphanumeric chars)
Response: { id, name, joinCode, ... }
```

### 2. Manage Members
**`POST /api/admin/classes/[classId]/members`** — add student
```ts
Request: { email: string }
// Tìm user theo email → tạo ClassMember
// Auto-create Submission (DRAFT) cho các existing CLASS assignments
```

**`DELETE /api/admin/classes/[classId]/members`**
```ts
Request: { userId: string }
// Xóa ClassMember
```

### 3. Manage Schedules
**`POST /api/admin/classes/[classId]/schedules`**
```ts
Request: {
  dayOfWeek: 1-7,
  startTime: "08:00",
  endTime: "10:00",
  location?: string,
  isOnline?: boolean
}
```

**`PUT /api/admin/classes/[classId]/schedules/[scheduleId]`** — update
**`DELETE /api/admin/classes/[classId]/schedules/[scheduleId]`** — delete

### 4. Class Lesson Timeline
**`GET /api/admin/classes/[classId]/lessons`**
```ts
Response: {
  course: Course | null,
  chapters: {
    id, title,
    lessons: {
      id, title, completedAt, note, completionRate
    }[]
  }[]
}
// completionRate = % students đã hoàn thành
```

**`PUT /api/admin/classes/[classId]/lessons`**
```ts
Request: { lessonId: string, completedAt?: Date, note?: string }
// upsert ClassLesson → auto-seed vocabulary cho all class members
```

### 5. Class Detail
**`GET /api/admin/classes/[classId]`**
```ts
Response: {
  class: Class,
  members: { id, name, email, xp, level, streakDays, joinedAt }[],
  schedules: ClassSchedule[],
  assignments: Assignment[],
  course: Course | null
}
```

## Student Class Flow

### 1. Preview Class (before joining)
**`GET /api/classes/join?code=HSK2A`**
```ts
Response: {
  teacherName, schedule, studentCount, courseTitle?
}
// Public endpoint — không cần auth
```

### 2. Join Class
**`POST /api/classes/join`**
```ts
Request: { joinCode: string }
// Tạo ClassMember
// Tạo DRAFT Submissions cho các existing CLASS assignments
// Redirect → /home/student/courses hoặc /home/student/schedule
```

### 3. View Schedule
**`GET /api/student/schedule`**
```ts
Query: ?week=2026-04-07  (ISO date)
Response: {
  weekDays: {
    date: string, dayOfWeek: 1-7,
    sessions: {
      id, classId, className, teacherName,
      startTime, endTime, location, isOnline,
      status: "TODAY" | "SCHEDULED" | "ONGOING" | "COMPLETED"
    }[]
  }[]
}
```

**Status logic:**
```ts
const now = new Date()
const sessionStart = new Date(`${date}T${startTime}`)
const sessionEnd = new Date(`${date}T${endTime}`)

if (sessionStart <= now <= sessionEnd) status = "ONGOING"
else if (sessionEnd < now) status = "COMPLETED"
else if (date === today) status = "TODAY"
else status = "SCHEDULED"
```

## UI Pages

### Teacher: Class List (`/admin/classes`)
- Card per class: name, student count, join code, linked course
- Create new class button
- Toggle publish/unpublish
- Delete (cascade: members, schedules, sessions)

### Teacher: Class Detail (`/admin/classes/[id]`)
- **Members tab:** list, search, add by email, remove
- **Schedule tab:** weekly slots, add/edit/delete
- **Lessons tab:** course timeline, mark lesson complete
- **Assignments tab:** linked assignments

### Student: Schedule (`/home/student/schedule`)
- Week view: T2-T7 + CN
- Day selector tabs
- Session cards: class name, teacher, time, location/online
- Status badge (TODAY/SCHEDULED/ONGOING/COMPLETED)
- "Join online" button (hiện link Zoom/Meet nếu `isOnline=true`)
- Auto-refresh mỗi phút

### Student: Class Join Flow
- Input: mã 6 ký tự
- Preview: thông tin lớp trước khi join
- Confirm → tạo ClassMember

## Join Code

6 ký tự alphanumeric (A-Z, 0-9), unique, không phân biệt hoa thường.
Generated bằng:
```ts
const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase()
```

## Class → Assignment Relationship

Khi tạo CLASS assignment → auto-tạo DRAFT Submission cho mỗi ClassMember.
Khi student join class → kiểm tra existing CLASS assignments → tạo DRAFT Submissions.

## Supabase Storage

Các bucket Supabase:
- `lesson-images` — thumbnail bài học
- `vocab-audio` — audio từ vựng (uploaded, not generated)
- `audio_question` — audio câu hỏi listening
