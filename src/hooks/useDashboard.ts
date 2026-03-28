// src/hooks/useDashboard.ts
import { useEffect, useState } from "react";

export interface DashboardData {
  user: {
    id: string;
    name: string;
    image: string | null;  // app avatar (falls back to Keycloak image)
    xp: number;
    level: string;
    streakDays: number;
    maxStreak: number;
    levelInfo: {
      current: { name: string; min: number; color: string };
      next:    { name: string; min: number; color: string } | null;
      progress: number;
    };
  };
  stats: {
    wordsLearned:      number;
    assignmentsGraded: number;
    quizAvgScore:      number;
    leaderboardRank:   number;
  };
  xpToday: { earned: number; goal: number };
  upcomingAssignments: {
    id: string;
    title: string;
    description: string | null;
    deadline: string;
    class: { name: string };
    _count: { questions: number };
  }[];
  dailyActivity: {
    date: string;
    xpEarned: number;
    wordsLearned: number;
  }[];
  continueLesson: {
    id: string;
    title: string;
    titleChinese: string | null;
    pinyin: string | null;
    chapter: { course: { title: string } };
  } | null;
  notifications: {
    id: string;
    type: string;
    title: string;
    body: string;
    link: string | null;
    createdAt: string;
  }[];
}

export function useDashboard() {
  const [data, setData]       = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchDashboard() {
      try {
        const res = await fetch("/api/student/dashboard", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to fetch dashboard");
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch (err) {
        if (!cancelled) setError("Không thể tải dữ liệu");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchDashboard();
    return () => { cancelled = true; };
  }, []);

  return { data, loading, error, refetch: () => setLoading(true) };
}
