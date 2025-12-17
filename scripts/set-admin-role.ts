/**
 * Script to set admin role for a user by email
 * Run this script to ensure the admin user has the correct role in the database
 * 
 * Usage:
 *   npx ts-node scripts/set-admin-role.ts
 * 
 * Or via API endpoint (safer):
 *   POST /api/set-admin-role
 */

import { createServiceClient } from "@/lib/supabase/service"

const ADMIN_EMAIL = "jaydhole.739@gmail.com"

async function setAdminRole() {
  const service = createServiceClient()

  try {
    // First, get the user by email from auth.users
    const { data: authUser, error: authError } = await service.auth.admin.getUserByEmail(ADMIN_EMAIL)
    
    if (authError || !authUser) {
      console.error("❌ Could not find user with email:", ADMIN_EMAIL)
      console.error("Error:", authError)
      return false
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
      return false
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
        return false
      }

      console.log("✅ Updated user role to admin:", {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role
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
        return false
      }

      console.log("✅ Created user record with admin role:", {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role
      })
    }

    return true
  } catch (error: any) {
    console.error("❌ Unexpected error:", error)
    return false
  }
}

// Run if executed directly
if (require.main === module) {
  setAdminRole()
    .then((success) => {
      if (success) {
        console.log("\n✅ Admin role set successfully!")
        process.exit(0)
      } else {
        console.log("\n❌ Failed to set admin role")
        process.exit(1)
      }
    })
    .catch((error) => {
      console.error("Fatal error:", error)
      process.exit(1)
    })
}

export { setAdminRole }


