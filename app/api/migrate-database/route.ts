import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    console.log("Starting database migration...")

    // Add missing columns to projects table
    const alterTableQueries = [
      `ALTER TABLE projects ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(10,2) DEFAULT 0;`,
      `ALTER TABLE projects ADD COLUMN IF NOT EXISTS remaining_amount DECIMAL(10,2) DEFAULT 0;`,
      `ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_advance_payment BOOLEAN DEFAULT FALSE;`,
      `ALTER TABLE projects ADD COLUMN IF NOT EXISTS advance_percentage INTEGER DEFAULT 100;`
    ]

    for (const query of alterTableQueries) {
      const { error } = await supabase.rpc('execute_sql', { sql: query })
      if (error) {
        console.log(`Query result for "${query}":`, error.message)
        // Some errors are expected if columns already exist, so we continue
      }
    }

    // Update existing projects
    const { error: updateError } = await supabase
      .from('projects')
      .update({ 
        remaining_amount: supabase.raw('total_amount - COALESCE(paid_amount, 0)') 
      })
      .is('remaining_amount', null)

    if (updateError) {
      console.log("Update existing projects result:", updateError.message)
    }

    // Check if project_messages table exists by trying to select from it
    const { error: checkTableError } = await supabase
      .from('project_messages')
      .select('id')
      .limit(1)

    if (checkTableError && checkTableError.code === 'PGRST106') {
      // Table doesn't exist, create it
      console.log("Creating project_messages table...")
      
      // Note: This is a simplified approach. In production, you'd use proper migrations
      // For now, we'll create a basic table structure that works with RLS
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS project_messages (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          project_id UUID NOT NULL,
          user_id UUID NOT NULL,
          sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'admin')),
          message TEXT NOT NULL,
          read_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        ALTER TABLE project_messages ENABLE ROW LEVEL SECURITY;
      `
      
      const { error: createError } = await supabase.rpc('execute_sql', { sql: createTableSQL })
      if (createError) {
        console.log("Create table result:", createError.message)
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: "Database migration completed" 
    })
  } catch (error: any) {
    console.error("Migration error:", error)
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}