import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { LanguageService } from "../client/src/services/language-service";
import { GamificationService } from "../client/src/services/gamification-service";

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
      const { languageCode, level, category, count } = generateContentSchema.parse(req.body);
      
      // Mock content generation
      const mockContent = [
        {
          english: "How much does this cost?",
          target: languageCode === "kn" ? "ಇದು ಎಷ್ಟು ಬೆಲೆ?" : "यह कितना है?",
          transliteration: languageCode === "kn" ? "idu eshtu bele?" : "yah kitna hai?",
          context: "Used when asking for the price of items in markets or shops",
        },
      ];
      
      res.json(mockContent);
    } catch (error) {
      console.error("Error generating content:", error);
      res.status(500).json({ message: "Failed to generate content" });
    }
  });

  app.post("/api/languages/translate", async (req, res) => {
    try {
      const { text, sourceLang, targetLang } = translateSchema.parse(req.body);
      
      // Mock translation
      const translation = `[Translated: ${text}]`;
      res.json({ translation });
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
      
      // Simple answer checking logic
      const isCorrect = userAnswer.toLowerCase().trim() === correctAnswer.toLowerCase().trim();
      const feedback = isCorrect 
        ? "Excellent! That's correct." 
        : `Not quite right. The correct answer is: ${correctAnswer}`;
      
      res.json({
        isCorrect,
        feedback,
        score: isCorrect ? 100 : 50,
      });
    } catch (error) {
      console.error("Error checking answer:", error);
      res.status(500).json({ message: "Failed to check answer" });
    }
  });

  // Lesson endpoints
  app.get("/api/lessons/current/:languageId/:mode", async (req, res) => {
    try {
      const { languageId, mode } = req.params;
      const lesson = await storage.getCurrentLesson("user-1", languageId, mode);
      
      if (!lesson) {
        return res.status(404).json({ message: "No current lesson found" });
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

      // Mock answer checking
      const feedback = "Good attempt! Keep practicing to improve your accuracy.";
      const correct = Math.random() > 0.3; // 70% chance of being correct
      
      if (correct) {
        // Award XP for correct answer
        await storage.updateUserXP("user-1", lesson.xpReward);
      }

      res.json({
        correct,
        feedback,
        xpAwarded: correct ? lesson.xpReward : 0,
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
