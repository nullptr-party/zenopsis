-- Create message_references table
CREATE TABLE IF NOT EXISTS message_references (
  id INTEGER PRIMARY KEY,
  source_message_id INTEGER NOT NULL,
  target_message_id INTEGER NOT NULL,
  reference_type TEXT NOT NULL,
  resolved_username TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Add sentiment_score column to messages if it doesn't exist
ALTER TABLE messages ADD COLUMN sentiment_score INTEGER;
