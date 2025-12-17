import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get all projects for this user
    const { data: projects, error: projectsError } = await supabase
      .from("projects")
      .select(`
        id,
        title,
        total_amount,
        paid_amount,
        remaining_amount,
        payment_status,
        status,
        created_at,
        payments (
          id,
          amount,
          status,
          razorpay_payment_id,
          created_at
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (projectsError) {
      return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 })
    }

    // Get all payments for this user
    const { data: payments, error: paymentsError } = await supabase
      .from("payments")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (paymentsError) {
      return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 })
    }

    return NextResponse.json({
      user_id: user.id,
      user_email: user.email,
      projects: projects,
      payments: payments,
      summary: {
        total_projects: projects?.length || 0,
        projects_with_payments: projects?.filter(p => p.paid_amount > 0).length || 0,
        total_payments: payments?.length || 0,
        completed_payments: payments?.filter(p => p.status === 'completed').length || 0,
        pending_payments: payments?.filter(p => p.status === 'pending').length || 0,
      }
    })
  } catch (error: any) {
    console.error("Error in debug projects:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}