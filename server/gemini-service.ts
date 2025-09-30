import "./env";
import { GoogleGenAI } from "@google/genai";
import { LessonContent, LessonContentVariant, LessonContentVariants } from "@shared/schema";
import { getLanguageStyleGuidance } from "./ai/language-guidance";

import type { TranslationWithAnalysisResult } from "./ai/types";

export interface GeminiConfig {
  model: "gemini-2.5-flash-lite" | "gemini-2.5-flash" | "gemini-2.5-pro";
  temperature?: number;
  maxTokens?: number;
}

export interface GeminiUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

export interface GeminiResult<T> {
  data: T;
  usage?: GeminiUsage;
}

function extractUsageMetadata(response: any): GeminiUsage | undefined {
  const candidates = [
    (response as any)?.usageMetadata,
    (response as any)?.response?.usageMetadata,
    (response as any)?.result?.usageMetadata,
    (response as any)?.generateContentResponse?.usageMetadata,
    (response as any)?.response?.candidates?.[0]?.usageMetadata,
  ];

  const usage = candidates.find((candidate) => !!candidate);
  if (!usage) {
    return undefined;
  }

  const rawInput = usage.inputTokenCount ?? usage.promptTokenCount ?? undefined;
  const rawOutput = usage.outputTokenCount ?? usage.candidateTokenCount ?? undefined;
  let rawTotal = usage.totalTokenCount ?? undefined;

  if (rawTotal === undefined && rawInput !== undefined && rawOutput !== undefined) {
    rawTotal = rawInput + rawOutput;
  }

  let inputTokens = rawInput;
  let outputTokens = rawOutput;

  if (inputTokens === undefined && rawTotal !== undefined && rawOutput !== undefined) {
    inputTokens = Math.max(rawTotal - rawOutput, 0);
  }

  if (outputTokens === undefined && rawTotal !== undefined && rawInput !== undefined) {
    outputTokens = Math.max(rawTotal - rawInput, 0);
  }

  const totalTokens = rawTotal ?? ((inputTokens ?? 0) + (outputTokens ?? 0));

  return {
    inputTokens: inputTokens ?? undefined,
    outputTokens: outputTokens ?? undefined,
    totalTokens: totalTokens ?? undefined,
  };
}

function mergeUsageMetadata(a?: GeminiUsage, b?: GeminiUsage): GeminiUsage | undefined {
  if (!a && !b) {
    return undefined;
  }
  const inputTokens = (a?.inputTokens ?? 0) + (b?.inputTokens ?? 0);
  const outputTokens = (a?.outputTokens ?? 0) + (b?.outputTokens ?? 0);
  const totalTokens = (a?.totalTokens ?? 0) + (b?.totalTokens ?? 0);
  return {
    inputTokens: inputTokens || undefined,
    outputTokens: outputTokens || undefined,
    totalTokens: totalTokens || undefined,
  };
}

export class GeminiService {
  private ai: GoogleGenAI;
  private defaultConfig: GeminiConfig;

