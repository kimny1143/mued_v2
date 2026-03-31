/**
 * MCP API Keys Schema
 *
 * Long-lived API keys for authenticating MCP client connections.
 * Keys are stored as SHA-256 hashes — the raw key is only shown once at creation.
 */

import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "../schema";

export const mcpApiKeys = pgTable(
  "mcp_api_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    keyPrefix: text("key_prefix").notNull(), // "mcp_xxxx" for display
    keyHash: text("key_hash").notNull(), // SHA-256 hash for verification
    name: text("name").notNull().default("default"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    revokedAt: timestamp("revoked_at"), // NULL = active
    lastUsedAt: timestamp("last_used_at"),
  },
  (table) => ({
    keyHashIdx: index("idx_mcp_api_keys_hash").on(table.keyHash),
    userIdIdx: index("idx_mcp_api_keys_user_id").on(table.userId),
  })
);
