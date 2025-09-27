import type { Express } from "express";
import { createServer, type Server } from "http";
import { performance } from "node:perf_hooks";
import { storage } from "./storage";
import { z } from "zod";
import { aiModelManager } from "./ai/model-manager";
import { AI_MODEL_IDS, type AIModelId } from "@shared/ai-models";
import type { AIUsageMetadata } from "@shared/ai-usage";
import {
  recordAIUsage,
  getPricingMetadata,
} from "./ai/usage-tracker";
const modelIdSchema = z.enum(AI_MODEL_IDS);
const parseOptionalModelId = (value: unknown): AIModelId | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }
  const result = modelIdSchema.safeParse(value);
  return result.success ? result.data : undefined;
};
// Request validation schemas
const checkAnswerSchema = z.object({
  lessonId: z.string(),
  mode: z.string(),
  answer: z.string(),
  contentIndex: z.number(),
});
const playAudioSchema = z.object({
  text: z.string(),
  language: z.string(),
});
const generateContentSchema = z.object({
  languageCode: z.string(),
  level: z.string(),
  category: z.string(),
  count: z.number().optional(),
  model: modelIdSchema.optional(),
  skipWordAnalysis: z.boolean().optional(),
  languageId: z.string().optional(),
  learningMode: z.string().optional(),
});
const translateSchema = z.object({
  text: z.string(),
  sourceLang: z.string(),
  targetLang: z.string(),
  languageId: z.string().optional(),
  model: modelIdSchema.optional(),
});
const translateWithAnalysisSchema = z.object({
  text: z.string(),
  sourceLang: z.string(),
  targetLang: z.string(),
  languageCode: z.string(),
  languageId: z.string().optional(),
  model: modelIdSchema.optional(),
});
const addXPSchema = z.object({
  userId: z.string(),
  amount: z.number(),
  source: z.string(),
});
const setAIModelSchema = z.object({
  modelId: modelIdSchema,
});
const feedbackSignals = ["positive", "negative", "neutral"] as const;
const feedbackTouchpoints = [
  "translation",
  "translation-with-analysis",
  "content-generation",
  "reveal-answer",
  "word-analysis",
  "check-answer",
  "check-answer-detailed",
  "lesson-check-answer",
  "other",
] as const;
const feedbackSchema = z.object({
  usageRecordId: z.string(),
  signal: z.enum(feedbackSignals),
  touchpoint: z.enum(feedbackTouchpoints),
  feature: z.string().optional(),
  operation: z.string().optional(),
  modelId: modelIdSchema.optional(),
  languageId: z.string().optional(),
  reason: z.enum(["accuracy", "tone", "latency", "complexity", "other"]).optional(),
  comment: z.string().max(1000).optional(),
  xpDelta: z.number().optional(),
});
const feedbackUpdateSchema = feedbackSchema.partial().extend({ id: z.string() });
const usageQuerySchema = z.object({
  userId: z.string().min(1).optional(),
  modelId: modelIdSchema.optional(),
  operation: z.string().min(1).optional(),
  feature: z.string().min(1).optional(),
  start: z.string().min(1).optional(),
  end: z.string().min(1).optional(),
  limit: z.coerce.number().int().positive().optional(),
});
const feedbackQuerySchema = z.object({
  userId: z.string().optional(),
  languageId: z.string().optional(),
  modelId: modelIdSchema.optional(),
  feature: z.string().optional(),
  operation: z.string().optional(),
  touchpoint: z.enum(feedbackTouchpoints).optional(),
  signal: z.enum(feedbackSignals).optional(),
  functionality: z.string().optional(),
  learningMode: z.string().optional(),
  learningLevel: z.string().optional(),
  start: z.string().optional(),
  end: z.string().optional(),
  limit: z.coerce.number().int().positive().optional(),
});
const engagementQuerySchema = z.object({
  userId: z.string().optional(),
  languageId: z.string().optional(),
  modelId: modelIdSchema.optional(),
  feature: z.string().optional(),
  operation: z.string().optional(),
  action: z.string().optional(),
  functionality: z.string().optional(),
  learningMode: z.string().optional(),
  learningLevel: z.string().optional(),
  start: z.string().optional(),
  end: z.string().optional(),
  limit: z.coerce.number().int().positive().optional(),
});
export async function registerRoutes(app: Express): Promise<Server> {
  const resolveAdapter = async (modelId?: AIModelId) =>
    modelId ? aiModelManager.getAdapterById(modelId) : aiModelManager.getActiveAdapter();
  const resolveAdapterFromRequest = (value: unknown) =>
    resolveAdapter(parseOptionalModelId(value));
  // User and stats endpoints
  app.get("/api/user/stats", async (req, res) => {
    try {
      // For demo purposes, use default user
      const stats = await storage.getUserStats("user-1");
      res.json(stats);
    } catch (error) {
      console.error("Error fetching user stats:", error);
      res.status(500).json({ message: "Failed to fetch user stats" });
    }
  });
  app.get("/api/user/progress/:languageId", async (req, res) => {
    try {
      const { languageId } = req.params;
      const progress = await storage.getUserProgress("user-1", languageId);
      res.json({
        todayProgress: 40, // Mock today's progress
        currentLevel: progress?.level === "basic" ? 1 : 2,
        nextLevelXP: 1000,
        currentXP: progress ? progress.progress * 10 : 0,
      });
    } catch (error) {
      console.error("Error fetching user progress:", error);
      res.status(500).json({ message: "Failed to fetch user progress" });
    }
  });
  app.get("/api/user/recent-activities", async (req, res) => {
    try {
      // Mock recent activities
      const activities = [
        {
          id: "activity-1",
          title: "Market Conversations",
          language: "Kannada",
          level: "Basic Level",
          progress: 60,
          totalLessons: 5,
          completedLessons: 3,
        },
      ];
      res.json(activities);
    } catch (error) {
      console.error("Error fetching recent activities:", error);
      res.status(500).json({ message: "Failed to fetch recent activities" });
    }
  });
  app.get("/api/user/achievements/:languageId", async (req, res) => {
    try {
      const achievements = {
        streak: 7,
        recentBadge: {
          name: "First Conversation",
          xpReward: 100,
          isNew: true,
        },
        weeklyXP: 2450,
        weeklyRank: "top 10%",
      };
      res.json(achievements);
    } catch (error) {
      console.error("Error fetching achievements:", error);
      res.status(500).json({ message: "Failed to fetch achievements" });
    }
  });
  // Language endpoints
  app.get("/api/languages/with-progress", async (req, res) => {
    try {
      const languages = await storage.getLanguagesWithProgress("user-1");
      res.json(languages);
    } catch (error) {
      console.error("Error fetching languages with progress:", error);
      res.status(500).json({ message: "Failed to fetch languages" });
    }
  });
  app.get("/api/languages/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const language = await storage.getLanguage(id);
      if (!language) {
        return res.status(404).json({ message: "Language not found" });
      }
      res.json(language);
    } catch (error) {
      console.error("Error fetching language:", error);
      res.status(500).json({ message: "Failed to fetch language" });
    }
  });
  app.post("/api/languages/generate-content", async (req, res) => {
    try {
      const {
        languageCode,
        languageId,
        level,
        category,
        count,
        model,
        skipWordAnalysis,
        learningMode,
      } =
        generateContentSchema.parse(req.body);
      const language = languageId
        ? await storage.getLanguage(languageId)
        : await storage
            .getAllLanguages()
            .then((langs) => langs.find((l) => l.code === languageCode));
      if (!language) {
        return res.status(404).json({ message: "Language not found" });
      }
      const adapter = await resolveAdapterFromRequest(model);
      const start = performance.now();
      const usageResponse = await adapter.generateContent(
        languageCode,
        language.name,
        language.region,
        level,
        category,
        count ?? 5
      );
      const durationMs = Math.max(0, Math.round(performance.now() - start));
      const usageRecord = await recordAIUsage({
        req,
        adapter,
        operation: "generate-content",
        feature: "language-content",
        response: usageResponse,
        metadata: {
          languageCode,
          languageId: language.id,
          level,
          learningLevel: level,
          learningMode,
          functionality: "learn",
          category,
          count: count ?? 5,
        },
        engagement: {
          action: "generate-content",
        },
        durationMs,
      });

      const content = usageResponse.data ?? [];
      if (typeof skipWordAnalysis === "boolean" && skipWordAnalysis) {
        return res.json({
          items: content,
          interaction: {
            usageRecordId: usageRecord.id,
            provider: adapter.info.provider,
            modelId: adapter.id,
            feature: "language-content",
            operation: "generate-content",
            languageId: language.id,
            metadata: usageRecord.metadata,
            durationMs: usageRecord.durationMs,
          },
        });
      }
      const enhancedContent = await Promise.all(
        content.map(async (item: any) => {
          try {
            const wordStart = performance.now();
            const analysisResponse = await adapter.analyzeWordsForLearning(
              item.english,
              item.target,
              languageCode
            );
            const wordDurationMs = Math.max(0, Math.round(performance.now() - wordStart));
            await recordAIUsage({
              req,
              adapter,
              operation: "analyze-words",
              feature: "language-content",
              response: analysisResponse,
              metadata: {
                languageCode,
                languageId: language.id,
                lessonCategory: category,
                learningLevel: level,
                learningMode,
                functionality: "learn",
              },
              engagement: {
                action: "analyze-words",
              },
              durationMs: wordDurationMs,
            });
            const wordAnalysis = analysisResponse.data;
            return {
              ...item,
              wordMeanings: wordAnalysis?.wordMeanings,
              quickTip: wordAnalysis?.quickTip,
            };
          } catch (error) {
            console.error("Word analysis error:", error);
            return item;
          }
        })
      );
      res.json({
        items: enhancedContent,
        interaction: {
          usageRecordId: usageRecord.id,
          provider: adapter.info.provider,
          modelId: adapter.id,
          feature: "language-content",
          operation: "generate-content",
          languageId: language.id,
          metadata: usageRecord.metadata,
          durationMs: usageRecord.durationMs,
        },
      });
    } catch (error) {
      console.error("Error generating content:", error);
      res.status(500).json({ message: "Failed to generate content" });
    }
  });
  // New route for adding word analysis to existing content
  app.post("/api/languages/add-word-analysis", async (req, res) => {
    try {
      const { content, languageCode, languageId, learningMode, learningLevel } = req.body;
      const adapter = await resolveAdapterFromRequest(req.body?.model);
      const start = performance.now();
      const analysisResponse = await adapter.analyzeWordsForLearning(
        content.english,
        content.target,
        languageCode
      );
      const durationMs = Math.max(0, Math.round(performance.now() - start));
      await recordAIUsage({
        req,
        adapter,
        operation: "analyze-words",
        feature: "language-content",
        response: analysisResponse,
        metadata: {
          languageCode,
          languageId,
          learningMode,
          learningLevel,
          functionality: "learn",
        },
        engagement: {
          action: "analyze-words",
        },
        durationMs,
      });
      const wordAnalysis = analysisResponse.data;
      const enhancedContent = {
        ...content,
        wordMeanings: wordAnalysis?.wordMeanings,
        quickTip: wordAnalysis?.quickTip
      };
      res.json(enhancedContent);
    } catch (error) {
      console.error("Error adding word analysis:", error);
      res.status(500).json({ message: "Failed to add word analysis" });
    }
  });
  app.post("/api/languages/translate", async (req, res) => {
    try {
      const { text, sourceLang, targetLang, languageId, model } = translateSchema.parse(req.body);
      const adapter = await resolveAdapterFromRequest(model);
      const language = languageId ? await storage.getLanguage(languageId) : undefined;

      const start = performance.now();
      const responsePayload = await adapter.translateText(
        text,
        sourceLang,
        targetLang
      );
      const durationMs = Math.max(0, Math.round(performance.now() - start));
      const usageRecord = await recordAIUsage({
        req,
        adapter,
        operation: "translate-text",
        feature: "translation",
        response: responsePayload,
        metadata: {
          sourceLang,
          targetLang,
          textLength: text.length,
          languageId: language?.id ?? languageId,
          sourceText: text,
          translationText: responsePayload.data.translation,
          transliteration: responsePayload.data.transliteration,
          functionality: "translate",
        },
        engagement: {
          action: "translate",
        },
        durationMs,
      });

      res.json({
        ...responsePayload.data,
        interaction: {
          usageRecordId: usageRecord.id,
          provider: adapter.info.provider,
          modelId: adapter.id,
          feature: "translation",
          operation: "translate-text",
          languageId: language?.id ?? languageId,
          metadata: usageRecord.metadata,
          durationMs: usageRecord.durationMs,
        },
      });
    } catch (error) {
      console.error("Error translating text:", error);
      res.status(500).json({ message: "Failed to translate text" });
    }
  });
  app.post("/api/languages/transliterate", async (req, res) => {
    try {
      const { text, languageCode } = req.body;
      // Mock transliteration
      const transliteration = `[Transliterated: ${text}]`;
      res.json({ transliteration });
    } catch (error) {
      console.error("Error transliterating text:", error);
      res.status(500).json({ message: "Failed to transliterate text" });
    }
  });
  app.post("/api/languages/synthesize", async (req, res) => {
    try {
      const { text, languageCode } = req.body;
      // Mock speech synthesis - return a placeholder audio URL
      const audioUrl = "/api/mock-audio.mp3";
      res.json({ audioUrl });
    } catch (error) {
      console.error("Error synthesizing speech:", error);
      res.status(500).json({ message: "Failed to synthesize speech" });
    }
  });
  app.post("/api/languages/check-answer", async (req, res) => {
    try {
      const { userAnswer, correctAnswer, context, languageId, level } = req.body;
      const mode = req.body.mode || "general";
      const adapter = await resolveAdapterFromRequest(req.body?.model);
      const start = performance.now();
      const responsePayload = await adapter.checkAnswer(
        userAnswer,
        correctAnswer,
        context,
        mode
      );
      const durationMs = Math.max(0, Math.round(performance.now() - start));
      const usageRecord = await recordAIUsage({
        req,
        adapter,
        operation: "check-answer",
        feature: "evaluation",
        response: responsePayload,
        metadata: {
          mode,
          learningMode: mode,
          learningLevel: level,
          functionality: "learn",
          languageId,
          sourceText: userAnswer,
          translationText: correctAnswer,
          languageCode: req.body?.languageCode,
        },
        engagement: {
          action: "check-answer",
        },
        durationMs,
      });
      res.json({
        ...responsePayload.data,
        interaction: {
          usageRecordId: usageRecord.id,
          provider: adapter.info.provider,
          modelId: adapter.id,
          feature: "evaluation",
          operation: "check-answer",
          languageId,
          metadata: usageRecord.metadata,
          durationMs: usageRecord.durationMs,
        },
      });
    } catch (error) {
      console.error("Error checking answer:", error);
      res.status(500).json({ message: "Failed to check answer" });
    }
  });
  app.post("/api/languages/translate-with-analysis", async (req, res) => {
    try {
      const { text, sourceLang, targetLang, languageCode, languageId, model } =
        translateWithAnalysisSchema.parse(req.body);
      const adapter = await resolveAdapterFromRequest(model);
      const language = languageId
        ? await storage.getLanguage(languageId)
        : await storage
            .getAllLanguages()
            .then((langs) => langs.find((l) => l.code === languageCode));

      const start = performance.now();
      const responsePayload = await adapter.translateWithAnalysis(
        text,
        sourceLang,
        targetLang,
        languageCode
      );
      const durationMs = Math.max(0, Math.round(performance.now() - start));
      const usageRecord = await recordAIUsage({
        req,
        adapter,
        operation: "translate-with-analysis",
        feature: "translation",
        response: responsePayload,
        metadata: {
          sourceLang,
          targetLang,
          languageCode,
          languageId: language?.id ?? languageId,
          textLength: text.length,
          sourceText: text,
          translationText: responsePayload.data.translation,
          transliteration: responsePayload.data.transliteration,
          functionality: "translate",
        },
        engagement: {
          action: "translate-with-analysis",
        },
        durationMs,
      });
      res.json({
        ...responsePayload.data,
        interaction: {
          usageRecordId: usageRecord.id,
          provider: adapter.info.provider,
          modelId: adapter.id,
          feature: "translation",
          operation: "translate-with-analysis",
          languageId: language?.id ?? languageId,
          metadata: usageRecord.metadata,
          durationMs: usageRecord.durationMs,
        },
      });
    } catch (error) {
      console.error("Error translating with analysis:", error);
      res.status(500).json({ message: "Failed to translate with analysis" });
    }
  });
  app.post("/api/languages/check-answer-detailed", async (req, res) => {
    try {
      const { userAnswer, correctAnswer, context, mode, model, languageId, level } = req.body;
      const adapter = await resolveAdapterFromRequest(model);
      const start = performance.now();
      const responsePayload = await adapter.checkAnswerDetailed(
        userAnswer,
        correctAnswer,
        context,
        mode
      );
      const durationMs = Math.max(0, Math.round(performance.now() - start));
      const usageRecord = await recordAIUsage({
        req,
        adapter,
        operation: "check-answer-detailed",
        feature: "evaluation",
        response: responsePayload,
        metadata: {
          mode,
          learningMode: mode,
          learningLevel: level,
          functionality: "learn",
          languageId,
        },
        engagement: {
          action: "check-answer-detailed",
        },
        durationMs,
      });
      res.json({
        ...responsePayload.data,
        interaction: {
          usageRecordId: usageRecord.id,
          provider: adapter.info.provider,
          modelId: adapter.id,
          feature: "evaluation",
          operation: "check-answer-detailed",
          languageId,
          metadata: usageRecord.metadata,
          durationMs: usageRecord.durationMs,
        },
      });
    } catch (error) {
      console.error("Error checking answer with details:", error);
      res.status(500).json({ message: "Failed to check answer with details" });
    }
  });
  // Lesson endpoints
  app.get("/api/lessons/current/:languageId/:mode", async (req, res) => {
    try {
      const { languageId, mode } = req.params;
      const adapter = await resolveAdapter();
      let lesson = await storage.getCurrentLesson("user-1", languageId, mode);
      if (!lesson) {
        return res.status(404).json({ message: "No current lesson found" });
      }
      // Generate content dynamically if lesson content is empty
      if (!lesson.content || (Array.isArray(lesson.content) && lesson.content.length === 0)) {
        const language = await storage.getLanguage(languageId);
        if (language) {
          try {
            const generatedContentResponse = await adapter.generateContent(
              language.code,
              language.name,
              language.region,
              lesson.level,
              lesson.category,
              3 // Generate 3 sentences per lesson
            );
            await recordAIUsage({
              req,
              adapter,
              operation: "generate-content",
              feature: "lesson-bootstrap",
              response: generatedContentResponse,
              metadata: {
                languageId,
                lessonId: lesson.id,
                mode,
                learningMode: mode,
                learningLevel: lesson.level,
                functionality: "lesson",
              },
            });
            // Update lesson with generated content
            lesson = await storage.updateLesson(lesson.id, {
              content: generatedContentResponse.data,
            });
          } catch (error) {
            console.error("Error generating lesson content:", error);
            // Fallback to basic content if generation fails
            lesson.content = [{
              english: "Welcome to your lesson",
              target: language.code === "kn" ? "ನಿಮ್ಮ ಪಾಠಕ್ಕೆ ಸ್ವಾಗತ" : "आपके पाठ में स्वागत है",
              transliteration: language.code === "kn" ? "nimma paathakke swaagata" : "aapke paath mein swaagat hai",
              context: "General welcome message"
            }];
          }
        }
      }
      // Add progress information
      const lessonWithProgress = {
        ...lesson,
        isCompleted: false,
        progress: 0,
      };
      res.json(lessonWithProgress);
    } catch (error) {
      console.error("Error fetching current lesson:", error);
      res.status(500).json({ message: "Failed to fetch current lesson" });
    }
  });
  app.post("/api/lessons/check-answer", async (req, res) => {
    try {
      const { lessonId, mode, answer, contentIndex } = checkAnswerSchema.parse(req.body);
      const adapter = await resolveAdapter();
      const lesson = await storage.getLesson(lessonId);
      if (!lesson) {
        return res.status(404).json({ message: "Lesson not found" });
      }
      // Get the specific content item
      const content = Array.isArray(lesson.content) ? lesson.content[contentIndex] : null;
      if (!content) {
        return res.status(400).json({ message: "Invalid content index" });
      }
      const correctAnswer = mode === "guide" ? content.english : content.target;
      const context = content.context || `${lesson.category} - ${lesson.level} level`;
      const start = performance.now();
      const responsePayload = await adapter.checkAnswer(
        answer,
        correctAnswer,
        context,
        mode
      );
      const durationMs = Math.max(0, Math.round(performance.now() - start));
      const result = responsePayload.data;
      const xpAwarded = result?.isCorrect ? lesson.xpReward : 0;
      const usageRecord = await recordAIUsage({
        req,
        adapter,
        operation: "lesson-check-answer",
        feature: "evaluation",
        response: responsePayload,
        metadata: {
          lessonId,
          mode,
          languageId: lesson.languageId,
          contentIndex,
          learningMode: mode,
          learningLevel: lesson.level,
          functionality: "lesson",
        },
        engagement: {
          action: "lesson-check-answer",
          xpDelta: xpAwarded,
        },
        durationMs,
      });
      if (xpAwarded > 0) {
        // Award XP for correct answer
        await storage.updateUserXP("user-1", lesson.xpReward);
      }
      res.json({
        correct: !!result?.isCorrect,
        feedback: result?.feedback ?? "",
        score: result?.score ?? 0,
        xpAwarded,
        interaction: {
          usageRecordId: usageRecord.id,
          provider: adapter.info.provider,
          modelId: adapter.id,
          feature: "evaluation",
          operation: "lesson-check-answer",
          languageId: lesson.languageId,
          metadata: usageRecord.metadata,
          durationMs: usageRecord.durationMs,
        },
      });
    } catch (error) {
      console.error("Error checking lesson answer:", error);
      res.status(500).json({ message: "Failed to check answer" });
    }
  });
  app.post("/api/lessons/play-audio", async (req, res) => {
    try {
      const { text, language } = playAudioSchema.parse(req.body);
      // Mock audio generation - in a real app, this would use a TTS service
      const audioUrl = `/api/audio/${encodeURIComponent(text)}`;
      res.json({ audioUrl });
    } catch (error) {
      console.error("Error generating audio:", error);
      res.status(500).json({ message: "Failed to generate audio" });
    }
  });
  // Gamification endpoints
  app.post("/api/gamification/add-xp", async (req, res) => {
    try {
      const { userId, amount, source } = addXPSchema.parse(req.body);
      const updatedUser = await storage.updateUserXP(userId, amount);
      const stats = await storage.getUserStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error adding XP:", error);
      res.status(500).json({ message: "Failed to add XP" });
    }
  });
  app.post("/api/gamification/update-streak", async (req, res) => {
    try {
      const { userId } = req.body;
      // Mock streak update logic
      const currentStreak = 7;
      const bonus = currentStreak >= 7 ? 50 : 0;
      await storage.updateUserStreak(userId, currentStreak);
      res.json({
        streak: currentStreak,
        bonus,
      });
    } catch (error) {
      console.error("Error updating streak:", error);
      res.status(500).json({ message: "Failed to update streak" });
    }
  });
  app.get("/api/gamification/leaderboard", async (req, res) => {
    try {
      const { timeframe = "weekly", limit = "10" } = req.query;
      // Mock leaderboard data
      const leaderboard = [
        { userId: "user-1", username: "polylearner", xp: 2450, rank: 1 },
        { userId: "user-2", username: "linguist", xp: 2200, rank: 2 },
        { userId: "user-3", username: "student", xp: 1900, rank: 3 },
      ];
      res.json(leaderboard.slice(0, parseInt(limit as string)));
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      res.status(500).json({ message: "Failed to fetch leaderboard" });
    }
  });
  app.get("/api/gamification/stats/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const stats = await storage.getUserStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching user stats:", error);
      res.status(500).json({ message: "Failed to fetch user stats" });
    }
  });
  app.get("/api/admin/ai-models", async (_req, res) => {
    try {
      const models = await aiModelManager.listModels();
      const activeModelId = await aiModelManager.getActiveModelId();
      res.json({ activeModelId, models });
    } catch (error) {
      console.error("Error fetching AI models:", error);
      res.status(500).json({ message: "Failed to fetch AI models" });
    }
  });
  app.post("/api/admin/ai-models/select", async (req, res) => {
    try {
      const { modelId } = setAIModelSchema.parse(req.body);
      await aiModelManager.setActiveModel(modelId);
      res.json({ activeModelId: modelId });
    } catch (error) {
      console.error("Error updating AI model:", error);
      const status = /not registered/i.test(String(error)) ? 400 : 500;
      res.status(status).json({ message: status === 400 ? "Invalid model selection" : "Failed to update AI model" });
    }
  });
  app.get("/api/admin/ai-usage/logs", async (req, res) => {
    try {
      const query = usageQuerySchema.parse(req.query);
      const limit = query.limit ?? 100;
      const records = await storage.listAIUsage({
        ...query,
        limit,
      });
      const pricingModelId = query.modelId ?? records[0]?.modelId;
      const pricingMeta = pricingModelId ? getPricingMetadata(pricingModelId) : undefined;
      res.json({
        records,
        pricingSource: pricingMeta?.source,
        pricingEffectiveDate: pricingMeta?.effectiveDate,
      });
    } catch (error) {
      console.error("Error fetching AI usage logs:", error);
      res.status(500).json({ message: "Failed to fetch usage logs" });
    }
  });
  app.get("/api/admin/ai-usage/daily-summary", async (req, res) => {
    try {
      const query = usageQuerySchema.parse(req.query);
      const limit = query.limit ?? 30;
      const summaries = await storage.getDailyAIUsageSummaries({
        ...query,
        limit,
      });
      const pricingModelId = query.modelId ?? summaries[0]?.modelId;
      const pricingMeta = pricingModelId ? getPricingMetadata(pricingModelId) : undefined;
      res.json({
        summaries,
        pricingSource: pricingMeta?.source,
        pricingEffectiveDate: pricingMeta?.effectiveDate,
      });
    } catch (error) {
      console.error("Error fetching AI usage summary:", error);
      res.status(500).json({ message: "Failed to fetch usage summary" });
    }
  });
  app.post("/api/feedback", async (req, res) => {
    try {
      const payload = feedbackSchema.parse(req.body);
      const usageRecord = await storage.getAIUsageRecordById(payload.usageRecordId);
      if (!usageRecord) {
        return res.status(404).json({ message: "Usage record not found" });
      }

      const languageIdFromUsage =
        (usageRecord.metadata?.languageId as string | undefined) ?? undefined;

      const metadata = (usageRecord.metadata ?? {}) as AIUsageMetadata;
      const feedbackContextRaw = {
        sourceText: metadata.sourceText as string | undefined,
        sourceLang: metadata.sourceLang as string | undefined,
        targetLang: metadata.targetLang as string | undefined,
        translationText: metadata.translationText as string | undefined,
        transliteration: metadata.transliteration as string | undefined,
        languageCode: metadata.languageCode as string | undefined,
      };
      const feedbackContextEntries = Object.entries(feedbackContextRaw).filter(
        ([, value]) => typeof value === "string" && value.trim().length > 0
      );
      const feedbackContext = feedbackContextEntries.length
        ? Object.fromEntries(feedbackContextEntries)
        : undefined;

      const functionality = typeof metadata.functionality === "string" ? metadata.functionality : undefined;
      const learningMode = typeof metadata.learningMode === "string"
        ? metadata.learningMode
        : typeof (metadata as Record<string, unknown>).mode === "string"
          ? ((metadata as Record<string, unknown>).mode as string)
          : undefined;
      const learningLevel = typeof metadata.learningLevel === "string"
        ? metadata.learningLevel
        : typeof (metadata as Record<string, unknown>).level === "string"
          ? ((metadata as Record<string, unknown>).level as string)
          : undefined;

      const feedbackRecord = await storage.logFeedback({
        usageRecordId: payload.usageRecordId,
        userId: usageRecord.userId,
        sessionId: usageRecord.sessionId,
        provider: usageRecord.provider,
        modelId: payload.modelId ?? usageRecord.modelId,
        languageId: payload.languageId ?? languageIdFromUsage,
        operation: payload.operation ?? usageRecord.operation,
        feature: payload.feature ?? usageRecord.feature,
        touchpoint: payload.touchpoint,
        signal: payload.signal,
        reason: payload.reason,
        comment: payload.comment?.trim() || undefined,
        xpDelta: payload.xpDelta,
        context: feedbackContext,
        functionality,
        learningMode,
        learningLevel,
      });

      res.status(201).json(feedbackRecord);
    } catch (error) {
      console.error("Error recording feedback:", error);
      res.status(500).json({ message: "Failed to record feedback" });
    }
  });
  app.patch("/api/feedback/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const payload = feedbackUpdateSchema.parse({ id, ...req.body });
      const updated = await storage.updateFeedback(id, {
        signal: payload.signal,
        reason: payload.reason,
        comment: payload.comment?.trim() || undefined,
        xpDelta: payload.xpDelta,
        touchpoint: payload.touchpoint,
      });
      if (!updated) {
        return res.status(404).json({ message: "Feedback not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating feedback:", error);
      res.status(500).json({ message: "Failed to update feedback" });
    }
  });
  app.get("/api/admin/feedback/logs", async (req, res) => {
    try {
      const query = feedbackQuerySchema.parse(req.query);
      const records = await storage.listFeedback(query);
      res.json({ records });
    } catch (error) {
      console.error("Error fetching feedback logs:", error);
      res.status(500).json({ message: "Failed to fetch feedback logs" });
    }
  });
  app.get("/api/admin/feedback/summary", async (req, res) => {
    try {
      const query = feedbackQuerySchema.parse(req.query);
      const summary = await storage.getFeedbackSummary(query);
      res.json(summary);
    } catch (error) {
      console.error("Error fetching feedback summary:", error);
      res.status(500).json({ message: "Failed to fetch feedback summary" });
    }
  });
  app.get("/api/admin/engagement/logs", async (req, res) => {
    try {
      const query = engagementQuerySchema.parse(req.query);
      const records = await storage.listEngagementEvents(query);
      res.json({ records });
    } catch (error) {
      console.error("Error fetching engagement logs:", error);
      res.status(500).json({ message: "Failed to fetch engagement logs" });
    }
  });
  app.get("/api/admin/engagement/summary", async (req, res) => {
    try {
      const query = engagementQuerySchema.parse(req.query);
      const summary = await storage.getEngagementSummary(query);
      res.json(summary);
    } catch (error) {
      console.error("Error fetching engagement summary:", error);
      res.status(500).json({ message: "Failed to fetch engagement summary" });
    }
  });
  const httpServer = createServer(app);
  return httpServer;
}
