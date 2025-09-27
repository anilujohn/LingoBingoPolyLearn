import { useLocation } from "wouter";
import { Headphones, Compass, Mic, Settings } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  const [showSettings, setShowSettings] = useState(false);
  const [selectedModel, setSelectedModel] = useState<"gemini-2.5-flash" | "gemini-2.5-pro">("gemini-2.5-flash");

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
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Choose Your Learning Mode</h3>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
            className="text-gray-500 hover:text-gray-700"
            data-testid="settings-btn"
          >
            <Settings size={20} />
          </Button>
        </div>
      </div>

      {showSettings && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">AI Model:</label>
            <Select value={selectedModel} onValueChange={(value: "gemini-2.5-flash" | "gemini-2.5-pro") => setSelectedModel(value)}>
              <SelectTrigger className="w-48" data-testid="model-selector">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gemini-2.5-flash">Gemini 2.5 Flash (Fast)</SelectItem>
                <SelectItem value="gemini-2.5-pro">Gemini 2.5 Pro (Advanced)</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-xs text-gray-500">
              {selectedModel === "gemini-2.5-flash" ? "Faster responses, good quality" : "Higher quality, slower responses"}
            </span>
          </div>
        </div>
      )}
      
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
