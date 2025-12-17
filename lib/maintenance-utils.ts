"use client"

import { createClient } from '@/lib/supabase/client'

export interface MaintenanceProject {
  id: string
  project_id: string
  maintenance_plan_id: string
  start_date: string
  end_date: string
  next_payment_due: string
  status: 'active' | 'expired' | 'suspended' | 'cancelled'
  base_amount: number
  maintenance_amount: number
  created_at: string
  updated_at: string
}

export interface MaintenancePlan {
  id: string
  name: string
  duration_months: number
  base_price: number
  price_multiplier: number
  description: string
}

// Calculate free maintenance period (90 days from completion)
export function calculateFreeMaintenance(completionDate: string) {
  const completion = new Date(completionDate)
  const freePeriodStart = new Date(completion)
  const freePeriodEnd = new Date(completion)
  freePeriodEnd.setDate(freePeriodEnd.getDate() + 90)
  
  const today = new Date()
  const daysRemaining = Math.ceil((freePeriodEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  
  return {
    startDate: freePeriodStart.toISOString().split('T')[0],
    endDate: freePeriodEnd.toISOString().split('T')[0],
    daysRemaining: Math.max(0, daysRemaining),
    isActive: daysRemaining > 0,
    isEndingSoon: daysRemaining <= 14 && daysRemaining > 0
  }
}

// Calculate maintenance amount based on project cost
export function calculateMaintenanceAmount(projectAmount: number, planMultiplier: number): number {
  return Math.round(projectAmount * planMultiplier)
}

// Get maintenance status color
export function getMaintenanceStatusColor(status: string): string {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
    case 'expired':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
    case 'suspended':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
    case 'cancelled':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
  }
}

// Check if project has maintenance
export async function checkProjectMaintenance(projectId: string): Promise<MaintenanceProject | null> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('project_maintenance')
    .select('*')
    .eq('project_id', projectId)
    .single()
    
  if (error && error.code !== 'PGRST116') {
    console.error('Error checking maintenance:', error)
    return null
  }
  
  return data
}

// Create maintenance record when project is completed
export async function createMaintenanceRecord(
  projectId: string, 
  projectAmount: number, 
  completionDate: string
): Promise<boolean> {
  const supabase = createClient()
  
  try {
    // Get default monthly plan
    const { data: plan, error: planError } = await supabase
      .from('maintenance_plans')
      .select('*')
      .eq('name', 'Monthly')
      .single()
    
    if (planError || !plan) {
      console.error('Error getting maintenance plan:', planError)
      return false
    }
    
    // Calculate maintenance dates (90 days after completion)
    const completion = new Date(completionDate)
    const maintenanceStart = new Date(completion)
    maintenanceStart.setDate(maintenanceStart.getDate() + 90)
    
    const maintenanceEnd = new Date(maintenanceStart)
    maintenanceEnd.setMonth(maintenanceEnd.getMonth() + plan.duration_months)
    
    const maintenanceAmount = calculateMaintenanceAmount(projectAmount, plan.price_multiplier)
    
    const { error } = await supabase
      .from('project_maintenance')
      .insert({
        project_id: projectId,
        maintenance_plan_id: plan.id,
        start_date: maintenanceStart.toISOString().split('T')[0],
        end_date: maintenanceEnd.toISOString().split('T')[0],
        next_payment_due: maintenanceStart.toISOString().split('T')[0],
        base_amount: projectAmount,
        maintenance_amount: maintenanceAmount,
        status: 'active'
      })
    
    if (error) {
      console.error('Error creating maintenance record:', error)
      return false
    }
    
    return true
  } catch (error) {
    console.error('Error in createMaintenanceRecord:', error)
    return false
  }
}

// Update project completion date and create maintenance
export async function completeProjectWithMaintenance(
  projectId: string, 
  projectAmount: number
): Promise<boolean> {
  const supabase = createClient()
  
  try {
    const completionDate = new Date().toISOString().split('T')[0]
    
    // Update project status and completion date (this should always work)
    const { error: projectError } = await supabase
      .from('projects')
      .update({
        status: 'completed',
        completed_at: completionDate,
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId)
    
    if (projectError) {
      console.error('Error updating project:', projectError)
      return false
    }
    
    // Try to create maintenance record, but don't fail if maintenance tables don't exist
    try {
      const maintenanceCreated = await createMaintenanceRecord(projectId, projectAmount, completionDate)
      if (maintenanceCreated) {
        console.log('Maintenance record created successfully')
      } else {
        console.log('Maintenance system not set up, but project completed successfully')
      }
    } catch (maintenanceError) {
      console.log('Maintenance system not available, but project completed successfully:', maintenanceError)
    }
    
    // Return true as long as project was updated successfully
    return true
  } catch (error) {
    console.error('Error in completeProjectWithMaintenance:', error)
    return false
  }
}

// Get maintenance plans
export async function getMaintenancePlans(): Promise<MaintenancePlan[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('maintenance_plans')
    .select('*')
    .order('duration_months')
  
  if (error) {
    console.error('Error fetching maintenance plans:', error)
    return []
  }
  
  return data || []
}

// Calculate days until payment due
export function calculateDaysUntilDue(dueDate: string): number {
  const today = new Date()
  const due = new Date(dueDate)
  return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

// Get payment urgency status
export function getPaymentUrgency(daysUntilDue: number): 'overdue' | 'urgent' | 'warning' | 'normal' {
  if (daysUntilDue < 0) return 'overdue'
  if (daysUntilDue <= 3) return 'urgent'
  if (daysUntilDue <= 7) return 'warning'
  return 'normal'
}

// Format maintenance period text
export function formatMaintenancePeriod(startDate: string, endDate: string): string {
  const start = new Date(startDate)
  const end = new Date(endDate)
  
  const startFormatted = start.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  })
  
  const endFormatted = end.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  })
  
  return `${startFormatted} - ${endFormatted}`
}