import type { AIModelId } from "./ai-models";

export interface AIModelPricing {
  currency: string;
  inputPerMillion: number; // cost in currency per 1M input tokens
  outputPerMillion: number; // cost in currency per 1M output tokens
  source?: string;
  effectiveDate?: string;
}

export interface UsageCostBreakdown {
  inputCost: number;
  outputCost: number;
  totalCost: number;
  currency: string;
}

export const AI_MODEL_PRICING: Partial<Record<AIModelId, AIModelPricing>> = {
  "gemini-2.5-flash-lite": {
    currency: "USD",
    inputPerMillion: 0.075,
    outputPerMillion: 0.30,
    source: "Google AI Studio Pricing (July 2024)",
    effectiveDate: "2024-07-01",
  },
  "gemini-2.5-flash": {
    currency: "USD",
    inputPerMillion: 0.35,
    outputPerMillion: 1.05,
    source: "Google AI Studio Pricing (July 2024)",
    effectiveDate: "2024-07-01",
  },
  "gemini-2.5-pro": {
    currency: "USD",
    inputPerMillion: 3.50,
    outputPerMillion: 10.50,
    source: "Google AI Studio Pricing (July 2024)",
    effectiveDate: "2024-07-01",
  },
};

export function calculateUsageCost(
  modelId: AIModelId,
  inputTokens: number,
  outputTokens: number
): UsageCostBreakdown {
  const pricing = AI_MODEL_PRICING[modelId];
  if (!pricing) {
    return {
      inputCost: 0,
      outputCost: 0,
      totalCost: 0,
      currency: "USD",
    };
  }

  const inputCost = (inputTokens / 1_000_000) * pricing.inputPerMillion;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPerMillion;
  const totalCost = inputCost + outputCost;

  return {
    inputCost,
    outputCost,
    totalCost,
    currency: pricing.currency,
  };
}
