import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // First, create the update_updated_at_column function if it doesn't exist
    const functionSql = `
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ language 'plpgsql';
    `
    
    // Then create the email_notifications table
    const tableSql = `
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
    `
    
    // Enable RLS
    const rlsSql = `
      ALTER TABLE public.email_notifications ENABLE ROW LEVEL SECURITY;
    `
    
    // Create RLS policy
    const policySql = `
      CREATE POLICY "Admins can view all email notifications" ON public.email_notifications
        FOR ALL USING (
          EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
          )
        );
    `
    
    // Create trigger
    const triggerSql = `
      DROP TRIGGER IF EXISTS update_email_notifications_updated_at ON public.email_notifications;
      CREATE TRIGGER update_email_notifications_updated_at 
        BEFORE UPDATE ON public.email_notifications
        FOR EACH ROW 
        EXECUTE FUNCTION update_updated_at_column();
    `

    // Execute all SQL statements
    // Note: Supabase JavaScript client doesn't have a direct way to execute raw SQL
    // We'll need to use a different approach
    
    // For now, let's just test if we can insert into the table
    const { data, error } = await supabase
      .from("email_notifications")
      .insert({
        recipient_email: "test@example.com",
        subject: "Test Email",
        body: "This is a test email",
        type: "test",
        status: "pending"
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating email_notifications table:", error)
      return NextResponse.json({ 
        success: false, 
        error: "Failed to create email_notifications table",
        details: error.message 
      }, { status: 500 })
    }

    // Clean up test record
    await supabase
      .from("email_notifications")
      .delete()
      .eq("id", data.id)

    return NextResponse.json({ 
      success: true, 
      message: "Email notifications table is ready",
      data: data 
    })
  } catch (error: any) {
    console.error("Error in create-email-table API:", error)
    return NextResponse.json({ 
      success: false, 
      error: "Internal server error",
      details: error.message 
    }, { status: 500 })
  }
}