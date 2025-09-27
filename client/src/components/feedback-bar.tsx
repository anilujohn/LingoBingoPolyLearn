import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useFeedback } from "@/hooks/use-feedback";
import { FEEDBACK_REASON_PRESETS, FEEDBACK_REASONS } from "@shared/feedback";
import type { FeedbackTouchpoint } from "@shared/feedback";
import type { AIInteractionMeta, AIUsageMetadata } from "@shared/ai-usage";

interface FeedbackBarProps {
  interaction?: AIInteractionMeta | null;
  touchpoint: FeedbackTouchpoint;
  languageId?: string;
  xpDelta?: number;
  className?: string;
  reasons?: string[];
}

export function FeedbackBar({ interaction, touchpoint, languageId, xpDelta, className, reasons }: FeedbackBarProps) {
  const {
    state,
    selectSignal,
    selectReason,
    updateComment,
    submitComment,
    reset,
    isLoading,
    isError,
  } = useFeedback({ interaction: interaction ?? null, touchpoint, languageId, xpDelta });

  useEffect(() => {
    if (!interaction) {
      reset();
    }
  }, [interaction, reset]);

  if (!interaction) {
    return null;
  }

  const showReasonSelect = state.signal === "negative";
  const availableReasons = reasons ?? FEEDBACK_REASON_PRESETS[touchpoint] ?? FEEDBACK_REASONS;
  const showSavedIndicator = state.submitted && !isLoading;
  const metadata = interaction.metadata as AIUsageMetadata | undefined;
  const metadataRecord = metadata as (Record<string, unknown> & AIUsageMetadata) | undefined;

  const formatPretty = (value?: string | null) => {
    if (!value) return undefined;
    return value
      .split(/[-_]/)
      .filter(Boolean)
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(" ");
  };

  const formatMode = (value?: string | null) => {
    if (!value) return undefined;
    switch (value) {
      case "lazy-listen":
        return "Lazy Listen";
      case "guided-kn-en":
        return "Guided (Kannada → English)";
      case "guided-en-kn":
        return "Guided (English → Kannada)";
      default:
        return formatPretty(value);
    }
  };

  const functionalityLabel = formatPretty(metadata?.functionality);
  const fallbackMode = typeof metadataRecord?.mode === "string" ? (metadataRecord.mode as string) : undefined;
  const fallbackLevel = typeof metadataRecord?.level === "string" ? (metadataRecord.level as string) : undefined;

  const learningModeLabel = formatMode(metadata?.learningMode ?? fallbackMode);
  const learningLevelLabel = formatPretty(metadata?.learningLevel ?? fallbackLevel);

  const experienceParts = [functionalityLabel, learningModeLabel, learningLevelLabel].filter(Boolean);
  const experienceSummary = experienceParts.length ? experienceParts.join(" • ") : undefined;

  return (
    <div className={cn("rounded-md border bg-white p-3 shadow-sm", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-gray-800">Was this helpful?</p>
          <p className="text-xs text-muted-foreground">
            Your feedback helps us tune the model and improve {touchpoint.replace(/-/g, " ")}.
          </p>
          {experienceSummary ? (
            <p className="mt-1 text-xs text-muted-foreground">Context: {experienceSummary}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={state.signal === "positive" ? "default" : "outline"}
            size="sm"
            disabled={isLoading}
            onClick={() => selectSignal("positive")}
          >
            👍 Helpful
          </Button>
          <Button
            variant={state.signal === "negative" ? "default" : "outline"}
            size="sm"
            disabled={isLoading}
            onClick={() => selectSignal("negative")}
          >
            👎 Needs work
          </Button>
        </div>
      </div>

      {showReasonSelect && (
        <div className="mt-3 flex flex-col gap-1">
          <p className="text-xs text-muted-foreground">What needs improving?</p>
          <Select
            value={state.reason ?? ""}
            onValueChange={(value) => selectReason((value || undefined) as typeof state.reason)}
            disabled={isLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a reason" />
            </SelectTrigger>
            <SelectContent position="popper" className="z-50 border bg-white shadow-lg">
              {availableReasons.map((item) => (
                <SelectItem key={item} value={item}>
                  {item.charAt(0).toUpperCase() + item.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <Textarea
        value={state.comment ?? ""}
        onChange={(event) => updateComment(event.target.value)}
        placeholder="Optional: add details so we know what to fix"
        rows={2}
        className="mt-3 placeholder:italic placeholder:text-gray-400"
        disabled={isLoading}
      />

      <div className="mt-3 flex items-center gap-3">
        <Button
          size="sm"
          onClick={submitComment}
          disabled={isLoading || !state.signal}
        >
          Save feedback
        </Button>
        {showSavedIndicator ? <span className="text-xs text-green-600">Recorded</span> : null}
      </div>

      {isError && (
        <p className="mt-2 text-xs text-destructive">Could not save feedback. Please try again.</p>
      )}
      {!state.signal && !isLoading && (
        <p className="mt-2 text-xs text-muted-foreground">Select 👍 or 👎 to provide feedback.</p>
      )}
    </div>
  );
}
