import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/require-admin"
import { createServiceClient } from "@/lib/supabase/service"

export async function GET() {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) {
      return NextResponse.json({ error: auth.reason }, { status: auth.status })
    }

    const supabase = createServiceClient()

    // Fetch all users ordered by creation date
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, email, full_name, phone, company_name, role, created_at")
      .order("created_at", { ascending: false })

    if (usersError) {
      return NextResponse.json({ error: usersError.message }, { status: 500 })
    }

    // Compute per-user stats (projects + payments + maintenance)
    const results = [] as any[]

    for (const user of users || []) {
      // Projects for this user
      const { data: projects } = await supabase
        .from("projects")
        .select("id, total_amount")
        .eq("user_id", user.id)

      const project_total_amount = projects?.reduce((sum: number, p: any) => sum + (p.total_amount || 0), 0) || 0

      let project_paid_amount = 0
      if (projects && projects.length > 0) {
        const projectIds = projects.map((p: any) => p.id)
        const { data: projPayments } = await supabase
          .from("payments")
          .select("amount, status, project_id")
          .in("project_id", projectIds)
          .eq("status", "completed")

        project_paid_amount = projPayments?.reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0
      }

      const project_remaining_amount = Math.max(0, project_total_amount - project_paid_amount)

      // Maintenance paid (from payments)
      let maintenance_paid_amount = 0
      if (projects && projects.length > 0) {
        const projectIds = projects.map((p: any) => p.id)
        const { data: maintenancePayments } = await supabase
          .from("payments")
          .select("amount, status, payment_method, user_id, project_id")
          .in("project_id", projectIds)
          .eq("user_id", user.id)
          .or("payment_method.like.%maintenance%,payment_method.eq.maintenance")
          .eq("status", "completed")

        maintenance_paid_amount = maintenancePayments?.reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0
      }

      // Maintenance due (from maintenance_charges)
      let maintenance_due_amount = 0
      try {
        const { data: maintenanceCharges } = await supabase
          .from("maintenance_charges")
          .select("amount, status")
          .eq("user_id", user.id)
          .eq("status", "pending")

        maintenance_due_amount = maintenanceCharges?.reduce((sum: number, c: any) => sum + (c.amount || 0), 0) || 0
      } catch {
        // table might not exist; ignore
      }

      const project_count = projects?.length || 0
      const total_paid_amount = project_paid_amount + maintenance_paid_amount
      const total_remaining_amount = project_remaining_amount + maintenance_due_amount
      const total_spent = total_paid_amount + total_remaining_amount

      results.push({
        ...user,
        project_count,
        total_spent,
        project_paid_amount,
        project_remaining_amount,
        maintenance_paid_amount,
        maintenance_due_amount,
        total_paid_amount,
        total_remaining_amount,
      })
    }

    return NextResponse.json({ users: results })
  } catch (e: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
