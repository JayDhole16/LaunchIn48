import { NextResponse } from "next/server"

// This isolates the public key exposure to a dedicated endpoint
export async function GET() {
  try {
    // Return only the public key which is safe for client use
    // Note: This is the public key, not the secret key
    const publicKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
    
    if (!publicKey) {
      console.error("NEXT_PUBLIC_RAZORPAY_KEY_ID environment variable is not set")
      return NextResponse.json({ error: "Payment configuration not found" }, { status: 500 })
    }

    return NextResponse.json({
      key: publicKey,
    })
  } catch (error) {
    console.error("Error getting Razorpay config:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
