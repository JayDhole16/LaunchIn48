import { NextResponse, type NextRequest } from "next/server"
import { requireAdmin } from "@/lib/auth/require-admin"
import { createServiceClient } from "@/lib/supabase/service"

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) {
      return NextResponse.json({ error: auth.reason }, { status: auth.status })
    }

    const supabase = createServiceClient()

    const debug = new URL(req.url).searchParams.get('debug') === '1'

    let { data: payments, error } = await supabase
      .from("payments")
      .select(`
        id,
        project_id,
        user_id,
        amount,
        status,
        payment_method,
        created_at,
        razorpay_payment_id,
        projects (
          id,
          title,
          total_amount,
          paid_amount,
          remaining_amount,
          payment_status,
          users (
            full_name,
            email,
            phone
          )
        )
      `)
      .order("created_at", { ascending: false })

    if (error) {
      // Fallback to simpler selection to avoid embed errors
      const fb = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false })
      if (fb.error) {
        return NextResponse.json({ error: error.message, fallback_error: fb.error.message }, { status: 500 })
      }
      payments = fb.data as any
    }

    // Enrich with user summaries
    const userIds = Array.from(new Set((payments || []).map((p: any) => p.user_id).filter(Boolean)))
    let usersById: Record<string, any> = {}
    if (userIds.length > 0) {
      const { data: usersData } = await supabase
        .from('users')
        .select('id, full_name, email, phone')
        .in('id', userIds)
      usersById = Object.fromEntries((usersData || []).map((u: any) => [u.id, u]))
    }

    const paymentsWithUser = (payments || []).map((p: any) => ({
      ...p,
      user_summary: usersById[p.user_id] || null,
    }))

    if (debug) {
      return NextResponse.json({ count: paymentsWithUser.length, sample: paymentsWithUser[0] || null })
    }

    return NextResponse.json({ payments: paymentsWithUser })
  } catch (e: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
