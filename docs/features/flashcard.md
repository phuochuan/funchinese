# Flashcard & Spaced Repetition (SM-2)

## Overview

Hệ thống flashcard dùng thuật toán **SM-2** (SuperMemo 2) để lập lịch ôn từ vựng tối ưu theo khoảng cách thời gian.

## Data Models

### Vocabulary
Từ vựng gốc HSK:
```
hanzi, pinyin, hanViet, meaningVi, exampleSentence, audioUrl, hskLevel, wordType
```

### UserVocabulary
Bản ghi spaced repetition cho mỗi user ↔ từ:
```
userId, vocabularyId, timesCorrect, timesWrong,
easeFactor (Float, default 2.5),   ← độ khó mới nhớ
interval (Int, default 1),          ← số ngày đến lần ôn tiếp
nextReviewAt (DateTime),             ← khi nào cần ôn
lastSeenAt (DateTime)
```

## Memory Levels (6 cấp độ)

| Level | Label | Điều kiện | Màu |
|---|---|---|---|
| 0 | Từ mới | Chưa có `UserVocabulary` | gray |
| 1 | Cần ôn | `nextReviewAt <= now` hoặc `interval == 0` | red |
| 2 | 1 ngày | `interval == 1` | orange |
| 3 | 2-3 ngày | `interval in [2, 3]` | amber |
| 4 | 1 tuần | `interval in [4, 7]` | green |
| 5 | 1 tháng+ | `interval >= 8` | blue |

## SM-2 Algorithm

Mỗi lần student đánh giá flashcard (đúng/sai):

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

**Giải thích:**
- Đúng: nhân khoảng cách với easeFactor (mỗi lần nhớ tăng 0.1)
- Sai: reset về 1 ngày, ease giảm 0.2
- easeFactor luôn ≥ 1.3 (không xuống quá thấp)

## API Endpoints

### `GET /api/student/flashcard`
Lấy danh sách từ cần ôn theo bucket (filter `?hsk=HSK1`):

```ts
Response: {
  overdue: VocabularyWithUserRecord[],   // Level 1 — quá hạn
  oneDay: VocabularyWithUserRecord[],     // Level 2 — 1 ngày
  twoThreeDays: VocabularyWithUserRecord[], // Level 3
  oneWeek: VocabularyWithUserRecord[],    // Level 4
  oneMonth: VocabularyWithUserRecord[],   // Level 5
  newWords: VocabularyWithUserRecord[],   // Level 0 — từ mới
}
```

### `POST /api/student/flashcard`
Cập nhật SM-2 sau khi đánh giá:

```ts
Request: { vocabId: string, correct: boolean }
Response: { interval: number, nextReviewAt: string, easeFactor: number }
```

### `GET /api/student/flashcard/stats`
Thống kê flashcard:

```ts
Response: {
  byLevel: { level: 0-5, count: number, label: string, color: string }[],
  byHsk: { hskLevel: string, learned: number, total: number }[],
  totalLearned: number,
  newWords: number,
  masteryPercentage: number,  // từ đã đạt level 4+
}
```

## Student UI

### Library Page (`/home/student/flashcard`)
- Daily task card (số từ cần ôn hôm nay)
- Memory bar chart 6 levels
- HSK breakdown (mỗi cấp bao nhiêu từ đã học/tổng)
- Nút "Học" để bắt đầu session

### Active Session (`/home/student/flashcard/[hskLevel]`)
- 3D flip card (Space để lật)
- 4 nút đánh giá: Sai (←) / Khó / Đúng / Dễ (→)
- Progress bar (đang ở từ thứ mấy / tổng)
- Kết quả: accuracy %, XP earned, weak words list

## Seed Vocabulary (Lesson Complete)

Khi student hoàn thành lesson → `POST /api/lessons/[id]/complete`:
→ Upsert `UserVocabulary` cho mỗi từ trong bài (không ghi đè spaced repetition đã có).

## TTS

Mỗi từ có `audioUrl` (đã generate sẵn). Card hiển thị nút phát âm.
