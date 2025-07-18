import { Express, Request, Response } from "express";

export async function registerRoutes(app: Express) {
  // Basic health check
  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ status: "OK", message: "API is working!" });
  });

  // Sample projects route
  app.get("/api/projects", (_req: Request, res: Response) => {
    res.json([
      {
        id: 1,
        title: "Portfolio Website",
        description: "Personal portfolio built with Vite + React + Express",
      },
      {
        id: 2,
        title: "Blog Platform",
        description: "Full-stack blog system with Markdown support",
      },
    ]);
  });

  // Future routes can be added here

  return app;
}
