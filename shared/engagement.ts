import type { AIModelId, AIProvider } from "./ai-models";

export interface EngagementEvent {
  id: string;
  userId: string;
  sessionId?: string;
  provider: AIProvider;
  modelId: AIModelId;
  languageId?: string;
  operation: string;
  feature: string;
  action: string;
  xpDelta?: number;
  functionality?: string;
  learningMode?: string;
  learningLevel?: string;
  timestamp: string;
}

export interface EngagementQueryFilters {
  userId?: string;
  languageId?: string;
  modelId?: AIModelId;
  feature?: string;
  operation?: string;
  action?: string;
  functionality?: string;
  learningMode?: string;
  learningLevel?: string;
  start?: string;
  end?: string;
  limit?: number;
}

export interface EngagementSummaryBucket {
  date: string;
  userId: string;
  languageId?: string;
  modelId: AIModelId;
  feature: string;
  functionality?: string;
  learningMode?: string;
  learningLevel?: string;
  actionCount: number;
  xpTotal: number;
  activeMinutes: number;
  actionsPerActiveMinute: number;
  xpPerActiveMinute: number;
}

export interface EngagementSummaryResponse {
  buckets: EngagementSummaryBucket[];
}
