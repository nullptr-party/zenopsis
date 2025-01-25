-- Create message_references table
CREATE TABLE IF NOT EXISTS message_references (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_message_id INTEGER NOT NULL,
  target_message_id INTEGER NOT NULL,
  reference_type TEXT NOT NULL,
  resolved_username TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Add sentiment_score column to messages if it doesn't exist
ALTER TABLE messages ADD COLUMN sentiment_score INTEGER;
