import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Language, LessonContent } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Mic, Volume2, ArrowLeft } from "lucide-react";
import useSpeechRecognition from "@/hooks/use-speech-recognition";
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

  // Auto-generate content when learn mode settings change
  useEffect(() => {
    if (functionality === 'learn' && language) {
      generateContentMutation.mutate();
    }
  }, [functionality, level, learningMode, language?.code]);

  // Translation mutation
  const translateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/languages/translate-with-analysis", {
        text: inputText,
        sourceLang: "English",
        targetLang: language?.name,
        languageCode: language?.code,
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
  const playAudio = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = speechSynthesis.getVoices();
      const targetLang = language?.code === "kn" ? "kn" : "hi";
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

  // Get language-specific styling and text
  const getLanguageTheme = (langCode: string) => {
    const themes = {
      'kn': {
        colors: 'from-orange-400 to-red-500',
        bgAccent: 'bg-orange-50',
        textAccent: 'text-orange-900',
        borderAccent: 'border-orange-200',
        title: 'Simply Kannada Kali',
        subtitle: 'No more "Kannada Gottilla"!',
        translateButton: 'Just Translate (A → ಅ)',
        scripts: { source: 'A', target: 'ಅ' }
      },
      'hi': {
        colors: 'from-blue-400 to-indigo-500',
        bgAccent: 'bg-blue-50',
        textAccent: 'text-blue-900',
        borderAccent: 'border-blue-200',
        title: 'Simply Hindi Kali',
        subtitle: 'No more "Hindi Nahi Aata"!',
        translateButton: 'Just Translate (A → अ)',
        scripts: { source: 'A', target: 'अ' }
      }
    };
    return themes[langCode as keyof typeof themes] || themes.kn;
  };

  if (!language) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading language...</p>
      </div>
    );
  }

  const theme = getLanguageTheme(language.code);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Compact Header */}
      <header className={`bg-gradient-to-r ${theme.colors} text-white shadow-lg`}>
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => setLocation('/')}
              className="text-white hover:bg-white/20 px-2"
              data-testid="back-btn"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <div className="text-center flex-1">
              <h1 className="text-xl font-bold">{theme.title}</h1>
              <p className="text-sm opacity-90">{theme.subtitle}</p>
            </div>
            <div className="w-16"></div> {/* Spacer for balance */}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-4">
        {/* Functionality Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card 
            className={`cursor-pointer transition-all ${
              functionality === 'learn' 
                ? `ring-2 ring-orange-400 ${theme.bgAccent}` 
                : 'hover:shadow-md'
            }`}
            onClick={() => setFunctionality('learn')}
            data-testid="learn-section"
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                Learn with Examples
                {functionality === 'learn' && (
                  <Badge variant="default" className="text-xs">Active</Badge>
                )}
              </CardTitle>
              <p className="text-xs text-gray-600">
                Practice with AI-generated sentences
              </p>
            </CardHeader>
          </Card>

          <Card 
            className={`cursor-pointer transition-all ${
              functionality === 'translate' 
                ? `ring-2 ring-orange-400 ${theme.bgAccent}` 
                : 'hover:shadow-md'
            }`}
            onClick={() => setFunctionality('translate')}
            data-testid="translate-section"
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                {theme.translateButton}
                {functionality === 'translate' && (
                  <Badge variant="default" className="text-xs">Active</Badge>
                )}
              </CardTitle>
              <p className="text-xs text-gray-600">
                Instant translation with word meanings
              </p>
            </CardHeader>
          </Card>
        </div>

        {/* Content Area */}
        {functionality === 'translate' ? (
          /* Just Translate */
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Translate to {language.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Type your message here..."
                    className="min-h-20 pr-12"
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
              </CardContent>
            </Card>

            {/* Translation Results */}
            {translationResult && (
              <div className="space-y-3">
                {/* Main Translation */}
                <Card className={`${theme.bgAccent} ${theme.borderAccent} border`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xl font-medium">{translationResult.translation}</p>
                        {translationResult.transliteration && (
                          <p className="text-base text-gray-600">{translationResult.transliteration}</p>
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
                  </CardContent>
                </Card>

                {/* Word Meanings */}
                {translationResult.wordMeanings && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Word Meanings</CardTitle>
                    </CardHeader>
                    <CardContent>
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
                    </CardContent>
                  </Card>
                )}

                {/* Quick Tip */}
                {translationResult.quickTip && (
                  <Card className="bg-blue-50 border-blue-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-blue-900 text-base">Quick Tip</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-blue-800 text-sm">{translationResult.quickTip}</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Learn with Examples */
          <div className="space-y-4">
            {/* Compact Level and Mode Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Level Selection */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Difficulty Level</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex space-x-2">
                    <Button
                      variant={level === 'basic' ? 'default' : 'outline'}
                      onClick={() => setLevel('basic')}
                      className="flex-1 h-auto py-2"
                      data-testid="basic-level-btn"
                    >
                      <div className="text-center">
                        <div className="font-semibold text-sm">Basic</div>
                        <div className="text-xs opacity-80">≤5 words</div>
                      </div>
                    </Button>
                    <Button
                      variant={level === 'intermediate' ? 'default' : 'outline'}
                      onClick={() => setLevel('intermediate')}
                      className="flex-1 h-auto py-2"
                      data-testid="intermediate-level-btn"
                    >
                      <div className="text-center">
                        <div className="font-semibold text-sm">Intermediate</div>
                        <div className="text-xs opacity-80">6-15 words</div>
                      </div>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Learning Mode Selection */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Learning Mode</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-1">
                    <Button
                      variant={learningMode === 'lazy-listen' ? 'default' : 'outline'}
                      onClick={() => setLearningMode('lazy-listen')}
                      className="h-auto py-1 px-1"
                      data-testid="lazy-listen-btn"
                    >
                      <div className="text-center">
                        <div className="font-semibold text-xs">Lazy Listen</div>
                        <div className="text-xs opacity-80">({theme.scripts.source} → {theme.scripts.target})</div>
                      </div>
                    </Button>
                    
                    <Button
                      variant={learningMode === 'guided-kn-en' ? 'default' : 'outline'}
                      onClick={() => setLearningMode('guided-kn-en')}
                      className="h-auto py-1 px-1"
                      data-testid="guided-kn-en-btn"
                    >
                      <div className="text-center">
                        <div className="font-semibold text-xs">Guided</div>
                        <div className="text-xs opacity-80">({theme.scripts.target} → {theme.scripts.source})</div>
                      </div>
                    </Button>
                    
                    <Button
                      variant={learningMode === 'guided-en-kn' ? 'default' : 'outline'}
                      onClick={() => setLearningMode('guided-en-kn')}
                      className="h-auto py-1 px-1"
                      data-testid="guided-en-kn-btn"
                    >
                      <div className="text-center">
                        <div className="font-semibold text-xs">Guided</div>
                        <div className="text-xs opacity-80">({theme.scripts.source} → {theme.scripts.target})</div>
                      </div>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Loading State */}
            {generateContentMutation.isPending && (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-base">Generating learning content...</p>
                  <div className="animate-pulse mt-2 text-gray-500 text-sm">Please wait</div>
                </CardContent>
              </Card>
            )}

            {/* Learning Content */}
            {currentContent && !generateContentMutation.isPending && (
              <div className="space-y-3">
                {/* Context Badge */}
                <div className="text-center">
                  <Badge variant="secondary" className="text-xs">
                    {currentContent.context?.toUpperCase() || 'GENERAL CONVERSATION'}
                  </Badge>
                </div>

                {/* Main Learning Card */}
                <Card className={`${theme.bgAccent} ${theme.borderAccent} border`}>
                  <CardContent className="p-4">
                    {learningMode === 'lazy-listen' ? (
                      // Lazy Listen Mode
                      <div className="text-center space-y-3">
                        <h3 className="text-base text-gray-600">{currentContent.english}</h3>
                        <div className="flex items-center justify-center space-x-3">
                          <div>
                            <p className="text-lg font-medium">{currentContent.target}</p>
                            <p className="text-sm text-gray-600">{currentContent.transliteration}</p>
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
                      <div className="space-y-3">
                        <div className="text-center">
                          <h3 className="text-base mb-3">
                            {learningMode === 'guided-kn-en' 
                              ? currentContent.target 
                              : currentContent.english}
                          </h3>
                          {learningMode === 'guided-kn-en' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => playAudio(currentContent.target)}
                              className="mb-3"
                              data-testid="pronounce-kn-btn"
                            >
                              <Volume2 className="w-4 h-4 mr-1" />
                              Pronounce
                            </Button>
                          )}
                          <p className="text-sm text-gray-600">
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
                            className="min-h-16 pr-12"
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
                  </CardContent>
                </Card>

                {/* Guidance Section */}
                {showGuidance && guidedFeedback && (
                  <Card className="bg-blue-50 border-blue-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-blue-900 text-base">Guidance</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div>
                        <h4 className="font-semibold text-blue-900 text-sm">What's Right:</h4>
                        <p className="text-blue-800 text-xs">{guidedFeedback.whatsRight}</p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-blue-900 text-sm">Main Point to Improve:</h4>
                        <p className="text-blue-800 text-xs">{guidedFeedback.mainPointToImprove}</p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-blue-900 text-sm">Hint:</h4>
                        <p className="text-blue-800 text-xs">{guidedFeedback.hint}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Correct Answer Section */}
                {showCorrectAnswer && (
                  <Card className="bg-green-50 border-green-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-green-900 text-base">Correct Answer</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-base font-medium text-green-900">
                            {learningMode === 'guided-kn-en' 
                              ? currentContent.english 
                              : currentContent.target}
                          </p>
                          {learningMode === 'guided-en-kn' && (
                            <p className="text-green-700 text-sm">{currentContent.transliteration}</p>
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

                {/* Word Meanings and Quick Tip */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Word Meanings</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {(currentContent as any).wordMeanings && (currentContent as any).wordMeanings.length > 0 ? (
                        <div className="space-y-1">
                          {(currentContent as any).wordMeanings.map((word: any, index: number) => (
                            <div key={index} className="text-xs">
                              <span className="font-medium">{word.word}</span>
                              {word.transliteration && (
                                <span className="text-gray-600"> ({word.transliteration})</span>
                              )}
                              <span className="text-gray-700"> - {word.meaning}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-600">Loading word analysis...</p>
                      )}
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Quick Tip</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-gray-700">
                        {(currentContent as any).quickTip || currentContent.context}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Next Sentence Button */}
                <div className="text-center">
                  <Button
                    onClick={handleNextSentence}
                    variant="outline"
                    data-testid="next-sentence-btn"
                  >
                    Next Sentence
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}