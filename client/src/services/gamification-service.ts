import { apiRequest } from "@/lib/queryClient";
import { Achievement, UserStats } from "@shared/schema";

export class GamificationService {
  static async addXP(userId: string, amount: number, source: string): Promise<UserStats> {
    const response = await apiRequest("POST", "/api/gamification/add-xp", {
      userId,
      amount,
      source,
    });
    return response.json();
  }

  static async updateStreak(userId: string): Promise<{ streak: number; bonus: number }> {
    const response = await apiRequest("POST", "/api/gamification/update-streak", {
      userId,
    });
    return response.json();
  }

  static async checkAchievements(userId: string): Promise<Achievement[]> {
    const response = await apiRequest("POST", "/api/gamification/check-achievements", {
      userId,
    });
    return response.json();
  }

  static async unlockAchievement(
    userId: string,
    achievementId: string
  ): Promise<{ success: boolean; xpReward: number }> {
    const response = await apiRequest("POST", "/api/gamification/unlock-achievement", {
      userId,
      achievementId,
    });
    return response.json();
  }

  static async getLeaderboard(
    timeframe: "daily" | "weekly" | "monthly",
    limit: number = 10
  ): Promise<Array<{ userId: string; username: string; xp: number; rank: number }>> {
    const response = await apiRequest("GET", `/api/gamification/leaderboard?timeframe=${timeframe}&limit=${limit}`);
    return response.json();
  }

  static async getUserStats(userId: string): Promise<UserStats> {
    const response = await apiRequest("GET", `/api/gamification/stats/${userId}`);
    return response.json();
  }
}
