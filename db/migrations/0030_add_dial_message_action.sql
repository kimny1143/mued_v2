-- Add action column to dial_messages for persisting tool call actions
ALTER TABLE dial_messages ADD COLUMN IF NOT EXISTS action TEXT;
