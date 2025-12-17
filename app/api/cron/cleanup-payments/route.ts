import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    // Verify this is a cron job call (for security)
    const authHeader = request.headers.get('Authorization')
    const vercelCronHeader = request.headers.get('x-vercel-cron')
    
    // Allow either Vercel cron (has x-vercel-cron header) or external cron with secret
    const isVercelCron = vercelCronHeader === '1'
    const isAuthorizedExternal = authHeader === `Bearer ${process.env.CRON_SECRET}`
    
    if (!isVercelCron && !isAuthorizedExternal) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Call our cleanup endpoint
    const cleanupResponse = await fetch(`${request.nextUrl.origin}/api/cleanup-pending-payments`, {
      method: 'POST',
    })

    if (!cleanupResponse.ok) {
      throw new Error('Cleanup failed')
    }

    const cleanupResult = await cleanupResponse.json()
    
    console.log('Scheduled cleanup completed:', cleanupResult)
    
    return NextResponse.json({
      success: true,
      message: 'Scheduled cleanup completed',
      result: cleanupResult
    })
  } catch (error: any) {
    console.error('Scheduled cleanup failed:', error)
    return NextResponse.json(
      { error: error.message || 'Cleanup failed' },
      { status: 500 }
    )
  }
}

// Also allow POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request)
}