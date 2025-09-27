import {
  AI_MODEL_LIST,
  AI_MODEL_CATALOG,
  DEFAULT_AI_MODEL_ID,
  type AIModelId,
  type AIModelInfo,
  type AIProvider,
} from "@shared/ai-models";
import { storage } from "../storage";
import { GeminiAdapter } from "./adapters/gemini-adapter";
import type { AIModelAdapter } from "./types";

const adapterFactories: Partial<Record<AIProvider, (info: AIModelInfo) => AIModelAdapter>> = {
  google: (info) => new GeminiAdapter(info),
};

class AIModelManager {
  private readonly adapters = new Map<AIModelId, AIModelAdapter>();

  constructor() {
    for (const info of AI_MODEL_LIST) {
      const adapter = this.createAdapter(info);
      this.adapters.set(info.id, adapter);
    }
  }

  async getActiveModelId(): Promise<AIModelId> {
    const settings = await storage.getAISettings();
    if (this.adapters.has(settings.activeModelId)) {
      return settings.activeModelId;
    }
    return DEFAULT_AI_MODEL_ID;
  }

  async getActiveAdapter(): Promise<AIModelAdapter> {
    const activeId = await this.getActiveModelId();
    return this.getAdapterById(activeId);
  }

  getAdapterById(modelId: AIModelId): AIModelAdapter {
    const adapter = this.adapters.get(modelId);
    if (!adapter) {
      throw new Error(`AI model ${modelId} is not registered.`);
    }
    return adapter;
  }

  async setActiveModel(modelId: AIModelId): Promise<void> {
    if (!this.adapters.has(modelId)) {
      throw new Error(`AI model ${modelId} is not registered.`);
    }
    await storage.setActiveAIModel(modelId);
  }

  async listModels() {
    const activeId = await this.getActiveModelId();
    return AI_MODEL_LIST.map((info) => ({
      ...info,
      isActive: info.id === activeId,
    }));
  }

  getModelInfo(modelId: AIModelId): AIModelInfo {
    const info = AI_MODEL_CATALOG[modelId];
    if (!info) {
      throw new Error(`AI model ${modelId} metadata is missing.`);
    }
    return info;
  }

  private createAdapter(info: AIModelInfo): AIModelAdapter {
    const factory = adapterFactories[info.provider];
    if (!factory) {
      throw new Error(`Provider ${info.provider} is not yet supported.`);
    }
    return factory(info);
  }
}

export const aiModelManager = new AIModelManager();
