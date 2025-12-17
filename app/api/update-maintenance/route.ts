import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { projectId, planName, planId, durationMonths, amount } = await request.json()
    
    // Verify user authentication
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    // Verify project belongs to user
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, title")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single()
    
    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }
    
    console.log('🔧 API: Updating maintenance state for project:', project.title)
    
    // Calculate maintenance extension
    const now = new Date()
    const endDate = new Date(now)
    endDate.setMonth(endDate.getMonth() + durationMonths)
    
    const maintenanceState = {
      projectId,
      status: 'active' as const,
      start_date: now.toISOString(),
      end_date: endDate.toISOString(),
      next_payment_due: endDate.toISOString(),
      maintenance_amount: amount,
      base_amount: amount,
      plan_name: planName,
      plan_id: planId,
      created_at: now.toISOString(),
      updated_at: now.toISOString()
    }
    
    console.log('✅ API: Maintenance extended until:', endDate.toISOString())
    
    return NextResponse.json({
      success: true,
      maintenanceState,
      message: `Maintenance extended for ${durationMonths} month(s)`
    })
    
  } catch (error) {
    console.error('❌ Error updating maintenance state:', error)
    return NextResponse.json(
      { error: "Failed to update maintenance state" },
      { status: 500 }
    )
  }
}