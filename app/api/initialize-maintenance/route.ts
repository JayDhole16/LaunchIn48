import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { initializeProjectMaintenance } from "@/lib/maintenance-business"

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    console.log('🔧 Initializing maintenance for user:', user.id)
    
    // Get all completed projects for this user that don't have maintenance records
    const { data: completedProjects, error: projectsError } = await supabase
      .from('projects')
      .select(`
        id, 
        title,
        status,
        completed_date,
        created_at
      `)
      .eq('user_id', user.id)
      .eq('status', 'completed')
    
    if (projectsError) {
      console.error('❌ Failed to fetch completed projects:', projectsError)
      return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
    }
    
    if (!completedProjects || completedProjects.length === 0) {
      return NextResponse.json({ 
        message: 'No completed projects found',
        initialized_count: 0 
      })
    }
    
    console.log(`📋 Found ${completedProjects.length} completed projects`)
    
    // Check which projects already have maintenance records
    const projectIds = completedProjects.map(p => p.id)
    const { data: existingMaintenance } = await supabase
      .from('project_maintenance')
      .select('project_id')
      .in('project_id', projectIds)
    
    const existingProjectIds = new Set(existingMaintenance?.map(m => m.project_id) || [])
    const projectsNeedingMaintenance = completedProjects.filter(p => !existingProjectIds.has(p.id))
    
    console.log(`🔧 ${projectsNeedingMaintenance.length} projects need maintenance initialization`)
    
    const results = []
    let successCount = 0
    let errorCount = 0
    
    // Initialize maintenance for each project
    for (const project of projectsNeedingMaintenance) {
      try {
        const completionDate = project.completed_date || project.created_at
        const maintenanceRecord = await initializeProjectMaintenance(
          project.id,
          user.id,
          completionDate
        )
        
        results.push({
          project_id: project.id,
          project_title: project.title,
          status: 'success',
          maintenance_id: maintenanceRecord.id,
          free_end_date: maintenanceRecord.free_end_date,
          total_days_remaining: maintenanceRecord.total_days_remaining
        })
        
        successCount++
        console.log(`✅ Initialized maintenance for project: ${project.title}`)
        
      } catch (error) {
        console.error(`❌ Failed to initialize maintenance for project ${project.id}:`, error)
        results.push({
          project_id: project.id,
          project_title: project.title,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        errorCount++
      }
    }
    
    console.log(`✅ Maintenance initialization complete: ${successCount} success, ${errorCount} errors`)
    
    return NextResponse.json({
      success: true,
      message: `Initialized maintenance for ${successCount} projects`,
      initialized_count: successCount,
      error_count: errorCount,
      results: results
    })
    
  } catch (error) {
    console.error('❌ Error initializing maintenance:', error)
    return NextResponse.json(
      { error: 'Failed to initialize maintenance records' },
      { status: 500 }
    )
  }
}