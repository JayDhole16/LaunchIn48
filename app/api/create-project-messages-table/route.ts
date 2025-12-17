import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: "To create the project_messages table, please run this SQL in your Supabase SQL editor:",
    sql: `
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

-- Create policies for users
CREATE POLICY "Users can view their own messages" ON project_messages
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own messages" ON project_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id AND sender_type = 'user');

-- Create policies for admins (assuming there's a role column in users table)
CREATE POLICY "Admins can view all messages" ON project_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND (users.role = 'admin' OR users.email LIKE '%@launchin48.%')
    )
  );

CREATE POLICY "Admins can insert messages" ON project_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND (users.role = 'admin' OR users.email LIKE '%@launchin48.%')
    )
    AND sender_type = 'admin'
  );

CREATE POLICY "Admins can update messages" ON project_messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND (users.role = 'admin' OR users.email LIKE '%@launchin48.%')
    )
  );
    `
  })
}