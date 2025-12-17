-- Fix RLS policies to prevent infinite recursion
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can view all projects" ON public.projects;
DROP POLICY IF EXISTS "Admins can view all payments" ON public.payments;

-- Create a function to check if user is admin (avoids recursion)
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users au
    JOIN public.users pu ON au.id = pu.id
    WHERE au.id = user_id AND pu.role = 'admin'
  );
END;
$$;

-- Recreate admin policies using the function
CREATE POLICY "Admins can view all users" ON public.users
  FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update all users" ON public.users
  FOR UPDATE USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can view all projects" ON public.projects
  FOR ALL USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can view all payments" ON public.payments
  FOR ALL USING (public.is_admin(auth.uid()));

-- Add policies for payments table that were missing
CREATE POLICY "Users can create own payments" ON public.payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own payments" ON public.payments
  FOR UPDATE USING (auth.uid() = user_id);

-- Create email notifications table
CREATE TABLE IF NOT EXISTS public.email_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('payment_confirmation', 'admin_notification', 'welcome', 'project_update')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on email_notifications table
ALTER TABLE public.email_notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for email_notifications
CREATE POLICY "Admins can view all email notifications" ON public.email_notifications
  FOR ALL USING (public.is_admin(auth.uid()));
