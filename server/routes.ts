import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertPortfolioViewSchema, 
  insertContactMessageSchema, 
  insertProjectInteractionSchema,
  insertSkillsDataSchema
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Portfolio analytics endpoints
  app.post("/api/portfolio/view", async (req, res) => {
    try {
      const validatedData = insertPortfolioViewSchema.parse(req.body);
      const portfolioView = await storage.trackPortfolioView(validatedData);
      res.json(portfolioView);
    } catch (error) {
      res.status(400).json({ error: "Invalid request data" });
    }
  });

  app.get("/api/portfolio/views", async (req, res) => {
    try {
      const views = await storage.getPortfolioViews();
      res.json(views);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch portfolio views" });
    }
  });

  // Contact form endpoints
  app.post("/api/contact", async (req, res) => {
    try {
      const validatedData = insertContactMessageSchema.parse(req.body);
      const message = await storage.saveContactMessage(validatedData);
      res.json(message);
    } catch (error) {
      res.status(400).json({ error: "Invalid contact message data" });
    }
  });

  app.get("/api/contact/messages", async (req, res) => {
    try {
      const messages = await storage.getContactMessages();
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch contact messages" });
    }
  });

  app.patch("/api/contact/messages/:id/read", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.markMessageAsRead(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to mark message as read" });
    }
  });

  // Project interaction tracking
  app.post("/api/projects/interaction", async (req, res) => {
    try {
      const validatedData = insertProjectInteractionSchema.parse(req.body);
      const interaction = await storage.trackProjectInteraction(validatedData);
      res.json(interaction);
    } catch (error) {
      res.status(400).json({ error: "Invalid project interaction data" });
    }
  });

  app.get("/api/projects/interactions", async (req, res) => {
    try {
      const interactions = await storage.getProjectInteractions();
      res.json(interactions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch project interactions" });
    }
  });

  // Skills management endpoints
  app.post("/api/skills", async (req, res) => {
    try {
      const validatedData = insertSkillsDataSchema.parse(req.body);
      const skill = await storage.createSkill(validatedData);
      res.json(skill);
    } catch (error) {
      res.status(400).json({ error: "Invalid skill data" });
    }
  });

  app.get("/api/skills", async (req, res) => {
    try {
      const skills = await storage.getSkills();
      res.json(skills);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch skills" });
    }
  });

  app.patch("/api/skills/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.updateSkill(id, req.body);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update skill" });
    }
  });

  // Portfolio stats endpoint
  app.get("/api/portfolio/stats", async (req, res) => {
    try {
      const [views, interactions, messages] = await Promise.all([
        storage.getPortfolioViews(),
        storage.getProjectInteractions(),
        storage.getContactMessages()
      ]);

      const stats = {
        totalViews: views.length,
        totalInteractions: interactions.length,
        totalMessages: messages.length,
        unreadMessages: messages.filter(m => !m.isRead).length,
        popularProjects: interactions.reduce((acc, interaction) => {
          const project = interaction.projectName;
          acc[project] = (acc[project] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      };

      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch portfolio stats" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
