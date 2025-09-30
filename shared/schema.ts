import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, jsonb, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull(),
  streak: integer("streak").default(0).notNull(),
  xp: integer("xp").default(0).notNull(),
  level: integer("level").default(1).notNull(),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

export const languages = pgTable("languages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  nativeName: text("native_name").notNull(),
  code: text("code").notNull().unique(),
  region: text("region").notNull(),
  speakers: integer("speakers").notNull(),
  description: text("description").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
});

export const userProgress = pgTable("user_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  languageId: varchar("language_id").references(() => languages.id).notNull(),
  level: text("level").default("basic").notNull(), // basic, intermediate, advanced
  progress: integer("progress").default(0).notNull(), // percentage 0-100
  lessonsCompleted: integer("lessons_completed").default(0).notNull(),
  lastActivity: timestamp("last_activity").default(sql`now()`).notNull(),
  currentStreak: integer("current_streak").default(0).notNull(),
});

export const lessons = pgTable("lessons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  languageId: varchar("language_id").references(() => languages.id).notNull(),
  title: text("title").notNull(),
  category: text("category").notNull(),
  level: text("level").notNull(), // basic, intermediate, advanced
  mode: text("mode").notNull(), // listen, guide, speak
  content: jsonb("content").notNull(), // flexible content structure
  duration: integer("duration").notNull(), // in minutes
  xpReward: integer("xp_reward").default(10).notNull(),
  order: integer("order").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
});

export const achievements = pgTable("achievements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull(),
  xpReward: integer("xp_reward").default(50).notNull(),
  type: text("type").notNull(), // streak, lesson, progress, special
  requirement: jsonb("requirement").notNull(), // flexible requirement structure
});

export const userAchievements = pgTable("user_achievements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  achievementId: varchar("achievement_id").references(() => achievements.id).notNull(),
  unlockedAt: timestamp("unlocked_at").default(sql`now()`).notNull(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  displayName: true,
});

export const insertLanguageSchema = createInsertSchema(languages).omit({
  id: true,
});

export const insertUserProgressSchema = createInsertSchema(userProgress).omit({
  id: true,
});

export const insertLessonSchema = createInsertSchema(lessons).omit({
  id: true,
});

export const insertAchievementSchema = createInsertSchema(achievements).omit({
  id: true,
});

export const insertUserAchievementSchema = createInsertSchema(userAchievements).omit({
  id: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Language = typeof languages.$inferSelect;
export type InsertLanguage = z.infer<typeof insertLanguageSchema>;

export type UserProgress = typeof userProgress.$inferSelect;
export type InsertUserProgress = z.infer<typeof insertUserProgressSchema>;

export type Lesson = typeof lessons.$inferSelect;
export type InsertLesson = z.infer<typeof insertLessonSchema>;

export type Achievement = typeof achievements.$inferSelect;
export type InsertAchievement = z.infer<typeof insertAchievementSchema>;

export type UserAchievement = typeof userAchievements.$inferSelect;
export type InsertUserAchievement = z.infer<typeof insertUserAchievementSchema>;

// Lesson content type
export interface LessonContentVariant {
  text: string;
  transliteration?: string;
}

export interface LessonContentVariants {
  everyday: LessonContentVariant;
  classical: LessonContentVariant;
}

export interface LessonContent {
  english: string;
  variants: LessonContentVariants;
  target?: string; // legacy compatibility fallback
  transliteration?: string; // legacy compatibility fallback
  context?: string;
  explanation?: string;
  audioUrl?: string;
  wordMeanings?: Array<{
    word: string;
    meaning: string;
    transliteration?: string;
  }>;
  quickTip?: string;
  defaultVariant?: keyof LessonContentVariants;
}

// API response types
export interface UserStats {
  streak: number;
  xp: number;
  level: number;
  weeklyXP: number;
  totalLessons: number;
  achievements: Achievement[];
}

export interface LanguageWithProgress extends Language {
  progress: number;
  badgeCount: number;
  isStarted: boolean;
}

export interface LessonWithProgress extends Lesson {
  isCompleted: boolean;
  progress: number;
}
