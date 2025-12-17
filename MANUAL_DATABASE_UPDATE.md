# Database Schema Update - Manual Steps

To fully enable the advance payment features, you need to add some columns to your Supabase database.

## Step 1: Go to your Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to "SQL Editor" from the left sidebar

## Step 2: Run the following SQL commands

Copy and paste this SQL into the SQL Editor and click "Run":

```sql
-- Add missing columns to projects table for advance payment support
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS remaining_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_advance_payment BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS advance_percentage INTEGER DEFAULT 100;

-- Update existing projects to have proper remaining amounts
UPDATE projects 
SET 
    paid_amount = 0,
    remaining_amount = total_amount,
    is_advance_payment = FALSE,
    advance_percentage = 100
WHERE paid_amount IS NULL;

-- Create project_messages table for messaging system
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

-- Create update trigger for project_messages
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER IF NOT EXISTS update_project_messages_updated_at 
  BEFORE UPDATE ON project_messages 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## Step 3: Verify the changes

After running the SQL, you can verify by checking:
1. The `projects` table should now have the new columns
2. The `project_messages` table should be created
3. Your payment system should now support advance payments

## What this enables:

✅ **Advance Payment System**
- Users can pay minimum 20% of project cost upfront
- Remaining balance tracked automatically
- Payment status shows "partial" or "paid"

✅ **Messaging System** 
- Customers can chat with admin for paid projects
- Messages are organized by project
- Real-time communication support

✅ **Enhanced Dashboard**
- Proper payment tracking
- Only shows projects with actual payments in admin
- Correct total spent calculations

## Note:
The application will work even without these columns (basic payment functionality), but adding them enables the full advanced features.