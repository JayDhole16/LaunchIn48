# Password Change on First Login - Setup Complete

## Overview
The system now requires users to change their password on their first login after you manually create their account in Supabase.

## What Was Implemented

### 1. Database Schema Update
- **File**: `scripts/add_must_change_password_column.sql`
- Added `must_change_password` boolean column to the `users` table
- Defaults to `true` for all users (including existing ones)

### 2. Change Password Page
- **File**: `app/auth/change-password/page.tsx`
- Simple form with:
  - New Password field
  - Confirm Password field
  - Password visibility toggles
  - Validation (minimum 6 characters, passwords must match)
- Automatically redirects if user doesn't need to change password

### 3. Login Flow Updated
- **File**: `app/auth/login/page.tsx`
- After successful login, checks if user needs to change password
- Redirects to change password page if `must_change_password` is true
- Otherwise redirects to dashboard/admin as normal

### 4. Middleware Protection
- **File**: `lib/supabase/middleware.ts`
- Added check to redirect users who need to change password
- Prevents access to any page until password is changed
- Excludes auth pages from this check

### 5. Auth Callback Updated
- **File**: `app/auth/callback/page.tsx`
- Also checks for password change requirement on OAuth callbacks

## Setup Instructions

### Step 1: Run the SQL Migration
Run this SQL script in your Supabase SQL Editor:

```sql
-- File: scripts/add_must_change_password_column.sql
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT true;

UPDATE public.users
SET must_change_password = true
WHERE must_change_password IS NULL;
```

### Step 2: When Creating Users Manually
When you manually create a user in Supabase Auth:

1. Create the user in `auth.users` table with a temporary password
2. Make sure the corresponding record in `public.users` table has:
   - `must_change_password = true` (this is the default)
   - All other user details (full_name, email, phone, etc.)

The user will be forced to change their password on first login.

### Step 3: Testing
1. Create a test user manually in Supabase
2. Try to log in with the temporary password
3. You should be redirected to `/auth/change-password`
4. After changing password, you should be redirected to dashboard
5. Try logging out and back in - you should go directly to dashboard

## How It Works

1. **User Registration**: User fills out the form at `/auth/sign-up` → Email sent to admin
2. **Admin Creates User**: You manually create the user in Supabase with `must_change_password = true`
3. **First Login**: User logs in → System detects `must_change_password = true` → Redirects to change password page
4. **Password Change**: User enters new password → System updates password and sets `must_change_password = false`
5. **Normal Access**: User is redirected to dashboard and can access all pages normally

## Notes

- The password change page cannot be bypassed - middleware checks all routes
- Users who don't need to change password won't see this page
- Existing users will have `must_change_password = true` set by default, so they'll need to change on next login
- If you want to exempt existing users, run: `UPDATE public.users SET must_change_password = false WHERE created_at < NOW() - INTERVAL '1 day';`


