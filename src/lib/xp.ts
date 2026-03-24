// src/lib/xp.ts

export const LEVELS = [
  { name: "Học sinh mới", min: 0,     color: "text-gray-500"    },
  { name: "Đồng",         min: 300,   color: "text-amber-600"   },
  { name: "Bạc",          min: 1000,  color: "text-slate-400"   },
  { name: "Vàng",         min: 3000,  color: "text-yellow-500"  },
  { name: "Bạch Kim",     min: 7500,  color: "text-cyan-400"    },
  { name: "Kim Cương",    min: 15000, color: "text-purple-500"  },
];

export function getLevelFromXP(xp: number) {
  let current = LEVELS[0];
  for (const level of LEVELS) {
    if (xp >= level.min) current = level;
    else break;
  }
  const idx = LEVELS.indexOf(current);
  const next = LEVELS[idx + 1];
  return {
    current,
    next,
    progress: next ? Math.round(((xp - current.min) / (next.min - current.min)) * 100) : 100,
  };
}

// XP rewards
export const XP_REWARDS = {
  LESSON_COMPLETE:   20,
  QUIZ_CORRECT:       5,
  QUIZ_STREAK_BONUS: 10,   // khi streak >= 5
  ASSIGNMENT_SUBMIT: 30,
  ASSIGNMENT_PERFECT: 20,  // bonus khi 100%
  DAILY_STREAK:      10,
  COURSE_COMPLETE:  100,
};

export async function addXP(prisma: any, userId: string, amount: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Cộng XP cho user
  const user = await prisma.user.update({
    where: { id: userId },
    data: { xp: { increment: amount } },
    select: { xp: true },
  });

  // Ghi daily activity
  await prisma.dailyActivity.upsert({
    where: { userId_date: { userId, date: today } },
    create: { userId, date: today, xpEarned: amount },
    update: { xpEarned: { increment: amount } },
  });

  // Cập nhật level
  const { current } = getLevelFromXP(user.xp);
  await prisma.user.update({
    where: { id: userId },
    data: { level: current.name },
  });

  return user.xp;
}

export async function updateStreak(prisma: any, userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { streakDays: true, maxStreak: true, lastStudyDate: true },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const last = user.lastStudyDate ? new Date(user.lastStudyDate) : null;
  if (last) last.setHours(0, 0, 0, 0);

  let newStreak = user.streakDays;

  if (!last || last < yesterday) {
    // Bỏ hôm qua → reset streak
    newStreak = 1;
  } else if (last.getTime() === yesterday.getTime()) {
    // Học đúng hôm qua → tăng streak
    newStreak = user.streakDays + 1;
  }
  // last === today → không thay đổi

  await prisma.user.update({
    where: { id: userId },
    data: {
      streakDays:    newStreak,
      maxStreak:     Math.max(newStreak, user.maxStreak),
      lastStudyDate: today,
    },
  });

  return newStreak;
}
