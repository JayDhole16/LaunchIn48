import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    console.log("Setting up project_messages table...")
    
    // Create the project_messages table
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        -- Create project_messages table if it doesn't exist
        CREATE TABLE IF NOT EXISTS project_messages (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
          user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
          sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'admin')),
          message TEXT NOT NULL,
          read_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Create indexes for better performance
        CREATE INDEX IF NOT EXISTS idx_project_messages_project_id ON project_messages(project_id);
        CREATE INDEX IF NOT EXISTS idx_project_messages_user_id ON project_messages(user_id);
        CREATE INDEX IF NOT EXISTS idx_project_messages_sender_type ON project_messages(sender_type);
        CREATE INDEX IF NOT EXISTS idx_project_messages_created_at ON project_messages(created_at DESC);

        -- Enable RLS
        ALTER TABLE project_messages ENABLE ROW LEVEL SECURITY;

        -- Create policies
        DROP POLICY IF EXISTS "Users can view their own messages" ON project_messages;
        CREATE POLICY "Users can view their own messages" ON project_messages
          FOR SELECT USING (auth.uid() = user_id);

        DROP POLICY IF EXISTS "Users can insert their own messages" ON project_messages;
        CREATE POLICY "Users can insert their own messages" ON project_messages
          FOR INSERT WITH CHECK (auth.uid() = user_id AND sender_type = 'user');

        DROP POLICY IF EXISTS "Admins can view all messages" ON project_messages;
        CREATE POLICY "Admins can view all messages" ON project_messages
          FOR SELECT USING (
            EXISTS (
              SELECT 1 FROM users 
              WHERE users.id = auth.uid() 
              AND users.role = 'admin'
            )
          );

        DROP POLICY IF EXISTS "Admins can insert messages" ON project_messages;
        CREATE POLICY "Admins can insert messages" ON project_messages
          FOR INSERT WITH CHECK (
            EXISTS (
              SELECT 1 FROM users 
              WHERE users.id = auth.uid() 
              AND users.role = 'admin'
            )
            AND sender_type = 'admin'
          );

        DROP POLICY IF EXISTS "Admins can update messages" ON project_messages;
        CREATE POLICY "Admins can update messages" ON project_messages
          FOR UPDATE USING (
            EXISTS (
              SELECT 1 FROM users 
              WHERE users.id = auth.uid() 
              AND users.role = 'admin'
            )
          );
      `
    })

    if (error) {
      console.error("SQL Error:", error)
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 })
    }

    // Test the table
    const { data: testData, error: testError } = await supabase
      .from('project_messages')
      .select('*')
      .limit(1)

    console.log("Table test:", { testData, testError })

    return NextResponse.json({
      success: true,
      message: "project_messages table set up successfully",
      test: { testData, testError }
    })
    
  } catch (error: any) {
    console.error("Setup error:", error)
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}