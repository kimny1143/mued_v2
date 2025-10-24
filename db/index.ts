import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";
import { config } from "dotenv";
import ws from "ws";

// Node.js環境の場合のみ.env.localを読み込む
if (typeof window === "undefined") {
  config({ path: ".env.local" });
}

// WebSocket設定（Node.js環境でのみ必要）
if (typeof window === "undefined") {
  neonConfig.webSocketConstructor = ws;
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });

export type DB = typeof db;