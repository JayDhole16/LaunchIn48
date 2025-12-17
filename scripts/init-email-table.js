// Script to initialize the email_notifications table
// Run with: node scripts/init-email-table.js

console.log('To create the email_notifications table, please follow these steps:')
console.log('')
console.log('1. Go to your Supabase dashboard')
console.log('2. Navigate to SQL Editor')
console.log('3. Run the following SQL query:')
console.log('')
console.log('--- SQL QUERY START ---')
console.log(`
CREATE TABLE IF NOT EXISTS public.email_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT,
  metadata JSONB,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on email_notifications table
ALTER TABLE public.email_notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for email_notifications
CREATE POLICY "Admins can view all email notifications" ON public.email_notifications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create trigger for updating timestamps (assuming this function exists)
-- If the function doesn't exist, you can create it with:
-- CREATE OR REPLACE FUNCTION update_updated_at_column()
-- RETURNS TRIGGER AS $$
-- BEGIN
--     NEW.updated_at = NOW();
--     RETURN NEW;
-- END;
-- $$ language 'plpgsql';

-- CREATE TRIGGER update_email_notifications_updated_at 
--   BEFORE UPDATE ON public.email_notifications
--   FOR EACH ROW 
--   EXECUTE FUNCTION update_updated_at_column();
`)
console.log('--- SQL QUERY END ---')
console.log('')
console.log('4. After running the query, the email_notifications table will be created')
console.log('5. You can now use the email functionality in your application')