  constructor(defaultConfig: Partial<GeminiConfig> = {}) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    this.ai = new GoogleGenAI({ apiKey });
    this.defaultConfig = {
      model: "gemini-2.5-flash-lite",
      temperature: 0.7,
      maxTokens: 1000,
      ...defaultConfig,
    };
  }

  async generateContent(
    languageCode: string,
    languageName: string,
    region: string,
    level: string,
    category: string,
    count: number = 5,
    config: Partial<GeminiConfig> = {}
  ): Promise<GeminiResult<LessonContent[]>> {
    const modelConfig = { ...this.defaultConfig, ...config };
    
    const regionContext = this.getRegionContext(languageCode, region);
    const levelDescription = this.getLevelDescription(level);
    const styleGuidance = getLanguageStyleGuidance(languageCode);
    const everydayExamplesList = styleGuidance.everydayExamples
      .slice(0, 40)
      .map((word) => `- ${word}`)
      .join("\n") || "- Use natural borrowed English words";
    const keepNativeExamplesList = styleGuidance.keepNativeExamples
      .slice(0, 25)
      .map((word) => `- ${word}`)
      .join("\n") || "- Keep grammar particles and connectors in the native language";
    const guidanceNotesList = styleGuidance.notes
      ?.map((note) => `- ${note}`)
      .join("\n");
    
    const themes = [
      "Transportation (autos, metro, buses, cabs, booking rides)",
      "Food & Dining (restaurants, street food, ordering, paying bills)", 
      "Shopping (markets, stores, bargaining, asking for items, prices)",
      "Daily Life & Home (chores, talking to family, neighbors, landlords)",
      "Work & Office (meetings, colleagues, deadlines, small talk)",
      "Socializing (making plans with friends, invitations, compliments)",
      "Services (plumbers, electricians, deliveries, appointments)",
      "Health & Wellness (doctor appointments, pharmacy, describing symptoms)",
      "Navigating the City (asking for directions, landmarks, traffic)",
      "Government Services (Aadhaar, PAN card, passport applications)",
      "Utility Services (electricity, water bills, internet, mobile recharge)",
      "Civic Issues (reporting problems, municipality complaints)",
      "Banking & Finance (ATM, account opening, loan inquiries)",
      "Education (school admissions, fees, talking to teachers)",
      "Real Estate (house hunting, rent negotiations, maintenance)",
      "Entertainment (movie tickets, events, cultural programs)",
      "Emergency Situations (police, fire, medical emergencies)",
      "Religious & Cultural (festivals, temple visits, customs)",
      "Technology (mobile issues, internet problems, app usage)",
      "Personal Care (salon, spa, beauty treatments)"
    ];
    
    const selectedThemes = themes.sort(() => 0.5 - Math.random()).slice(0, Math.min(count, themes.length));
    
    const prompt = `You are a language learning content generator creating practical, real-world sentences for learners.

**Context:**
- Language: ${languageName} (${languageCode})
- Region: ${region}
- Level: ${levelDescription}
- Regional Context: ${regionContext}

**Dual Sentence Requirement:**
For each scenario, produce two versions that express the same idea clearly:
1. Everyday ${languageName}: Keep grammar and sentence structure in ${languageName}, but naturally mix in a few widely used English loanwords. Use these examples as inspiration (not a strict list):
${everydayExamplesList}

2. Classical ${languageName}: Provide the same sentence using only native vocabulary (no English loanwords). These word families should remain in ${languageName}:
${keepNativeExamplesList}

${guidanceNotesList ? `Additional guidance:
${guidanceNotesList}
` : ''}**Task:** Generate ${count} practical, everyday sentences covering these diverse themes: ${selectedThemes.join(', ')}. Each sentence should be culturally relevant and contextually appropriate for someone living in ${region}.

**Requirements:**
1. Create sentences that locals actually use in daily situations.
2. Keep Everyday and Classical versions closely aligned in meaning and length.
3. Limit everyday English loanwords to 2-3 per sentence and only for modern or formal nouns.
4. Preserve core grammar, particles, and verbs in ${languageName} for both versions.
5. Ensure appropriate complexity for ${level} level learners.
6. Cover different themes - avoid repeating the same scenario.
7. Include authentic local expressions and a short usage context note.

**Output Format:** Return ONLY a JSON array of objects with this structure:
[
  {
    "english": "English sentence",
    "context": "When and how to use this phrase",
    "variants": {
      "everyday": {
        "text": "Native script sentence with natural English mix",
        "transliteration": "Roman script transliteration"
      },
      "classical": {
        "text": "Pure native script sentence",
        "transliteration": "Roman script transliteration"
      }
    },
    "defaultVariant": "everyday"
  }
]

Make sure the everyday version feels approachable for common folks, while the classical version preserves full native vocabulary for clarity.`;


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
                context: { type: "string" },
                variants: {
                  type: "object",
                  properties: {
                    everyday: {
                      type: "object",
                      properties: {
                        text: { type: "string" },
                        transliteration: { type: "string" }
                      },
                      required: ["text"]
                    },
                    classical: {
                      type: "object",
                      properties: {
                        text: { type: "string" },
                        transliteration: { type: "string" }
                      },
                      required: ["text"]
                    }
                  },
                  required: ["everyday", "classical"]
                },
                defaultVariant: {
                  type: "string",
                  enum: ["everyday", "classical"]
                }
              },
              required: ["english", "context", "variants"]
            }
          }
        }
      });

      const jsonText = response.text;
      if (!jsonText) {
        throw new Error("No content generated");
      }

      type RawLessonContent = {
        english: string;
        context?: string;
        explanation?: string;
        variants?: Partial<LessonContentVariants>;
        defaultVariant?: keyof LessonContentVariants;
      };

      const rawContent = JSON.parse(jsonText) as RawLessonContent[];
      const normalized = rawContent.map<LessonContent>((item) => {
        const everyday: LessonContentVariant = item.variants?.everyday ?? item.variants?.classical ?? { text: item.english };
        const classical: LessonContentVariant = item.variants?.classical ?? item.variants?.everyday ?? { text: item.english };

        const everydayVariant: LessonContentVariant = {
          text: everyday.text?.trim() || classical.text?.trim() || item.english.trim(),
          transliteration: everyday.transliteration?.trim() || classical.transliteration?.trim(),
        };

        const classicalVariant: LessonContentVariant = {
          text: classical.text?.trim() || everyday.text?.trim() || item.english.trim(),
          transliteration: classical.transliteration?.trim() || everyday.transliteration?.trim(),
        };

        return {
          english: item.english.trim(),
          context: item.context?.trim(),
          explanation: item.explanation?.trim(),
          variants: {
            everyday: everydayVariant,
            classical: classicalVariant,
          },
          target: everydayVariant.text,
          transliteration: everydayVariant.transliteration,
          defaultVariant: item.defaultVariant === "classical" ? "classical" : "everyday",
        };
      });

      return { data: normalized, usage: extractUsageMetadata(response) };
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
  ): Promise<GeminiResult<{ translation: string; transliteration?: string }>> {
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

      const data = JSON.parse(jsonText) as {
        translation: string;
        transliteration?: string;
      };
      return { data, usage: extractUsageMetadata(response) };
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
  ): Promise<GeminiResult<{ isCorrect: boolean; feedback: string; score: number }>> {
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

      return {
        data: JSON.parse(jsonText) as {
          isCorrect: boolean;
          feedback: string;
          score: number;
        },
        usage: extractUsageMetadata(response),
      };
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

  // Unified method for analyzing text pairs and generating Quick Tips
  async analyzeTextPair(
    englishText: string,
    targetText: string,
    languageCode: string,
    includeTranslation: boolean = false,
    config: Partial<GeminiConfig> = {},
    everydayVariant?: string
  ): Promise<
    GeminiResult<{
      translation?: string;
      transliteration?: string;
      wordMeanings?: Array<{
        word: string;
        meaning: string;
        transliteration?: string;
      }>;
      quickTip?: string;
    }>
  > {
    const languageName = languageCode === 'kn' ? 'Kannada' : 'Hindi';
    const regionContext = languageCode === 'kn' ? 'Karnataka/Bangalore' : 'India';
    
    const prompt = `Analyze this language learning pair:

English: "${englishText}"
Target (${languageCode}): "${targetText}"
${everydayVariant ? `Everyday blended version learners commonly hear: "${everydayVariant}"
` : ''}
Provide:
1. Word-by-word breakdown with meanings and transliteration
2. One enhanced practical tip

For the "quickTip" value, provide ONE concise, practical language tip. Focus on:
- Simple grammar patterns or word usage
- Formal vs informal alternatives 
- Common mistakes learners make
- Easy memory aids or patterns
- What responses to expect

Keep it short (1-2 sentences max) and language-focused. Avoid cultural advice or lengthy explanations.

RULES:
- Use ONLY Roman script transliteration, NO ${languageName} script
- Wrap transliterated words in **bold** markdown
- Keep the vocabulary list aligned with the classical sentence while acknowledging everyday English words where it helps the learner
- No technical grammar terms
- Focus purely on language usage, not cultural context
${everydayVariant ? "- Do not include English loanwords from the everyday version in the word list, but you may reference them in the tip as deliberate mix-ins\n" : ''}
${includeTranslation ? `Also provide:
- translation: The target language text in native script
- transliteration: Roman script version

` : ''}JSON format:
{
  ${includeTranslation ? '"translation": "Native script text",\n  "transliteration": "Roman script version",\n  ' : ''}"wordMeanings": [
    {
      "word": "target word",
      "meaning": "English meaning",
      "transliteration": "roman script"
    }
  ],
  "quickTip": "Enhanced practical tip with real-world context using **bold** for transliterated words"
}`;

    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash-lite",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              ...(includeTranslation && {
                translation: { type: "string" },
                transliteration: { type: "string" }
              }),
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
            required: [
              "wordMeanings", 
              "quickTip",
              ...(includeTranslation ? ["translation"] : [])
            ]
          }
        }
      });

      const jsonText = response.text;
      if (!jsonText) {
        return { data: {}, usage: extractUsageMetadata(response) };
      }

      return {
        data: JSON.parse(jsonText),
        usage: extractUsageMetadata(response),
      };
    } catch (error) {
      console.error("Error analyzing text pair:", error);
      return { data: {}, usage: undefined };
    }
  }

  // For backward compatibility - translates and analyzes
  async translateWithAnalysis(
    text: string,
    sourceLang: string,
    targetLang: string,
    languageCode: string,
    config: Partial<GeminiConfig> = {}
  ): Promise<GeminiResult<TranslationWithAnalysisResult>> {
    const modelConfig = { ...this.defaultConfig, ...config };
    const styleGuidance = getLanguageStyleGuidance(languageCode);
    const everydayExamplesList = styleGuidance.everydayExamples
      .slice(0, 40)
      .map((word) => `- ${word}`)
      .join("\n") || "- Use natural borrowed English words";
    const keepNativeExamplesList = styleGuidance.keepNativeExamples
      .slice(0, 25)
      .map((word) => `- ${word}`)
      .join("\n") || "- Keep grammar particles and connectors in the native language";
    const guidanceNotesList = styleGuidance.notes
      ?.map((note) => `- ${note}`)
      .join("\n");

    const prompt = `You are helping learners translate from ${sourceLang} to ${targetLang} (${languageCode}).

Source sentence:
"${text}"

Produce two versions that communicate the same idea:
1. Everyday ${targetLang}: Keep grammar in ${targetLang} but blend in 1-3 widely used English loanwords for modern objects or formal terms. Treat this list as inspiration (not a strict rule):
${everydayExamplesList}

2. Classical ${targetLang}: Give the same sentence using only native vocabulary (no English loanwords). These items should remain in ${targetLang}:
${keepNativeExamplesList}

${guidanceNotesList ? `Additional guidance:
${guidanceNotesList}
` : ''}Requirements:
- Everyday and Classical versions must align in meaning and length.
- Limit English loanwords to truly common borrowings; keep verbs, particles, and grammar native.
- Preserve politeness and cultural tone appropriate for everyday conversation.
- Provide a short optional context note if helpful.

Return ONLY a JSON object with this structure:
{
  "variants": {
    "everyday": { "text": "...", "transliteration": "..." },
    "classical": { "text": "...", "transliteration": "..." }
  },
  "defaultVariant": "everyday",
  "contextNote": "Short optional learner note"
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
              variants: {
                type: "object",
                properties: {
                  everyday: {
                    type: "object",
                    properties: {
                      text: { type: "string" },
                      transliteration: { type: "string" }
                    },
                    required: ["text"]
                  },
                  classical: {
                    type: "object",
                    properties: {
                      text: { type: "string" },
                      transliteration: { type: "string" }
                    },
                    required: ["text"]
                  }
                },
                required: ["everyday", "classical"]
              },
              defaultVariant: {
                type: "string",
                enum: ["everyday", "classical"]
              },
              contextNote: { type: "string" }
            },
            required: ["variants"]
          }
        }
      });

      const jsonText = response.text;
      if (!jsonText) {
        throw new Error("No translation generated");
      }

      type RawTranslation = {
        variants?: Partial<LessonContentVariants>;
        defaultVariant?: keyof LessonContentVariants;
        contextNote?: string;
      };

      const parsed = JSON.parse(jsonText) as RawTranslation;
      const everyday: LessonContentVariant = parsed.variants?.everyday ?? parsed.variants?.classical ?? { text: text };
      const classical: LessonContentVariant = parsed.variants?.classical ?? parsed.variants?.everyday ?? { text: text };

      const normalizedVariants: LessonContentVariants = {
        everyday: {
          text: everyday.text?.trim() || classical.text?.trim() || text,
          transliteration: everyday.transliteration?.trim() || classical.transliteration?.trim(),
        },
        classical: {
          text: classical.text?.trim() || everyday.text?.trim() || text,
          transliteration: classical.transliteration?.trim() || everyday.transliteration?.trim(),
        },
      };

      const translationUsage = extractUsageMetadata(response);
      const analysis = await this.analyzeTextPair(
        text,
        normalizedVariants.classical.text,
        languageCode,
        false,
        config,
        normalizedVariants.everyday.text
      );

      const usage = mergeUsageMetadata(translationUsage, analysis.usage);

      return {
        data: {
          variants: normalizedVariants,
          defaultVariant: parsed.defaultVariant === "classical" ? "classical" : "everyday",
          contextNote: parsed.contextNote?.trim(),
          wordMeanings: analysis.data.wordMeanings,
          quickTip: analysis.data.quickTip,
        },
        usage,
      };
    } catch (error) {
      console.error("Error translating with analysis:", error);
      throw new Error(`Failed to translate with analysis: ${error}`);
    }
  }


  async checkAnswerDetailed(
    userAnswer: string,
    correctAnswer: string,
    context: string,
    mode: string,
    config: Partial<GeminiConfig> = {}
  ): Promise<GeminiResult<{
    whatsRight: string;
    mainPointToImprove: string;
    hint: string;
  }>> {
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

      return {
        data: JSON.parse(jsonText) as {
          whatsRight: string;
          mainPointToImprove: string;
          hint: string;
        },
        usage: extractUsageMetadata(response),
      };
    } catch (error) {
      console.error("Error generating detailed feedback:", error);
      throw new Error(`Failed to generate detailed feedback: ${error}`);
    }
  }

  // For backward compatibility - use unified method
  async analyzeWordsForLearning(
    englishText: string,
    targetText: string,
    languageCode: string,
    everydayVariant?: string
  ): Promise<
    GeminiResult<{
      wordMeanings?: Array<{
        word: string;
        meaning: string;
        transliteration?: string;
      }>;
      quickTip?: string;
    }>
  > {
    return this.analyzeTextPair(
      englishText,
      targetText,
      languageCode,
      false,
      {},
      everydayVariant
    );
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
        model: "gemini-2.5-flash-lite",
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


