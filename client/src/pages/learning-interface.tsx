import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Clock } from "lucide-react";
import { Language, LessonWithProgress } from "@shared/schema";
import LearningModeSelector from "@/components/learning-mode-selector";
import LessonContent from "@/components/lesson-content";
import AchievementPanel from "@/components/achievement-panel";
import UserProgress from "@/components/user-progress";

interface LearningInterfaceParams {
  languageId: string;
  mode?: string;
}

export default function LearningInterface() {
  const params = useParams<LearningInterfaceParams>();
  const [, setLocation] = useLocation();
  
  const { data: language, isLoading: languageLoading } = useQuery<Language>({
    queryKey: ["/api/languages", params.languageId],
  });

  const { data: currentLesson, isLoading: lessonLoading } = useQuery<LessonWithProgress>({
    queryKey: ["/api/lessons/current", params.languageId, params.mode || "listen"],
  });

  const handleBackToHub = () => {
    setLocation("/");
  };

  if (languageLoading || lessonLoading) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gray-200 rounded-xl"></div>
              <div className="space-y-2">
                <div className="h-6 bg-gray-200 rounded w-32"></div>
                <div className="h-4 bg-gray-200 rounded w-24"></div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="h-96 bg-gray-200 rounded-xl"></div>
          </div>
        </div>
      </main>
    );
  }

  if (!language) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Language not found</h2>
          <button 
            onClick={handleBackToHub}
            className="text-primary hover:text-primary/80 transition-colors"
          >
            ← Back to Language Hub
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Language Header */}
      <div className="flex items-center justify-between bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center space-x-4">
          <button 
            onClick={handleBackToHub}
            className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center justify-center transition-colors"
            data-testid="back-to-hub-btn"
          >
            <ArrowLeft className="text-gray-600" size={20} />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {language.nativeName} ({language.name})
            </h2>
            <p className="text-sm text-gray-500">{language.region}</p>
          </div>
        </div>
        
        <UserProgress languageId={params.languageId} />
      </div>

      {/* Learning Mode Selector */}
      <LearningModeSelector 
        currentMode={params.mode || "listen"} 
        languageId={params.languageId}
      />

      {/* Current Lesson */}
      {currentLesson && (
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">{currentLesson.title}</h3>
              <p className="text-gray-500">{currentLesson.level} • {currentLesson.category}</p>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Clock size={16} />
              <span>{currentLesson.duration} min</span>
            </div>
          </div>

          <LessonContent 
            lesson={currentLesson} 
            mode={params.mode || "listen"}
          />
        </div>
      )}

      {/* Achievement Panel */}
      <AchievementPanel languageId={params.languageId} />
    </main>
  );
}
