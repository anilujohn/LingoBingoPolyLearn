import { useQuery } from "@tanstack/react-query";
import LanguageCard from "@/components/language-card";
import { Plus, ChevronRight } from "lucide-react";
import { LanguageWithProgress } from "@shared/schema";

interface RecentActivity {
  id: string;
  title: string;
  language: string;
  level: string;
  progress: number;
  totalLessons: number;
  completedLessons: number;
}

export default function LanguageHub() {
  const { data: languages, isLoading: languagesLoading } = useQuery<LanguageWithProgress[]>({
    queryKey: ["/api/languages/with-progress"],
  });

  const { data: recentActivities, isLoading: activitiesLoading } = useQuery<RecentActivity[]>({
    queryKey: ["/api/user/recent-activities"],
  });

  if (languagesLoading) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-8">
          <div className="text-center space-y-4">
            <div className="h-8 bg-gray-200 rounded w-64 mx-auto"></div>
            <div className="h-6 bg-gray-200 rounded w-96 mx-auto"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl shadow-lg p-6">
                <div className="h-48 bg-gray-200 rounded-xl mb-4"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-bold text-gray-900">Choose Your Learning Path</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto text-balance">
            Select a language and region to start your personalized learning journey with 
            real-world context and cultural insights.
          </p>
        </div>

        {/* Language Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {languages?.map((language) => (
            <LanguageCard key={language.id} language={language} />
          ))}
          
          {/* Add Language Card */}
          <div 
            className="bg-white rounded-2xl border-2 border-dashed border-gray-300 hover:border-primary transition-all duration-300 cursor-pointer group"
            data-testid="add-language-card"
          >
            <div className="h-full flex flex-col items-center justify-center p-8 space-y-4">
              <div className="w-16 h-16 bg-gray-100 group-hover:bg-primary/10 rounded-2xl flex items-center justify-center transition-colors">
                <Plus className="text-2xl text-gray-400 group-hover:text-primary transition-colors" size={32} />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">More Languages</h3>
                <p className="text-sm text-gray-500">
                  Spanish, French, Mandarin, Arabic, and many more coming soon!
                </p>
              </div>
              <button className="text-primary font-medium text-sm hover:text-primary/80 transition-colors" data-testid="request-language-btn">
                Request Language
              </button>
            </div>
          </div>
        </div>

        {/* Recent Activity Section */}
        {recentActivities && recentActivities.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Continue Where You Left Off</h3>
              <button 
                className="text-primary text-sm font-medium hover:text-primary/80 transition-colors"
                data-testid="view-all-activities-btn"
              >
                View All
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recentActivities.map((activity) => (
                <div 
                  key={activity.id}
                  className="flex items-center space-x-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
                  data-testid={`activity-${activity.id}`}
                >
                  <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                    <span className="text-lg font-medium">{activity.language.substring(0, 2)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 truncate">{activity.title}</h4>
                    <p className="text-sm text-gray-500">{activity.language} • {activity.level}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-secondary rounded-full transition-all duration-500" 
                          style={{ width: `${activity.progress}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-500">
                        {activity.completedLessons}/{activity.totalLessons} lessons
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="text-gray-400" size={20} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
