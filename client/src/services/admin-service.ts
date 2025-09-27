import { apiRequest } from "@/lib/queryClient";
import type { AIModelId, AIModelInfo } from "@shared/ai-models";
import type {
  AIUsageReportResponse,
  AIDailyUsageReportResponse,
} from "@shared/ai-usage";
import type { AIResponseFeedback, FeedbackSummaryResponse } from "@shared/feedback";
import type { EngagementEvent, EngagementSummaryResponse } from "@shared/engagement";

export interface AIModelListItem extends AIModelInfo {
  isActive: boolean;
}

export interface AIModelListResponse {
  activeModelId: AIModelId;
  models: AIModelListItem[];
}

export interface AIUsageQueryParams {
  userId?: string;
  modelId?: AIModelId;
  operation?: string;
  feature?: string;
  start?: string;
  end?: string;
  limit?: number;
  languageId?: string;
}

export class AdminService {
  static async listAIModels(): Promise<AIModelListResponse> {
    const response = await apiRequest("GET", "/api/admin/ai-models");
    return response.json();
  }

  static async selectAIModel(modelId: AIModelId): Promise<{ activeModelId: AIModelId }> {
    const response = await apiRequest("POST", "/api/admin/ai-models/select", {
      modelId,
    });
    return response.json();
  }

  static async fetchAIUsageLogs(
    params: AIUsageQueryParams = {}
  ): Promise<AIUsageReportResponse> {
    const query = new URLSearchParams();
    if (params.userId) query.set("userId", params.userId);
    if (params.modelId) query.set("modelId", params.modelId);
    if (params.operation) query.set("operation", params.operation);
    if (params.feature) query.set("feature", params.feature);
    if (params.start) query.set("start", params.start);
    if (params.end) query.set("end", params.end);
    if (typeof params.limit === "number") {
      query.set("limit", params.limit.toString());
    }
    const url = `/api/admin/ai-usage/logs${query.toString() ? `?${query.toString()}` : ""}`;
    const response = await apiRequest("GET", url);
    return response.json();
  }

  static async fetchAIDailyUsage(
    params: AIUsageQueryParams = {}
  ): Promise<AIDailyUsageReportResponse> {
    const query = new URLSearchParams();
    if (params.userId) query.set("userId", params.userId);
    if (params.modelId) query.set("modelId", params.modelId);
    if (params.operation) query.set("operation", params.operation);
    if (params.feature) query.set("feature", params.feature);
    if (params.start) query.set("start", params.start);
    if (params.end) query.set("end", params.end);
    if (typeof params.limit === "number") {
      query.set("limit", params.limit.toString());
    }
    const url = `/api/admin/ai-usage/daily-summary${query.toString() ? `?${query.toString()}` : ""}`;
    const response = await apiRequest("GET", url);
    return response.json();
  }

  static async fetchFeedbackLogs(params: Record<string, string | number | undefined> = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        query.set(key, String(value));
      }
    });
    const url = `/api/admin/feedback/logs${query.toString() ? `?${query.toString()}` : ""}`;
    const response = await apiRequest("GET", url);
    return response.json() as Promise<{ records: AIResponseFeedback[] }>;
  }

  static async fetchFeedbackSummary(params: Record<string, string | number | undefined> = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        query.set(key, String(value));
      }
    });
    const url = `/api/admin/feedback/summary${query.toString() ? `?${query.toString()}` : ""}`;
    const response = await apiRequest("GET", url);
    return response.json() as Promise<FeedbackSummaryResponse>;
  }

  static async fetchEngagementLogs(params: Record<string, string | number | undefined> = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        query.set(key, String(value));
      }
    });
    const url = `/api/admin/engagement/logs${query.toString() ? `?${query.toString()}` : ""}`;
    const response = await apiRequest("GET", url);
    return response.json() as Promise<{ records: EngagementEvent[] }>;
  }

  static async fetchEngagementSummary(params: Record<string, string | number | undefined> = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        query.set(key, String(value));
      }
    });
    const url = `/api/admin/engagement/summary${query.toString() ? `?${query.toString()}` : ""}`;
    const response = await apiRequest("GET", url);
    return response.json() as Promise<EngagementSummaryResponse>;
  }
}
