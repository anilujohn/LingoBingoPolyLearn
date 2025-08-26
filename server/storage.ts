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
  type UserStats
} from "@shared/schema";
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
  getCurrentLesson(userId: string, languageId: string, mode: string): Promise<Lesson | undefined>;

  // Achievement operations
  getAllAchievements(): Promise<Achievement[]>;
  getAchievement(id: string): Promise<Achievement | undefined>;
  createAchievement(achievement: InsertAchievement): Promise<Achievement>;
  getUserAchievements(userId: string): Promise<UserAchievement[]>;
  createUserAchievement(userAchievement: InsertUserAchievement): Promise<UserAchievement>;

  // Stats operations
  getUserStats(userId: string): Promise<UserStats>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private languages: Map<string, Language> = new Map();
  private userProgress: Map<string, UserProgress> = new Map();
  private lessons: Map<string, Lesson> = new Map();
  private achievements: Map<string, Achievement> = new Map();
  private userAchievements: Map<string, UserAchievement> = new Map();

  constructor() {
    this.initializeData();
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

    // Create sample lessons
    const sampleLessons: Lesson[] = [
      {
        id: "lesson-1",
        languageId: kannada.id,
        title: "Market Conversations",
        category: "Shopping & Daily Life",
        level: "basic",
        mode: "listen",
        content: [
          {
            english: "How much does this cost?",
            target: "ಇದು ಎಷ್ಟು ಬೆಲೆ?",
            transliteration: "idu eshtu bele?",
            context: "Used when asking for the price of items in markets or shops",
          },
          {
            english: "It's too expensive",
            target: "ಇದು ತುಂಬಾ ದುಬಾರಿ",
            transliteration: "idu tumba dubari",
            context: "Express that something costs too much",
          },
        ] as LessonContent[],
        duration: 5,
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
    const newLanguage: Language = { ...language, id };
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
    const newLesson: Lesson = { ...lesson, id };
    this.lessons.set(id, newLesson);
    return newLesson;
  }

  async getCurrentLesson(userId: string, languageId: string, mode: string): Promise<Lesson | undefined> {
    const lessons = await this.getLessonsByLanguage(languageId, "basic", mode);
    return lessons[0]; // Return first lesson for now
  }

  async getAllAchievements(): Promise<Achievement[]> {
    return Array.from(this.achievements.values());
  }

  async getAchievement(id: string): Promise<Achievement | undefined> {
    return this.achievements.get(id);
  }

  async createAchievement(achievement: InsertAchievement): Promise<Achievement> {
    const id = randomUUID();
    const newAchievement: Achievement = { ...achievement, id };
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
