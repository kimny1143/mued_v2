-- migration 0043: persist tool_use blocks in dial_messages
-- Enables history reconstruction with tool_use/tool_result pairs for Anthropic API
-- Prevents Hoo from repeating tool calls (e.g. set_musical_style loops) after page reload

ALTER TABLE dial_messages
  ADD COLUMN IF NOT EXISTS tool_use_blocks JSONB;

-- Format: [{ "id": "toolu_xxx", "name": "propose_mix_action", "input": {...} }]
-- NULL = no tool_use in this message (plain text response)

CREATE INDEX IF NOT EXISTS idx_dial_messages_has_tool_use
  ON dial_messages ((tool_use_blocks IS NOT NULL))
  WHERE tool_use_blocks IS NOT NULL;
