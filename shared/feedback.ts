import type { AIModelId, AIProvider } from "./ai-models";

export type FeedbackSignal = "positive" | "negative" | "neutral";

export type FeedbackTouchpoint =
  | "translation"
  | "translation-with-analysis"
  | "content-generation"
  | "reveal-answer"
  | "word-analysis"
  | "check-answer"
  | "check-answer-detailed"
  | "lesson-check-answer"
  | "other";

export interface AIResponseFeedback {
  id: string;
  usageRecordId: string;
  userId: string;
  sessionId?: string;
  provider: AIProvider;
  modelId: AIModelId;
  languageId?: string;
  operation: string;
  feature: string;
  touchpoint: FeedbackTouchpoint;
  signal: FeedbackSignal;
  reason?: FeedbackReason;
  comment?: string;
  xpDelta?: number;
  createdAt: string;
  context?: FeedbackContext;
  functionality?: string;
  learningMode?: string;
  learningLevel?: string;
}

export const FEEDBACK_REASONS = [
  "accuracy",
  "tone",
  "latency",
  "complexity",
  "other",
] as const;

export type FeedbackReason = (typeof FEEDBACK_REASONS)[number];

export const FEEDBACK_REASON_PRESETS: Record<FeedbackTouchpoint, readonly FeedbackReason[]> = {
  translation: ["accuracy", "tone", "latency", "other"],
  "translation-with-analysis": ["accuracy", "tone", "complexity", "latency", "other"],
  "content-generation": ["accuracy", "tone", "complexity", "other"],
  "reveal-answer": ["accuracy", "tone", "latency", "other"],
  "word-analysis": ["accuracy", "tone", "complexity", "other"],
  "check-answer": ["accuracy", "tone", "latency", "other"],
  "check-answer-detailed": ["accuracy", "tone", "complexity", "other"],
  "lesson-check-answer": ["accuracy", "tone", "complexity", "other"],
  other: FEEDBACK_REASONS,
};

export interface FeedbackContext {
  sourceText?: string;
  sourceLang?: string;
  targetLang?: string;
  translationText?: string;
  transliteration?: string;
  languageCode?: string;
  featureMeta?: Record<string, unknown>;
}

export interface FeedbackQueryFilters {
  userId?: string;
  languageId?: string;
  modelId?: AIModelId;
  feature?: string;
  operation?: string;
  touchpoint?: FeedbackTouchpoint;
  signal?: FeedbackSignal;
  functionality?: string;
  learningMode?: string;
  learningLevel?: string;
  start?: string;
  end?: string;
  limit?: number;
}

export interface FeedbackSummaryBucket {
  date: string;
  languageId?: string;
  modelId: AIModelId;
  feature: string;
  functionality?: string;
  learningMode?: string;
  learningLevel?: string;
  userId?: string;
  total: number;
  positive: number;
  negative: number;
  neutral: number;
}

export interface FeedbackSummaryResponse {
  buckets: FeedbackSummaryBucket[];
}
