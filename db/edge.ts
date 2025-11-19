/**
 * Edge Runtime Database Connection
 *
 * Vercel Edge Runtime用のデータベース接続。
 * Node.js依存のWebSocketではなく、HTTPベースの接続を使用。
 *
 * 使用箇所:
 * - Edge Runtimeを使用するAPIルート
 * - Middleware
 */

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

// Neon HTTP SQL for Edge Runtime
const sql = neon(process.env.DATABASE_URL);

// Drizzle ORM instance for Edge Runtime
export const db = drizzle(sql, { schema });

export type EdgeDB = typeof db;
