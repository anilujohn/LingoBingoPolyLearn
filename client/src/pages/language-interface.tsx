import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Language, LessonContent } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Mic, Volume2, ArrowLeft, Settings } from "lucide-react";
import useSpeechRecognition from "@/hooks/use-speech-recognition";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface TranslationResult {
  translation: string;
  transliteration?: string;
  wordMeanings?: Array<{
    word: string;
    meaning: string;
    transliteration?: string;
  }>;
  quickTip?: string;
}

interface GuidedFeedback {
  whatsRight: string;
  mainPointToImprove: string;
  hint: string;
}

export default function LanguageInterface() {
  const { languageId } = useParams();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Determine if we're in translate or learn mode
  const isTranslateMode = location.includes('/translate/');
  
  // Main functionality state
  const [functionality, setFunctionality] = useState<'translate' | 'learn'>(
    isTranslateMode ? 'translate' : 'learn'
  );
  
  // Translate mode state
  const [inputText, setInputText] = useState("");
  const [translationResult, setTranslationResult] = useState<TranslationResult | null>(null);
  
  // Learn mode state
  const [level, setLevel] = useState<'basic' | 'intermediate'>('basic');
  const [learningMode, setLearningMode] = useState<'lazy-listen' | 'guided-kn-en' | 'guided-en-kn'>('lazy-listen');
  const [currentContent, setCurrentContent] = useState<LessonContent | null>(null);
  const [userAnswer, setUserAnswer] = useState("");
  const [showGuidance, setShowGuidance] = useState(false);
  const [guidedFeedback, setGuidedFeedback] = useState<GuidedFeedback | null>(null);
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(false);
  const [contentIndex, setContentIndex] = useState(0);
  const [generatedContent, setGeneratedContent] = useState<LessonContent[]>([]);
  
  // Settings
  const [selectedModel, setSelectedModel] = useState<"gemini-2.5-flash" | "gemini-2.5-pro">("gemini-2.5-flash");
  const [showSettings, setShowSettings] = useState(false);

  // Fetch language data
  const { data: language } = useQuery<Language>({
    queryKey: [`/api/languages/${languageId}`],
    enabled: !!languageId,
  });

  // Speech recognition
  const { startListening, stopListening, isListening, transcript } = useSpeechRecognition({
    language: language?.code === 'kn' ? 'kn-IN' : 'hi-IN',
    onResult: (result: string) => {
      if (functionality === 'translate') {
        setInputText(result);
      } else {
        setUserAnswer(result);
      }
    },
    onError: (error: string) => {
      console.error('Speech recognition error:', error);
      toast({
        title: "Speech Recognition Error",
        description: "Please try again or type your answer.",
        variant: "destructive",
      });
    },
  });

  // Clear content when switching functionalities
  useEffect(() => {
    setInputText("");
    setTranslationResult(null);
    setUserAnswer("");
    setShowGuidance(false);
    setGuidedFeedback(null);
    setShowCorrectAnswer(false);
    setCurrentContent(null);
    setGeneratedContent([]);
    setContentIndex(0);
  }, [functionality, level, learningMode]);

  // Translation mutation
  const translateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/languages/translate-with-analysis", {
        text: inputText,
        sourceLang: "English",
        targetLang: language?.name,
        languageCode: language?.code,
        model: selectedModel,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setTranslationResult(data);
    },
    onError: (error) => {
      toast({
        title: "Translation Error",
        description: "Failed to translate text. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Generate content mutation for learn mode
  const generateContentMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/languages/generate-content", {
        languageCode: language?.code,
        level,
        category: "Daily Life", 
        count: 5,
        model: selectedModel,
      });
      return response.json();
    },
    onSuccess: (data: LessonContent[]) => {
      setGeneratedContent(data);
      setCurrentContent(data[0]);
      setContentIndex(0);
    },
    onError: (error) => {
      toast({
        title: "Content Generation Error",
        description: "Failed to generate learning content. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Check answer mutation
  const checkAnswerMutation = useMutation({
    mutationFn: async () => {
      const correctAnswer = learningMode === 'guided-kn-en' 
        ? currentContent?.english 
        : currentContent?.target;

      const response = await apiRequest("POST", "/api/languages/check-answer-detailed", {
        userAnswer,
        correctAnswer,
        context: currentContent?.context,
        mode: learningMode,
        model: selectedModel,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setGuidedFeedback(data);
      setShowGuidance(true);
    },
    onError: (error) => {
      toast({
        title: "Answer Check Error", 
        description: "Failed to check answer. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Text-to-speech functionality
  const playAudio = (text: string, lang?: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = speechSynthesis.getVoices();
      const targetLang = lang || (language?.code === "kn" ? "kn" : "hi");
      const voice = voices.find(v => v.lang.startsWith(targetLang)) || voices[0];
      
      if (voice) {
        utterance.voice = voice;
      }
      
      utterance.rate = 0.8;
      utterance.pitch = 1.0;
      
      speechSynthesis.speak(utterance);
    }
  };

  const handleNextSentence = () => {
    if (contentIndex < generatedContent.length - 1) {
      setContentIndex(contentIndex + 1);
      setCurrentContent(generatedContent[contentIndex + 1]);
      setUserAnswer("");
      setShowGuidance(false);
      setGuidedFeedback(null);
      setShowCorrectAnswer(false);
    } else {
      // Generate more content
      generateContentMutation.mutate();
    }
  };

  const handleRevealAnswer = () => {
    setShowCorrectAnswer(true);
    setShowGuidance(false);
  };

  if (!language) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading language...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => setLocation('/')}
        className="mb-6"
        data-testid="back-btn"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Languages
      </Button>

      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Simply {language.name} Kali</h1>
        <p className="text-gray-600 mt-2">No more "{language.name} Gotilla"!</p>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex justify-center mb-8">
        <div className="bg-white rounded-xl p-1 shadow-lg">
          <Button
            variant={functionality === 'learn' ? 'default' : 'ghost'}
            onClick={() => setFunctionality('learn')}
            className="rounded-lg px-6"
            data-testid="learn-tab"
          >
            Learn with Examples
          </Button>
          <Button
            variant={functionality === 'translate' ? 'default' : 'ghost'}
            onClick={() => setFunctionality('translate')}
            className="rounded-lg px-6"
            data-testid="translate-tab"
          >
            Just Translate (A → ಅ)
          </Button>
        </div>
      </div>

      {/* Settings Panel */}
      <div className="flex justify-end mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowSettings(!showSettings)}
          data-testid="settings-btn"
        >
          <Settings className="w-4 h-4" />
        </Button>
      </div>

      {showSettings && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium">AI Model:</label>
              <Select value={selectedModel} onValueChange={(value: "gemini-2.5-flash" | "gemini-2.5-pro") => setSelectedModel(value)}>
                <SelectTrigger className="w-48" data-testid="model-selector">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gemini-2.5-flash">Gemini 2.5 Flash (Fast)</SelectItem>
                  <SelectItem value="gemini-2.5-pro">Gemini 2.5 Pro (Advanced)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content Area */}
      {functionality === 'translate' ? (
        // Just Translate Functionality
        <Card>
          <CardHeader>
            <CardTitle>Enter English text to translate into {language.name}.</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type your message here..."
                className="min-h-24 pr-12"
                data-testid="translate-input"
              />
              <Button
                variant="ghost"
                size="sm"
                className="absolute bottom-2 right-2"
                onClick={() => isListening ? stopListening() : startListening()}
                data-testid="mic-btn"
              >
                <Mic className={`w-4 h-4 ${isListening ? 'text-red-500' : 'text-gray-500'}`} />
              </Button>
            </div>

            <div className="flex space-x-2">
              <Button
                onClick={() => translateMutation.mutate()}
                disabled={!inputText.trim() || translateMutation.isPending}
                className="flex-1"
                data-testid="translate-btn"
              >
                {translateMutation.isPending ? 'Translating...' : 'Translate'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setInputText("");
                  setTranslationResult(null);
                }}
                data-testid="clear-btn"
              >
                Clear
              </Button>
            </div>

            {/* Translation Result */}
            {translationResult && (
              <div className="space-y-4 border-t pt-4">
                <div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xl font-medium">{translationResult.translation}</p>
                      {translationResult.transliteration && (
                        <p className="text-lg text-gray-600">{translationResult.transliteration}</p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => playAudio(translationResult.translation)}
                      data-testid="pronounce-btn"
                    >
                      <Volume2 className="w-4 h-4 mr-1" />
                      Pronounce
                    </Button>
                  </div>
                </div>

                {/* Word Meanings */}
                {translationResult.wordMeanings && (
                  <div>
                    <h3 className="font-semibold mb-2">Word Meanings</h3>
                    <div className="space-y-1">
                      {translationResult.wordMeanings.map((word, index) => (
                        <div key={index} className="text-sm">
                          <span className="font-medium">{word.word}</span>
                          {word.transliteration && (
                            <span className="text-gray-600"> ({word.transliteration})</span>
                          )}
                          <span className="text-gray-700"> - {word.meaning}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Tip */}
                {translationResult.quickTip && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <h3 className="font-semibold text-blue-900 mb-1">Quick Tip</h3>
                    <p className="text-blue-800 text-sm">{translationResult.quickTip}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        // Learn with Examples Functionality
        <div className="space-y-6">
          {/* Level Selection */}
          <div className="flex justify-center">
            <div className="bg-white rounded-xl p-1 shadow-lg">
              <Button
                variant={level === 'basic' ? 'default' : 'ghost'}
                onClick={() => setLevel('basic')}
                className="rounded-lg px-6"
                data-testid="basic-level-btn"
              >
                Basic
              </Button>
              <Button
                variant={level === 'intermediate' ? 'default' : 'ghost'}
                onClick={() => setLevel('intermediate')}
                className="rounded-lg px-6"
                data-testid="intermediate-level-btn"
              >
                Intermediate
              </Button>
            </div>
          </div>

          {/* Learning Mode Selection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant={learningMode === 'lazy-listen' ? 'default' : 'outline'}
              onClick={() => setLearningMode('lazy-listen')}
              className="p-4 h-auto"
              data-testid="lazy-listen-btn"
            >
              <div className="text-center">
                <div className="font-semibold">Lazy Listen</div>
                <div className="text-sm opacity-80">(A → ಅ)</div>
              </div>
            </Button>
            
            <Button
              variant={learningMode === 'guided-kn-en' ? 'default' : 'outline'}
              onClick={() => setLearningMode('guided-kn-en')}
              className="p-4 h-auto"
              data-testid="guided-kn-en-btn"
            >
              <div className="text-center">
                <div className="font-semibold">Guided Workout</div>
                <div className="text-sm opacity-80">(ಅ → A)</div>
              </div>
            </Button>
            
            <Button
              variant={learningMode === 'guided-en-kn' ? 'default' : 'outline'}
              onClick={() => setLearningMode('guided-en-kn')}
              className="p-4 h-auto"
              data-testid="guided-en-kn-btn"
            >
              <div className="text-center">
                <div className="font-semibold">Guided Workout</div>
                <div className="text-sm opacity-80">(A → ಅ)</div>
              </div>
            </Button>
          </div>

          {/* Generate Content Button */}
          {!currentContent && (
            <div className="text-center">
              <Button
                onClick={() => generateContentMutation.mutate()}
                disabled={generateContentMutation.isPending}
                data-testid="generate-content-btn"
              >
                {generateContentMutation.isPending ? 'Generating...' : 'Start Learning'}
              </Button>
            </div>
          )}

          {/* Learning Content */}
          {currentContent && (
            <Card>
              <CardContent className="p-6 space-y-4">
                {/* Context Badge */}
                <div className="text-center">
                  <Badge variant="secondary" className="mb-4">
                    {currentContent.context?.toUpperCase() || 'GENERAL CONVERSATION'}
                  </Badge>
                </div>

                {/* Content Display */}
                {learningMode === 'lazy-listen' ? (
                  // Lazy Listen Mode
                  <div className="text-center space-y-4">
                    <h3 className="text-lg text-gray-600">{currentContent.english}</h3>
                    <div className="flex items-center justify-center space-x-4">
                      <div>
                        <p className="text-2xl font-medium">{currentContent.target}</p>
                        <p className="text-lg text-gray-600">{currentContent.transliteration}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => playAudio(currentContent.target)}
                        data-testid="pronounce-btn"
                      >
                        <Volume2 className="w-4 h-4 mr-1" />
                        Pronounce
                      </Button>
                    </div>
                  </div>
                ) : (
                  // Guided Workout Mode
                  <div className="space-y-4">
                    <div className="text-center">
                      <h3 className="text-lg mb-4">
                        {learningMode === 'guided-kn-en' 
                          ? currentContent.target 
                          : currentContent.english}
                      </h3>
                      {learningMode === 'guided-kn-en' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => playAudio(currentContent.target)}
                          className="mb-4"
                          data-testid="pronounce-kn-btn"
                        >
                          <Volume2 className="w-4 h-4 mr-1" />
                          Pronounce
                        </Button>
                      )}
                      <p className="text-gray-600">
                        {learningMode === 'guided-kn-en' 
                          ? 'What does this mean in English?' 
                          : `How do you say this in ${language.name}?`}
                      </p>
                    </div>

                    <div className="relative">
                      <Textarea
                        value={userAnswer}
                        onChange={(e) => setUserAnswer(e.target.value)}
                        placeholder="Type or click the mic to speak..."
                        className="min-h-20 pr-12"
                        data-testid="answer-input"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute bottom-2 right-2"
                        onClick={() => isListening ? stopListening() : startListening()}
                        data-testid="mic-btn-guided"
                      >
                        <Mic className={`w-4 h-4 ${isListening ? 'text-red-500' : 'text-gray-500'}`} />
                      </Button>
                    </div>

                    <div className="flex space-x-2">
                      <Button
                        onClick={() => checkAnswerMutation.mutate()}
                        disabled={!userAnswer.trim() || checkAnswerMutation.isPending}
                        className="flex-1"
                        data-testid="check-answer-btn"
                      >
                        {checkAnswerMutation.isPending ? 'Checking...' : 'Check Answer'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleRevealAnswer}
                        data-testid="reveal-answer-btn"
                      >
                        Reveal Answer
                      </Button>
                    </div>
                  </div>
                )}

                {/* Guidance Section */}
                {showGuidance && guidedFeedback && (
                  <Card className="bg-blue-50">
                    <CardHeader>
                      <CardTitle className="text-blue-900">Guidance</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <h4 className="font-semibold text-blue-900">What's Right:</h4>
                        <p className="text-blue-800 text-sm">{guidedFeedback.whatsRight}</p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-blue-900">Main Point to Improve:</h4>
                        <p className="text-blue-800 text-sm">{guidedFeedback.mainPointToImprove}</p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-blue-900">Hint:</h4>
                        <p className="text-blue-800 text-sm">{guidedFeedback.hint}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Correct Answer Section */}
                {showCorrectAnswer && (
                  <Card className="bg-green-50">
                    <CardHeader>
                      <CardTitle className="text-green-900">Correct Answer</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-lg font-medium text-green-900">
                            {learningMode === 'guided-kn-en' 
                              ? currentContent.english 
                              : currentContent.target}
                          </p>
                          {learningMode === 'guided-en-kn' && (
                            <p className="text-green-700">{currentContent.transliteration}</p>
                          )}
                        </div>
                        {learningMode === 'guided-en-kn' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => playAudio(currentContent.target)}
                            data-testid="pronounce-correct-btn"
                          >
                            <Volume2 className="w-4 h-4 mr-1" />
                            Pronounce
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Word Meanings and Quick Tip (for all modes) */}
                <div className="space-y-3 border-t pt-4">
                  <div>
                    <h4 className="font-semibold mb-2">Word Meanings</h4>
                    <div className="text-sm space-y-1">
                      {/* This would be populated by a separate API call for word analysis */}
                      <p className="text-gray-600">Word analysis will be shown here...</p>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <h4 className="font-semibold mb-1">Quick Tip</h4>
                    <p className="text-sm text-gray-700">{currentContent.context}</p>
                  </div>
                </div>

                {/* Next Sentence Button */}
                <div className="text-center pt-4">
                  <Button
                    onClick={handleNextSentence}
                    variant="outline"
                    data-testid="next-sentence-btn"
                  >
                    Next Sentence
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}