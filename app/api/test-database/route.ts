import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Test if we can query the projects table and see what columns exist
    const { data: projects, error } = await supabase
      .from("projects")
      .select("*")
      .limit(1)

    console.log("Projects table structure test:")
    console.log("Data:", projects)
    console.log("Error:", error)

    // Test if services table exists and has data
    const { data: services, error: servicesError } = await supabase
      .from("services")
      .select("*")

    console.log("Services table test:")
    console.log("Services count:", services?.length || 0)
    if (services?.length) {
      console.log("Sample service:", services[0])
      console.log("All service names:", services.map(s => s.name))
    }
    console.log("Services error:", servicesError)

    // Test creating a basic project
    const testProject = {
      user_id: "test-user-id",
      title: "Test Project",
      description: "Test Description",
      total_amount: 1000,
      status: "pending"
    }

    console.log("Testing project creation with basic fields...")
    const { data: createTest, error: createError } = await supabase
      .from("projects")
      .insert(testProject)
      .select()
      .single()

    if (createError) {
      console.log("Create test error:", createError)
    } else {
      console.log("Create test success:", createTest)
      // Clean up test project
      await supabase.from("projects").delete().eq("id", createTest.id)
    }

    return NextResponse.json({
      success: true,
      projects: projects,
      projectsError: error?.message,
      services: services?.map(s => ({ id: s.id, name: s.name })),
      servicesError: servicesError?.message,
      createTestError: createError?.message
    })
  } catch (error: any) {
    console.error("Database test error:", error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}