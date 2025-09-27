import { useLocation } from "wouter";
import { Users, Trophy } from "lucide-react";
import { LanguageWithProgress } from "@shared/schema";

interface LanguageCardProps {
  language: LanguageWithProgress;
}

export default function LanguageCard({ language }: LanguageCardProps) {
  const [, setLocation] = useLocation();

  const handleClick = () => {
    setLocation(`/learn/${language.id}`);
  };

  const getGradientClass = () => {
    // Different gradients based on language code
    const gradients = {
      'kn': 'from-orange-400 to-pink-400',
      'hi': 'from-orange-500 to-green-500',
      'es': 'from-red-400 to-yellow-400',
      'fr': 'from-blue-400 to-red-400',
      'de': 'from-gray-800 to-red-600',
      'zh': 'from-red-600 to-yellow-500',
    };
    return gradients[language.code as keyof typeof gradients] || 'from-blue-400 to-purple-400';
  };

  const formatSpeakers = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(0)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(0)}K`;
    }
    return count.toString();
  };

  return (
    <div 
      className="language-card hover-lift"
      onClick={handleClick}
      data-testid={`language-card-${language.code}`}
    >
      {/* Header Image */}
      <div className={`h-48 bg-gradient-to-r ${getGradientClass()} relative overflow-hidden`}>
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="absolute top-4 left-4">
          <div className="bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1">
            <span className="text-sm font-medium text-gray-700">{language.region}</span>
          </div>
        </div>
        <div className="absolute bottom-4 left-4 right-4">
          <h3 className="text-2xl font-bold text-white mb-1">{language.nativeName}</h3>
          <p className="text-white/90 text-sm">{language.name}</p>
        </div>
      </div>
      
      {/* Card Content */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Users className="text-gray-400" size={16} />
            <span className="text-sm text-gray-600">{formatSpeakers(language.speakers)} speakers</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="text-sm text-gray-600">Progress:</span>
            <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-secondary rounded-full transition-all duration-500" 
                style={{ width: `${language.progress}%` }}
                data-testid={`progress-bar-${language.code}`}
              ></div>
            </div>
            <span className="text-sm text-secondary font-medium">{language.progress}%</span>
          </div>
        </div>
        
        <p className="text-gray-600 text-sm mb-4 line-clamp-3">
          {language.description}
        </p>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Trophy className="text-yellow-500" size={16} />
            <span className="text-sm text-gray-600">{language.badgeCount} badges</span>
          </div>
          <button 
            className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            data-testid={`continue-learning-btn-${language.code}`}
          >
            {language.isStarted ? 'Continue Learning' : 'Start Learning'}
          </button>
        </div>
      </div>
    </div>
  );
}
