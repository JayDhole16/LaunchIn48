import { createClient } from '@/lib/supabase/client'

export interface MaintenancePaymentSummary {
  projectId: string
  totalMaintenanceAmount: number
  paymentCount: number
  payments: Array<{
    id: string
    amount: number
    planName: string | null
    paymentDate: string
    status: string
    razorpayPaymentId: string | null
  }>
  latestPlanName?: string
  firstPaymentDate?: string
  lastPaymentDate?: string
}

export interface ProjectMaintenanceSummary {
  [projectId: string]: MaintenancePaymentSummary
}

/**
 * Fetches maintenance payment summary for all projects of a user
 * @param userId - The user ID to fetch maintenance payments for
 * @returns Promise<ProjectMaintenanceSummary> - Object with project IDs as keys and maintenance summaries as values
 */
export async function getMaintenancePaymentSummary(userId: string): Promise<ProjectMaintenanceSummary> {
  const supabase = createClient()
  
  try {
    // Fetch all maintenance payments for the user
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select(`
        id,
        project_id,
        amount,
        status,
        payment_method,
        razorpay_payment_id,
        created_at,
        projects!inner(
          id,
          title,
          user_id
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'completed')
      .or('payment_method.ilike.%maintenance%,payment_method.eq.maintenance')
      .order('created_at', { ascending: false })

    if (paymentsError) {
      console.error('Error fetching maintenance payments:', paymentsError)
      return {}
    }

    if (!payments || payments.length === 0) {
      return {}
    }

    // Also fetch maintenance payment records from the dedicated table if available
    const { data: maintenancePayments, error: maintenanceError } = await supabase
      .from('maintenance_payments')
      .select(`
        project_id,
        amount,
        plan_name,
        created_at,
        status,
        razorpay_payment_id
      `)
      .eq('user_id', userId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })

    // Create summary object
    const summary: ProjectMaintenanceSummary = {}

    // Process regular payments table
    payments.forEach(payment => {
      const projectId = payment.project_id
      
      if (!summary[projectId]) {
        summary[projectId] = {
          projectId,
          totalMaintenanceAmount: 0,
          paymentCount: 0,
          payments: []
        }
      }

      // Extract plan name from payment_method (e.g., "maintenance_monthly" -> "Monthly")
      let planName: string | null = null
      if (payment.payment_method) {
        const planId = payment.payment_method.replace('maintenance_', '')
        const planNameMap: { [key: string]: string } = {
          'monthly': 'Monthly',
          'quarterly': 'Quarterly', 
          'yearly': 'Yearly'
        }
        planName = planNameMap[planId] || planId
      }

      summary[projectId].payments.push({
        id: payment.id,
        amount: payment.amount || 0,
        planName: planName,
        paymentDate: payment.created_at,
        status: payment.status,
        razorpayPaymentId: payment.razorpay_payment_id
      })

      summary[projectId].totalMaintenanceAmount += payment.amount || 0
      summary[projectId].paymentCount += 1
    })

    // Process dedicated maintenance payments table if available
    if (maintenancePayments && maintenancePayments.length > 0) {
      maintenancePayments.forEach(payment => {
        const projectId = payment.project_id
        
        if (!summary[projectId]) {
          summary[projectId] = {
            projectId,
            totalMaintenanceAmount: 0,
            paymentCount: 0,
            payments: []
          }
        }

        // Check if this payment is already included from the main payments table
        const existingPayment = summary[projectId].payments.find(p => 
          p.razorpayPaymentId === payment.razorpay_payment_id &&
          p.amount === payment.amount &&
          new Date(p.paymentDate).getTime() === new Date(payment.created_at).getTime()
        )

        if (!existingPayment) {
          summary[projectId].payments.push({
            id: `maintenance_${payment.project_id}_${payment.created_at}`,
            amount: payment.amount || 0,
            planName: payment.plan_name,
            paymentDate: payment.created_at,
            status: payment.status,
            razorpayPaymentId: payment.razorpay_payment_id
          })

          summary[projectId].totalMaintenanceAmount += payment.amount || 0
          summary[projectId].paymentCount += 1
        }
      })
    }

    // Add derived data to each project summary
    Object.keys(summary).forEach(projectId => {
      const projectSummary = summary[projectId]
      
      if (projectSummary.payments.length > 0) {
        // Sort payments by date (newest first)
        projectSummary.payments.sort((a, b) => 
          new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
        )

        // Get latest plan name
        projectSummary.latestPlanName = projectSummary.payments[0]?.planName || undefined

        // Get first and last payment dates
        projectSummary.firstPaymentDate = projectSummary.payments[projectSummary.payments.length - 1].paymentDate
        projectSummary.lastPaymentDate = projectSummary.payments[0].paymentDate
      }
    })

    console.log('✅ Maintenance Payment Summary Generated:', {
      projectCount: Object.keys(summary).length,
      totalPayments: Object.values(summary).reduce((sum, p) => sum + p.paymentCount, 0),
      totalAmount: Object.values(summary).reduce((sum, p) => sum + p.totalMaintenanceAmount, 0)
    })

    return summary

  } catch (error) {
    console.error('Error generating maintenance payment summary:', error)
    return {}
  }
}

/**
 * Gets maintenance payment summary for a specific project
 * @param userId - The user ID
 * @param projectId - The project ID to get summary for
 * @returns Promise<MaintenancePaymentSummary | null>
 */
export async function getProjectMaintenanceSummary(userId: string, projectId: string): Promise<MaintenancePaymentSummary | null> {
  const allSummaries = await getMaintenancePaymentSummary(userId)
  return allSummaries[projectId] || null
}

/**
 * Formats maintenance amount for display
 * @param amount - The amount to format
 * @returns Formatted currency string
 */
export function formatMaintenanceAmount(amount: number): string {
  return `₹${amount.toLocaleString()}`
}

/**
 * Gets maintenance payment statistics for user dashboard
 * @param userId - The user ID
 * @returns Promise with overall maintenance stats
 */
export async function getMaintenanceStats(userId: string): Promise<{
  totalMaintenanceSpent: number
  totalMaintenancePayments: number
  projectsWithMaintenance: number
  averageMaintenancePerProject: number
}> {
  const summary = await getMaintenancePaymentSummary(userId)
  
  const totalMaintenanceSpent = Object.values(summary).reduce((sum, p) => sum + p.totalMaintenanceAmount, 0)
  const totalMaintenancePayments = Object.values(summary).reduce((sum, p) => sum + p.paymentCount, 0)
  const projectsWithMaintenance = Object.keys(summary).length
  const averageMaintenancePerProject = projectsWithMaintenance > 0 ? totalMaintenanceSpent / projectsWithMaintenance : 0

  return {
    totalMaintenanceSpent,
    totalMaintenancePayments, 
    projectsWithMaintenance,
    averageMaintenancePerProject
  }
}