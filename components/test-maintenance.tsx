"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'

export function TestMaintenance({ projectId }: { projectId: string }) {
  const [testing, setTesting] = useState(false)
  
  const testMaintenanceCalculation = async () => {
    setTesting(true)
    
    console.log('🧪 Testing maintenance calculation logic')
    
    // Simulate what happens when a payment is made
    const completionDate = new Date('2025-10-05') // Project completion
    const freeEndDate = new Date(completionDate)
    freeEndDate.setDate(freeEndDate.getDate() + 90) // 90 days free = Dec 28, 2025
    
    console.log('📅 Project completed:', completionDate.toDateString())
    console.log('📅 Free period ends:', freeEndDate.toDateString())
    
    // Simulate monthly payment (30 days)
    const monthlyDays = 30
    const finalValidityEnd = new Date(freeEndDate)
    finalValidityEnd.setDate(finalValidityEnd.getDate() + monthlyDays)
    
    const now = new Date()
    const totalDaysRemaining = Math.ceil((finalValidityEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    
    console.log('✅ After Monthly payment:')
    console.log('  - Validity extends to:', finalValidityEnd.toDateString())
    console.log('  - Total days remaining:', totalDaysRemaining)
    console.log('  - Breakdown: 90 free + 30 paid = 120 total days')
    
    alert(`Maintenance Test:\nFree: 90 days until ${freeEndDate.toDateString()}\nAfter Monthly: +30 days until ${finalValidityEnd.toDateString()}\nTotal: ${totalDaysRemaining} days remaining`)
    
    setTesting(false)
  }
  
  return (
    <Button 
      onClick={testMaintenanceCalculation}
      disabled={testing}
      variant="outline"
      size="sm"
    >
      🧪 Test Calculation
    </Button>
  )
}