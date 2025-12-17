import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('projectId')
    
    const supabase = createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    if (projectId) {
      // Get maintenance data for specific project
      const { data: maintenanceData, error: maintenanceError } = await supabase
        .from('project_maintenance')
        .select(`
          *,
          maintenance_plans(*),
          projects!inner(
            id,
            title,
            user_id,
            status,
            total_amount
          ),
          maintenance_payments(*)
        `)
        .eq('project_id', projectId)
        .eq('projects.user_id', user.id)
        .single()

      if (maintenanceError) {
        return NextResponse.json({ maintenanceData: null })
      }

      return NextResponse.json({ maintenanceData })
    } else {
      // Get all maintenance data for user
      const { data: maintenanceList, error: listError } = await supabase
        .from('project_maintenance')
        .select(`
          *,
          maintenance_plans(*),
          projects!inner(
            id,
            title,
            user_id,
            status,
            total_amount
          ),
          maintenance_payments(*)
        `)
        .eq('projects.user_id', user.id)
        .order('next_payment_due', { ascending: true })

      if (listError) {
        return NextResponse.json(
          { error: "Failed to fetch maintenance data" },
          { status: 500 }
        )
      }

      return NextResponse.json({ maintenanceList })
    }
  } catch (error: any) {
    console.error("Error fetching maintenance data:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const { projectId, maintenancePlanId } = await req.json()

    if (!projectId || !maintenancePlanId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const supabase = createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Verify project belongs to user and is completed
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single()

    if (projectError || !projectData) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      )
    }

    if (projectData.status !== 'completed') {
      return NextResponse.json(
        { error: "Project must be completed before setting up maintenance" },
        { status: 400 }
      )
    }

    // Check if maintenance already exists for this project
    const { data: existingMaintenance } = await supabase
      .from('project_maintenance')
      .select('id')
      .eq('project_id', projectId)
      .single()

    if (existingMaintenance) {
      return NextResponse.json(
        { error: "Maintenance already set up for this project" },
        { status: 400 }
      )
    }

    // Create maintenance record using database function
    const { data: maintenanceId, error: createError } = await supabase
      .rpc('create_project_maintenance', {
        p_project_id: projectId,
        p_maintenance_plan_id: maintenancePlanId,
        p_base_amount: projectData.total_amount
      })

    if (createError || !maintenanceId) {
      return NextResponse.json(
        { error: "Failed to create maintenance record" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      maintenanceId: maintenanceId,
      message: "Maintenance setup completed successfully"
    })

  } catch (error: any) {
    console.error("Error setting up maintenance:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}