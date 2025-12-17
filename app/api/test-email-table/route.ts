import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Try to access the email_notifications table
    const { data, error } = await supabase
      .from("email_notifications")
      .select("id")
      .limit(1)

    if (error) {
      console.error("Error accessing email_notifications table:", error)
      return NextResponse.json({ 
        success: false, 
        error: "Email notifications table not accessible",
        details: error.message 
      })
    }

    return NextResponse.json({ 
      success: true, 
      message: "Email notifications table is accessible",
      data: data 
    })
  } catch (error: any) {
    console.error("Error in test-email-table API:", error)
    return NextResponse.json({ 
      success: false, 
      error: "Internal server error",
      details: error.message 
    }, { status: 500 })
  }
}