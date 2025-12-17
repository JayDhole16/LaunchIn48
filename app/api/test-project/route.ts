import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    console.log("=== TEST PROJECT API ===")
    
    const { projectId } = await request.json()
    
    console.log("Project ID:", projectId)
    
    const supabase = await createClient()
    
    // Get the authenticated user
    console.log("Getting user...")
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error("Auth error:", authError)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("User authenticated:", user.id)

    // Verify the project belongs to the user
    console.log("Verifying project...")
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single()

    if (projectError || !project) {
      console.error("Project error:", projectError)
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    console.log("Project found:", project)
    
    return NextResponse.json({ success: true, project })
  } catch (error: any) {
    console.error("=== UNEXPECTED ERROR IN TEST PROJECT API ===")
    console.error("Error:", error)
    console.error("Error message:", error.message)
    return NextResponse.json({ 
      error: "Internal server error",
      details: error.message 
    }, { status: 500 })
  }
}