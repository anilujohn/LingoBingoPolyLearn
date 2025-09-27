import type { AIModelId, AIProvider } from "./ai-models";

export interface AIUsageMetadata extends Record<string, unknown> {
  functionality?: string;
  learningMode?: string;
  learningLevel?: string;
  languageId?: string;
  languageCode?: string;
  targetLang?: string;
  languageName?: string;
}

export interface AIUsageRecord {
  id: string;
  userId: string;
  sessionId?: string;
  timestamp: string;
  provider: AIProvider;
  modelId: AIModelId;
  operation: string;
  feature: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
  currency: string;
  metadata?: AIUsageMetadata;
  durationMs?: number;
}

export type AIUsageRecordInput = Omit<AIUsageRecord, "id" | "timestamp"> & {
  id?: string;
  timestamp?: string;
};

export interface AIInteractionMeta {
  usageRecordId: string;
  provider: AIProvider;
  modelId: AIModelId;
  feature: string;
  operation: string;
  languageId?: string;
  metadata?: AIUsageMetadata;
  durationMs?: number;
}

export interface AIUsageQueryFilters {
  userId?: string;
  start?: string;
  end?: string;
  modelId?: AIModelId;
  operation?: string;
  feature?: string;
  limit?: number;
}

export interface DailyAIUsageSummary {
  date: string;
  userId: string;
  provider: AIProvider;
  modelId: AIModelId;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
  currency: string;
}

export interface AIUsageReportResponse {
  records: AIUsageRecord[];
  pricingSource?: string;
  pricingEffectiveDate?: string;
}

export interface AIDailyUsageReportResponse {
  summaries: DailyAIUsageSummary[];
  pricingSource?: string;
  pricingEffectiveDate?: string;
}

