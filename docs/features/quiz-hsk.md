# HSK Timed Quiz

## Overview

Quiz có timer lấy câu hỏi ngẫu nhiên từ ngân hàng `hsk_questions`, chấm điểm, trao XP và cập nhật streak.

## Data Model

### HskQuestion
```
id, code (Q-NNNN), hanzi, pinyin, meaningVi, meaningEn,
hskLevel (1-6), type (QuestionType),
options (Json),         ← ["A: ...", "B: ...", "C: ...", "D: ..."]
answer (String),         ← "A" | "B" | "C" | "D"
explanation, audioUrl, category, tags
```

### PracticeSession
```
id, userId, level (HSK 1-6), durationSelected (min),
expiresAt, questions (Json), status ("doing"|"submitted"|"expired"),
score, correctCount, totalQuestions, results (Json),
xpEarned, createdAt
```

`questions` Json format:
```ts
[{
  id: string, hanzi: string, pinyin: string,
  question: string,         // câu hỏi đã được normalize
  options: string[],        // ["A. Học", "B. Ăn", ...]
  correctAnswer: string,    // nghĩa (không phải A/B/C/D!)
  originalAnswer: string   // "A" (letter gốc)
}]
```

### QuizSession (canonical log)
```
id, userId, mode, source, totalQ, correctQ,
xpEarned, durationSec, results (Json), createdAt
```

## Quiz Flow

### 1. Start Quiz
**`POST /api/practice/start`**
```ts
Request: { hskLevel: 1-6, durationMin: 5|10|15 }
```
- Chọn ngẫu nhiên N câu hỏi từ `hsk_questions` (giới hạn bởi duration)
- **Normalize:** Với mỗi câu, lấy nghĩa tương ứng với letter `answer` → lưu vào `correctAnswer`
- `expiresAt = now + durationSelected * 60000`
- `status = "doing"`

**`GET /api/practice/[sessionId]`** → trả questions (chỉ question, không trả đáp án)

### 2. Answer Questions
Client gửi `POST /api/practice/[sessionId]` với các câu trả lời.
Server kiểm tra `expiresAt` — nếu quá hạn → `status = "expired"`.

### 3. Submit
**`POST /api/practice/[sessionId]/submit`**
```ts
Request: { answers: { [questionId]: "A"|"B"|"C"|"D" } }
```

Logic chấm điểm:
```ts
for each question:
  correct = normalize(userAnswer) === normalize(correctAnswer)  // so sánh nghĩa
  update QuizSession.results

correctCount = results.filter(r => r.correct).length
score = Math.round((correctCount / totalQ) * 100)

// XP
xpEarned = correctCount * XP_REWARDS.QUIZ_CORRECT
if (streak >= 5) xpEarned += XP_REWARDS.QUIZ_STREAK_BONUS
await addXP(prisma, userId, xpEarned)

// Streak
await updateStreak(prisma, userId)

// Update UserVocabulary (SM-2) nếu câu hỏi liên quan từ vựng
// → POST /api/practice/session (POST)
// upsert: timesCorrect++, nextReviewAt tính lại
```

### 4. Session Management
**`POST /api/practice/next`** — lấy thêm câu hỏi khi gần hết (tránh trùng).

**`GET /api/practice/session`** — lấy kết quả session: by `?sessionId=`, `?lessonId=`, `?hsk=`, `?weak=true`.

## Student UI

### Setup Page (`/home/student/quiz`)
- Chọn HSK level (1-6, checkbox)
- Chọn thời gian: 5 / 10 / 15 phút
- Nút "Bắt đầu" → tạo session → redirect

### Active Quiz (`/home/student/quiz/[sessionId]`)
- Timer countdown (hiện số phút còn lại)
- Progress bar: câu thứ X / tổng
- 4 đáp án (A/B/C/D)
- Navigation dots (jump to question)
- Auto-submit khi hết giờ

### Review Page (`/home/student/quiz/[sessionId]/review`)
- Accuracy: X%
- XP earned + streak badge
- Tabs: Tất cả / Đúng / Sai
- Mỗi câu: highlight đáp án đúng/sai + explanation + TTS

## XP Rewards

| Sự kiện | XP |
|---|---|
| Mỗi đáp án đúng | +5 |
| Streak bonus (≥5) | +10 |
| Hoàn thành quiz | streak + daily streak |

## Notes

- `answer` trong `HskQuestion` là letter `"A"-"D"`, **KHÔNG phải** nghĩa
- API start session normalize: `hskQuestion.meaningVi` theo letter → `correctAnswer`
- Mỗi user chỉ có 1 `PracticeSession` đang active (`status = "doing"`)
