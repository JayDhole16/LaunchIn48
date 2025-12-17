import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/auth/require-admin"
import { createServiceClient } from "@/lib/supabase/service"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const isAdmin = searchParams.get('isAdmin') === 'true'

    if (isAdmin) {
      // Verify admin and use service role to bypass RLS
      const auth = await requireAdmin()
      if (!auth.ok) {
        return NextResponse.json({ error: auth.reason }, { status: auth.status })
      }
      const svc = createServiceClient()

      // Use project_maintenance table instead of maintenance_charges
      let { data: maintenanceCharges, error } = await svc
        .from('project_maintenance')
        .select(`
          *,
          projects (
            title,
            users (
              full_name,
              email,
              phone
            )
          )
        `)
        .order('next_payment_due', { ascending: true })

      if (error) {
        // If table doesn't exist yet, return empty list instead of 500
        // 42P01 = undefined table
        // Otherwise fallback to plain select
        if ((error as any).code === '42P01') {
          return NextResponse.json({ maintenanceCharges: [] })
        }
        const fb = await svc.from('project_maintenance').select('*').order('next_payment_due', { ascending: true })
        if (fb.error) {
          return NextResponse.json({ error: (error as any).message, fallback_error: fb.error.message }, { status: 500 })
        }
        maintenanceCharges = fb.data as any
      }

      // Transform the data to match the expected format
      const transformedData = (maintenanceCharges || []).map((item: any) => ({
        ...item,
        amount: item.maintenance_amount,
        due_date: item.next_payment_due,
        created_at: item.created_at
      }))

      return NextResponse.json({ maintenanceCharges: transformedData })
    } else if (userId) {
      // User view - get their maintenance charges (anon client, RLS enforced)
      const { data: maintenanceCharges, error } = await supabase
        .from('project_maintenance')
        .select(`
          *,
          projects (
            title
          )
        `)
        .eq('projects.user_id', userId) // Changed to use projects.user_id for proper relationship
        .order('next_payment_due', { ascending: true })

      if (error) {
        // If table doesn't exist yet, return empty list instead of 500
        // 42P01 = undefined table
        if ((error as any).code === '42P01') {
          return NextResponse.json({ maintenanceCharges: [] })
        }
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      // Transform the data to match the expected format
      const transformedData = (maintenanceCharges || []).map((item: any) => ({
        ...item,
        amount: item.maintenance_amount,
        due_date: item.next_payment_due,
        created_at: item.created_at
      }))

      return NextResponse.json({ maintenanceCharges: transformedData })
    } else {
      return NextResponse.json({ error: "User ID required" }, { status: 400 })
    }
  } catch (error: any) {
    console.error("Error fetching maintenance charges:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // This endpoint is used by cron job or admin to create maintenance records
    // when projects are completed for 3 months
    
    // Get all completed projects that are 3 months old and don't have maintenance records yet
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
    
    const { data: eligibleProjects, error: projectsError } = await supabase
      .from('projects')
      .select(`
        id,
        title,
        user_id,
        total_amount,
        completed_at,
        users (
          full_name,
          email
        )
      `)
      .eq('status', 'completed')
      .lt('completed_at', threeMonthsAgo.toISOString())
      .is('maintenance_charge_created', null)

    if (projectsError) {
      return NextResponse.json({ error: projectsError.message }, { status: 500 })
    }

    const maintenanceRecords = []

    for (const project of eligibleProjects || []) {
      // Calculate maintenance amount (10% of project amount, minimum ₹500)
      const maintenanceAmount = Math.max(500, Math.round(project.total_amount * 0.1))
      
      // Get user info (users is an array, get the first item)
      const user = project.users && project.users.length > 0 ? project.users[0] : null
      
      // Skip if no user info
      if (!user) continue
      
      // Create maintenance record in project_maintenance table
      const { data: maintenanceRecord, error: recordError } = await supabase
        .from('project_maintenance')
        .insert({
          project_id: project.id,
          user_id: project.user_id,
          // Use a default maintenance plan (you may want to make this configurable)
          maintenance_plan_id: 'default', // This should be a valid UUID from maintenance_plans table
          start_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 90 days from now
          end_date: new Date(Date.now() + (90 + 365) * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 90 + 365 days from now
          next_payment_due: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 90 days from now
          status: 'active',
          base_amount: project.total_amount,
          maintenance_amount: maintenanceAmount,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (!recordError) {
        maintenanceRecords.push(maintenanceRecord)
        
        // Mark project as having maintenance record created
        await supabase
          .from('projects')
          .update({ maintenance_charge_created: true })
          .eq('id', project.id)

        // Send notification email
        try {
          await fetch(`${request.nextUrl.origin}/api/send-email`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              recipientEmail: user.email,
              subject: "🔧 Maintenance Service Due - LaunchIn 48",
              body: `Dear ${user.full_name || 'Valued Customer'},

🎉 Your project "${project.title}" has been successfully running for 3 months!

🔧 MAINTENANCE SERVICE NOTICE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
To ensure your project continues running smoothly, we recommend our maintenance service.

💰 Maintenance Details:
• Project: ${project.title}
• Maintenance Fee: ₹${maintenanceAmount.toLocaleString()}
• Includes: Security updates, bug fixes, performance optimization
• Duration: Next 12 months

🚀 Benefits of Maintenance:
✅ Regular security updates
✅ Bug fixes and improvements  
✅ Performance monitoring
✅ Priority support
✅ Peace of mind

💳 Easy Payment:
Log into your dashboard to pay the maintenance fee securely.

⏰ Due Date: Immediate
📞 Questions? Reply to this email or contact our support team.

Thank you for choosing LaunchIn 48!

Best regards,
🛠️ LaunchIn 48 Support Team`,
              type: "maintenance_notification",
              metadata: {
                project_id: project.id,
                maintenance_amount: maintenanceAmount,
                user_id: project.user_id
              }
            })
          })
        } catch (emailError) {
          console.error("Error sending maintenance email:", emailError)
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Created ${maintenanceRecords.length} maintenance records`,
      charges: maintenanceRecords
    })
  } catch (error: any) {
    console.error("Error creating maintenance records:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}