import { useState } from "react";
import { useMutation } from "@tanstack/react-query";

import { FeedbackService } from "@/services/feedback-service";
import type { FeedbackSignal, FeedbackTouchpoint, FeedbackReason } from "@shared/feedback";
import type { AIInteractionMeta } from "@shared/ai-usage";

interface FeedbackState {
  signal?: FeedbackSignal;
  reason?: FeedbackReason;
  comment?: string;
  submitted?: boolean;
  feedbackId?: string;
}

interface UseFeedbackOptions {
  interaction: AIInteractionMeta | null | undefined;
  touchpoint: FeedbackTouchpoint;
  languageId?: string;
  xpDelta?: number;
  onSuccess?: () => void;
}

export function useFeedback({ interaction, touchpoint, languageId, xpDelta, onSuccess }: UseFeedbackOptions) {
  const [state, setState] = useState<FeedbackState>({});

  const submitMutation = useMutation({
    mutationFn: async (payload: { signal: FeedbackSignal; reason?: FeedbackReason; comment?: string }) => {
      if (!interaction) {
        throw new Error("Missing interaction metadata for feedback submission");
      }

      if (state.feedbackId) {
        return FeedbackService.updateFeedback(state.feedbackId, {
          signal: payload.signal,
          reason: payload.reason,
          comment: payload.comment,
          xpDelta,
        });
      }

      return FeedbackService.submitFeedback({
        usageRecordId: interaction.usageRecordId,
        signal: payload.signal,
        touchpoint,
        feature: interaction.feature,
        operation: interaction.operation,
        modelId: interaction.modelId,
        languageId: languageId ?? interaction.languageId,
        reason: payload.reason,
        comment: payload.comment,
        xpDelta,
      });
    },
    onSuccess: (record) => {
      setState((prev) => ({
        ...prev,
        submitted: true,
        feedbackId: record.id,
      }));
      onSuccess?.();
    },
  });

  const selectSignal = (signal: FeedbackSignal) => {
    if (!interaction) return;
    const nextReason = signal === "negative" ? state.reason : undefined;
    setState((prev) => ({
      ...prev,
      signal,
      reason: nextReason,
      submitted: prev.feedbackId ? prev.submitted : false,
    }));
    submitMutation.mutate({
      signal,
      reason: nextReason,
      comment: state.comment,
    });
  };

  const selectReason = (reason: FeedbackReason | undefined) => {
    setState((prev) => ({ ...prev, reason }));
    if (state.signal === "negative") {
      submitMutation.mutate({ signal: state.signal, reason, comment: state.comment });
    }
  };

  const updateComment = (comment: string) => {
    setState((prev) => ({ ...prev, comment }));
  };

  const submitComment = () => {
    if (!state.signal) return;
    submitMutation.mutate({ signal: state.signal, reason: state.reason, comment: state.comment });
  };

  const reset = () => {
    setState({});
    submitMutation.reset();
  };

  return {
    state,
    isLoading: submitMutation.isPending,
    isError: submitMutation.isError,
    selectSignal,
    selectReason,
    updateComment,
    submitComment,
    reset,
  };
}
