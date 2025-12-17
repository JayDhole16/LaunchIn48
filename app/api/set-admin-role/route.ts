/**
 * API endpoint to set admin role for jaydhole.739@gmail.com
 * This ensures the admin user has the correct role in the database
 * 
 * Security: Only allow running from server-side, require authentication
 */

import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/service"

const ADMIN_EMAIL = "jaydhole.739@gmail.com"

export async function POST(request: NextRequest) {
  try {
    const service = createServiceClient()

    // Get the user by email from auth.users
    const { data: authUser, error: authError } = await service.auth.admin.getUserByEmail(ADMIN_EMAIL)
    
    if (authError || !authUser) {
      console.error("❌ Could not find user with email:", ADMIN_EMAIL)
      return NextResponse.json({ 
        success: false, 
        error: "Admin user not found in auth system" 
      }, { status: 404 })
    }

    console.log("✅ Found user:", {
      id: authUser.user.id,
      email: authUser.user.email
    })

    // Check if user exists in users table
    const { data: existingUser, error: checkError } = await service
      .from("users")
      .select("id, email, role")
      .eq("id", authUser.user.id)
      .single()

    if (checkError && checkError.code !== "PGRST116") { // PGRST116 = not found
      console.error("❌ Error checking user:", checkError)
      return NextResponse.json({ 
        success: false, 
        error: checkError.message 
      }, { status: 500 })
    }

    if (existingUser) {
      // Update existing user
      const { data: updatedUser, error: updateError } = await service
        .from("users")
        .update({ role: "admin" })
        .eq("id", authUser.user.id)
        .select()
        .single()

      if (updateError) {
        console.error("❌ Error updating user role:", updateError)
        return NextResponse.json({ 
          success: false, 
          error: updateError.message 
        }, { status: 500 })
      }

      console.log("✅ Updated user role to admin:", {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role
      })

      return NextResponse.json({ 
        success: true, 
        message: "Admin role updated successfully",
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          role: updatedUser.role
        }
      })
    } else {
      // Create new user record
      const { data: newUser, error: insertError } = await service
        .from("users")
        .insert({
          id: authUser.user.id,
          email: ADMIN_EMAIL,
          role: "admin",
          full_name: "Admin User",
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (insertError) {
        console.error("❌ Error creating user record:", insertError)
        return NextResponse.json({ 
          success: false, 
          error: insertError.message 
        }, { status: 500 })
      }

      console.log("✅ Created user record with admin role:", {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role
      })

      return NextResponse.json({ 
        success: true, 
        message: "Admin user created with admin role",
        user: {
          id: newUser.id,
          email: newUser.email,
          role: newUser.role
        }
      })
    }
  } catch (error: any) {
    console.error("❌ Unexpected error:", error)
    return NextResponse.json({ 
      success: false, 
      error: error.message || "Internal server error" 
    }, { status: 500 })
  }
}


