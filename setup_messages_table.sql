-- Setup project_messages table for LaunchIn 48
-- Run this in your Supabase SQL Editor

-- Create project_messages table
CREATE TABLE IF NOT EXISTS project_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'admin')),
  message TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_project_messages_project_id ON project_messages(project_id);
CREATE INDEX IF NOT EXISTS idx_project_messages_user_id ON project_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_project_messages_sender_type ON project_messages(sender_type);
CREATE INDEX IF NOT EXISTS idx_project_messages_created_at ON project_messages(created_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE project_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own messages" ON project_messages;
DROP POLICY IF EXISTS "Users can insert their own messages" ON project_messages;
DROP POLICY IF EXISTS "Admins can view all messages" ON project_messages;
DROP POLICY IF EXISTS "Admins can insert messages" ON project_messages;
DROP POLICY IF EXISTS "Admins can update messages" ON project_messages;
DROP POLICY IF EXISTS "Admins can delete messages" ON project_messages;

-- Create policies for users
CREATE POLICY "Users can view their own messages" ON project_messages
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own messages" ON project_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id AND sender_type = 'user');

-- Create policies for admins (using email pattern for admin identification)
CREATE POLICY "Admins can view all messages" ON project_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email LIKE '%@launchin48.%'
    )
    OR
    -- Fallback: allow if user is admin by email pattern
    (SELECT email FROM auth.users WHERE id = auth.uid()) LIKE '%admin%'
    OR
    -- Allow specific admin email
    (SELECT email FROM auth.users WHERE id = auth.uid()) = 'jaydhole.739@gmail.com'
  );

CREATE POLICY "Admins can insert messages" ON project_messages
  FOR INSERT WITH CHECK (
    (
      EXISTS (
        SELECT 1 FROM auth.users 
        WHERE auth.users.id = auth.uid() 
        AND (
          auth.users.email LIKE '%@launchin48.%'
          OR auth.users.email LIKE '%admin%'
          OR auth.users.email = 'jaydhole.739@gmail.com'
        )
      )
      AND sender_type = 'admin'
    )
  );

CREATE POLICY "Admins can update messages" ON project_messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND (
        auth.users.email LIKE '%@launchin48.%'
        OR auth.users.email LIKE '%admin%'
        OR auth.users.email = 'jaydhole.739@gmail.com'
      )
    )
  );

CREATE POLICY "Admins can delete messages" ON project_messages
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND (
        auth.users.email LIKE '%@launchin48.%'
        OR auth.users.email LIKE '%admin%'
        OR auth.users.email = 'jaydhole.739@gmail.com'
      )
    )
  );

-- Insert a test message to verify the table works
-- Replace the UUIDs with actual user and project IDs from your database
/*
INSERT INTO project_messages (project_id, user_id, sender_type, message) VALUES
(
  (SELECT id FROM projects LIMIT 1),
  (SELECT id FROM users LIMIT 1),
  'user',
  'Test message from user - please reply!'
);
*/