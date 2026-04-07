# XP & Gamification System

## Overview

Hệ thống điểm thưởng và cấp bậc khuyến khích học sinh học tập đều đặn.

## XP Rewards

```ts
XP_REWARDS = {
  LESSON_COMPLETE:    20,   // hoàn thành 1 bài học
  QUIZ_CORRECT:        5,   // mỗi đáp án đúng trong quiz
  QUIZ_STREAK_BONUS:  10,   // khi streak câu trả lời ≥ 5
  ASSIGNMENT_SUBMIT:  30,   // nộp bài tập
  ASSIGNMENT_PERFECT: 20,   // bonus khi đạt điểm tuyệt đối
  DAILY_STREAK:       10,   // học đều đặn mỗi ngày
  COURSE_COMPLETE:   100,   // hoàn thành 1 khóa học
}
```

## Levels

| Level | Tên | XP tối thiểu | Icon | Màu |
|---|---|---|---|---|
| 0 | Học sinh mới | 0 | seedling | gray |
| 1 | Đồng | 300 | bronze-medal | amber |
| 2 | Bạc | 1,000 | silver-medal | slate |
| 3 | Vàng | 3,000 | gold-medal | yellow |
| 4 | Bạch Kim | 7,500 | platinum | cyan |
| 5 | Kim Cương | 15,000 | diamond | purple |

`getLevelFromXP(xp)` trả về:
```ts
{
  current: { name, min, color },
  next: { name, min, color } | null,
  progress: number  // 0-100 (phần trăm tiến độ đến level tiếp)
}
```

## Streak System

### Data Model
```
User.streakDays    Int       ← số ngày liên tiếp
User.maxStreak     Int       ← kỷ lục streak
User.lastStudyDate DateTime  ← ngày học cuối
```

### Update Logic (`updateStreak(prisma, userId)`)
```ts
today = date(today)
yesterday = today - 1 day
lastStudy = date(user.lastStudyDate)

if (!lastStudy || lastStudy < yesterday):
  // Bỏ qua ≥1 ngày → reset
  newStreak = 1
elif lastStudy === yesterday:
  // Học đúng hôm qua → tăng streak
  newStreak = user.streakDays + 1
else:
  // lastStudy === today → không thay đổi (tránh spam)
```

Sau đó:
```ts
update user: {
  streakDays: newStreak,
  maxStreak: Math.max(newStreak, user.maxStreak),
  lastStudyDate: today
}
```

### Daily XP (`addXP(prisma, userId, amount)`)
- `User.xp += amount`
- `User.level` = current level name (recalculated from XP)
- `DailyActivity.upsert({ userId, date: today })` → `xpEarned += amount`

## Daily Activity Tracking

Model `DailyActivity`:
```
userId, date (unique), xpEarned, wordsLearned, minutesStudied
```

Dùng cho:
- **Heatmap** trên dashboard (calendar view)
- **Weekly stats** trong assignment list
- **Analytics** trong admin dashboard

## Badges

### Model
```
Badge:   id, name, description, iconUrl, condition:Json
UserBadge: userId, badgeId, earnedAt
```

`condition` JSON format:
```ts
{ type: "streak", value: 7 }           // streak 7 ngày
{ type: "quiz_score", value: 100 }    // đạt 100% quiz
{ type: "words_learned", value: 100 } // học 100 từ
{ type: "lessons_completed", value: 10 }
```

Badge awarding logic check trong các API:
- `updateStreak()` → check streak badges
- Quiz submit → check score badges
- Lesson complete → check lesson count badges

## XP Sources Summary

| Nguồn | Sự kiện | XP |
|---|---|---|
| **Lesson** | Hoàn thành bài | 20 |
| **Quiz** | Mỗi đáp án đúng | 5 |
| **Quiz** | Streak ≥ 5 câu | 10 |
| **Quiz** | Hoàn thành session | streak bonus |
| **Assignment** | Nộp bài | 30 |
| **Assignment** | Đạt 100% | 20 |
| **Course** | Hoàn thành khóa | 100 |
| **Daily** | Học đều mỗi ngày | 10 |

## Dashboard Display

Student dashboard hiển thị:
- Progress bar XP đến level tiếp theo (%)
- Current level badge + name
- Streak flame icon + số ngày
- Today's XP earned
- Heatmap calendar (30 ngày gần nhất)
- Weak words count (words có timesWrong > timesCorrect)

## Library (`src/lib/xp.ts`)

```ts
// Lấy thông tin level
getLevelFromXP(xp: number): LevelInfo

// Cộng XP + cập nhật daily activity + level
addXP(prisma, userId, amount): Promise<number>

// Cập nhật streak
updateStreak(prisma, userId): Promise<number>

// Constants
LEVELS: Level[]
XP_REWARDS: Record<string, number>
```
