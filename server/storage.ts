import {
  type User,
  type InsertUser,
  type Language,
  type InsertLanguage,
  type UserProgress,
  type InsertUserProgress,
  type Lesson,
  type InsertLesson,
  type Achievement,
  type InsertAchievement,
  type UserAchievement,
  type InsertUserAchievement,
  type LessonContent,
  type LanguageWithProgress,
  type UserStats,
} from "@shared/schema";
import { DEFAULT_AI_MODEL_ID, type AIModelId } from "@shared/ai-models";
import {
  type AIUsageRecord,
  type AIUsageRecordInput,
  type AIUsageQueryFilters,
  type DailyAIUsageSummary,
  type AIUsageMetadata,
} from "@shared/ai-usage";
import {
  type AIResponseFeedback,
  type FeedbackQueryFilters,
  type FeedbackSummaryResponse,
  type FeedbackSummaryBucket,
} from "@shared/feedback";
import {
  type EngagementEvent,
  type EngagementQueryFilters,
  type EngagementSummaryResponse,
  type EngagementSummaryBucket,
} from "@shared/engagement";
import { randomUUID } from "crypto";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserXP(userId: string, xp: number): Promise<User>;
  updateUserStreak(userId: string, streak: number): Promise<User>;

  // Language operations
  getAllLanguages(): Promise<Language[]>;
  getLanguage(id: string): Promise<Language | undefined>;
  createLanguage(language: InsertLanguage): Promise<Language>;
  getLanguagesWithProgress(userId: string): Promise<LanguageWithProgress[]>;

  // User Progress operations
  getUserProgress(userId: string, languageId: string): Promise<UserProgress | undefined>;
  createUserProgress(progress: InsertUserProgress): Promise<UserProgress>;
  updateUserProgress(userId: string, languageId: string, progress: Partial<UserProgress>): Promise<UserProgress>;

  // Lesson operations
  getLesson(id: string): Promise<Lesson | undefined>;
  getLessonsByLanguage(languageId: string, level?: string, mode?: string): Promise<Lesson[]>;
  createLesson(lesson: InsertLesson): Promise<Lesson>;
  updateLesson(lessonId: string, updates: Partial<Lesson>): Promise<Lesson>;
  getCurrentLesson(userId: string, languageId: string, mode: string): Promise<Lesson | undefined>;

  // Achievement operations
  getAllAchievements(): Promise<Achievement[]>;
  getAchievement(id: string): Promise<Achievement | undefined>;
  createAchievement(achievement: InsertAchievement): Promise<Achievement>;
  getUserAchievements(userId: string): Promise<UserAchievement[]>;
  createUserAchievement(userAchievement: InsertUserAchievement): Promise<UserAchievement>;

  // Stats operations
  getUserStats(userId: string): Promise<UserStats>;

  // AI model selection
  getAISettings(): Promise<{ activeModelId: AIModelId }>;
  setActiveAIModel(modelId: AIModelId): Promise<void>;

  // AI usage tracking
  logAIUsage(record: AIUsageRecordInput): Promise<AIUsageRecord>;
  listAIUsage(filters?: AIUsageQueryFilters): Promise<AIUsageRecord[]>;
  getDailyAIUsageSummaries(filters?: AIUsageQueryFilters): Promise<DailyAIUsageSummary[]>;
  getAIUsageRecordById(id: string): Promise<AIUsageRecord | undefined>;

  // Feedback tracking
  logFeedback(
    feedback: Omit<AIResponseFeedback, "id" | "createdAt"> & {
      id?: string;
      createdAt?: string;
    }
  ): Promise<AIResponseFeedback>;
  updateFeedback(
    id: string,
    updates: Partial<Pick<AIResponseFeedback, "signal" | "reason" | "comment" | "xpDelta" | "touchpoint" | "context">>
  ): Promise<AIResponseFeedback | undefined>;
  listFeedback(filters?: FeedbackQueryFilters): Promise<AIResponseFeedback[]>;
  getFeedbackSummary(filters?: FeedbackQueryFilters): Promise<FeedbackSummaryResponse>;

  // Engagement tracking
  logEngagementEvent(
    event: Omit<EngagementEvent, "id" | "timestamp"> & {
      id?: string;
      timestamp?: string;
    }
  ): Promise<EngagementEvent>;
  listEngagementEvents(filters?: EngagementQueryFilters): Promise<EngagementEvent[]>;
  getEngagementSummary(filters?: EngagementQueryFilters): Promise<EngagementSummaryResponse>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private languages: Map<string, Language> = new Map();
  private userProgress: Map<string, UserProgress> = new Map();
  private lessons: Map<string, Lesson> = new Map();
  private achievements: Map<string, Achievement> = new Map();
  private userAchievements: Map<string, UserAchievement> = new Map();
  private aiSettings: { activeModelId: AIModelId } = { activeModelId: DEFAULT_AI_MODEL_ID };
  private aiUsageRecords: AIUsageRecord[] = [];
  private feedbackRecords: AIResponseFeedback[] = [];
  private engagementEvents: EngagementEvent[] = [];

  constructor() {
    this.initializeData();
  }

  private filterAIUsageRecords(filters: AIUsageQueryFilters = {}): AIUsageRecord[] {
    const { userId, start, end, modelId, operation, feature } = filters;
    let records = [...this.aiUsageRecords];

    if (userId) {
      records = records.filter((record) => record.userId === userId);
    }

    if (modelId) {
      records = records.filter((record) => record.modelId === modelId);
    }

    if (operation) {
      records = records.filter((record) => record.operation === operation);
    }

    if (feature) {
      records = records.filter((record) => record.feature === feature);
    }

    if (start) {
      const startDate = new Date(start).getTime();
      if (!Number.isNaN(startDate)) {
        records = records.filter((record) => new Date(record.timestamp).getTime() >= startDate);
      }
    }

    if (end) {
      const endDate = new Date(end).getTime();
      if (!Number.isNaN(endDate)) {
        records = records.filter((record) => new Date(record.timestamp).getTime() <= endDate);
      }
    }

    return records.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  private filterFeedbackRecords(filters: FeedbackQueryFilters = {}): AIResponseFeedback[] {
    const {
      userId,
      languageId,
      modelId,
      feature,
      operation,
      touchpoint,
      signal,
      functionality,
      learningMode,
      learningLevel,
      start,
      end,
    } = filters;

    let records = [...this.feedbackRecords];

    if (userId) {
      records = records.filter((record) => record.userId === userId);
    }

    if (languageId) {
      records = records.filter((record) => record.languageId === languageId);
    }

    if (modelId) {
      records = records.filter((record) => record.modelId === modelId);
    }

    if (feature) {
      records = records.filter((record) => record.feature === feature);
    }

    if (operation) {
      records = records.filter((record) => record.operation === operation);
    }

    if (touchpoint) {
      records = records.filter((record) => record.touchpoint === touchpoint);
    }

    if (signal) {
      records = records.filter((record) => record.signal === signal);
    }

    if (functionality) {
      records = records.filter((record) => record.functionality === functionality);
    }

    if (learningMode) {
      records = records.filter((record) => record.learningMode === learningMode);
    }

    if (learningLevel) {
      records = records.filter((record) => record.learningLevel === learningLevel);
    }

    if (start) {
      const startDate = new Date(start).getTime();
      if (!Number.isNaN(startDate)) {
        records = records.filter((record) => new Date(record.createdAt).getTime() >= startDate);
      }
    }

    if (end) {
      const endDate = new Date(end).getTime();
      if (!Number.isNaN(endDate)) {
        records = records.filter((record) => new Date(record.createdAt).getTime() <= endDate);
      }
    }

    return records.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  private filterEngagementEvents(filters: EngagementQueryFilters = {}): EngagementEvent[] {
    const {
      userId,
      languageId,
      modelId,
      feature,
      operation,
      action,
      functionality,
      learningMode,
      learningLevel,
      start,
      end,
    } = filters;

    let events = [...this.engagementEvents];

    if (userId) {
      events = events.filter((event) => event.userId === userId);
    }

    if (languageId) {
      events = events.filter((event) => event.languageId === languageId);
    }

    if (modelId) {
      events = events.filter((event) => event.modelId === modelId);
    }

    if (feature) {
      events = events.filter((event) => event.feature === feature);
    }

    if (operation) {
      events = events.filter((event) => event.operation === operation);
    }

    if (action) {
      events = events.filter((event) => event.action === action);
    }

    if (functionality) {
      events = events.filter((event) => event.functionality === functionality);
    }

    if (learningMode) {
      events = events.filter((event) => event.learningMode === learningMode);
    }

    if (learningLevel) {
      events = events.filter((event) => event.learningLevel === learningLevel);
    }

    if (start) {
      const startDate = new Date(start).getTime();
      if (!Number.isNaN(startDate)) {
        events = events.filter((event) => new Date(event.timestamp).getTime() >= startDate);
      }
    }

    if (end) {
      const endDate = new Date(end).getTime();
      if (!Number.isNaN(endDate)) {
        events = events.filter((event) => new Date(event.timestamp).getTime() <= endDate);
      }
    }

    return events.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  private initializeData() {
    // Create default user
    const defaultUser: User = {
      id: "user-1",
      username: "polylearner",
      email: "user@example.com",
      displayName: "Poly Learner",
      streak: 7,
      xp: 2450,
      level: 2,
      createdAt: new Date(),
    };
    this.users.set(defaultUser.id, defaultUser);

    // Create languages
    const kannada: Language = {
      id: "lang-kannada",
      name: "Kannada",
      nativeName: "ಕನ್ನಡ",
      code: "kn",
      region: "Karnataka, India",
      speakers: 44000000,
      description: "Perfect for living and working in Bangalore, Mysore, and other Karnataka cities. Learn market phrases, workplace communication, and local customs.",
      isActive: true,
    };

    const hindi: Language = {
      id: "lang-hindi",
      name: "Hindi",
      nativeName: "हिंदी",
      code: "hi",
      region: "All India",
      speakers: 600000000,
      description: "India's official language, essential for travel, business, and cultural connection across the country. Learn Bollywood phrases and cultural expressions.",
      isActive: true,
    };

    this.languages.set(kannada.id, kannada);
    this.languages.set(hindi.id, hindi);

    // Create user progress
    const kannadaProgress: UserProgress = {
      id: "progress-1",
      userId: defaultUser.id,
      languageId: kannada.id,
      level: "basic",
      progress: 35,
      lessonsCompleted: 12,
      lastActivity: new Date(),
      currentStreak: 3,
    };

    const hindiProgress: UserProgress = {
      id: "progress-2",
      userId: defaultUser.id,
      languageId: hindi.id,
      level: "basic",
      progress: 12,
      lessonsCompleted: 4,
      lastActivity: new Date(),
      currentStreak: 1,
    };

    this.userProgress.set(`${defaultUser.id}-${kannada.id}`, kannadaProgress);
    this.userProgress.set(`${defaultUser.id}-${hindi.id}`, hindiProgress);

    // Create sample lessons - content will be generated dynamically
    const sampleLessons: Lesson[] = [
      {
        id: "lesson-1",
        languageId: kannada.id,
        title: "Market Conversations",
        category: "Shopping & Daily Life",
        level: "basic",
        mode: "listen",
        content: [], // Will be populated dynamically by Gemini
        duration: 5,
        xpReward: 10,
        order: 1,
        isActive: true,
      },
      {
        id: "lesson-2",
        languageId: kannada.id,
        title: "Workplace Communication",
        category: "Professional",
        level: "basic",
        mode: "guide",
        content: [],
        duration: 8,
        xpReward: 15,
        order: 2,
        isActive: true,
      },
      {
        id: "lesson-3",
        languageId: hindi.id,
        title: "Travel & Transportation",
        category: "Travel",
        level: "basic",
        mode: "listen",
        content: [],
        duration: 6,
        xpReward: 10,
        order: 1,
        isActive: true,
      },
    ];

    sampleLessons.forEach(lesson => {
      this.lessons.set(lesson.id, lesson);
    });

    // Create sample achievements
    const achievements: Achievement[] = [
      {
        id: "achievement-1",
        name: "First Steps",
        description: "Complete your first lesson",
        icon: "👶",
        xpReward: 50,
        type: "lesson",
        requirement: { lessonsCompleted: 1 },
      },
      {
        id: "achievement-2",
        name: "Streak Master",
        description: "Maintain a 7-day learning streak",
        icon: "🔥",
        xpReward: 100,
        type: "streak",
        requirement: { streak: 7 },
      },
    ];

    achievements.forEach(achievement => {
      this.achievements.set(achievement.id, achievement);
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id,
      streak: 0,
      xp: 0,
      level: 1,
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async updateUserXP(userId: string, xp: number): Promise<User> {
    const user = this.users.get(userId);
    if (!user) throw new Error("User not found");
    
    user.xp += xp;
    user.level = Math.floor(user.xp / 1000) + 1;
    this.users.set(userId, user);
    return user;
  }

  async updateUserStreak(userId: string, streak: number): Promise<User> {
    const user = this.users.get(userId);
    if (!user) throw new Error("User not found");
    
    user.streak = streak;
    this.users.set(userId, user);
    return user;
  }

  async getAllLanguages(): Promise<Language[]> {
    return Array.from(this.languages.values()).filter(lang => lang.isActive);
  }

  async getLanguage(id: string): Promise<Language | undefined> {
    return this.languages.get(id);
  }

  async createLanguage(language: InsertLanguage): Promise<Language> {
    const id = randomUUID();
    const newLanguage: Language = { 
      ...language, 
      id,
      isActive: language.isActive ?? true 
    };
    this.languages.set(id, newLanguage);
    return newLanguage;
  }

  async getLanguagesWithProgress(userId: string): Promise<LanguageWithProgress[]> {
    const languages = await this.getAllLanguages();
    return languages.map(language => {
      const progress = Array.from(this.userProgress.values())
        .find(p => p.userId === userId && p.languageId === language.id);
      
      return {
        ...language,
        progress: progress?.progress || 0,
        badgeCount: 3, // Mock badge count
        isStarted: !!progress,
      };
    });
  }

  async getUserProgress(userId: string, languageId: string): Promise<UserProgress | undefined> {
    return this.userProgress.get(`${userId}-${languageId}`);
  }

  async createUserProgress(progress: InsertUserProgress): Promise<UserProgress> {
    const id = randomUUID();
    const newProgress: UserProgress = { 
      ...progress, 
      id,
      level: progress.level ?? "basic",
      progress: progress.progress ?? 0,
      lessonsCompleted: progress.lessonsCompleted ?? 0,
      currentStreak: progress.currentStreak ?? 0,
      lastActivity: new Date(),
    };
    this.userProgress.set(`${progress.userId}-${progress.languageId}`, newProgress);
    return newProgress;
  }

  async updateUserProgress(userId: string, languageId: string, updates: Partial<UserProgress>): Promise<UserProgress> {
    const key = `${userId}-${languageId}`;
    const existing = this.userProgress.get(key);
    if (!existing) throw new Error("Progress not found");
    
    const updated = { ...existing, ...updates, lastActivity: new Date() };
    this.userProgress.set(key, updated);
    return updated;
  }

  async getLesson(id: string): Promise<Lesson | undefined> {
    return this.lessons.get(id);
  }

  async getLessonsByLanguage(languageId: string, level?: string, mode?: string): Promise<Lesson[]> {
    return Array.from(this.lessons.values())
      .filter(lesson => {
        if (lesson.languageId !== languageId || !lesson.isActive) return false;
        if (level && lesson.level !== level) return false;
        if (mode && lesson.mode !== mode) return false;
        return true;
      })
      .sort((a, b) => a.order - b.order);
  }

  async createLesson(lesson: InsertLesson): Promise<Lesson> {
    const id = randomUUID();
    const newLesson: Lesson = { 
      ...lesson, 
      id,
      isActive: lesson.isActive ?? true,
      xpReward: lesson.xpReward ?? 10
    };
    this.lessons.set(id, newLesson);
    return newLesson;
  }

  async getCurrentLesson(userId: string, languageId: string, mode: string): Promise<Lesson | undefined> {
    const lessons = await this.getLessonsByLanguage(languageId, "basic", mode);
    return lessons[0]; // Return first lesson for now
  }

  async updateLesson(lessonId: string, updates: Partial<Lesson>): Promise<Lesson> {
    const existing = this.lessons.get(lessonId);
    if (!existing) throw new Error("Lesson not found");
    
    const updated = { ...existing, ...updates };
    this.lessons.set(lessonId, updated);
    return updated;
  }

  async getAllAchievements(): Promise<Achievement[]> {
    return Array.from(this.achievements.values());
  }

  async getAchievement(id: string): Promise<Achievement | undefined> {
    return this.achievements.get(id);
  }

  async createAchievement(achievement: InsertAchievement): Promise<Achievement> {
    const id = randomUUID();
    const newAchievement: Achievement = { 
      ...achievement, 
      id,
      xpReward: achievement.xpReward ?? 50
    };
    this.achievements.set(id, newAchievement);
    return newAchievement;
  }

  async getUserAchievements(userId: string): Promise<UserAchievement[]> {
    return Array.from(this.userAchievements.values())
      .filter(ua => ua.userId === userId);
  }

  async createUserAchievement(userAchievement: InsertUserAchievement): Promise<UserAchievement> {
    const id = randomUUID();
    const newUserAchievement: UserAchievement = { 
      ...userAchievement, 
      id,
      unlockedAt: new Date(),
    };
    this.userAchievements.set(id, newUserAchievement);
    return newUserAchievement;
  }

  async getAISettings(): Promise<{ activeModelId: AIModelId }> {
    return { ...this.aiSettings };
  }

  async setActiveAIModel(modelId: AIModelId): Promise<void> {
    this.aiSettings.activeModelId = modelId;
  }

  async logAIUsage(record: AIUsageRecordInput): Promise<AIUsageRecord> {
    const id = record.id ?? randomUUID();
    const timestamp = record.timestamp ?? new Date().toISOString();

    const sanitized: AIUsageRecord = {
      id,
      timestamp,
      userId: record.userId,
      sessionId: record.sessionId,
      provider: record.provider,
      modelId: record.modelId,
      operation: record.operation,
      feature: record.feature,
      inputTokens: record.inputTokens ?? 0,
      outputTokens: record.outputTokens ?? 0,
      totalTokens:
        record.totalTokens ??
        ((record.inputTokens ?? 0) + (record.outputTokens ?? 0)),
      inputCost: record.inputCost ?? 0,
      outputCost: record.outputCost ?? 0,
      totalCost:
        record.totalCost ?? (record.inputCost ?? 0) + (record.outputCost ?? 0),
      currency: record.currency ?? "USD",
      metadata: record.metadata,
      durationMs: record.durationMs,
    };

    this.aiUsageRecords.push(sanitized);
    return sanitized;
  }

  async listAIUsage(filters: AIUsageQueryFilters = {}): Promise<AIUsageRecord[]> {
    const records = this.filterAIUsageRecords(filters);
    const limit = filters.limit && filters.limit > 0 ? filters.limit : undefined;
    return limit ? records.slice(0, limit) : records;
  }

  async getDailyAIUsageSummaries(
    filters: AIUsageQueryFilters = {}
  ): Promise<DailyAIUsageSummary[]> {
    const records = this.filterAIUsageRecords({ ...filters, limit: undefined });
    const summaries = new Map<string, DailyAIUsageSummary>();

    for (const record of records) {
      const dateKey = new Date(record.timestamp).toISOString().slice(0, 10);
      const summaryKey = `${dateKey}::${record.userId}::${record.provider}::${record.modelId}`;
      const existing = summaries.get(summaryKey);

      if (!existing) {
        summaries.set(summaryKey, {
          date: dateKey,
          userId: record.userId,
          provider: record.provider,
          modelId: record.modelId,
          inputTokens: record.inputTokens,
          outputTokens: record.outputTokens,
          totalTokens: record.totalTokens,
          inputCost: record.inputCost,
          outputCost: record.outputCost,
          totalCost: record.totalCost,
          currency: record.currency,
        });
      } else {
        existing.inputTokens += record.inputTokens;
        existing.outputTokens += record.outputTokens;
        existing.totalTokens += record.totalTokens;
        existing.inputCost += record.inputCost;
        existing.outputCost += record.outputCost;
        existing.totalCost += record.totalCost;
      }
    }

    const sorted = Array.from(summaries.values()).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const limit = filters.limit && filters.limit > 0 ? filters.limit : undefined;
    return limit ? sorted.slice(0, limit) : sorted;
  }

  async logFeedback(
    feedback: Omit<AIResponseFeedback, "id" | "createdAt"> & {
      id?: string;
      createdAt?: string;
    }
  ): Promise<AIResponseFeedback> {
    const id = feedback.id ?? randomUUID();
    const createdAt = feedback.createdAt ?? new Date().toISOString();

    const record: AIResponseFeedback = {
      ...feedback,
      id,
      createdAt,
    };

    this.feedbackRecords.push(record);
    return record;
  }

  async updateFeedback(
    id: string,
    updates: Partial<Pick<AIResponseFeedback, "signal" | "reason" | "comment" | "xpDelta" | "touchpoint" | "context">>
  ): Promise<AIResponseFeedback | undefined> {
    const index = this.feedbackRecords.findIndex((record) => record.id === id);
    if (index === -1) {
      return undefined;
    }

    const existing = this.feedbackRecords[index];
    const updated: AIResponseFeedback = {
      ...existing,
      ...updates,
    };
    this.feedbackRecords[index] = updated;
    return updated;
  }

  async listFeedback(filters: FeedbackQueryFilters = {}): Promise<AIResponseFeedback[]> {
    const records = this.filterFeedbackRecords({ ...filters, limit: undefined });
    const limit = filters.limit && filters.limit > 0 ? filters.limit : undefined;
    return limit ? records.slice(0, limit) : records;
  }

  async getFeedbackSummary(filters: FeedbackQueryFilters = {}): Promise<FeedbackSummaryResponse> {
    const records = this.filterFeedbackRecords({ ...filters, limit: undefined });
    const summaryMap = new Map<string, FeedbackSummaryBucket>();

    for (const record of records) {
      const date = new Date(record.createdAt).toISOString().slice(0, 10);
      const key = [
        date,
        record.userId ?? "",
        record.languageId ?? "",
        record.modelId,
        record.feature,
        record.functionality ?? "",
        record.learningMode ?? "",
        record.learningLevel ?? "",
      ].join("::");
      let bucket = summaryMap.get(key);

      if (!bucket) {
        bucket = {
          date,
          userId: record.userId,
          languageId: record.languageId,
          modelId: record.modelId,
          feature: record.feature,
          functionality: record.functionality,
          learningMode: record.learningMode,
          learningLevel: record.learningLevel,
          total: 0,
          positive: 0,
          negative: 0,
          neutral: 0,
        };
        summaryMap.set(key, bucket);
      }

      bucket.total += 1;
      if (record.signal === "positive") {
        bucket.positive += 1;
      } else if (record.signal === "negative") {
        bucket.negative += 1;
      } else {
        bucket.neutral += 1;
      }
    }

    const buckets = Array.from(summaryMap.values()).sort((a, b) => {
      if (a.date === b.date) {
        return (b.total ?? 0) - (a.total ?? 0);
      }
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    const limit = filters.limit && filters.limit > 0 ? filters.limit : undefined;
    return {
      buckets: limit ? buckets.slice(0, limit) : buckets,
    };
  }

  async logEngagementEvent(
    event: Omit<EngagementEvent, "id" | "timestamp"> & { id?: string; timestamp?: string }
  ): Promise<EngagementEvent> {
    const id = event.id ?? randomUUID();
    const timestamp = event.timestamp ?? new Date().toISOString();

    const record: EngagementEvent = {
      ...event,
      id,
      timestamp,
    };

    this.engagementEvents.push(record);
    return record;
  }

  async listEngagementEvents(filters: EngagementQueryFilters = {}): Promise<EngagementEvent[]> {
    const events = this.filterEngagementEvents({ ...filters, limit: undefined });
    const limit = filters.limit && filters.limit > 0 ? filters.limit : undefined;
    return limit ? events.slice(0, limit) : events;
  }

  async getEngagementSummary(
    filters: EngagementQueryFilters = {}
  ): Promise<EngagementSummaryResponse> {
    const events = this.filterEngagementEvents({ ...filters, limit: undefined });
    const groups = new Map<string, EngagementEvent[]>();

    for (const event of events) {
      const date = new Date(event.timestamp).toISOString().slice(0, 10);
      const key = [
        event.userId,
        date,
        event.languageId ?? "",
        event.modelId,
        event.feature,
        event.functionality ?? "",
        event.learningMode ?? "",
        event.learningLevel ?? "",
      ].join("::");

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(event);
    }

    const ninetySeconds = 90 * 1000;
    const buckets: EngagementSummaryBucket[] = [];

    for (const [key, groupEvents] of Array.from(groups.entries())) {
      const sortedAsc = [...groupEvents].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      let previousTimestamp: number | undefined = undefined;
      let activeSeconds = 0;
      let xpTotal = 0;

      for (const event of sortedAsc) {
        const currentTimestamp = new Date(event.timestamp).getTime();
        xpTotal += event.xpDelta ?? 0;

        if (previousTimestamp !== undefined) {
          const diffMs = currentTimestamp - previousTimestamp;
          if (diffMs <= ninetySeconds) {
            activeSeconds += diffMs / 1000;
          }
        }

        previousTimestamp = currentTimestamp;
      }

      const [userId, date, languageIdRaw, modelId, feature, functionality, learningMode, learningLevel] =
        key.split("::");
      const actionCount = sortedAsc.length;
      const activeMinutes = activeSeconds / 60;
      const xpPerActiveMinute = activeMinutes > 0 ? xpTotal / activeMinutes : xpTotal;
      const actionsPerActiveMinute = activeMinutes > 0 ? actionCount / activeMinutes : actionCount;

      buckets.push({
        date,
        userId,
        languageId: languageIdRaw || undefined,
        modelId: modelId as AIModelId,
        feature,
        functionality: functionality || undefined,
        learningMode: learningMode || undefined,
        learningLevel: learningLevel || undefined,
        actionCount,
        xpTotal,
        activeMinutes,
        xpPerActiveMinute,
        actionsPerActiveMinute,
      });
    }

    buckets.sort((a, b) => {
      if (a.date === b.date) {
        return b.actionCount - a.actionCount;
      }
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    const limit = filters.limit && filters.limit > 0 ? filters.limit : undefined;
    return {
      buckets: limit ? buckets.slice(0, limit) : buckets,
    };
  }

  async getAIUsageRecordById(id: string): Promise<AIUsageRecord | undefined> {
    return this.aiUsageRecords.find((record) => record.id === id);
  }

  async getUserStats(userId: string): Promise<UserStats> {
    const user = this.users.get(userId);
    if (!user) throw new Error("User not found");

    const userAchievements = await this.getUserAchievements(userId);
    const achievements = await Promise.all(
      userAchievements.map(ua => this.getAchievement(ua.achievementId))
    );

    return {
      streak: user.streak,
      xp: user.xp,
      level: user.level,
      weeklyXP: 450, // Mock weekly XP
      totalLessons: 16,
      achievements: achievements.filter(Boolean) as Achievement[],
    };
  }
}

export const storage = new MemStorage();



