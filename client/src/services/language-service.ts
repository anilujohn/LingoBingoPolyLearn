import { apiRequest } from "@/lib/queryClient";
import { LessonContent } from "@shared/schema";
import type { AIModelId } from "@shared/ai-models";

export class LanguageService {
  static async generateContent(
    languageCode: string,
    level: string,
    category: string,
    count: number = 5,
    model?: AIModelId,
    languageId?: string
  ): Promise<LessonContent[]> {
    const response = await apiRequest("POST", "/api/languages/generate-content", {
      languageCode,
      level,
      category,
      count,
      model,
      languageId,
    });
    const data = await response.json();
    return Array.isArray(data) ? data : data.items ?? [];
  }

  static async translateText(
    text: string,
    sourceLang: string,
    targetLang: string,
    model?: AIModelId,
    languageId?: string
  ): Promise<string> {
    const body: Record<string, unknown> = {
      text,
      sourceLang,
      targetLang,
    };

    if (model) {
      body.model = model;
    }

    if (languageId) {
      body.languageId = languageId;
    }

    const response = await apiRequest("POST", "/api/languages/translate", body);
    const data = await response.json();
    return data.translation;
  }

  static async getTransliteration(
    text: string,
    languageCode: string
  ): Promise<string> {
    const response = await apiRequest("POST", "/api/languages/transliterate", {
      text,
      languageCode,
    });
    const data = await response.json();
    return data.transliteration;
  }

  static async synthesizeSpeech(
    text: string,
    languageCode: string
  ): Promise<string> {
    const response = await apiRequest("POST", "/api/languages/synthesize", {
      text,
      languageCode,
    });
    const data = await response.json();
    return data.audioUrl;
  }

  static async checkAnswer(
    userAnswer: string,
    correctAnswer: string,
    context: string,
    model?: AIModelId,
    languageId?: string
  ): Promise<{ isCorrect: boolean; feedback: string; score: number }> {
    const body: Record<string, unknown> = {
      userAnswer,
      correctAnswer,
      context,
    };

    if (model) {
      body.model = model;
    }

    if (languageId) {
      body.languageId = languageId;
    }

    const response = await apiRequest("POST", "/api/languages/check-answer", body);
    return response.json();
  }
}
