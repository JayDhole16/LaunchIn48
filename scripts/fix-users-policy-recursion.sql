-- Fix infinite recursion in users table RLS policy
-- The issue: Policy checks users table, which triggers the same policy check, causing infinite loop

-- Step 1: Drop the problematic policy
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;

-- Step 2: Create a SECURITY DEFINER function that bypasses RLS to check admin role
-- This function can read from users table without triggering RLS policies
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- This allows the function to bypass RLS
SET search_path = public
AS $$
BEGIN
  -- Check if user has admin role directly from auth.users metadata or users table
  -- Using SECURITY DEFINER allows this to bypass RLS
  RETURN EXISTS (
    SELECT 1 
    FROM public.users 
    WHERE id = user_id AND role = 'admin'
  );
END;
$$;

-- Step 3: Recreate the admin policy using the function (avoids recursion)
CREATE POLICY "Admins can view all users" ON public.users
  FOR SELECT USING (
    auth.uid() = id -- Users can always see themselves
    OR 
    public.is_admin(auth.uid()) -- Admins can see everyone (checked via function to avoid recursion)
  );

-- Step 4: Also fix admin update policy if it exists
DROP POLICY IF EXISTS "Admins can update all users" ON public.users;

CREATE POLICY "Admins can update all users" ON public.users
  FOR UPDATE USING (
    auth.uid() = id -- Users can update themselves
    OR 
    public.is_admin(auth.uid()) -- Admins can update everyone
  );

-- Step 5: Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated, anon;


