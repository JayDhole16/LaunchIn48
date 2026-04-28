import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"

export async function GET(_req: NextRequest) {
  try {
    const auth = await createClient()
    const { data: { user } } = await auth.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const service = createServiceClient()
    // Allow optional ?status=all to return all payments; by default return only completed
    const url = new URL(_req.url)
    const statusFilter = url.searchParams.get('status') || 'completed'

    let query: any = service
      .from('payments')
      .select(`
        id,
        project_id,
        amount,
        currency,
        status,
        payment_method,
        razorpay_payment_id,
        razorpay_order_id,
        created_at,
        updated_at,
        projects (
          id,
          title,
          description,
          total_amount
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter)
    }

    const { data, error } = await query

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Format payments for frontend
    const formattedPayments = (data || []).map((payment: any) => ({
      id: payment.id,
      project_id: payment.project_id,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      payment_method: payment.payment_method,
      razorpay_payment_id: payment.razorpay_payment_id,
      razorpay_order_id: payment.razorpay_order_id,
      created_at: payment.created_at ? new Date(payment.created_at).toISOString() : null,
      updated_at: payment.updated_at ? new Date(payment.updated_at).toISOString() : null,
      projects: payment.projects ? {
        title: payment.projects.title,
        description: payment.projects.description,
      } : null,
    }))

    return NextResponse.json({ payments: formattedPayments })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 })
  }
}




