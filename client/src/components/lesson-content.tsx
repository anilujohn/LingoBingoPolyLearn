import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Play, RotateCcw, ChevronLeft, ChevronRight, Mic, Volume2 } from "lucide-react";
import { LessonWithProgress, LessonContent as LessonContentType } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import useSpeechRecognition from "@/hooks/use-speech-recognition";
import { apiRequest } from "@/lib/queryClient";

interface LessonContentProps {
  lesson: LessonWithProgress;
  mode: string;
  languageId: string;
}

export default function LessonContent({ lesson, mode, languageId }: LessonContentProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState("");
  const [showAnswer, setShowAnswer] = useState(false);
  const [feedback, setFeedback] = useState<string>("");
  const queryClient = useQueryClient();

  const content = lesson.content as LessonContentType[];
  const currentContent = content?.[currentIndex];

  const { isListening, startListening, transcript } = useSpeechRecognition({
    language: mode === "guide" ? "en-US" : lesson.languageId === "kn" ? "kn-IN" : "hi-IN",
    onResult: (result) => {
      setUserInput(result);
    }
  });

  const checkAnswerMutation = useMutation({
    mutationFn: async (answer: string) => {
      const response = await apiRequest("POST", "/api/lessons/check-answer", {
        lessonId: lesson.id,
        mode,
        answer,
        contentIndex: currentIndex,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setFeedback(data.feedback);
      if (data.correct) {
        queryClient.invalidateQueries({ queryKey: ["/api/user/stats"] });
      }
    },
  });

  const playAudioMutation = useMutation({
    mutationFn: async (text?: string) => {
      const textToSpeak = text || currentContent?.target || currentContent?.english;
      
      // Use Web Speech API for text-to-speech
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        
        // Set language-specific voice
        const voices = speechSynthesis.getVoices();
        const targetLang = lesson.languageId === "lang-kannada" ? "kn" : "hi";
        const voice = voices.find(v => v.lang.startsWith(targetLang)) || voices[0];
        
        if (voice) {
          utterance.voice = voice;
        }
        
        utterance.rate = 0.8; // Slightly slower for learning
        utterance.pitch = 1.0;
        
        speechSynthesis.speak(utterance);
        return { success: true };
      }
      
      // Fallback to API call for future Google TTS integration
      const response = await apiRequest("POST", "/api/lessons/play-audio", {
        text: textToSpeak,
        language: lesson.languageId,
      });
      return response.json();
    },
    onError: (error) => {
      console.error("Error playing audio:", error);
    },
  });

  const handleNext = () => {
    if (currentIndex < (content?.length || 0) - 1) {
      setCurrentIndex(currentIndex + 1);
      setUserInput("");
      setShowAnswer(false);
      setFeedback("");
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setUserInput("");
      setShowAnswer(false);
      setFeedback("");
    }
  };

  const handleCheckAnswer = () => {
    if (userInput.trim()) {
      checkAnswerMutation.mutate(userInput);
    }
  };

  const handleRevealAnswer = () => {
    setShowAnswer(true);
  };

  const handlePlayAudio = () => {
    playAudioMutation.mutate();
  };

  if (!currentContent) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">No lesson content available</p>
      </div>
    );
  }

  return (
    <div className="lesson-content min-h-96 bg-slate-50 rounded-xl p-8 flex items-center justify-center">
      <div className="text-center space-y-6 max-w-2xl w-full">
        {/* Category Badge */}
        <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-4">
          {lesson.category}
        </div>

        {/* Content Based on Mode */}
        {mode === "listen" && (
          <div>
            <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
              <p className="text-gray-700 mb-3" data-testid="english-text">
                {currentContent.english}
              </p>
              <p className="text-2xl font-medium text-gray-900 mb-2" data-testid="target-text">
                {currentContent.target}
              </p>
              {currentContent.transliteration && (
                <p className="text-sm text-gray-500" data-testid="transliteration">
                  {currentContent.transliteration}
                </p>
              )}
            </div>

            <div className="flex items-center justify-center space-x-4">
              <Button
                size="lg"
                className="w-16 h-16 rounded-full shadow-lg hover:scale-105 transition-all duration-300"
                onClick={handlePlayAudio}
                disabled={playAudioMutation.isPending}
                data-testid="play-audio-btn"
              >
                <Play className="text-white" size={24} />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="w-12 h-12 rounded-full"
                onClick={handlePlayAudio}
                data-testid="repeat-audio-btn"
              >
                <RotateCcw size={20} />
              </Button>
            </div>
          </div>
        )}

        {mode === "guide" && (
          <div>
            <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
              <p className="text-2xl font-medium text-gray-900 mb-2" data-testid="target-text">
                {currentContent.target}
              </p>
              {currentContent.transliteration && (
                <p className="text-sm text-gray-500 mb-2" data-testid="transliteration">
                  {currentContent.transliteration}
                </p>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePlayAudio}
                className="flex items-center space-x-1"
                data-testid="play-target-audio"
              >
                <Volume2 size={16} />
                <span>Listen</span>
              </Button>
            </div>

            <p className="text-gray-600 mb-4">What does this mean in English?</p>

            <div className="relative mb-4">
              <Textarea
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Type your translation or click the mic..."
                rows={2}
                className="pr-12"
                data-testid="translation-input"
              />
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-2 w-8 h-8 p-0"
                onClick={startListening}
                disabled={isListening}
                data-testid="mic-btn"
              >
                <Mic className={`${isListening ? 'text-red-500' : 'text-gray-500'}`} size={16} />
              </Button>
            </div>

            {isListening && (
              <p className="text-sm text-red-500 mb-2" data-testid="listening-status">
                Listening...
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-4">
              <Button
                onClick={handleCheckAnswer}
                disabled={!userInput.trim() || checkAnswerMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
                data-testid="check-answer-btn"
              >
                Check Answer
              </Button>
              <Button
                variant="outline"
                onClick={handleRevealAnswer}
                className="border-yellow-500 text-yellow-600 hover:bg-yellow-50"
                data-testid="reveal-answer-btn"
              >
                Reveal Answer
              </Button>
            </div>

            {feedback && (
              <div className="bg-blue-50 p-4 rounded-lg text-left" data-testid="feedback-container">
                <p className="text-sm">{feedback}</p>
              </div>
            )}

            {showAnswer && (
              <div className="bg-green-50 p-4 rounded-lg text-left" data-testid="answer-container">
                <p className="font-medium text-green-800">Correct Answer:</p>
                <p className="text-green-700">{currentContent.english}</p>
                {currentContent.explanation && (
                  <p className="text-sm text-green-600 mt-2">{currentContent.explanation}</p>
                )}
              </div>
            )}
          </div>
        )}

        {mode === "speak" && (
          <div>
            <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
              <p className="text-lg sm:text-xl font-semibold text-gray-900" data-testid="english-text">
                {currentContent.english}
              </p>
              {currentContent.context && (
                <p className="text-sm text-gray-500 mt-2" data-testid="context">
                  {currentContent.context}
                </p>
              )}
            </div>

            <p className="text-gray-600 mb-4">How do you say this in the target language?</p>

            <div className="relative mb-4">
              <Textarea
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Type your translation or click the mic..."
                rows={2}
                className="pr-12"
                data-testid="translation-input"
              />
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-2 w-8 h-8 p-0"
                onClick={startListening}
                disabled={isListening}
                data-testid="mic-btn"
              >
                <Mic className={`${isListening ? 'text-red-500' : 'text-gray-500'}`} size={16} />
              </Button>
            </div>

            {isListening && (
              <p className="text-sm text-red-500 mb-2" data-testid="listening-status">
                Listening...
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-4">
              <Button
                onClick={handleCheckAnswer}
                disabled={!userInput.trim() || checkAnswerMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
                data-testid="check-answer-btn"
              >
                Check Answer
              </Button>
              <Button
                variant="outline"
                onClick={handleRevealAnswer}
                className="border-yellow-500 text-yellow-600 hover:bg-yellow-50"
                data-testid="reveal-answer-btn"
              >
                Reveal Answer
              </Button>
            </div>

            {feedback && (
              <div className="bg-blue-50 p-4 rounded-lg text-left" data-testid="feedback-container">
                <p className="text-sm">{feedback}</p>
              </div>
            )}

            {showAnswer && (
              <div className="bg-green-50 p-4 rounded-lg text-left" data-testid="answer-container">
                <p className="font-medium text-green-800">Correct Answer:</p>
                <p className="text-green-700">{currentContent.target}</p>
                {currentContent.transliteration && (
                  <p className="text-sm text-green-600">{currentContent.transliteration}</p>
                )}
                {currentContent.explanation && (
                  <p className="text-sm text-green-600 mt-2">{currentContent.explanation}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Lesson Navigation */}
        {content && content.length > 1 && (
          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <Button
              variant="ghost"
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              data-testid="previous-btn"
            >
              <ChevronLeft size={20} />
              <span>Previous</span>
            </Button>
            
            <div className="flex items-center space-x-2">
              {content.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full ${
                    index === currentIndex ? 'bg-primary' : 'bg-gray-300'
                  }`}
                  data-testid={`progress-dot-${index}`}
                />
              ))}
            </div>
            
            <Button
              variant="ghost"
              onClick={handleNext}
              disabled={currentIndex === (content?.length || 0) - 1}
              className="text-primary hover:text-primary/80"
              data-testid="next-btn"
            >
              <span>Next</span>
              <ChevronRight size={20} />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
