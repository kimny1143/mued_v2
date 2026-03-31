-- MCP API Keys: long-lived tokens for MCP client authentication
CREATE TABLE IF NOT EXISTS mcp_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT 'default',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMP,
  last_used_at TIMESTAMP
);

CREATE INDEX idx_mcp_api_keys_hash ON mcp_api_keys(key_hash);
CREATE INDEX idx_mcp_api_keys_user_id ON mcp_api_keys(user_id);
