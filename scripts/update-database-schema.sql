-- Add missing columns to projects table for advance payment support
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS remaining_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_advance_payment BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS advance_percentage INTEGER DEFAULT 100;

-- Update existing projects to have proper remaining amounts
UPDATE projects 
SET remaining_amount = total_amount - COALESCE(paid_amount, 0)
WHERE remaining_amount IS NULL OR remaining_amount = 0;

-- Create project_messages table if it doesn't exist
CREATE TABLE IF NOT EXISTS project_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'admin')),
  message TEXT NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on project_messages
ALTER TABLE project_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for project_messages
CREATE POLICY "Users can view their own project messages" ON project_messages
  FOR SELECT USING (
    user_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_messages.project_id 
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages for their own projects" ON project_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_messages.project_id 
      AND projects.user_id = auth.uid()
      AND projects.payment_status IN ('paid', 'partial')
    )
  );

-- Update trigger for project_messages
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_project_messages_updated_at BEFORE UPDATE ON project_messages 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();