import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import { config } from "dotenv";

// Node.js環境の場合のみ.env.localを読み込む
if (typeof window === "undefined") {
  config({ path: ".env.local" });
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const sql = neon(process.env.DATABASE_URL);
export const db = drizzle(sql, { schema });

export type DB = typeof db;