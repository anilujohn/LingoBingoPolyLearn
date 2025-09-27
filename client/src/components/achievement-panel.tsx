import { useQuery } from "@tanstack/react-query";
import { Flame, Trophy, Star } from "lucide-react";

interface AchievementPanelProps {
  languageId: string;
}

interface UserAchievements {
  streak: number;
  recentBadge?: {
    name: string;
    xpReward: number;
    isNew: boolean;
  };
  weeklyXP: number;
  weeklyRank: string;
}

export default function AchievementPanel({ languageId }: AchievementPanelProps) {
  const { data: achievements } = useQuery<UserAchievements>({
    queryKey: ["/api/user/achievements", languageId],
  });

  if (!achievements) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-gray-200 rounded-2xl p-6 h-32"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Streak Card */}
      <div className="gradient-accent rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <Flame size={24} />
          <span className="text-sm bg-white/20 px-2 py-1 rounded-full">Active</span>
        </div>
        <h4 className="font-semibold mb-1">Streak Master</h4>
        <p className="text-sm opacity-90 mb-3">Keep your learning streak alive!</p>
        <div className="text-2xl font-bold" data-testid="streak-display">
          {achievements.streak} days
        </div>
      </div>

      {/* Recent Achievement Card */}
      <div className="gradient-secondary rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <Trophy size={24} />
          {achievements.recentBadge?.isNew && (
            <span className="text-sm bg-white/20 px-2 py-1 rounded-full">New!</span>
          )}
        </div>
        <h4 className="font-semibold mb-1">
          {achievements.recentBadge?.name || "No Recent Badge"}
        </h4>
        <p className="text-sm opacity-90 mb-3">
          {achievements.recentBadge 
            ? "Great progress on your learning journey!" 
            : "Complete lessons to earn badges"
          }
        </p>
        <div className="text-sm font-medium" data-testid="recent-badge-xp">
          {achievements.recentBadge ? `+${achievements.recentBadge.xpReward} XP earned` : "Keep learning!"}
        </div>
      </div>

      {/* Weekly XP Card */}
      <div className="gradient-primary rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <Star size={24} />
          <span className="text-sm bg-white/20 px-2 py-1 rounded-full">Progress</span>
        </div>
        <h4 className="font-semibold mb-1">XP Champion</h4>
        <p className="text-sm opacity-90 mb-3">
          You're in the {achievements.weeklyRank} this week
        </p>
        <div className="text-2xl font-bold" data-testid="weekly-xp">
          {achievements.weeklyXP.toLocaleString()} XP
        </div>
      </div>
    </div>
  );
}
