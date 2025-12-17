-- Add must_change_password column to users table
-- This column tracks if a user needs to change their password on first login

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT true;

-- Set default to true for existing users (they'll need to change on next login)
UPDATE public.users
SET must_change_password = true
WHERE must_change_password IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.users.must_change_password IS 'Set to true when user is manually created. User must change password on first login.';


