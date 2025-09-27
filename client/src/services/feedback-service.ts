import { apiRequest } from "@/lib/queryClient";
import type { FeedbackSignal, FeedbackTouchpoint, FeedbackReason, AIResponseFeedback } from "@shared/feedback";
import type { AIModelId } from "@shared/ai-models";

export interface SubmitFeedbackRequest {
  usageRecordId: string;
  signal: FeedbackSignal;
  touchpoint: FeedbackTouchpoint;
  feature?: string;
  operation?: string;
  modelId?: AIModelId;
  languageId?: string;
  reason?: FeedbackReason;
  comment?: string;
  xpDelta?: number;
}

export class FeedbackService {
  static async submitFeedback(payload: SubmitFeedbackRequest): Promise<AIResponseFeedback> {
    const response = await apiRequest("POST", "/api/feedback", payload);
    return response.json();
  }

  static async updateFeedback(
    id: string,
    payload: Partial<Pick<SubmitFeedbackRequest, "signal" | "reason" | "comment" | "xpDelta" | "touchpoint">>
  ): Promise<AIResponseFeedback> {
    const response = await apiRequest("PATCH", `/api/feedback/${id}`, payload);
    return response.json();
  }
}
