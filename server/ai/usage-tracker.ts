import type { Request } from "express";
import { randomUUID } from "crypto";

import { calculateUsageCost, AI_MODEL_PRICING } from "@shared/ai-pricing";
import type { AIModelAdapter, AIModelResponse } from "./types";
import type { AIModelUsage } from "./types";
import type { AIUsageRecord, AIUsageMetadata } from "@shared/ai-usage";
import type { EngagementEvent } from "@shared/engagement";
import { storage } from "../storage";

interface RecordUsageOptions<T> {
  req: Request;
  adapter: AIModelAdapter;
  operation: string;
  feature: string;
  response: AIModelResponse<T> | null;
  metadata?: AIUsageMetadata;
  userId?: string;
  sessionId?: string;
  engagement?: {
    action: string;
    xpDelta?: number;
  };
  durationMs?: number;
}

const DEFAULT_USER_ID = "user-1";

export function resolveUserId(req: Request): string {
  return (req.header("x-user-id") || DEFAULT_USER_ID).trim();
}

export function resolveSessionId(req: Request): string | undefined {
  const header = req.header("x-session-id");
  return header ? header.trim() : undefined;
}

function normalizeUsage(usage?: AIModelUsage) {
  const inputTokens = usage?.inputTokens ?? 0;
  const outputTokens = usage?.outputTokens ?? 0;
  const totalTokens = usage?.totalTokens ?? inputTokens + outputTokens;
  return { inputTokens, outputTokens, totalTokens };
}

export async function recordAIUsage<T>(options: RecordUsageOptions<T>): Promise<AIUsageRecord> {
  const { req, adapter, operation, feature, response } = options;
  const metadata = options.metadata ?? ({} as AIUsageMetadata);
  const userId = options.userId ?? resolveUserId(req);
  const sessionId = options.sessionId ?? resolveSessionId(req);

  const usage = normalizeUsage(response?.usage);
  const cost = calculateUsageCost(adapter.id, usage.inputTokens, usage.outputTokens);

  const record: AIUsageRecord = await storage.logAIUsage({
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    userId,
    sessionId,
    provider: adapter.info.provider,
    modelId: adapter.id,
    operation,
    feature,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    totalTokens: usage.totalTokens,
    inputCost: cost.inputCost,
    outputCost: cost.outputCost,
    totalCost: cost.totalCost,
    currency: cost.currency,
    metadata,
    durationMs: options.durationMs,
  });

  if (options.engagement) {
    const languageId = (metadata?.languageId as string | undefined) || undefined;
    const functionality = typeof metadata?.functionality === "string" ? metadata.functionality : undefined;
    const learningMode = typeof metadata?.learningMode === "string" ? metadata.learningMode : undefined;
    const learningLevel = typeof metadata?.learningLevel === "string"
      ? metadata.learningLevel
      : typeof (metadata as Record<string, unknown>)?.level === "string"
        ? ((metadata as Record<string, unknown>).level as string)
        : undefined;
    const engagementRecord: Omit<EngagementEvent, "id" | "timestamp"> = {
      userId,
      sessionId,
      provider: adapter.info.provider,
      modelId: adapter.id,
      languageId,
      operation,
      feature,
      action: options.engagement.action,
      xpDelta: options.engagement.xpDelta,
      functionality,
      learningMode,
      learningLevel,
    };
    await storage.logEngagementEvent(engagementRecord);
  }

  return record;
}

export function getPricingMetadata(modelId: string) {
  const pricing = AI_MODEL_PRICING[modelId as keyof typeof AI_MODEL_PRICING];
  if (!pricing) {
    return undefined;
  }
  return {
    source: pricing.source,
    effectiveDate: pricing.effectiveDate,
  };
}
