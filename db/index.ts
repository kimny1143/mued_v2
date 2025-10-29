import * as schema from "./schema";
import { config } from "dotenv";

// Node.js環境の場合のみ.env.localを読み込む
if (typeof window === "undefined") {
  config({ path: ".env.local" });
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

// CI環境ではnode-postgres、本番ではneon-serverlessを使用
const isCI = process.env.CI === "true";

let db;

if (isCI) {
  // GitHub Actions用: 標準PostgreSQL接続
  const pg = require("pg");
  const { drizzle } = require("drizzle-orm/node-postgres");
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle(pool, { schema });
} else {
  // 本番環境用: Neon Serverless接続
  const { Pool, neonConfig } = require("@neondatabase/serverless");
  const { drizzle } = require("drizzle-orm/neon-serverless");
  const ws = require("ws");

  neonConfig.webSocketConstructor = ws;

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle(pool, { schema });
}

export { db };

export type DB = typeof db;