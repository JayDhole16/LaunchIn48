import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    
    // This endpoint should be called by a cron job or scheduled task
    // Check for due maintenance payments and send notifications
    const { data: notificationCount, error } = await supabase
      .rpc('check_maintenance_due_notifications')

    if (error) {
      console.error('Error checking maintenance notifications:', error)
      return NextResponse.json(
        { error: "Failed to check notifications" },
        { status: 500 }
      )
    }

    // Send emails for new notifications
    if (notificationCount > 0) {
      try {
        // Get all notifications created today
        const today = new Date().toISOString().split('T')[0]
        const { data: todayNotifications } = await supabase
          .from('maintenance_notifications')
          .select(`
            *,
            users!inner(email, full_name),
            project_maintenance!inner(
              id,
              maintenance_amount,
              projects!inner(title)
            )
          `)
          .gte('sent_at', today + 'T00:00:00')
          .lt('sent_at', today + 'T23:59:59')

        if (todayNotifications) {
          // Send email for each notification
          for (const notification of todayNotifications) {
            await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/send-email`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                type: 'maintenance_reminder',
                email: notification.users.email,
                userName: notification.users.full_name,
                projectTitle: notification.project_maintenance.projects.title,
                amount: notification.project_maintenance.maintenance_amount,
                daysRemaining: notification.days_remaining,
                message: notification.message
              })
            })
          }

          // Also send summary to admin
          await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/send-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              type: 'admin_maintenance_summary',
              notificationCount: notificationCount,
              notifications: todayNotifications
            })
          })
        }
      } catch (emailError) {
        console.error('Error sending notification emails:', emailError)
        // Don't fail the entire process if emails fail
      }
    }

    return NextResponse.json({
      success: true,
      notificationCount: notificationCount,
      message: `Created ${notificationCount} maintenance notifications`
    })

  } catch (error: any) {
    console.error("Error processing maintenance notifications:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    
    const supabase = createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Get notifications for the user
    let query = supabase
      .from('maintenance_notifications')
      .select(`
        *,
        project_maintenance!inner(
          id,
          maintenance_amount,
          projects!inner(
            id,
            title
          )
        )
      `)
      .eq('user_id', user.id)
      .order('sent_at', { ascending: false })

    const { data: notifications, error } = await query

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch notifications" },
        { status: 500 }
      )
    }

    return NextResponse.json({ notifications })

  } catch (error: any) {
    console.error("Error fetching maintenance notifications:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { notificationId } = await req.json()
    
    if (!notificationId) {
      return NextResponse.json(
        { error: "Missing notification ID" },
        { status: 400 }
      )
    }

    const supabase = createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Mark notification as read
    const { error: updateError } = await supabase
      .from('maintenance_notifications')
      .update({
        read_at: new Date().toISOString()
      })
      .eq('id', notificationId)
      .eq('user_id', user.id)

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to mark notification as read" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Notification marked as read"
    })

  } catch (error: any) {
    console.error("Error updating notification:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}