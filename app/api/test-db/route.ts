import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Test database connectivity by querying a simple table
    const { data, error } = await supabase
      .from("services")
      .select("id, name")
      .limit(1)

    if (error) {
      console.error("Database connection error:", error)
      return NextResponse.json({ 
        success: false, 
        error: "Database connection failed",
        details: error.message 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: "Database connection successful",
      data: data 
    })
  } catch (error: any) {
    console.error("Error in test-db API:", error)
    return NextResponse.json({ 
      success: false, 
      error: "Internal server error",
      details: error.message 
    }, { status: 500 })
  }
}