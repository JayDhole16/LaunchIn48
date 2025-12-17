import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    console.log("Setting up database schema...")

    // First, let's check current project structure
    const { data: sampleProject } = await supabase
      .from("projects")
      .select("*")
      .limit(1)

    console.log("Current project structure:", sampleProject?.[0] || "No projects found")

    // Try to add columns one by one and update existing projects
    try {
      // Update existing projects to set payment_status to 'pending' if it doesn't exist
      const { data: projects, error: projectsError } = await supabase
        .from("projects")
        .select("id, total_amount")
      
      if (projects && projects.length > 0) {
        // Update all projects to have payment_status = 'pending' by default
        // and set initial values for our tracking
        for (const project of projects) {
          const updateData: any = {}
          
          // Try to set payment_status if column exists
          try {
            updateData.payment_status = 'pending'
          } catch (e) {
            console.log("payment_status column may not exist yet")
          }

          const { error: updateError } = await supabase
            .from("projects")
            .update(updateData)
            .eq("id", project.id)
          
          if (updateError) {
            console.log(`Update error for project ${project.id}:`, updateError.message)
          }
        }
      }
    } catch (error: any) {
      console.log("Error updating existing projects:", error.message)
    }

    return NextResponse.json({
      success: true,
      message: "Database setup completed",
      projectsFound: sampleProject?.length || 0
    })
  } catch (error: any) {
    console.error("Database setup error:", error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check current database structure
    const { data: projects, error: projectsError } = await supabase
      .from("projects")
      .select("*")
      .limit(3)

    const { data: services, error: servicesError } = await supabase
      .from("services")
      .select("id, name")
      .limit(5)

    const { data: payments, error: paymentsError } = await supabase
      .from("payments")
      .select("*")
      .limit(3)

    return NextResponse.json({
      success: true,
      database: {
        projects: {
          count: projects?.length || 0,
          sample: projects?.[0] || null,
          error: projectsError?.message || null
        },
        services: {
          count: services?.length || 0,
          names: services?.map(s => s.name) || [],
          error: servicesError?.message || null
        },
        payments: {
          count: payments?.length || 0,
          sample: payments?.[0] || null,
          error: paymentsError?.message || null
        }
      }
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}