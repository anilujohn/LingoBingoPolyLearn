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
import { WordAnalysisCards } from "@/components/word-analysis-cards";

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
  
  // Main functionality state
  const [functionality, setFunctionality] = useState<'translate' | 'learn'>('learn');
  
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
  
  // Content cache to avoid regenerating when switching modes
  const [contentCache, setContentCache] = useState<{
    [key: string]: LessonContent[]; // key format: "languageCode-level-mode"
  }>({});
  
  // Background generation queue for maintaining 10-sentence inventory
  const [backgroundQueue, setBackgroundQueue] = useState<string[]>([]);
  const [isBackgroundGenerating, setIsBackgroundGenerating] = useState(false);
  
  // Hybrid loading: Track which content needs word analysis
  const [pendingWordAnalysis, setPendingWordAnalysis] = useState<Set<string>>(new Set());
  
  // Loading state for next sentence
  const [isLoadingNextSentence, setIsLoadingNextSentence] = useState(false);
  
  // Track consumed sentences for refill
  const [consumedSentences, setConsumedSentences] = useState<Set<string>>(new Set());

  // Dynamic title state
  const [languageTitle, setLanguageTitle] = useState<string>('');
  const [languageSubtitle, setLanguageSubtitle] = useState<string>('');

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

  // Generate dynamic titles when language changes
  useEffect(() => {
    if (language) {
      const titles = {
        'kn': { 
          title: 'Simply Kannada Kali', 
          subtitle: 'No more "Kannada Gottilla"!' 
        },
        'hi': { 
          title: 'Hindi Seekhiye Aaram Se', 
          subtitle: 'Ab "Hindi Nahi Aati" Nahi Kahenge!' 
        }
      };
      
      const titleData = titles[language.code as keyof typeof titles] || {
        title: `Simply ${language.name} Sikho`,
        subtitle: `Master ${language.name} step by step!`
      };
      
      setLanguageTitle(titleData.title);
      setLanguageSubtitle(titleData.subtitle);
    }
  }, [language]);

  // Clear content when switching functionalities (but preserve cache)
  useEffect(() => {
    setInputText("");
    setTranslationResult(null);
    setUserAnswer("");
    setShowGuidance(false);
    setGuidedFeedback(null);
    setShowCorrectAnswer(false);
    // Don't clear currentContent and generatedContent - let mutation handle it
    // Don't clear contentIndex - let mutation handle it
  }, [functionality, level, learningMode]);

  // Auto-generate content when learn mode settings change
  useEffect(() => {
    if (functionality === 'learn' && language) {
      const cacheKey = `${language?.code}-${level}-${learningMode}`;
      const cached = contentCache[cacheKey] || [];
      
      if (cached.length === 0) {
        // No content in cache for this combination, generate immediately
        generateContentMutation.mutate({ count: 1, skipWordAnalysis: true });
      } else {
        // Content exists in cache, use it immediately
        setCurrentContent(cached[0]);
        setContentIndex(0);
        setGeneratedContent(cached);
      }
    }
  }, [functionality, level, learningMode, language?.code]);
  
  // Start background inventory management when language interface loads
  useEffect(() => {
    if (language) {
      const currentCacheKey = `${language.code}-${level}-${learningMode}`;
      queueInventoryManagement(currentCacheKey);
    }
  }, [language]);
  
  // Background generation processor with word analysis
  useEffect(() => {
    if (backgroundQueue.length > 0 && !isBackgroundGenerating) {
      const processNextInQueue = async () => {
        setIsBackgroundGenerating(true);
        const [cacheKey, countStr, priority] = backgroundQueue[0].split(':');
        const count = parseInt(countStr);
        const [langCode, levelStr, mode] = cacheKey.split('-');
        
        try {
          // Generate content with full word analysis for background inventory
          const response = await apiRequest("POST", "/api/languages/generate-content", {
            languageCode: langCode,
            level: levelStr,
            category: "Daily Life", 
            count,
            skipWordAnalysis: false, // Include word analysis for background content
          });
          const data = await response.json();
          
          // Update cache with background-generated content
          setContentCache(prev => ({
            ...prev,
            [cacheKey]: [...(prev[cacheKey] || []), ...data]
          }));
          
          // Update current view if this is the active mode
          if (cacheKey === `${language?.code}-${level}-${learningMode}`) {
            setGeneratedContent(prev => [...prev, ...data]);
          }
          
        } catch (error) {
          console.log('Background generation failed:', error);
        } finally {
          // Remove processed item from queue
          setBackgroundQueue(prev => prev.slice(1));
          setIsBackgroundGenerating(false);
        }
      };
      
      // Process with delay, prioritizing high-priority items
      const delay = backgroundQueue[0].includes('high') ? 500 : 2000;
      const timeoutId = setTimeout(processNextInQueue, delay);
      return () => clearTimeout(timeoutId);
    }
  }, [backgroundQueue, isBackgroundGenerating]);

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

  // Hybrid approach: Fast sentence loading with separate word analysis
  const generateContentMutation = useMutation({
    mutationFn: async (params: { isBackgroundGeneration?: boolean; count?: number; skipWordAnalysis?: boolean } = {}) => {
      const { isBackgroundGeneration = false, count = 1, skipWordAnalysis = true } = params;
      const cacheKey = `${language?.code}-${level}-${learningMode}`;
      
      // Check cache first (only if not background generation)
      if (!isBackgroundGeneration) {
        const cached = contentCache[cacheKey] || [];
        if (cached.length > 0) {
          return { data: cached, ...params, fromCache: true };
        }
      }
      
      // Generate content fast (without word analysis for immediate display)
      const response = await apiRequest("POST", "/api/languages/generate-content", {
        languageCode: language?.code,
        level,
        category: "Daily Life", 
        count,
        skipWordAnalysis,
      });
      const data = await response.json();
      return { data, ...params };
    },
    onSuccess: (result) => {
      const { data, isBackgroundGeneration = false, count = 1, skipWordAnalysis = true } = result;
      const fromCache = 'fromCache' in result ? result.fromCache : false;
      const cacheKey = `${language?.code}-${level}-${learningMode}`;
      
      if (isBackgroundGeneration) {
        // Append background-generated content to cache
        setContentCache(prev => ({
          ...prev,
          [cacheKey]: [...(prev[cacheKey] || []), ...data]
        }));
        
        // Update current view if this is the active mode
        if (cacheKey === `${language?.code}-${level}-${learningMode}`) {
          setGeneratedContent(prev => [...prev, ...data]);
        }
      } else {
        // Update cache and display content immediately
        const currentCache = contentCache[cacheKey] || [];
        const updatedCache = [...currentCache, ...data];
        
        setContentCache(prev => ({
          ...prev,
          [cacheKey]: updatedCache
        }));
        
        // If we have existing content, advance to the next item
        if (currentCache.length > 0) {
          const newIndex = currentCache.length; // This will be the index of the first new item
          setContentIndex(newIndex);
          setCurrentContent(data[0]);
          setGeneratedContent(updatedCache);
        } else {
          // First time loading content
          setGeneratedContent(data);
          setCurrentContent(data[0]);
          setContentIndex(0);
        }
        setIsLoadingNextSentence(false); // Clear loading state
        
        // If content was generated without word analysis, trigger background analysis
        if (skipWordAnalysis && !fromCache) {
          data.forEach((item: LessonContent, index: number) => {
            if (!item.wordMeanings || !item.quickTip) {
              const itemKey = `${cacheKey}-${index}`;
              setPendingWordAnalysis(prev => {
                const newSet = new Set(prev);
                newSet.add(itemKey);
                return newSet;
              });
              loadWordAnalysisForItem(item, cacheKey, index);
            }
          });
        } else {
          // Clear any pending analysis for items that already have word analysis
          data.forEach((item: LessonContent, index: number) => {
            if (item.wordMeanings && item.quickTip) {
              const itemKey = `${cacheKey}-${index}`;
              setPendingWordAnalysis(prev => {
                const newSet = new Set(prev);
                newSet.delete(itemKey);
                return newSet;
              });
            }
          });
        }
        
        // Maintain 10-sentence inventory
        queueInventoryManagement(cacheKey);
      }
    },
    onError: (error) => {
      toast({
        title: "Content Generation Error",
        description: "Failed to generate learning content. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Separate word analysis loading for hybrid approach
  const loadWordAnalysisForItem = async (item: LessonContent, cacheKey: string, index: number) => {
    try {
      const response = await apiRequest("POST", "/api/languages/add-word-analysis", {
        content: item,
        languageCode: language?.code,
      });
      const enhancedItem = await response.json();
      
      // Update cache with enhanced content
      setContentCache(prev => {
        const cached = prev[cacheKey] || [];
        const updated = [...cached];
        updated[index] = enhancedItem;
        return { ...prev, [cacheKey]: updated };
      });
      
      // Update current display if this is the visible item
      if (cacheKey === `${language?.code}-${level}-${learningMode}` && index === contentIndex) {
        setCurrentContent(enhancedItem);
        setGeneratedContent(prev => {
          const updated = [...prev];
          updated[index] = enhancedItem;
          return updated;
        });
      }
      
      // Remove from pending analysis
      const itemKey = `${cacheKey}-${index}`;
      setPendingWordAnalysis(prev => {
        const updated = new Set(prev);
        updated.delete(itemKey);
        return updated;
      });
    } catch (error) {
      console.error('Failed to load word analysis:', error);
    }
  };
  
  // Enhanced inventory management: Maintain 10 fresh sentences per mode across ALL levels
  const queueInventoryManagement = (currentCacheKey: string) => {
    const modes = ['lazy-listen', 'guided-kn-en', 'guided-en-kn'];
    const levels = ['basic', 'intermediate'];
    
    levels.forEach(lvl => {
      modes.forEach(mode => {
        const cacheKey = `${language?.code}-${lvl}-${mode}`;
        const cached = contentCache[cacheKey] || [];
        const needed = 10 - cached.length;
        
        if (needed > 0) {
          // Prioritize current mode and level, but generate for all
          const priority = (cacheKey === currentCacheKey) ? 'high' : 'low';
          queueBackgroundGeneration(cacheKey, needed, priority);
        }
      });
    });
  };
  
  // Background generation queue management with priority
  const queueBackgroundGeneration = (cacheKey: string, count: number, priority: 'high' | 'low' = 'low') => {
    const queueItem = `${cacheKey}:${count}:${priority}`;
    setBackgroundQueue(prev => {
      const newQueue = [...prev, queueItem];
      // Sort by priority (high priority first)
      return newQueue.sort((a, b) => {
        const aPriority = a.split(':')[2];
        const bPriority = b.split(':')[2];
        if (aPriority === 'high' && bPriority === 'low') return -1;
        if (aPriority === 'low' && bPriority === 'high') return 1;
        return 0;
      });
    });
  };

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
    const cacheKey = `${language?.code}-${level}-${learningMode}`;
    const cachedContent = contentCache[cacheKey] || [];
    
    
    // Store reference to current content before clearing
    const previousContent = currentContent;
    
    // Immediately clear the screen - user wants instant feedback
    setCurrentContent(null);
    setUserAnswer("");
    setShowGuidance(false);
    setGuidedFeedback(null);
    setShowCorrectAnswer(false);
    setIsLoadingNextSentence(true);
    
    // Mark current sentence as consumed for refill
    if (previousContent) {
      const sentenceKey = `${cacheKey}-${contentIndex}`;
      setConsumedSentences(prev => {
        const newSet = new Set(prev);
        newSet.add(sentenceKey);
        return newSet;
      });
      
      // Trigger refill for this mode
      queueBackgroundGeneration(cacheKey, 1, 'high');
    }
    
    // Check cache and load next sentence
    if (contentIndex < cachedContent.length - 1) {
      // Move to next sentence in cache - immediate loading
      const newIndex = contentIndex + 1;
      setContentIndex(newIndex);
      setCurrentContent(cachedContent[newIndex]);
      setGeneratedContent(cachedContent);
      setIsLoadingNextSentence(false);
    } else if (cachedContent.length === 0) {
      // No cache at all - show better loading message
      setTimeout(() => {
        generateContentMutation.mutate({ count: 1, skipWordAnalysis: true });
      }, 100);
    } else {
      // Reached end of cache - generate more
      generateContentMutation.mutate({ count: 1, skipWordAnalysis: true });
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
        activeBorder: 'border-orange-500 border-2 shadow-lg',
        translateButton: 'Just Translate (A → ಅ)',
        scripts: { source: 'A', target: 'ಅ' }
      },
      'hi': {
        colors: 'from-blue-400 to-indigo-500',
        bgAccent: 'bg-blue-50',
        textAccent: 'text-blue-900',
        borderAccent: 'border-blue-200',
        activeBorder: 'border-blue-500 border-2 shadow-lg',
        translateButton: 'Just Translate (A → अ)',
        scripts: { source: 'A', target: 'अ' }
      }
    };
    return themes[langCode as keyof typeof themes] || themes.kn;
  };

  // Function to extract topic from context (2-3 words max)
  const getTopicFromContext = (context: string) => {
    if (!context) return "General";
    
    // Extract key topic words - keep short (2-3 words max)
    const topicMappings = {
      'restaurant': 'Dining Out',
      'food': 'Food',
      'eating': 'Meals',
      'tea': 'Tea Time',
      'chai': 'Tea Time',
      'transport': 'Transport',
      'bus': 'Public Bus',
      'taxi': 'Taxi',
      'shopping': 'Shopping',
      'market': 'Market',
      'store': 'Store',
      'family': 'Family',
      'greet': 'Greetings',
      'hello': 'Greetings',
      'work': 'Work',
      'office': 'Office',
      'job': 'Career',
      'time': 'Time',
      'money': 'Money',
      'health': 'Health',
      'doctor': 'Medical',
      'weather': 'Weather',
      'home': 'Home',
      'hotel': 'Hotel',
      'phone': 'Phone',
      'help': 'Help'
    };

    const lowerContext = context.toLowerCase();
    for (const [key, topic] of Object.entries(topicMappings)) {
      if (lowerContext.includes(key)) {
        return topic;
      }
    }
    
    return "Daily Life";
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
      {/* Compact Header with Difficulty Level */}
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
              <h1 className="text-lg font-bold">{languageTitle}</h1>
              <p className="text-xs opacity-90">{languageSubtitle}</p>
            </div>
            
            {/* Difficulty Level in Header */}
            {functionality === 'learn' && (
              <div className="flex bg-white/10 rounded-lg p-1">
                <Button
                  variant="ghost"
                  onClick={() => setLevel('basic')}
                  className={`text-xs px-3 py-1 text-white ${
                    level === 'basic' 
                      ? 'bg-white/30 font-bold' 
                      : 'hover:bg-white/20'
                  }`}
                  data-testid="basic-level-btn"
                >
                  Basic
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setLevel('intermediate')}
                  className={`text-xs px-3 py-1 text-white ${
                    level === 'intermediate' 
                      ? 'bg-white/30 font-bold' 
                      : 'hover:bg-white/20'
                  }`}
                  data-testid="intermediate-level-btn"
                >
                  Intermediate
                </Button>
              </div>
            )}
            
            {functionality === 'translate' && (
              <div className="w-24"></div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-4">
        {/* Functionality Selection - More Compact */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <Card 
            className={`cursor-pointer transition-all ${
              functionality === 'learn' 
                ? theme.activeBorder
                : 'border hover:shadow-md'
            }`}
            onClick={() => setFunctionality('learn')}
            data-testid="learn-section"
          >
            <CardHeader className="pb-2 pt-3">
              <CardTitle className={`text-sm ${
                functionality === 'learn' ? 'font-bold' : 'font-medium'
              }`}>
                Learn with Examples
              </CardTitle>
              <p className="text-xs text-gray-600">
                Practice with AI-generated sentences
              </p>
            </CardHeader>
          </Card>

          <Card 
            className={`cursor-pointer transition-all ${
              functionality === 'translate' 
                ? theme.activeBorder
                : 'border hover:shadow-md'
            }`}
            onClick={() => setFunctionality('translate')}
            data-testid="translate-section"
          >
            <CardHeader className="pb-2 pt-3">
              <CardTitle className={`text-sm ${
                functionality === 'translate' ? 'font-bold' : 'font-medium'
              }`}>
                {theme.translateButton}
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
                <CardTitle className="text-base">Translate to {language.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (inputText.trim() && !translateMutation.isPending) {
                          translateMutation.mutate();
                        }
                      }
                    }}
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
                    className="flex-1 border-2 border-blue-500 hover:border-blue-600 shadow-md"
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
                    <div className="space-y-2">
                      <div className="text-center">
                        <p className="text-sm text-gray-500 mb-1">{translationResult.translation}</p>
                        {translationResult.transliteration && (
                          <div className="flex items-center justify-center gap-3">
                            <p className="text-2xl font-bold text-black">{translationResult.transliteration}</p>
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
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Word Meanings & Quick Tip */}
                <WordAnalysisCards 
                  wordMeanings={translationResult.wordMeanings}
                  quickTip={translationResult.quickTip}
                />
              </div>
            )}
          </div>
        ) : (
          /* Learn with Examples */
          <div className="space-y-4">
            {/* Modern Segmented Learning Mode Selection */}
            <div className="mb-3">
              <h3 className="text-sm font-semibold mb-2 text-center text-gray-900">Learning Mode</h3>
              <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
                <Button
                  variant="ghost"
                  onClick={() => setLearningMode('lazy-listen')}
                  className={`flex-1 text-xs py-2 px-2 rounded-md transition-all ${
                    learningMode === 'lazy-listen' 
                      ? 'bg-white shadow-md border-2 border-blue-400 font-bold text-black' 
                      : 'hover:bg-white/50 text-gray-700'
                  }`}
                  data-testid="lazy-listen-btn"
                >
                  <div className="text-center">
                    <div className="font-medium">Lazy Listen</div>
                    <div className="text-xs opacity-70">({theme.scripts.source} → {theme.scripts.target})</div>
                  </div>
                </Button>
                
                <Button
                  variant="ghost"
                  onClick={() => setLearningMode('guided-kn-en')}
                  className={`flex-1 text-xs py-2 px-2 rounded-md transition-all ${
                    learningMode === 'guided-kn-en' 
                      ? 'bg-white shadow-md border-2 border-blue-400 font-bold text-black' 
                      : 'hover:bg-white/50 text-gray-700'
                  }`}
                  data-testid="guided-kn-en-btn"
                >
                  <div className="text-center">
                    <div className="font-medium">Guided</div>
                    <div className="text-xs opacity-70">({theme.scripts.target} → {theme.scripts.source})</div>
                  </div>
                </Button>
                
                <Button
                  variant="ghost"
                  onClick={() => setLearningMode('guided-en-kn')}
                  className={`flex-1 text-xs py-2 px-2 rounded-md transition-all ${
                    learningMode === 'guided-en-kn' 
                      ? 'bg-white shadow-md border-2 border-blue-400 font-bold text-black' 
                      : 'hover:bg-white/50 text-gray-700'
                  }`}
                  data-testid="guided-en-kn-btn"
                >
                  <div className="text-center">
                    <div className="font-medium">Guided</div>
                    <div className="text-xs opacity-70">({theme.scripts.source} → {theme.scripts.target})</div>
                  </div>
                </Button>
              </div>
            </div>

            {/* Loading State */}
            {(generateContentMutation.isPending || isLoadingNextSentence || !currentContent) && (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-base text-black">
                    {isLoadingNextSentence ? "Loading next sentence..." : 
                     !currentContent ? "Preparing content..." : 
                     "Generating learning content..."}
                  </p>
                  <div className="animate-pulse mt-2 text-gray-500 text-sm">Please wait</div>
                </CardContent>
              </Card>
            )}

            {/* Learning Content */}
            {currentContent && !isLoadingNextSentence && (
              <div className="space-y-3">
                {/* Main Learning Card */}
                <Card className={`${theme.bgAccent} ${theme.borderAccent} border`}>
                  <CardContent className="p-4">
                    {/* Topic Badge moved inside card at top left */}
                    <div className="flex justify-start mb-3">
                      <Badge variant="secondary" className="text-xs">
                        Topic: {getTopicFromContext(currentContent.context || "")}
                      </Badge>
                    </div>
                    {learningMode === 'lazy-listen' ? (
                      // Lazy Listen Mode
                      <div className="text-center space-y-3">
                        <h3 className="text-base text-black font-medium">{currentContent.english}</h3>
                        <div className="space-y-2">
                          <div className="text-center">
                            <p className="text-sm text-gray-500 mb-1">{currentContent.target}</p>
                            <div className="flex items-center justify-center gap-3">
                              <p className="text-2xl font-bold text-black">{currentContent.transliteration}</p>
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
                        </div>
                      </div>
                    ) : (
                      // Guided Workout Mode
                      <div className="space-y-3">
                        <div className="text-center space-y-3">
                          <div>
                            {learningMode === 'guided-kn-en' ? (
                              <div className="mb-3">
                                <p className="text-sm text-gray-500 mb-1">{currentContent.target}</p>
                                <div className="flex items-center justify-center gap-3 mb-2">
                                  <p className="text-xl font-bold text-black">{currentContent.transliteration}</p>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => playAudio(currentContent.target)}
                                    data-testid="pronounce-kn-btn"
                                  >
                                    <Volume2 className="w-4 h-4 mr-1" />
                                    Pronounce
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <h3 className="text-base font-medium text-black mb-2">
                                {currentContent.english}
                              </h3>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 text-left">
                            {learningMode === 'guided-kn-en' 
                              ? 'What does this mean in English?' 
                              : `How do you say this in ${language.name}?`}
                          </p>
                        </div>

                        <div className="relative">
                          <Textarea
                            value={userAnswer}
                            onChange={(e) => setUserAnswer(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                if (userAnswer.trim() && !checkAnswerMutation.isPending) {
                                  checkAnswerMutation.mutate();
                                }
                              }
                            }}
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
                            className="flex-1 border-2 border-blue-500 hover:border-blue-600 shadow-md"
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

                {/* Word Meanings and Quick Tip for Lazy Listen Mode */}
                {learningMode === 'lazy-listen' && (
                  <WordAnalysisCards 
                    wordMeanings={(currentContent as any)?.wordMeanings}
                    quickTip={(currentContent as any)?.quickTip}
                    isLoading={pendingWordAnalysis.has(`${language?.code}-${level}-${learningMode}-${contentIndex}`)}
                  />
                )}

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
                      <div className="space-y-3">
                        <div className="text-center">
                          <p className="text-base font-medium text-green-900 mb-2">
                            {learningMode === 'guided-kn-en' 
                              ? currentContent.english 
                              : currentContent.english}
                          </p>
                          {learningMode === 'guided-en-kn' && (
                            <div>
                              <p className="text-sm text-green-600 mb-1">{currentContent.target}</p>
                              <div className="flex items-center justify-center gap-3">
                                <p className="text-lg font-bold text-green-900">{currentContent.transliteration}</p>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => playAudio(currentContent.target)}
                                  data-testid="pronounce-correct-btn"
                                >
                                  <Volume2 className="w-4 h-4 mr-1" />
                                  Pronounce
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Word Meanings and Quick Tip - Only show after reveal answer */}
                {showCorrectAnswer && (
                  <WordAnalysisCards 
                    wordMeanings={(currentContent as any)?.wordMeanings}
                    quickTip={(currentContent as any)?.quickTip}
                    isLoading={pendingWordAnalysis.has(`${language?.code}-${level}-${learningMode}-${contentIndex}`)}
                  />
                )}

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