import { 
  users, 
  portfolioViews, 
  contactMessages, 
  projectInteractions, 
  skillsData,
  type User, 
  type InsertUser,
  type InsertPortfolioView,
  type PortfolioView,
  type InsertContactMessage,
  type ContactMessage,
  type InsertProjectInteraction,
  type ProjectInteraction,
  type InsertSkillsData,
  type SkillsData
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Portfolio tracking methods
  trackPortfolioView(view: InsertPortfolioView): Promise<PortfolioView>;
  getPortfolioViews(): Promise<PortfolioView[]>;
  
  // Contact methods
  saveContactMessage(message: InsertContactMessage): Promise<ContactMessage>;
  getContactMessages(): Promise<ContactMessage[]>;
  markMessageAsRead(id: number): Promise<void>;
  
  // Project interaction methods
  trackProjectInteraction(interaction: InsertProjectInteraction): Promise<ProjectInteraction>;
  getProjectInteractions(): Promise<ProjectInteraction[]>;
  
  // Skills methods
  createSkill(skill: InsertSkillsData): Promise<SkillsData>;
  getSkills(): Promise<SkillsData[]>;
  updateSkill(id: number, skill: Partial<SkillsData>): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // Portfolio tracking methods
  async trackPortfolioView(view: InsertPortfolioView): Promise<PortfolioView> {
    const [portfolioView] = await db
      .insert(portfolioViews)
      .values(view)
      .returning();
    return portfolioView;
  }

  async getPortfolioViews(): Promise<PortfolioView[]> {
    return await db.select().from(portfolioViews);
  }

  // Contact methods
  async saveContactMessage(message: InsertContactMessage): Promise<ContactMessage> {
    const [contactMessage] = await db
      .insert(contactMessages)
      .values(message)
      .returning();
    return contactMessage;
  }

  async getContactMessages(): Promise<ContactMessage[]> {
    return await db.select().from(contactMessages);
  }

  async markMessageAsRead(id: number): Promise<void> {
    await db
      .update(contactMessages)
      .set({ isRead: true })
      .where(eq(contactMessages.id, id));
  }

  // Project interaction methods
  async trackProjectInteraction(interaction: InsertProjectInteraction): Promise<ProjectInteraction> {
    const [projectInteraction] = await db
      .insert(projectInteractions)
      .values(interaction)
      .returning();
    return projectInteraction;
  }

  async getProjectInteractions(): Promise<ProjectInteraction[]> {
    return await db.select().from(projectInteractions);
  }

  // Skills methods
  async createSkill(skill: InsertSkillsData): Promise<SkillsData> {
    const [skillData] = await db
      .insert(skillsData)
      .values(skill)
      .returning();
    return skillData;
  }

  async getSkills(): Promise<SkillsData[]> {
    return await db.select().from(skillsData).where(eq(skillsData.isActive, true));
  }

  async updateSkill(id: number, skill: Partial<SkillsData>): Promise<void> {
    await db
      .update(skillsData)
      .set(skill)
      .where(eq(skillsData.id, id));
  }
}

export const storage = new DatabaseStorage();