import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    // This endpoint should only be accessible in development or with proper authentication
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Not available in production" }, { status: 403 })
    }

    const supabase = await createServerClient()
    
    // Read the SQL file content
    const sql = `
      -- Add email notifications table
      CREATE TABLE IF NOT EXISTS public.email_notifications (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        recipient_email TEXT NOT NULL,
        subject TEXT NOT NULL,
        body TEXT NOT NULL,
        type TEXT,
        metadata JSONB,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
        sent_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Enable RLS on email_notifications table
      ALTER TABLE public.email_notifications ENABLE ROW LEVEL SECURITY;

      -- RLS policies for email_notifications
      CREATE POLICY "Admins can view all email notifications" ON public.email_notifications
        FOR ALL USING (
          EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
          )
        );

      -- Create trigger for updating timestamps
      CREATE TRIGGER update_email_notifications_updated_at 
        BEFORE UPDATE ON public.email_notifications
        FOR EACH ROW 
        EXECUTE FUNCTION update_updated_at_column();
    `

    // Execute the SQL
    const { error } = await supabase.rpc('exec_sql', { sql: sql })

    if (error) {
      console.error("Error initializing database:", error)
      return NextResponse.json({ error: "Failed to initialize database", details: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "Database initialized successfully" })
  } catch (error: any) {
    console.error("Error in init-database API:", error)
    return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 })
  }
}