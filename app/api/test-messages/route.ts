import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    console.log("Testing message retrieval...")
    
    // First, let's check if the table exists by trying a simple query
    const { data: tableCheck, error: tableError } = await supabase
      .from('project_messages')
      .select('count')
      .limit(1)
    
    console.log("Table check:", { tableCheck, tableError })
    
    if (tableError) {
      return NextResponse.json({
        success: false,
        error: "project_messages table might not exist",
        tableError: tableError
      }, { status: 400 })
    }
    
    // Test 1: Get all project messages
    const { data: allMessages, error: allError } = await supabase
      .from('project_messages')
      .select('*')
      .order('created_at', { ascending: false })
    
    console.log("All Messages:", allMessages)
    console.log("All Messages Error:", allError)
    
    // Test 2: Get user messages only
    const { data: userMessages, error: userError } = await supabase
      .from('project_messages')
      .select(`
        *,
        projects(
          title,
          users(
            full_name,
            email
          )
        ),
        users(
          full_name,
          email
        )
      `)
      .eq('sender_type', 'user')
      .order('created_at', { ascending: false })
    
    console.log("User Messages:", userMessages)
    console.log("User Messages Error:", userError)
    
    // Test 3: Get admin messages only
    const { data: adminMessages, error: adminError } = await supabase
      .from('project_messages')
      .select('*')
      .eq('sender_type', 'admin')
      .order('created_at', { ascending: false })
    
    console.log("Admin Messages:", adminMessages)
    console.log("Admin Messages Error:", adminError)
    
    return NextResponse.json({
      success: true,
      data: {
        all: { count: allMessages?.length || 0, messages: allMessages },
        users: { count: userMessages?.length || 0, messages: userMessages },
        admin: { count: adminMessages?.length || 0, messages: adminMessages }
      },
      errors: {
        all: allError,
        users: userError,
        admin: adminError
      }
    })
    
  } catch (error: any) {
    console.error("Test messages error:", error)
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}