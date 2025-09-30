import { LessonContent } from "@shared/schema";
import { GeminiService, type GeminiConfig, type GeminiResult } from "../../gemini-service";
import type { AIModelInfo } from "@shared/ai-models";
import type {
  AIModelAdapter,
  AIModelResponse,
  CheckAnswerDetailedResult,
  CheckAnswerResult,
  BasicTranslationResult,
  TranslationWithAnalysisResult,
  WordAnalysisResult,
} from "../types";

function ensureGoogleModel(info: AIModelInfo): GeminiConfig["model"] {
  const model = info.settings.google?.model;
  if (!model) {
    throw new Error(`Model ${info.id} is not configured with a Google Gemini identifier.`);
  }
  return model;
}

function toAIModelResponse<T>(result: GeminiResult<T>): AIModelResponse<T> {
  return {
    data: result.data,
    usage: result.usage
      ? {
          inputTokens: result.usage.inputTokens,
          outputTokens: result.usage.outputTokens,
          totalTokens: result.usage.totalTokens,
        }
      : undefined,
  };
}

export class GeminiAdapter implements AIModelAdapter {
  private readonly service: GeminiService;
  private readonly googleModelId: GeminiConfig["model"];

  constructor(private readonly modelInfo: AIModelInfo) {
    this.googleModelId = ensureGoogleModel(modelInfo);
    this.service = new GeminiService({ model: this.googleModelId });
  }

  get info(): AIModelInfo {
    return this.modelInfo;
  }

  get id() {
    return this.modelInfo.id;
  }

  async generateContent(
    languageCode: string,
    languageName: string,
    region: string,
    level: string,
    category: string,
    count = 5
  ): Promise<AIModelResponse<LessonContent[]>> {
    const result = await this.service.generateContent(
      languageCode,
      languageName,
      region,
      level,
      category,
      count,
      { model: this.googleModelId }
    );
    return toAIModelResponse(result);
  }

  async analyzeWordsForLearning(
    englishText: string,
    targetText: string,
    languageCode: string,
    everydayVariant?: string
  ): Promise<AIModelResponse<WordAnalysisResult>> {
    const result = await this.service.analyzeWordsForLearning(
      englishText,
      targetText,
      languageCode,
      everydayVariant
    );
    return toAIModelResponse(result);
  }

  async translateText(
    text: string,
    sourceLang: string,
    targetLang: string
  ): Promise<AIModelResponse<BasicTranslationResult>> {
    const result = await this.service.translateText(text, sourceLang, targetLang, {
      model: this.googleModelId,
    });
    return toAIModelResponse(result);
  }

  async translateWithAnalysis(
    text: string,
    sourceLang: string,
    targetLang: string,
    languageCode: string
  ): Promise<AIModelResponse<TranslationWithAnalysisResult>> {
    const result = await this.service.translateWithAnalysis(
      text,
      sourceLang,
      targetLang,
      languageCode,
      {
        model: this.googleModelId,
      }
    );
    return toAIModelResponse(result);
  }

  async checkAnswer(
    userAnswer: string,
    correctAnswer: string,
    context: string,
    mode: string
  ): Promise<AIModelResponse<CheckAnswerResult>> {
    const result = await this.service.checkAnswer(userAnswer, correctAnswer, context, mode, {
      model: this.googleModelId,
    });
    return toAIModelResponse(result);
  }

  async checkAnswerDetailed(
    userAnswer: string,
    correctAnswer: string,
    context: string,
    mode: string
  ): Promise<AIModelResponse<CheckAnswerDetailedResult>> {
    const result = await this.service.checkAnswerDetailed(
      userAnswer,
      correctAnswer,
      context,
      mode,
      {
        model: this.googleModelId,
      }
    );
    return toAIModelResponse(result);
  }
}



