import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"

export async function GET(_req: NextRequest) {
  try {
    const auth = await createClient()
    const { data: { user } } = await auth.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const service = createServiceClient()
    const { data, error } = await service
      .from('projects')
      .select(`
        id,
        title,
        description,
        total_amount,
        payment_status,
        paid_amount,
        remaining_amount,
        status,
        created_at,
        start_date,
        due_date,
        completed_date,
        priority,
        payments!left (
          id,
          amount,
          status,
          payment_method,
          created_at
        )
      `)
      .eq('user_id', user.id)
      .neq('status', 'draft')
      .neq('payment_status', 'pending')
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      // Enrich projects server-side: compute paid_amount and remaining_amount from linked payments
    const enriched = (data || []).map((p: any) => {
      const payments = Array.isArray(p.payments) ? p.payments : []
      
      // Filter out maintenance payments and failed payments
      const completedPayments = payments.filter((pm: any) => 
        pm.status === 'completed' && 
        !pm.payment_method?.includes('maintenance')
      )
      
      // Calculate paid amount excluding maintenance payments
      const calculatedPaid = completedPayments.reduce((sum: number, pm: any) => sum + (pm.amount || 0), 0)

      // Use database values if available, otherwise use calculated values
      const paid_amount = typeof p.paid_amount === 'number' ? p.paid_amount : calculatedPaid
      const total_amount = typeof p.total_amount === 'number' ? p.total_amount : 0
      const remaining_amount = Math.max(0, total_amount - paid_amount)

      // Determine payment status based on amounts
      const payment_status = paid_amount >= total_amount ? 'paid' 
        : paid_amount > 0 ? 'partial'
        : 'pending'

      return {
        ...p,
        paid_amount,
        remaining_amount,
        payment_status,
        // Normalize dates to ISO strings so frontend new Date(...) works reliably
        created_at: p.created_at ? new Date(p.created_at).toISOString() : null,
        start_date: p.start_date ? new Date(p.start_date).toISOString() : null,
        due_date: p.due_date ? new Date(p.due_date).toISOString() : null,
        completed_date: p.completed_date ? new Date(p.completed_date).toISOString() : null,
        payments: payments.map((pm: any) => ({
          ...pm,
          created_at: pm.created_at ? new Date(pm.created_at).toISOString() : null,
        })),
      }
    })

    return NextResponse.json({ projects: enriched })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 })
  }
}



