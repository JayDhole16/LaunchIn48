import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Calculate the cutoff time (5 minutes ago for more aggressive cleanup)
    const cutoffTime = new Date()
    cutoffTime.setMinutes(cutoffTime.getMinutes() - 5)
    
    console.log(`Cleaning up pending payments older than: ${cutoffTime.toISOString()}`)
    
    // First, let's see what pending payments exist
    const { data: allPendingPayments } = await supabase
      .from("payments")
      .select("id, razorpay_order_id, razorpay_payment_id, amount, status, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
    
    console.log(`Found ${allPendingPayments?.length || 0} pending payments:`)
    allPendingPayments?.forEach(payment => {
      const createdAt = new Date(payment.created_at)
      const isOld = createdAt < cutoffTime
      console.log(`- Payment ${payment.id}: created ${createdAt.toISOString()}, old: ${isOld}, has_payment_id: ${!!payment.razorpay_payment_id}`)
    })
    
    // Delete pending payments that are older than 5 minutes
    // This includes payments that were initiated but never completed properly
    const { data: deletedPayments, error } = await supabase
      .from("payments")
      .delete()
      .eq("status", "pending")
      .lt("created_at", cutoffTime.toISOString())
      .select("id, razorpay_order_id, razorpay_payment_id, amount, project_id")

    if (error) {
      console.error("Error cleaning up pending payments:", error)
      return NextResponse.json(
        { error: "Failed to cleanup pending payments" }, 
        { status: 500 }
      )
    }

    console.log(`Cleaned up ${deletedPayments?.length || 0} stale pending payments`)
    
    return NextResponse.json({
      success: true,
      cleaned_count: deletedPayments?.length || 0,
      cutoff_time: cutoffTime.toISOString(),
      message: `Successfully cleaned up ${deletedPayments?.length || 0} stale pending payments`
    })
  } catch (error: any) {
    console.error("Error in cleanup-pending-payments:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" }, 
      { status: 500 }
    )
  }
}

// Allow this endpoint to be called via GET for manual testing
export async function GET(request: NextRequest) {
  return POST(request)
}