import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const portfolioViews = pgTable("portfolio_views", {
  id: serial("id").primaryKey(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  viewedAt: timestamp("viewed_at").defaultNow().notNull(),
  pageSection: text("page_section"),
});

export const contactMessages = pgTable("contact_messages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  subject: text("subject"),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const projectInteractions = pgTable("project_interactions", {
  id: serial("id").primaryKey(),
  projectName: text("project_name").notNull(),
  interactionType: text("interaction_type").notNull(), // 'view', 'github_click', 'demo_click'
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const skillsData = pgTable("skills_data", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(),
  skillName: text("skill_name").notNull(),
  proficiencyLevel: integer("proficiency_level").notNull(), // 1-10 scale
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const portfolioViewsRelations = relations(portfolioViews, ({ many }) => ({
  projectInteractions: many(projectInteractions),
}));

export const contactMessagesRelations = relations(contactMessages, ({ one }) => ({
  // Could add user relation if authentication is added later
}));

export const projectInteractionsRelations = relations(projectInteractions, ({ one }) => ({
  // Could add project relation if projects are stored in DB
}));

export const skillsDataRelations = relations(skillsData, ({ one }) => ({
  // Could add categories relation if needed
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertPortfolioViewSchema = createInsertSchema(portfolioViews).pick({
  ipAddress: true,
  userAgent: true,
  pageSection: true,
});

export const insertContactMessageSchema = createInsertSchema(contactMessages).pick({
  name: true,
  email: true,
  subject: true,
  message: true,
});

export const insertProjectInteractionSchema = createInsertSchema(projectInteractions).pick({
  projectName: true,
  interactionType: true,
  ipAddress: true,
  userAgent: true,
});

export const insertSkillsDataSchema = createInsertSchema(skillsData).pick({
  category: true,
  skillName: true,
  proficiencyLevel: true,
  isActive: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertPortfolioView = z.infer<typeof insertPortfolioViewSchema>;
export type PortfolioView = typeof portfolioViews.$inferSelect;
export type InsertContactMessage = z.infer<typeof insertContactMessageSchema>;
export type ContactMessage = typeof contactMessages.$inferSelect;
export type InsertProjectInteraction = z.infer<typeof insertProjectInteractionSchema>;
export type ProjectInteraction = typeof projectInteractions.$inferSelect;
export type InsertSkillsData = z.infer<typeof insertSkillsDataSchema>;
export type SkillsData = typeof skillsData.$inferSelect;