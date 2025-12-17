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

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      )
    }

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long" },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // Check if user already exists in public.users table
    const { data: existingProfile } = await supabase
      .from("users")
      .select("id, email")
      .eq("email", email)
      .single()

    if (existingProfile) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 }
      )
    }

    // Create user in auth.users
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email so they can log in immediately
      user_metadata: {
        full_name: fullName || '',
        phone: phone || '',
        company_name: companyName || '',
      },
    })

    if (authError) {
      console.error("Error creating auth user:", authError)
      
      // Check if error is due to user already existing
      if (authError.message.includes("already") || authError.message.includes("exists") || authError.message.includes("409")) {
        return NextResponse.json(
          { error: "User with this email already exists" },
          { status: 409 }
        )
      }
      
      return NextResponse.json(
        { error: `Failed to create user: ${authError.message}` },
        { status: 500 }
      )
    }

    if (!authUser.user) {
      return NextResponse.json(
        { error: "Failed to create user - no user returned" },
        { status: 500 }
      )
    }

    // The trigger may have already created the user profile, so we'll upsert (update or insert)
    // First, wait a moment for the trigger to execute
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Upsert user profile in public.users (handle both new and existing from trigger)
    const { data: userProfile, error: profileError } = await supabase
      .from("users")
      .upsert({
        id: authUser.user.id,
        email: authUser.user.email!,
        full_name: fullName || '',
        phone: phone || '',
        company_name: companyName || '',
        role: 'customer',
        must_change_password: true, // Force password change on first login
      }, {
        onConflict: 'id'
      })
      .select()
      .single()

    if (profileError) {
      console.error("Error upserting user profile:", profileError)
      // Try to delete the auth user if profile creation fails
      try {
        await supabase.auth.admin.deleteUser(authUser.user.id)
      } catch (deleteError) {
        console.error("Failed to clean up auth user:", deleteError)
      }
      return NextResponse.json(
        { error: `Failed to create user profile: ${profileError.message}` },
        { status: 500 }
      )
    }

    // Ensure must_change_password is set to true (in case trigger created it with default)
    if (!userProfile.must_change_password) {
      const { data: updatedProfile } = await supabase
        .from("users")
        .update({ must_change_password: true })
        .eq("id", authUser.user.id)
        .select()
        .single()
      
      if (updatedProfile) {
        Object.assign(userProfile, updatedProfile)
      }
    }

    return NextResponse.json({
      success: true,
      message: "User created successfully. They will need to change their password on first login.",
      user: {
        id: userProfile.id,
        email: userProfile.email,
        full_name: userProfile.full_name,
        phone: userProfile.phone || '',
        company_name: userProfile.company_name || '',
        must_change_password: userProfile.must_change_password ?? true,
        temporary_password: password, // Include so admin can share it
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

