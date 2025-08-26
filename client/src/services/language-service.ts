import { apiRequest } from "@/lib/queryClient";
import { LessonContent } from "@shared/schema";

export class LanguageService {
  static async generateContent(
    languageCode: string,
    level: string,
    category: string,
    count: number = 5
  ): Promise<LessonContent[]> {
    const response = await apiRequest("POST", "/api/languages/generate-content", {
      languageCode,
      level,
      category,
      count,
    });
    return response.json();
  }

  static async translateText(
    text: string,
    sourceLang: string,
    targetLang: string
  ): Promise<string> {
    const response = await apiRequest("POST", "/api/languages/translate", {
      text,
      sourceLang,
      targetLang,
    });
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
    context: string
  ): Promise<{ isCorrect: boolean; feedback: string; score: number }> {
    const response = await apiRequest("POST", "/api/languages/check-answer", {
      userAnswer,
      correctAnswer,
      context,
    });
    return response.json();
  }
}
