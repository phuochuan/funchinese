# AI Quiz

## Overview

Quiz cá nhân hóa cho student, sinh từ **approved AI questions** dựa trên từ vựng đã học. Dùng **Claude API** (Anthropic) để tạo câu hỏi.

## Data Model

### AiQuestion
```
id, vocabularyId, vocabulary (relation)
questionText: string    // "学习 có nghĩa là gì?"
correctAnswer: string   // nghĩa đúng hoặc chữ Hán
options: Json           // ["A. Học", "B. Ăn", "C. Ngủ", "D. Chơi"]
hskLevel (1-6), type (QuestionType)
explanation: string?
imageUrl: string?       // URL ảnh minh hoạ từ AI tạo
difficulty: "easy"|"medium"|"hard"
generatedBy: "claude"|"Claude"|"gpt4"
status: "pending"|"approved"|"rejected"  ← teacher phê duyệt
reviewedBy, reviewedAt
promptUsed, createdAt
```

## AI Question Generation

### Single (`POST /api/admin/ai-questions/generate`)
Teacher chọn 1 từ vựng → sinh câu hỏi cho từ đó.

### Batch (`POST /api/admin/ai-questions/generate-batch`)
```ts
Request: { vocabularyIds: string[] }
```
- Xử lý từng batch 10 từ
- Mỗi từ sinh 4-5 câu hỏi các loại:
  1. **MEANING** — hỏi nghĩa tiếng Việt
  2. **PINYIN** — hỏi cách đọc
  3. **FILL_IN_BLANK** — điền vào chỗ trống
  4. **USAGE** — dùng từ trong câu
  5. **COMPARISON** — so sánh từ gần nghĩa
- System prompt yêu cầu: HSK1-3 vocabulary, age-appropriate, 4 options rõ ràng
- Image: thử Wikimedia Commons API, fallback → Picsum
- Audio: auto-generate Edge-TTS cho từ đó
- **Fallback:** nếu Claude API lỗi → dùng local generation

## Teacher AI Questions UI

**`/admin/ai-questions`**

| Filter | Mô tả |
|---|---|
| Status | pending / approved / rejected |
| HSK | HSK1-6 |
| Search | tìm theo từ vựng |

Features:
- Stats bar: Tổng / Pending / Approved / Rejected
- Bulk approve/reject (chọn nhiều → action)
- Per-row approve/reject buttons
- Xem chi tiết câu hỏi + image + explanation

## Student AI Quiz Flow

### Setup (`/home/student/ai-quiz`)
- Stats: số câu hỏi có sẵn theo từng HSK level
- Chọn HSK level để quiz
- Chọn thời gian
- Nút "Bắt đầu"

### Start (`POST /api/student/ai-quiz`)
```ts
Request: { hskLevel: number, durationMin: number }
```
1. Fetch approved `AiQuestion` records cho user's vocabulary ở level đó
2. Shuffle + take limit based on duration (≈ 1 câu/min)
3. Create `PracticeSession` (reuse model, source = "ai-quiz")
4. Return sessionId

### Active Quiz (`/home/student/ai-quiz/[sessionId]`)
Khác với HSK quiz:
- **Full-screen purple theme**
- Câu hỏi có thể có `imageUrl` (hiển thị ảnh minh hoạ)
- Audio playback cho listening-type questions
- Timer countdown

### Submit + Review (`/home/student/ai-quiz/[sessionId]/review`)
- Accuracy %
- Per-question review: đáp án đúng + explanation + image
- XP earned + streak

## API Reference

| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| GET | `/api/student/ai-quiz` | Student | Available counts by HSK |
| POST | `/api/student/ai-quiz` | Student | Start AI quiz session |
| GET | `/api/student/ai-quiz/[sessionId]` | Student | Session status + remaining time |
| POST | `/api/student/ai-quiz/[sessionId]` | Student | Submit answers |
| GET | `/api/admin/ai-questions` | Teacher | List AI questions |
| POST | `/api/admin/ai-questions` | Teacher | Bulk approve/reject |
| GET | `/api/admin/ai-questions/[id]` | Teacher | Single AI question |
| PUT | `/api/admin/ai-questions/[id]` | Teacher | Edit AI question |
| DELETE | `/api/admin/ai-questions/[id]` | Teacher | Delete |
| POST | `/api/admin/ai-questions/generate` | Teacher | Generate for 1 vocab |
| POST | `/api/admin/ai-questions/generate-batch` | Teacher | Batch generate |

## Claude API Integration

```ts
// src/lib/ai.ts (conceptual)
const response = await fetch("https://api.anthropic.com/v1/messages", {
  headers: {
    "x-api-key": process.env.ANTHROPIC_API_KEY,
    "anthropic-version": "2023-06-01",
    "anthropic-dangerous-direct-browser-access": "true",
  },
  body: JSON.stringify({
    model: "claude-opus-4-5",
    max_tokens: 4096,
    system: "You are a Chinese language teacher creating HSK quiz questions...",
    messages: [{ role: "user", content: prompt }]
  })
})
```

Fallback: local template-based generation nếu API fail.
