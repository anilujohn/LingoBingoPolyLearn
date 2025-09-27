export const AI_MODEL_IDS = [
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.5-pro"
] as const;

export type AIModelId = (typeof AI_MODEL_IDS)[number];

export type AIProvider = "google" | "openai" | "anthropic" | "xai";
export type AIModelTier = "budget" | "standard" | "premium" | "enterprise";

export interface AIModelCapabilities {
  contentGeneration: boolean;
  translation: boolean;
  evaluation: boolean;
}

export interface AIModelSettings {
  google?: {
    model: "gemini-2.5-flash-lite" | "gemini-2.5-flash" | "gemini-2.5-pro";
  };
}

export interface AIModelInfo {
  id: AIModelId;
  provider: AIProvider;
  label: string;
  description: string;
  tier: AIModelTier;
  costNote?: string;
  capabilities: AIModelCapabilities;
  settings: AIModelSettings;
}

export const DEFAULT_AI_MODEL_ID: AIModelId = "gemini-2.5-flash-lite";

const GOOGLE_MODELS: Record<AIModelId, AIModelInfo> = {
  "gemini-2.5-flash-lite": {
    id: "gemini-2.5-flash-lite",
    provider: "google",
    label: "Gemini 2.5 Flash Lite",
    description: "Fastest and most cost-effective option for everyday learning content.",
    tier: "budget",
    costNote: "Lowest cost per request; ideal for high-volume usage.",
    capabilities: {
      contentGeneration: true,
      translation: true,
      evaluation: true,
    },
    settings: {
      google: {
        model: "gemini-2.5-flash-lite",
      },
    },
  },
  "gemini-2.5-flash": {
    id: "gemini-2.5-flash",
    provider: "google",
    label: "Gemini 2.5 Flash",
    description: "Balanced choice offering better reasoning while staying efficient.",
    tier: "standard",
    costNote: "Moderate cost; use when higher accuracy is needed.",
    capabilities: {
      contentGeneration: true,
      translation: true,
      evaluation: true,
    },
    settings: {
      google: {
        model: "gemini-2.5-flash",
      },
    },
  },
  "gemini-2.5-pro": {
    id: "gemini-2.5-pro",
    provider: "google",
    label: "Gemini 2.5 Pro",
    description: "Highest quality responses with deeper reasoning and nuance.",
    tier: "premium",
    costNote: "Highest cost; reserve for premium subscribers or critical tasks.",
    capabilities: {
      contentGeneration: true,
      translation: true,
      evaluation: true,
    },
    settings: {
      google: {
        model: "gemini-2.5-pro",
      },
    },
  },
};

export const AI_MODEL_CATALOG: Readonly<Record<AIModelId, AIModelInfo>> = GOOGLE_MODELS;

export const AI_MODEL_LIST: ReadonlyArray<AIModelInfo> = Object.values(AI_MODEL_CATALOG);
