/**
 * Business logic for maintenance validity management
 * Handles cumulative validity periods (free + paid)
 */

import { createClient } from '@/lib/supabase/server'

interface MaintenanceRecord {
  id: string
  project_id: string
  user_id: string
  maintenance_plan_id: string
  start_date: string
  end_date: string
  next_payment_due: string
  status: 'active' | 'expired' | 'suspended' | 'cancelled'
  base_amount: number
  maintenance_amount: number
  notification_sent_at: string | null
  created_at: string
  updated_at: string
}

interface MaintenancePlan {
  id: string
  name: string
  slug: string
  description: string
  duration_months: number
  base_price: number
  price_multiplier: number
  features: string[]
}

/**
 * Initialize maintenance record for a completed project
 * Sets up the free maintenance period (90 days default)
 */
export async function initializeProjectMaintenance(
  projectId: string, 
  userId: string, 
  completionDate: string = new Date().toISOString()
) {
  const supabase = await createClient()
  
  console.log('🔧 Initializing maintenance for project:', projectId)
  
  // Check if maintenance record already exists
  const { data: existing } = await supabase
    .from('project_maintenance')
    .select('*')
    .eq('project_id', projectId)
    .single()
  
  if (existing) {
    console.log('✅ Maintenance record already exists')
    return existing
  }
  
  // Get project details to calculate maintenance amount
  const { data: project } = await supabase
    .from('projects')
    .select('total_amount')
    .eq('id', projectId)
    .single()
    
  if (!project) {
    throw new Error('Project not found')
  }
  
  // Get default maintenance plan (Monthly)
  const { data: defaultPlan } = await supabase
    .from('maintenance_plans')
    .select('*')
    .eq('name', 'Monthly')
    .single()
    
  if (!defaultPlan) {
    throw new Error('Default maintenance plan not found')
  }
  
  const completionDateObj = new Date(completionDate)
  const maintenanceStartDate = new Date(completionDateObj) // Maintenance starts immediately after completion
  
  const maintenanceEndDate = new Date(completionDateObj)
  maintenanceEndDate.setDate(maintenanceEndDate.getDate() + 90) // 90 days free maintenance
  
  const baseAmount = project.total_amount || 0
  const maintenanceAmount = Math.round(baseAmount * defaultPlan.price_multiplier)
  
  const maintenanceRecord = {
    project_id: projectId,
    user_id: userId,
    maintenance_plan_id: defaultPlan.id,
    start_date: maintenanceStartDate.toISOString().split('T')[0],
    end_date: maintenanceEndDate.toISOString().split('T')[0],
    next_payment_due: maintenanceEndDate.toISOString().split('T')[0],
    base_amount: baseAmount,
    maintenance_amount: maintenanceAmount,
    status: 'active' as const
  }
  
  const { data: created, error } = await supabase
    .from('project_maintenance')
    .insert(maintenanceRecord)
    .select()
    .single()
  
  if (error) {
    console.error('❌ Failed to initialize maintenance:', error)
    throw error
  }
  
  console.log('✅ Maintenance initialized:', {
    project_id: projectId,
    start_date: maintenanceStartDate.toISOString().split('T')[0],
    end_date: maintenanceEndDate.toISOString().split('T')[0],
    free_period_days: 90
  })
  
  return created
}

/**
 * Get maintenance plans from database
 */
export async function getMaintenancePlans(): Promise<MaintenancePlan[]> {
  const supabase = await createClient()
  
  const { data: plans, error } = await supabase
    .from('maintenance_plans')
    .select('*')
    .order('duration_months', { ascending: true })
  
  if (error) {
    console.error('❌ Failed to fetch maintenance plans:', error)
    return []
  }
  
  return plans || []
}

/**
 * Get maintenance record for a project
 */
export async function getProjectMaintenance(projectId: string): Promise<MaintenanceRecord | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('project_maintenance')
    .select('*')
    .eq('project_id', projectId)
    .single()
  
  if (error && error.code !== 'PGRST116') { // PGRST116 = not found
    console.error('❌ Failed to fetch maintenance record:', error)
    return null
  }
  
  return data
}

/**
 * Extend maintenance validity after successful payment
 * CUMULATIVE: Adds new period to existing validity
 */
