import { NextResponse } from "next/server"
import { getPaymentRedirectUrl, getMaintenancePaymentRedirectUrl } from "@/lib/payment-redirect"

export async function GET() {
  try {
    console.log("=== TESTING PAYMENT REDIRECT LOGIC ===")
    
    const testPaymentId = "pay_test123456"
    
    // Test regular payment redirect
    const regularRedirect = getPaymentRedirectUrl(testPaymentId)
    console.log("Regular payment redirect URL:", regularRedirect)
    
    // Test maintenance payment redirect
    const maintenanceRedirect = getMaintenancePaymentRedirectUrl(testPaymentId)
    console.log("Maintenance payment redirect URL:", maintenanceRedirect)
    
    return NextResponse.json({
      success: true,
      message: "Payment redirect logic tested successfully",
      results: {
        regularPayment: regularRedirect,
        maintenancePayment: maintenanceRedirect
      },
      explanation: [
        "Both functions will return /dashboard/payments URLs since window is not available on server-side",
        "In browser, they will check current path and redirect or reload accordingly",
        "From any page except payments: Redirect to payments page",
        "From payments page: Reload payments page with success parameters"
      ]
    })
    
  } catch (error: any) {
    console.error("Payment redirect test error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to test payment redirect",
      details: error.message
    }, { status: 500 })
  }
}