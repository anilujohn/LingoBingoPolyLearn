import { GoogleGenAI } from "@google/genai";
import { LessonContent } from "@shared/schema";

export interface GeminiConfig {
  model: "gemini-2.5-flash" | "gemini-2.5-pro";
  temperature?: number;
  maxTokens?: number;
}

export class GeminiService {
  private ai: GoogleGenAI;
  private defaultConfig: GeminiConfig = {
    model: "gemini-2.5-flash",
    temperature: 0.7,
    maxTokens: 1000,
  };

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    this.ai = new GoogleGenAI({ apiKey });
  }

  async generateContent(
    languageCode: string,
    languageName: string,
    region: string,
    level: string,
    category: string,
    count: number = 5,
    config: Partial<GeminiConfig> = {}
  ): Promise<LessonContent[]> {
    const modelConfig = { ...this.defaultConfig, ...config };
    
    const regionContext = this.getRegionContext(languageCode, region);
    const levelDescription = this.getLevelDescription(level);
    
    const prompt = `You are a language learning content generator creating practical, real-world sentences for learners.

**Context:** 
- Language: ${languageName} (${languageCode})
- Region: ${region}
- Level: ${levelDescription}
- Category: ${category}
- Regional Context: ${regionContext}

**Task:** Generate ${count} practical, everyday sentences that would be useful for someone living or working in ${region}. Each sentence should be culturally relevant and contextually appropriate.

**Requirements:**
1. Create sentences that locals actually use in daily situations
2. Include regional variations and cultural nuances specific to ${region}
3. Make them practical for real-world interactions
4. Ensure appropriate complexity for ${level} level learners
5. Focus on the category: ${category}

**Output Format:** Return ONLY a JSON array of objects with this exact structure:
[
  {
    "english": "English sentence",
    "target": "Native script sentence",
    "transliteration": "Roman script transliteration", 
    "context": "When and how to use this phrase"
  }
]

Make sure the sentences are authentic to ${region} and would help learners communicate effectively with locals.`;

    try {
      const response = await this.ai.models.generateContent({
        model: modelConfig.model,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                english: { type: "string" },
                target: { type: "string" },
                transliteration: { type: "string" },
                context: { type: "string" }
              },
              required: ["english", "target", "transliteration", "context"]
            }
          }
        }
      });

      const jsonText = response.text;
      if (!jsonText) {
        throw new Error("No content generated");
      }

      const content = JSON.parse(jsonText) as LessonContent[];
      return content;
    } catch (error) {
      console.error("Error generating content with Gemini:", error);
      throw new Error(`Failed to generate content: ${error}`);
    }
  }

  async translateText(
    text: string,
    sourceLang: string,
    targetLang: string,
    config: Partial<GeminiConfig> = {}
  ): Promise<{ translation: string; transliteration?: string }> {
    const modelConfig = { ...this.defaultConfig, ...config };
    
    const prompt = `Translate the following text from ${sourceLang} to ${targetLang}. 
    Provide both the translation in native script and transliteration in Roman script.
    
    Text to translate: "${text}"
    
    Return ONLY a JSON object with this structure:
    {
      "translation": "Native script translation",
      "transliteration": "Roman script transliteration"
    }`;

    try {
      const response = await this.ai.models.generateContent({
        model: modelConfig.model,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              translation: { type: "string" },
              transliteration: { type: "string" }
            },
            required: ["translation"]
          }
        }
      });

      const jsonText = response.text;
      if (!jsonText) {
        throw new Error("No translation generated");
      }

      return JSON.parse(jsonText);
    } catch (error) {
      console.error("Error translating with Gemini:", error);
      throw new Error(`Failed to translate: ${error}`);
    }
  }

  async checkAnswer(
    userAnswer: string,
    correctAnswer: string,
    context: string,
    mode: string,
    config: Partial<GeminiConfig> = {}
  ): Promise<{ isCorrect: boolean; feedback: string; score: number }> {
    const modelConfig = { ...this.defaultConfig, ...config };
    
    const prompt = `You are a language learning tutor providing feedback on student answers.

**Context:** ${context}
**Mode:** ${mode}
**Correct Answer:** "${correctAnswer}"
**Student's Answer:** "${userAnswer}"

Evaluate the student's answer and provide constructive feedback. Consider:
1. Accuracy (exact match, close meaning, or wrong)
2. Grammar and structure
3. Cultural appropriateness
4. Practical usability

Return ONLY a JSON object with this structure:
{
  "isCorrect": boolean (true if acceptable, false if needs improvement),
  "feedback": "Encouraging and constructive feedback explaining what's right/wrong and how to improve",
  "score": number (0-100, where 100 is perfect, 80+ is good, 60+ is acceptable, below 60 needs work)
}`;

    try {
      const response = await this.ai.models.generateContent({
        model: modelConfig.model,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              isCorrect: { type: "boolean" },
              feedback: { type: "string" },
              score: { type: "number" }
            },
            required: ["isCorrect", "feedback", "score"]
          }
        }
      });

      const jsonText = response.text;
      if (!jsonText) {
        throw new Error("No feedback generated");
      }

      return JSON.parse(jsonText);
    } catch (error) {
      console.error("Error checking answer with Gemini:", error);
      throw new Error(`Failed to check answer: ${error}`);
    }
  }

  private getRegionContext(languageCode: string, region: string): string {
    const contexts: Record<string, string> = {
      "kn": "Karnataka, India - Focus on Bangalore/Bengaluru workplace communication, market interactions, local transport (auto-rickshaw, bus), food ordering, and cultural expressions used in tech companies and local businesses.",
      "hi": "All India - Universal phrases for travel, business, Bollywood culture, railway stations, restaurants, and cross-cultural communication across different Indian states.",
    };
    
    return contexts[languageCode] || `${region} - Local cultural context and practical daily communication`;
  }

  private getLevelDescription(level: string): string {
    const descriptions: Record<string, string> = {
      "basic": "Beginner level - Simple, essential phrases for survival and basic communication (1-6 words)",
      "intermediate": "Intermediate level - More complex sentences for detailed conversations and nuanced expression (6-15 words)",
      "advanced": "Advanced level - Complex grammar, idioms, and sophisticated language for professional and cultural contexts"
    };
    
    return descriptions[level] || "General level";
  }

  async translateWithAnalysis(
    text: string,
    sourceLang: string,
    targetLang: string,
    languageCode: string,
    config: Partial<GeminiConfig> = {}
  ): Promise<{
    translation: string;
    transliteration?: string;
    wordMeanings?: Array<{
      word: string;
      meaning: string;
      transliteration?: string;
    }>;
    quickTip?: string;
  }> {
    const modelConfig = { ...this.defaultConfig, ...config };
    
    const prompt = `You are a language learning expert. Translate the following text from ${sourceLang} to ${targetLang} and provide detailed analysis.

Text to translate: "${text}"

Provide a comprehensive translation analysis including:
1. Accurate translation in native script
2. Transliteration in Roman script
3. Word-by-word breakdown with meanings
4. Cultural or linguistic tip about the usage

Return ONLY a JSON object with this structure:
{
  "translation": "Native script translation",
  "transliteration": "Roman script transliteration",
  "wordMeanings": [
    {
      "word": "original word",
      "meaning": "meaning in English",
      "transliteration": "roman script of translated word"
    }
  ],
  "quickTip": "Cultural tip or linguistic nuance about this phrase"
}

Make the analysis practical and helpful for language learners.`;

    try {
      const response = await this.ai.models.generateContent({
        model: modelConfig.model,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              translation: { type: "string" },
              transliteration: { type: "string" },
              wordMeanings: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    word: { type: "string" },
                    meaning: { type: "string" },
                    transliteration: { type: "string" }
                  },
                  required: ["word", "meaning"]
                }
              },
              quickTip: { type: "string" }
            },
            required: ["translation"]
          }
        }
      });

      const jsonText = response.text;
      if (!jsonText) {
        throw new Error("No translation analysis generated");
      }

      return JSON.parse(jsonText);
    } catch (error) {
      console.error("Error generating detailed translation:", error);
      throw new Error(`Failed to analyze translation: ${error}`);
    }
  }

  async checkAnswerDetailed(
    userAnswer: string,
    correctAnswer: string,
    context: string,
    mode: string,
    config: Partial<GeminiConfig> = {}
  ): Promise<{
    whatsRight: string;
    mainPointToImprove: string;
    hint: string;
  }> {
    const modelConfig = { ...this.defaultConfig, ...config };
    
    const prompt = `You are a language learning tutor providing structured feedback.

**Context:** ${context}
**Mode:** ${mode}
**Correct Answer:** "${correctAnswer}"
**Student's Answer:** "${userAnswer}"

Analyze the student's answer and provide structured guidance in exactly 3 parts:

1. What's Right: Acknowledge what the student got correct (even if partially)
2. Main Point to Improve: Identify the primary area that needs work
3. Hint: Give a specific, actionable hint to help them improve

Be encouraging and constructive. Focus on learning and progress.

Return ONLY a JSON object with this structure:
{
  "whatsRight": "What the student got correct or was close to",
  "mainPointToImprove": "Main area for improvement", 
  "hint": "Specific hint to help them improve"
}`;

    try {
      const response = await this.ai.models.generateContent({
        model: modelConfig.model,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              whatsRight: { type: "string" },
              mainPointToImprove: { type: "string" },
              hint: { type: "string" }
            },
            required: ["whatsRight", "mainPointToImprove", "hint"]
          }
        }
      });

      const jsonText = response.text;
      if (!jsonText) {
        throw new Error("No detailed feedback generated");
      }

      return JSON.parse(jsonText);
    } catch (error) {
      console.error("Error generating detailed feedback:", error);
      throw new Error(`Failed to generate detailed feedback: ${error}`);
    }
  }

  async analyzeWordsForLearning(
    englishText: string,
    targetText: string,
    languageCode: string
  ): Promise<{
    wordMeanings?: Array<{
      word: string;
      meaning: string;
      transliteration?: string;
    }>;
    quickTip?: string;
  }> {
    const prompt = `Analyze this language learning pair for fascinating cultural and linguistic insights:

English: "${englishText}"
Target (${languageCode}): "${targetText}"

Provide:
1. Word-by-word breakdown with meanings and transliteration
2. A captivating Quick Tip that reveals the cultural soul and linguistic beauty of the language

For the Quick Tip, craft something genuinely interesting that:
- Reveals hidden cultural values embedded in the language structure
- Shows fascinating linguistic peculiarities unique to this language family
- Explains how historical/social factors shaped this particular expression
- Uncovers beautiful metaphors or worldview differences reflected in word choices
- Highlights surprising connections to regional customs, beliefs, or social hierarchies
- Demonstrates how speakers think differently due to their language structure

Make it a "wow, I never knew that!" moment - something culturally enriching and linguistically fascinating that learners will remember and want to share with others. Avoid dry grammar rules - focus on the cultural story behind the language.

Return ONLY a JSON object:
{
  "wordMeanings": [
    {
      "word": "target language word",
      "meaning": "English meaning", 
      "transliteration": "roman script (if applicable)"
    }
  ],
  "quickTip": "A fascinating cultural or linguistic insight that reveals the unique worldview, values, or thought patterns embedded in this language - something genuinely interesting and memorable"
}`;

    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              wordMeanings: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    word: { type: "string" },
                    meaning: { type: "string" },
                    transliteration: { type: "string" }
                  },
                  required: ["word", "meaning"]
                }
              },
              quickTip: { type: "string" }
            }
          }
        }
      });

      const jsonText = response.text;
      if (!jsonText) {
        return {};
      }

      return JSON.parse(jsonText);
    } catch (error) {
      console.error("Error analyzing words for learning:", error);
      return {};
    }
  }

  async generateLanguageTitle(languageCode: string, languageName: string): Promise<string> {
    const prompt = `Generate a fun, catchy title for a ${languageName} learning app.

Requirements:
- Should be witty and relatable to people from that region
- Use common phrases or expressions people already know
- Keep it positive and encouraging  
- Avoid negative connotations
- Should convey the idea of learning or speaking the language
- Maximum 4-5 words

Examples of good patterns:
- Play on common regional expressions
- Reference popular cultural phrases
- Use wordplay that natives would appreciate

Return ONLY the title text, nothing else.`;

    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }]
      });

      return response.text?.trim() || `Simply ${languageName} Sikho`;
    } catch (error) {
      console.error("Error generating language title:", error);
      return `Simply ${languageName} Sikho`;
    }
  }
}

export const geminiService = new GeminiService();