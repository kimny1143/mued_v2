-- Make mode nullable for mastering-only sessions (no mix purchased)
ALTER TABLE dial_sessions ALTER COLUMN mode DROP NOT NULL;
