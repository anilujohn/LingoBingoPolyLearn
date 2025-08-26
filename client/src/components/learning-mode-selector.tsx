import { useLocation } from "wouter";
import { Headphones, Compass, Mic } from "lucide-react";

interface LearningModeSelectorProps {
  currentMode: string;
  languageId: string;
}

const modes = [
  {
    id: "listen",
    name: "Lazy Listen",
    description: "Passively absorb the language through immersive listening exercises",
    icon: Headphones,
    color: "blue",
  },
  {
    id: "guide",
    name: "Guided Practice", 
    description: "Interactive exercises with instant feedback and corrections",
    icon: Compass,
    color: "green",
  },
  {
    id: "speak",
    name: "Speak & Practice",
    description: "Voice recognition exercises to perfect your pronunciation",
    icon: Mic,
    color: "purple",
  },
];

export default function LearningModeSelector({ currentMode, languageId }: LearningModeSelectorProps) {
  const [, setLocation] = useLocation();

  const handleModeSelect = (modeId: string) => {
    setLocation(`/learn/${languageId}/${modeId}`);
  };

  const getColorClasses = (color: string, isActive: boolean) => {
    const colors = {
      blue: {
        bg: isActive ? "bg-blue-100" : "bg-blue-100",
        text: isActive ? "text-primary" : "text-blue-600",
        icon: isActive ? "text-primary" : "text-blue-600",
      },
      green: {
        bg: isActive ? "bg-green-100" : "bg-green-100", 
        text: isActive ? "text-primary" : "text-green-600",
        icon: isActive ? "text-primary" : "text-green-600",
      },
      purple: {
        bg: isActive ? "bg-purple-100" : "bg-purple-100",
        text: isActive ? "text-primary" : "text-purple-600", 
        icon: isActive ? "text-primary" : "text-purple-600",
      },
    };
    return colors[color as keyof typeof colors];
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Choose Your Learning Mode</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {modes.map((mode) => {
          const isActive = currentMode === mode.id;
          const colorClasses = getColorClasses(mode.color, isActive);
          const Icon = mode.icon;
          
          return (
            <div
              key={mode.id}
              className={`mode-card group ${isActive ? 'active' : ''}`}
              onClick={() => handleModeSelect(mode.id)}
              data-testid={`mode-${mode.id}`}
            >
              <div className={`w-12 h-12 ${colorClasses.bg} rounded-xl flex items-center justify-center mb-4 transition-colors`}>
                <Icon className={`${colorClasses.icon} transition-colors`} size={24} />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">{mode.name}</h4>
              <p className="text-sm text-gray-600 mb-3">{mode.description}</p>
              <div className={`flex items-center text-sm ${colorClasses.text} transition-colors`}>
                <span className="font-medium">
                  {isActive ? 'Current Mode' : `Start ${mode.name.split(' ')[0]}`}
                </span>
                {!isActive && <span className="ml-2">→</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
