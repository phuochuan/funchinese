# Assignments & Grading

## Overview

Teacher tạo bài tập cho lớp (CLASS) hoặc cá nhân (INDIVIDUAL), student nộp, teacher chấm điểm.

## Data Model

### Assignment
```
id, classId, title, description,
deadline, allowLate (Boolean, default true),
maxAttempts (Int, default 1),
xpReward (Int, default 50),
assignType (CLASS | INDIVIDUAL),
allowReview (Boolean),
imageUrls (String[]),             ← ảnh đính kèm bài tập
createdAt, updatedAt
```

**CLASS type:** tự động tạo DRAFT `Submission` cho mỗi `ClassMember`.

**INDIVIDUAL type:** dùng `AssignmentAssignee` để chỉ định từng học sinh.

### Submission
```
id, assignmentId, userId,
status (DRAFT | SUBMITTED | GRADED),
answers (Json),                  ← { questionId: answer }
autoScore (Float?),               ← chấm trắc nghiệm tự động
finalScore (Float?),
textContent (String?),            ← nội dung tự luận
mediaUrls (String[]),             ← video upload URLs
attempt (Int, default 1),
submittedAt, createdAt, updatedAt
@@unique([assignmentId, userId])
```

### Grade
```
id, submissionId, teacherId,
scores (Json),                    ← { questionId: { score, comment, tags } }
totalScore (Float),
overallComment (String?),
passed (Boolean),
score (Float?),                   ← điểm tổng
comment (String?),
reassign (Boolean, default false),
sentAt, gradedAt
@@unique(submissionId)
```

### Question + AssignmentQuestion
`Question` model lưu câu hỏi. `AssignmentQuestion` join assignment ↔ question.
Teacher gắn câu hỏi vào assignment khi tạo.

## Teacher Flow

### 1. Create Assignment (`POST /api/admin/assignments`)
```ts
{
  classId, title, description,
  deadline: Date,
  assignType: "CLASS" | "INDIVIDUAL",
  xpReward?: number,
  maxAttempts?: number,
  allowLate?: boolean,
  allowReview?: boolean,
  questions: string[]  // question IDs (optional)
}
```
- Tạo assignment
- Nếu `assignType === "CLASS"`: upsert DRAFT `Submission` cho mỗi `ClassMember`
- Gửi `Notification` cho tất cả assigned students

### 2. View Submissions (`GET /api/admin/assignments/[id]`)
```ts
Response: {
  assignment: Assignment,
  submissions: {
    id, userId, userName, userEmail,
    status, attempt, submittedAt,
    grade?: Grade
  }[]
}
```
- Filter: pending grade / all
- Stats: submitted count, avg score, pass rate

### 3. Grade (`POST /api/admin/assignments/[id]/grade/[submissionId]`)
```ts
Request: {
  scores: Json,          // { [questionId]: { score, comment } }
  totalScore: number,    // 0-100
  passed: boolean,
  comment?: string,
  reassign?: boolean     // giao lại bài
}
```
Actions:
1. Create `Grade` record
2. Update `Submission.status = "GRADED"`
3. If `passed`: `addXP(userId, XP_REWARDS.ASSIGNMENT_SUBMIT + ASSIGNMENT_PERFECT)`
4. Send `Notification` "Bài đã được chấm"

### 4. Edit Assignment (`PUT /api/admin/assignments/[id]`)
- Thay đổi deadline, mô tả, maxAttempts
- Không thay đổi questions sau khi có submission

## Student Flow

### 1. View Assignments (`GET /api/student/assignments`)
```ts
Filter: ?filter=pending | submitted | graded
Response: {
  items: AssignmentWithSubmission[],
  weeklyStats: { submitted, pending, graded },
  pagination
}
```

### 2. View Assignment Detail (`GET /api/student/assignments/[id]`)
- Assignment info + questions
- Current submission (DRAFT hoặc đã nộp)
- Auto-save draft mỗi 30s

### 3. Submit (`POST /api/student/assignments/[id]/submit`)
```ts
Request: {
  answers: Json,          // { [questionId]: answer }
  textContent?: string,
  mediaUrls?: string[]
}
```
- Validate deadline (trễ nếu `allowLate = false`)
- Update `Submission.status = "SUBMITTED"`, `submittedAt = now`
- `addXP(userId, XP_REWARDS.ASSIGNMENT_SUBMIT)`
- `updateStreak(userId)`

### 4. Video Upload (`POST /api/student/upload-video`)
```
Content-Type: multipart/form-data
File: video (max 50MB, MP4/WebM/MOV/AVI)
Response: { url: string }
```
Lưu vào `public/uploads/videos/`.

## UI Pages

### Teacher: `/admin/assignments`
- List: deadline, type badge, submitted/total, pending grade count
- Filter: all / upcoming / overdue
- "Chấm ngay" quick action cho pending submissions

### Teacher: `/admin/assignments/new`
Form tạo bài tập:
- Title, description (rich text)
- Class selector
- Deadline datetime picker
- Questions selector (từ question bank)
- Options: allow late, max attempts, XP reward

### Teacher: `/admin/assignments/[id]/grade/[submissionId]`
- Student info header
- Mỗi câu hỏi: nội dung + câu trả lời + input chấm điểm + comment
- Tổng điểm auto-calculated
- Pass/Fail toggle
- Gửi kết quả

### Student: `/home/student/assignments`
- Tabs: pending / submitted / graded
- Deadline countdown badge
- Weekly stats bar

### Student: `/home/student/assignments/[id]`
- Assignment description + attached images
- Questions list
- Rich text editor cho textContent
- File/video upload
- Draft auto-save indicator
- Submit button (disabled nếu deadline passed + not allowLate)

## XP Rewards

| Sự kiện | XP |
|---|---|
| Nộp bài | 30 |
| Đạt điểm tuyệt đối (bonus) | 20 |
