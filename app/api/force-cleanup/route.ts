import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    console.log('FORCE CLEANUP: Removing ALL pending payments...')
    
    // First, let's see what pending payments exist
    const { data: allPendingPayments } = await supabase
      .from("payments")
      .select("id, razorpay_order_id, razorpay_payment_id, amount, status, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
    
    console.log(`Found ${allPendingPayments?.length || 0} pending payments to force delete`)
    
    // Delete ALL pending payments (be careful with this!)
    const { data: deletedPayments, error } = await supabase
      .from("payments")
      .delete()
      .eq("status", "pending")
      .select("id, razorpay_order_id, razorpay_payment_id, amount, project_id")

    if (error) {
      console.error("Error force cleaning pending payments:", error)
      return NextResponse.json(
        { error: "Failed to force cleanup pending payments" }, 
        { status: 500 }
      )
    }

    console.log(`FORCE CLEANUP: Deleted ${deletedPayments?.length || 0} pending payments`)
    
    return NextResponse.json({
      success: true,
      message: "Force cleanup completed",
      deleted_count: deletedPayments?.length || 0,
      deleted_payments: deletedPayments?.map(p => ({
        id: p.id,
        amount: p.amount,
        order_id: p.razorpay_order_id
      }))
    })
  } catch (error: any) {
    console.error("Error in force cleanup:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" }, 
      { status: 500 }
    )
  }
}