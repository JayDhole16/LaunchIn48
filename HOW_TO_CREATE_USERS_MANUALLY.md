# How to Create Users Manually in Supabase

This guide shows you how to manually create users in Supabase with a password for first-time login.

## Method 1: Using Supabase Dashboard (Recommended for Beginners)

### Step 1: Go to Authentication
1. Open your Supabase Dashboard
2. Navigate to **Authentication** → **Users** (in the left sidebar)

### Step 2: Create New User
1. Click the **"Add user"** or **"Create new user"** button
2. Fill in the form:
   - **Email**: User's email address (required)
   - **Password**: Set a temporary password (user will change this on first login)
   - **Email Confirmed**: ✅ Check this box (important!)
   - **Phone**: Optional
   - **User Metadata**: You can add additional data here if needed
3. Click **"Create user"**

### Step 3: Create User Profile Record
After creating the user in Auth, you need to create the corresponding record in the `public.users` table:

1. Go to **Table Editor** → **users**
2. Click **"Insert row"** or use the SQL Editor with:

```sql
INSERT INTO public.users (
  id,
  email,
  full_name,
  phone,
  company_name,
  role,
  must_change_password
)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', ''),
  COALESCE(raw_user_meta_data->>'phone', ''),
  COALESCE(raw_user_meta_data->>'company_name', ''),
  'customer',
  true  -- Important: Force password change on first login
FROM auth.users
WHERE email = 'user@example.com'  -- Replace with actual email
ON CONFLICT (id) DO NOTHING;
```

## Method 2: Using SQL Directly (Faster for Bulk Operations)

### Complete SQL Script

Run this in Supabase SQL Editor:

```sql
-- Replace these variables with actual user data
DO $$
DECLARE
  user_email TEXT := 'user@example.com';  -- Change this
  user_password TEXT := 'TempPassword123!';  -- Change this - temporary password
  user_full_name TEXT := 'John Doe';  -- Change this
  user_phone TEXT := '+1234567890';  -- Change this (optional)
  user_company TEXT := 'Company Name';  -- Change this (optional)
  new_user_id UUID;
BEGIN
  -- Create user in auth.users using Supabase Admin API
  -- Note: You can't directly insert into auth.users via SQL
  -- You need to use the Supabase Admin API or Dashboard
  
  -- After user is created in auth.users (via Dashboard or Admin API),
  -- get their ID and create the profile:
  
  SELECT id INTO new_user_id
  FROM auth.users
  WHERE email = user_email;
  
  IF new_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found in auth.users. Create the user in Auth first!', user_email;
  END IF;
  
  -- Create/Update user profile
  INSERT INTO public.users (
    id,
    email,
    full_name,
    phone,
    company_name,
    role,
    must_change_password,
    created_at,
    updated_at
  )
  VALUES (
    new_user_id,
    user_email,
    user_full_name,
    user_phone,
    user_company,
    'customer',
    true,  -- Force password change
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    company_name = EXCLUDED.company_name,
    must_change_password = true,  -- Always reset to true for manual creates
    updated_at = NOW();
  
  RAISE NOTICE 'User profile created/updated for: %', user_email;
END $$;
```

## Method 3: Using Supabase Admin API (Programmatic - Recommended)

### Create an Admin API Route

Create a new API route: `app/api/admin/create-user/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/service"
import { requireAdmin } from "@/lib/auth/require-admin"

export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const auth = await requireAdmin()
    if (!auth.ok) {
      return NextResponse.json({ error: auth.reason }, { status: auth.status })
    }

    const body = await request.json()
    const { email, password, fullName, phone, companyName } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // Create user in auth.users
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: fullName || '',
        phone: phone || '',
        company_name: companyName || '',
      },
    })

    if (authError) {
      return NextResponse.json(
        { error: `Failed to create user: ${authError.message}` },
        { status: 500 }
      )
    }

    // Create user profile in public.users
    const { data: userProfile, error: profileError } = await supabase
      .from("users")
      .insert({
        id: authUser.user.id,
        email: authUser.user.email!,
        full_name: fullName || '',
        phone: phone || '',
        company_name: companyName || '',
        role: 'customer',
        must_change_password: true, // Force password change on first login
      })
      .select()
      .single()

    if (profileError) {
      // Try to delete the auth user if profile creation fails
      await supabase.auth.admin.deleteUser(authUser.user.id)
      return NextResponse.json(
        { error: `Failed to create user profile: ${profileError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "User created successfully",
      user: {
        id: userProfile.id,
        email: userProfile.email,
        full_name: userProfile.full_name,
        must_change_password: userProfile.must_change_password,
      },
    })
  } catch (error: any) {
    console.error("Error creating user:", error)
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    )
  }
}
```

### Use the API from Frontend

You can create an admin UI component or use it from your admin panel:

```typescript
const createUser = async () => {
  const response = await fetch('/api/admin/create-user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'user@example.com',
      password: 'TempPassword123!',
      fullName: 'John Doe',
      phone: '+1234567890',
      companyName: 'Company Name',
    }),
  })
  
  const data = await response.json()
  console.log(data)
}
```

## Quick Reference: Key Points

1. **Always set `must_change_password = true`** when manually creating users
2. **Auto-confirm email** - Set `email_confirm: true` or check "Email Confirmed" in dashboard
3. **Use temporary passwords** - Users will change it on first login
4. **Create both records** - User in `auth.users` AND profile in `public.users`
5. **Send credentials securely** - Email the temporary password or call the user

## Testing the Flow

1. Create a user with any of the methods above
2. Set `must_change_password = true`
3. User logs in with temporary password
4. User is redirected to `/auth/change-password`
5. User changes password
6. User is redirected to dashboard
7. `must_change_password` is automatically set to `false`

## Troubleshooting

**User can't log in:**
- Check if email is confirmed in `auth.users`
- Verify password was set correctly
- Check if user exists in both `auth.users` and `public.users`

**Password change page doesn't show:**
- Verify `must_change_password = true` in `public.users`
- Check browser console for errors
- Verify SQL migration was run

**User stuck on change password page:**
- Check if password update succeeded
- Verify `must_change_password` was set to `false` after password change


