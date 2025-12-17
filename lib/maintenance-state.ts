/**
 * Maintenance state management for client-side persistence
 * This provides a temporary solution until maintenance tables are created
 */

export interface MaintenanceState {
  projectId: string
  status: 'active' | 'expired' | 'suspended' | 'cancelled'
  start_date: string
  end_date: string
  next_payment_due: string
  maintenance_amount: number
  base_amount: number
  plan_name: string
  plan_id: string
  created_at: string
  updated_at: string
}

const MAINTENANCE_STORAGE_KEY = 'launchin48_maintenance_state'

/**
 * Get maintenance state from localStorage
 */
export function getMaintenanceState(): Record<string, MaintenanceState> {
  if (typeof window === 'undefined') return {}
  
  try {
    const stored = localStorage.getItem(MAINTENANCE_STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch (error) {
    console.error('Error reading maintenance state:', error)
    return {}
  }
}

/**
 * Save maintenance state to localStorage
 */
export function saveMaintenanceState(state: Record<string, MaintenanceState>) {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem(MAINTENANCE_STORAGE_KEY, JSON.stringify(state))
    console.log('💾 Maintenance state saved:', Object.keys(state).length, 'projects')
  } catch (error) {
    console.error('Error saving maintenance state:', error)
  }
}

/**
 * Get maintenance data for a specific project
 */
export function getProjectMaintenanceState(projectId: string): MaintenanceState | null {
  const allStates = getMaintenanceState()
  return allStates[projectId] || null
}

/**
 * Update maintenance state for a specific project
 */
export function updateProjectMaintenanceState(projectId: string, updates: Partial<MaintenanceState>) {
  const allStates = getMaintenanceState()
  const currentState = allStates[projectId]
  
  const newState: MaintenanceState = {
    projectId,
    status: 'active',
    start_date: new Date().toISOString(),
    end_date: new Date().toISOString(),
    next_payment_due: new Date().toISOString(),
    maintenance_amount: 0,
    base_amount: 0,
    plan_name: 'Monthly',
    plan_id: 'monthly',
    created_at: currentState?.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...currentState,
    ...updates
  }
  
  allStates[projectId] = newState
  saveMaintenanceState(allStates)
  
  return newState
}

/**
 * Extend maintenance period for a project (called after successful payment)
 */
export function extendProjectMaintenance(
  projectId: string, 
  planName: string, 
  planId: string, 
  durationMonths: number,
  amount: number
) {
  console.log('📱 Client: Extending maintenance for project:', projectId, 'Plan:', planName, 'Duration:', durationMonths)
  
  const currentState = getProjectMaintenanceState(projectId)
  const now = new Date()
  
  // If there's existing active maintenance, extend from current end date
  // Otherwise, start from now
  let startDate = now
  if (currentState && currentState.status === 'active') {
    const existingEndDate = new Date(currentState.end_date)
    if (existingEndDate > now) {
      startDate = existingEndDate
    }
  }
  
  // Calculate new end date
  const endDate = new Date(startDate)
  endDate.setMonth(endDate.getMonth() + durationMonths)
  
  // Calculate next payment due (same as end date for now)
  const nextPaymentDue = new Date(endDate)
  
  const updates: Partial<MaintenanceState> = {
    status: 'active',
    start_date: currentState?.start_date || now.toISOString(),
    end_date: endDate.toISOString(),
    next_payment_due: nextPaymentDue.toISOString(),
    maintenance_amount: amount,
    base_amount: amount,
    plan_name: planName,
    plan_id: planId,
    updated_at: now.toISOString()
  }
  
  const newState = updateProjectMaintenanceState(projectId, updates)
  
  console.log('✅ Client: Maintenance extended until:', endDate.toISOString())
  console.log('📊 Client: New maintenance state:', newState)
  
  // Trigger a custom event to notify components of the update
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('maintenance-updated', {
      detail: { projectId, state: newState }
    }))
  }
  
  return newState
}

/**
 * Clear all maintenance state (for testing/debugging)
 */
export function clearMaintenanceState() {
  if (typeof window === 'undefined') return
  
  localStorage.removeItem(MAINTENANCE_STORAGE_KEY)
  console.log('🗑️ Maintenance state cleared')
  
  // Trigger update event
  window.dispatchEvent(new CustomEvent('maintenance-cleared'))
}