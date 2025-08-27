import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { geminiService, type GeminiConfig } from "./gemini-service";

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
  model: z.enum(["gemini-2.5-flash", "gemini-2.5-pro"]).optional(),
});

const translateSchema = z.object({
  text: z.string(),
  sourceLang: z.string(),
  targetLang: z.string(),
});

const addXPSchema = z.object({
  userId: z.string(),
  amount: z.number(),
  source: z.string(),
});

export async function registerRoutes(app: Express): Promise<Server> {
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
      const { languageCode, level, category, count, model, skipWordAnalysis } = req.body;
      // Get language details from storage
      const language = await storage.getAllLanguages()
        .then(langs => langs.find(l => l.code === languageCode));
      
      if (!language) {
        return res.status(404).json({ message: "Language not found" });
      }

      const config: Partial<GeminiConfig> = model ? { model } : {};
      
      const content = await geminiService.generateContent(
        languageCode,
        language.name,
        language.region,
        level,
        category,
        count || 5,
        config
      );

      // Skip word analysis if requested (for fast loading)  
      if (skipWordAnalysis) {
        res.json(content);
        return;
      }
      // Add word analysis to each content item
      const enhancedContent = await Promise.all(
        content.map(async (item: any) => {
          try {
            const wordAnalysis = await geminiService.analyzeWordsForLearning(
              item.english,
              item.target,
              languageCode
            );
            return {
              ...item,
              wordMeanings: wordAnalysis.wordMeanings,
              quickTip: wordAnalysis.quickTip
            };
          } catch (error) {
            console.error('Word analysis error:', error);
            return item; // Return original item if analysis fails
          }
        })
      );
      
      res.json(enhancedContent);
    } catch (error) {
      console.error("Error generating content:", error);
      res.status(500).json({ message: "Failed to generate content" });
    }
  });

  // New route for adding word analysis to existing content
  app.post("/api/languages/add-word-analysis", async (req, res) => {
    try {
      const { content, languageCode } = req.body;
      
      // Add word analysis to the content item
      const wordAnalysis = await geminiService.analyzeWordsForLearning(
        content.english,
        content.target,
        languageCode
      );
      
      const enhancedContent = {
        ...content,
        wordMeanings: wordAnalysis.wordMeanings,
        quickTip: wordAnalysis.quickTip
      };
      
      res.json(enhancedContent);
    } catch (error) {
      console.error("Error adding word analysis:", error);
      res.status(500).json({ message: "Failed to add word analysis" });
    }
  });

  app.post("/api/languages/translate", async (req, res) => {
    try {
      const { text, sourceLang, targetLang } = translateSchema.parse(req.body);
      
      const result = await geminiService.translateText(text, sourceLang, targetLang);
      res.json(result);
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
      const { userAnswer, correctAnswer, context } = req.body;
      const mode = req.body.mode || "general";
      
      const result = await geminiService.checkAnswer(
        userAnswer,
        correctAnswer,
        context,
        mode
      );
      
      res.json(result);
    } catch (error) {
      console.error("Error checking answer:", error);
      res.status(500).json({ message: "Failed to check answer" });
    }
  });

  app.post("/api/languages/translate-with-analysis", async (req, res) => {
    try {
      const { text, sourceLang, targetLang, languageCode, model } = req.body;
      
      const config: Partial<GeminiConfig> = model ? { model } : {};
      
      const result = await geminiService.translateWithAnalysis(
        text,
        sourceLang,
        targetLang,
        languageCode,
        config
      );
      
      res.json(result);
    } catch (error) {
      console.error("Error translating with analysis:", error);
      res.status(500).json({ message: "Failed to translate with analysis" });
    }
  });

  app.post("/api/languages/check-answer-detailed", async (req, res) => {
    try {
      const { userAnswer, correctAnswer, context, mode, model } = req.body;
      
      const config: Partial<GeminiConfig> = model ? { model } : {};
      
      const result = await geminiService.checkAnswerDetailed(
        userAnswer,
        correctAnswer,
        context,
        mode,
        config
      );
      
      res.json(result);
    } catch (error) {
      console.error("Error checking answer with details:", error);
      res.status(500).json({ message: "Failed to check answer with details" });
    }
  });

  // Lesson endpoints
  app.get("/api/lessons/current/:languageId/:mode", async (req, res) => {
    try {
      const { languageId, mode } = req.params;
      let lesson = await storage.getCurrentLesson("user-1", languageId, mode);
      
      if (!lesson) {
        return res.status(404).json({ message: "No current lesson found" });
      }

      // Generate content dynamically if lesson content is empty
      if (!lesson.content || (Array.isArray(lesson.content) && lesson.content.length === 0)) {
        const language = await storage.getLanguage(languageId);
        if (language) {
          try {
            const generatedContent = await geminiService.generateContent(
              language.code,
              language.name,
              language.region,
              lesson.level,
              lesson.category,
              3 // Generate 3 sentences per lesson
            );
            
            // Update lesson with generated content
            lesson = await storage.updateLesson(lesson.id, { content: generatedContent });
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

      const result = await geminiService.checkAnswer(
        answer,
        correctAnswer,
        context,
        mode
      );
      
      if (result.isCorrect) {
        // Award XP for correct answer
        await storage.updateUserXP("user-1", lesson.xpReward);
      }

      res.json({
        correct: result.isCorrect,
        feedback: result.feedback,
        score: result.score,
        xpAwarded: result.isCorrect ? lesson.xpReward : 0,
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

  const httpServer = createServer(app);
  return httpServer;
}
