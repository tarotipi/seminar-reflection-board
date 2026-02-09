-- Supabase Schema for Seminar Reflection Board
-- Run this in Supabase SQL Editor

-- Drop existing tables if they exist (for re-creation)
DROP TABLE IF EXISTS posts;
DROP TABLE IF EXISTS sessions;

-- Sessions table
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  name TEXT,
  date TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Posts table
CREATE TABLE posts (
  id TEXT PRIMARY KEY,
  session_id TEXT REFERENCES sessions(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL,
  author_avatar TEXT NOT NULL,
  author_nickname TEXT NOT NULL,
  author_points INTEGER DEFAULT 0,
  category TEXT NOT NULL CHECK (category IN ('learning', 'growth', 'question')),
  content TEXT NOT NULL,
  reactions JSONB DEFAULT '{}',
  reacted_users JSONB DEFAULT '{}',
  comments JSONB DEFAULT '[]',
  sort_order BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  edited_at TIMESTAMPTZ
);

-- Enable Row Level Security
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Allow public read/write (for anonymous team access)
CREATE POLICY "Allow all operations on sessions" ON sessions FOR ALL USING (true);
CREATE POLICY "Allow all operations on posts" ON posts FOR ALL USING (true);

-- Create indexes for performance
CREATE INDEX idx_posts_session_id ON posts(session_id);
CREATE INDEX idx_posts_author_id ON posts(author_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
