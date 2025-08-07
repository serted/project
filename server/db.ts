import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 10, // Максимум 10 соединений в пуле
  idleTimeoutMillis: 30000, // 30 секунд для закрытия неактивных соединений
  connectionTimeoutMillis: 5000, // 5 секунд таймаут подключения
});

export const db = drizzle({ client: pool, schema });