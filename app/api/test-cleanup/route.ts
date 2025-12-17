import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Calculate the cutoff time (10 minutes ago)
    const cutoffTime = new Date()
    cutoffTime.setMinutes(cutoffTime.getMinutes() - 10)
    
    console.log(`Test: Looking for pending payments older than: ${cutoffTime.toISOString()}`)
    
    // First, let's see what pending payments exist
    const { data: allPendingPayments, error: fetchError } = await supabase
      .from("payments")
      .select("id, razorpay_order_id, razorpay_payment_id, amount, status, created_at, project_id")
      .eq("status", "pending")
      .order("created_at", { ascending: false })

    if (fetchError) {
      console.error("Error fetching pending payments:", fetchError)
      return NextResponse.json(
        { error: "Failed to fetch pending payments" }, 
        { status: 500 }
      )
    }

    // Find payments that should be cleaned up
    const paymentsToCleanup = allPendingPayments?.filter(payment => {
      const isOlderThan10Min = new Date(payment.created_at) < cutoffTime
      const hasNoPaymentId = !payment.razorpay_payment_id
      return isOlderThan10Min && hasNoPaymentId
    }) || []

    console.log(`Found ${allPendingPayments?.length || 0} pending payments total`)
    console.log(`Found ${paymentsToCleanup.length} payments to cleanup`)
    
    return NextResponse.json({
      success: true,
      cutoff_time: cutoffTime.toISOString(),
      total_pending_payments: allPendingPayments?.length || 0,
      payments_to_cleanup: paymentsToCleanup.length,
      all_pending_payments: allPendingPayments?.map(p => ({
        id: p.id,
        created_at: p.created_at,
        has_payment_id: !!p.razorpay_payment_id,
        is_older_than_10min: new Date(p.created_at) < cutoffTime,
        should_cleanup: new Date(p.created_at) < cutoffTime && !p.razorpay_payment_id
      })) || [],
      message: `Found ${paymentsToCleanup.length} stale pending payments that could be cleaned up`
    })
  } catch (error: any) {
    console.error("Error in test cleanup:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" }, 
      { status: 500 }
    )
  }
}