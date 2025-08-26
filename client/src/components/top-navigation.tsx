import { useQuery } from "@tanstack/react-query";
import { Globe, Flame, Star } from "lucide-react";
import { UserStats } from "@shared/schema";

export default function TopNavigation() {
  const { data: userStats } = useQuery<UserStats>({
    queryKey: ["/api/user/stats"],
  });

  return (
    <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center">
                <Globe className="text-white" size={20} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">PolyLearn</h1>
                <p className="text-xs text-gray-500">Master Any Language</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2 bg-orange-50 px-3 py-1 rounded-full">
              <Flame className="text-orange-500" size={16} />
              <span className="text-sm font-semibold text-orange-700" data-testid="streak-counter">
                {userStats?.streak || 0}
              </span>
              <span className="text-xs text-orange-600">day streak</span>
            </div>
            
            <div className="flex items-center space-x-2 bg-yellow-50 px-3 py-1 rounded-full">
              <Star className="text-yellow-500" size={16} />
              <span className="text-sm font-semibold text-yellow-700" data-testid="xp-counter">
                {userStats?.xp?.toLocaleString() || 0}
              </span>
              <span className="text-xs text-yellow-600">XP</span>
            </div>
            
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors" data-testid="user-avatar">
              <span className="text-white text-sm font-semibold">U</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
