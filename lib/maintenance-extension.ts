/**
 * Utility functions for managing maintenance period extensions
 */

import { createClient } from '@/lib/supabase/server'

interface MaintenanceExtensionData {
  projectId: string
  planId: string
  planName: string
  durationMonths: number
  amount: number
}

/**
 * Extend maintenance period for a project after successful payment
 * Since maintenance tables don't exist yet, we'll simulate the logic
 */
export async function extendMaintenancePeriod(data: MaintenanceExtensionData) {
  console.log('🔧 Extending maintenance period:', {
    projectId: data.projectId,
    planName: data.planName,
    duration: data.durationMonths,
    amount: data.amount
  })

  // Get plan duration in days
  const durationDays = data.durationMonths * 30

  // Simulate maintenance extension logic
  const currentDate = new Date()
  const newEndDate = new Date(currentDate.getTime() + (durationDays * 24 * 60 * 60 * 1000))
  
  console.log(`✅ Maintenance extended until ${newEndDate.toISOString()} (${durationDays} days from now)`)
  
  // TODO: When maintenance tables are created, implement actual database updates:
  // 1. Update or create maintenance_plans record
  // 2. Update project_maintenance record with new end_date
  // 3. Create maintenance_payments record linking payment to maintenance
  
  return {
    success: true,
    newEndDate: newEndDate.toISOString(),
    durationDays,
    message: `Maintenance extended for ${data.durationMonths} month(s)`
  }
}

/**
 * Calculate maintenance plan details from payment method
 */
export function parseMaintenancePlan(paymentMethod: string) {
  const planId = paymentMethod.replace('maintenance_', '')
  
  const planConfig = {
    monthly: { name: 'Monthly', duration: 1 },
    quarterly: { name: 'Quarterly', duration: 3 },
    yearly: { name: 'Yearly', duration: 12 }
  }
  
  const config = planConfig[planId as keyof typeof planConfig]
  if (!config) {
    throw new Error(`Unknown maintenance plan: ${planId}`)
  }
  
  return {
    id: planId,
    name: config.name,
    duration: config.duration
  }
}