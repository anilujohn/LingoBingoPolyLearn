import { useQuery } from "@tanstack/react-query";

interface UserProgressProps {
  languageId: string;
}

interface ProgressData {
  todayProgress: number;
  currentLevel: number;
  nextLevelXP: number;
  currentXP: number;
}

export default function UserProgress({ languageId }: UserProgressProps) {
  const { data: progress } = useQuery<ProgressData>({
    queryKey: ["/api/user/progress", languageId],
  });

  if (!progress) {
    return (
      <div className="flex items-center space-x-4 animate-pulse">
        <div className="text-right">
          <div className="w-24 h-4 bg-gray-200 rounded mb-1"></div>
          <div className="w-32 h-2 bg-gray-200 rounded"></div>
        </div>
        <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
      </div>
    );
  }

  const progressPercentage = (progress.currentXP / progress.nextLevelXP) * 100;

  return (
    <div className="flex items-center space-x-4">
      <div className="text-right">
        <div className="text-sm text-gray-500">Today's Progress</div>
        <div className="flex items-center space-x-2">
          <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-secondary rounded-full transition-all duration-500" 
              style={{ width: `${progress.todayProgress}%` }}
              data-testid="today-progress-bar"
            ></div>
          </div>
          <span className="text-sm font-medium text-secondary" data-testid="today-progress-text">
            {progress.todayProgress}%
          </span>
        </div>
      </div>
      <div className="w-12 h-12 gradient-secondary rounded-xl flex items-center justify-center">
        <span className="text-white font-bold text-lg" data-testid="current-level">
          {progress.currentLevel}
        </span>
      </div>
    </div>
  );
}
