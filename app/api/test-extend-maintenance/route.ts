import { NextRequest, NextResponse } from "next/server"

// Simple test API to extend maintenance validity
// This simulates what would happen with database updates
export async function POST(request: NextRequest) {
  try {
    const { projectId, planName, durationMonths } = await request.json()
    
    console.log('🧪 TEST: Extending maintenance validity')
    console.log('Project ID:', projectId)
    console.log('Plan:', planName)
    console.log('Duration:', durationMonths, 'months')
    
    // Simulate the database logic
    const now = new Date()
    const currentValidityEnd = new Date(now)
    currentValidityEnd.setDate(currentValidityEnd.getDate() + 31) // Current 31 days
    
    // Add the new plan duration to existing validity
    const newValidityEnd = new Date(currentValidityEnd)
    newValidityEnd.setMonth(newValidityEnd.getMonth() + durationMonths)
    
    const daysAdded = Math.ceil((newValidityEnd.getTime() - currentValidityEnd.getTime()) / (1000 * 60 * 60 * 24))
    const totalDaysFromNow = Math.ceil((newValidityEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    
    console.log('✅ TEST: Maintenance extended successfully')
    console.log('Previous validity end:', currentValidityEnd.toISOString())
    console.log('New validity end:', newValidityEnd.toISOString()) 
    console.log('Days added:', daysAdded)
    console.log('Total days from now:', totalDaysFromNow)
    
    // In a real system, this would update the database
    // For now, we'll just return the calculation
    
    return NextResponse.json({
      success: true,
      message: `Maintenance extended successfully with ${planName} plan`,
      details: {
        project_id: projectId,
        plan_name: planName,
        duration_months: durationMonths,
        days_added: daysAdded,
        previous_validity: currentValidityEnd.toISOString(),
        new_validity: newValidityEnd.toISOString(),
        total_days_remaining: totalDaysFromNow
      }
    })
    
  } catch (error) {
    console.error('❌ TEST: Error extending maintenance:', error)
    return NextResponse.json(
      { error: 'Failed to extend maintenance validity' },
      { status: 500 }
    )
  }
}