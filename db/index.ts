import * as schema from "./schema";
import { config } from "dotenv";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { NeonDatabase } from "drizzle-orm/neon-serverless";

// Node.js環境の場合のみ.env.localを読み込む
if (typeof window === "undefined") {
  config({ path: ".env.local" });
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

// CI環境ではnode-postgres、本番ではneon-serverlessを使用
const isCI = process.env.CI === "true";

// Drizzle DB型定義
type DrizzleDB = NodePgDatabase<typeof schema> | NeonDatabase<typeof schema>;

let db: DrizzleDB;

if (isCI) {
  // GitHub Actions用: 標準PostgreSQL接続
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pg = require("pg");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { drizzle } = require("drizzle-orm/node-postgres");
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle(pool, { schema });
} else {
  // 本番環境用: Neon Serverless接続
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Pool, neonConfig } = require("@neondatabase/serverless");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { drizzle } = require("drizzle-orm/neon-serverless");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ws = require("ws");

  neonConfig.webSocketConstructor = ws;

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle(pool, { schema });
}

export { db };

export type DB = typeof db;