export async function extendMaintenanceValidity(
  projectId: string,
  userId: string, 
  planSlug: string,
  paymentAmount: number,
  paymentId: string,
  razorpayPaymentId: string,
  razorpayOrderId: string
) {
  const supabase = await createClient()
  
  console.log('💰 Extending maintenance validity:', {
    projectId,
    planSlug, 
    paymentAmount,
    paymentId
  })
  
  // Get maintenance plan details
  // First try to find by name (planSlug should be the plan name)
  let { data: plan, error: planError } = await supabase
    .from('maintenance_plans')
    .select('*')
    .eq('name', planSlug)
    .single()
  
  if (planError || !plan) {
    // Try to find by lowercase name matching
    const { data: planByName, error: nameError } = await supabase
      .from('maintenance_plans')
      .select('*')
      .ilike('name', planSlug)
      .single()
    
    if (nameError || !planByName) {
      throw new Error(`Maintenance plan not found: ${planSlug}`)
    }
    
    plan = planByName
  }
  
  // Get or create maintenance record  
  let maintenanceRecord = await getProjectMaintenance(projectId)
  if (!maintenanceRecord) {
    maintenanceRecord = await initializeProjectMaintenance(projectId, userId)
  }
  
  const now = new Date()
  const currentValidityEnd = new Date(maintenanceRecord.end_date)
  
  // CUMULATIVE LOGIC: Add plan duration to current validity end if still active, or from now if expired
  const extensionStartDate = currentValidityEnd > now ? currentValidityEnd : now
  const newValidityEnd = new Date(extensionStartDate)
  newValidityEnd.setMonth(newValidityEnd.getMonth() + plan.duration_months)
  
  const daysAdded = Math.ceil((newValidityEnd.getTime() - extensionStartDate.getTime()) / (1000 * 60 * 60 * 24))
  const newTotalDaysRemaining = Math.ceil((newValidityEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  
  // Update maintenance record with existing schema
  const updatedData = {
    status: 'active' as const,
    end_date: newValidityEnd.toISOString().split('T')[0],
    next_payment_due: newValidityEnd.toISOString().split('T')[0],
    maintenance_plan_id: plan.id,
    updated_at: now.toISOString()
  }
  
  const { data: updatedRecord, error: updateError } = await supabase
    .from('project_maintenance')
    .update(updatedData)
    .eq('id', maintenanceRecord.id)
    .select()
    .single()
  
  if (updateError) {
    console.error('❌ Failed to update maintenance record:', updateError)
    throw updateError
  }
  
  // Create maintenance payment history record
  const paymentHistoryRecord = {
    project_maintenance_id: maintenanceRecord.id,
    project_id: projectId,
    user_id: userId,
    amount: paymentAmount,
    plan_name: plan.name,
    plan_duration_months: plan.duration_months,
    plan_duration_days: plan.duration_months * 30,
    days_added: daysAdded,
    payment_period_start: extensionStartDate.toISOString().split('T')[0],
    payment_period_end: newValidityEnd.toISOString().split('T')[0],
    razorpay_payment_id: razorpayPaymentId,
    razorpay_order_id: razorpayOrderId,
    status: 'completed' as const,
    paid_at: now.toISOString()
  }
  
  const { error: historyError } = await supabase
    .from('maintenance_payments')
    .insert(paymentHistoryRecord)
  
  if (historyError) {
    console.error('❌ Failed to create payment history:', historyError)
    // Don't throw - maintenance extension succeeded
  }
  
  console.log('✅ Maintenance extended successfully:', {
    previous_validity: extensionStartDate.toISOString(),
    new_validity: newValidityEnd.toISOString(),
    days_added: daysAdded,
    total_days_remaining: newTotalDaysRemaining
  })
  
  return {
    success: true,
    maintenanceRecord: updatedRecord,
    extensionDetails: {
      plan_name: plan.name,
      days_added: daysAdded,
      new_validity_end: newValidityEnd.toISOString(),
      total_days_remaining: newTotalDaysRemaining
    }
  }
}

/**
 * Calculate days remaining for a maintenance record
 */
export function calculateDaysRemaining(maintenanceRecord: MaintenanceRecord): number {
  if (!maintenanceRecord.end_date) return 0
  
  const now = new Date()
  const validityEnd = new Date(maintenanceRecord.end_date)
  const daysRemaining = Math.ceil((validityEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  
  return Math.max(0, daysRemaining)
}

/**
 * Get maintenance status for a project
 */
export function getMaintenanceStatus(maintenanceRecord: MaintenanceRecord | null) {
  if (!maintenanceRecord) {
    return {
      status: 'none',
      days_remaining: 0,
      validity_end: null,
      is_active: false,
      is_expired: true
    }
  }
  
  const daysRemaining = calculateDaysRemaining(maintenanceRecord)
  const isActive = daysRemaining > 0
  const isExpired = daysRemaining <= 0
  const isEndingSoon = daysRemaining > 0 && daysRemaining <= 7
  
  return {
    status: maintenanceRecord.status,
    days_remaining: daysRemaining,
    validity_end: maintenanceRecord.end_date,
    is_active: isActive,
    is_expired: isExpired,
    is_ending_soon: isEndingSoon,
    maintenance_amount: maintenanceRecord.maintenance_amount,
    base_amount: maintenanceRecord.base_amount,
    next_payment_due: maintenanceRecord.next_payment_due
  }
}