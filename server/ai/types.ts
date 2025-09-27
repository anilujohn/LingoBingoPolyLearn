import { LessonContent } from "@shared/schema";
import type { AIModelInfo, AIModelId } from "@shared/ai-models";

export interface TranslationResult {
  translation: string;
  transliteration?: string;
}

export interface WordMeaningDetail {
  word: string;
  meaning: string;
  transliteration?: string;
}

export interface WordAnalysisResult {
  wordMeanings?: WordMeaningDetail[];
  quickTip?: string;
}

export interface TranslationWithAnalysisResult extends TranslationResult, WordAnalysisResult {}

export interface CheckAnswerResult {
  isCorrect: boolean;
  feedback: string;
  score: number;
}

export interface CheckAnswerDetailedResult {
  whatsRight: string;
  mainPointToImprove: string;
  hint: string;
}

export interface AIModelUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

export interface AIModelResponse<T> {
  data: T;
  usage?: AIModelUsage;
}

export interface AIModelAdapter {
  readonly info: AIModelInfo;
  readonly id: AIModelId;
  generateContent(
    languageCode: string,
    languageName: string,
    region: string,
    level: string,
    category: string,
    count?: number
  ): Promise<AIModelResponse<LessonContent[]>>;
  analyzeWordsForLearning(
    englishText: string,
    targetText: string,
    languageCode: string
  ): Promise<AIModelResponse<WordAnalysisResult>>;
  translateText(
    text: string,
    sourceLang: string,
    targetLang: string
  ): Promise<AIModelResponse<TranslationResult>>;
  translateWithAnalysis(
    text: string,
    sourceLang: string,
    targetLang: string,
    languageCode: string
  ): Promise<AIModelResponse<TranslationWithAnalysisResult>>;
  checkAnswer(
    userAnswer: string,
    correctAnswer: string,
    context: string,
    mode: string
  ): Promise<AIModelResponse<CheckAnswerResult>>;
  checkAnswerDetailed(
    userAnswer: string,
    correctAnswer: string,
    context: string,
    mode: string
  ): Promise<AIModelResponse<CheckAnswerDetailedResult>>;
}
