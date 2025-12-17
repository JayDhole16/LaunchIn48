-- URGENT FIX for 504 Gateway Timeout during registration
-- This script temporarily disables the problematic trigger and implements a safer approach

-- STEP 1: Disable the problematic trigger immediately
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- STEP 2: Create a simpler, more reliable user creation function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Simple insert without complex logic to prevent timeouts
  INSERT INTO public.users (id, email, full_name, phone, company_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'phone'),
    COALESCE(NEW.raw_user_meta_data ->> 'company_name'),
    'customer'
  )
  ON CONFLICT (id) DO NOTHING; -- Simple conflict resolution
  
  RETURN NEW;
END;
$$;

-- STEP 3: Recreate the trigger with the simplified function
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- STEP 4: Ensure the users table exists and is properly configured
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT DEFAULT '',
  phone TEXT,
  company_name TEXT,
  role TEXT DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- STEP 5: Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- STEP 6: Create essential RLS policies (simplified)
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;

CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON public.users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- STEP 7: Grant permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.users TO postgres, anon, authenticated, service_role;

-- STEP 8: Add performance indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- STEP 9: Remove any problematic constraints that might cause delays
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS unique_user_email;

COMMENT ON FUNCTION public.handle_new_user() IS 'Simplified user creation function to prevent 504 timeouts';

