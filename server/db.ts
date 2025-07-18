import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Only configure WebSocket in non-production environments
if (process.env.NODE_ENV !== 'production') {
  neonConfig.webSocketConstructor = ws;
}

let db: ReturnType<typeof drizzle> | null = null;
let pool: Pool | null = null;

if (!process.env.DATABASE_URL) {
  console.warn("Warning: DATABASE_URL not set. Skipping database setup.");
} else {
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle({ client: pool, schema });
}

export { db, pool };
