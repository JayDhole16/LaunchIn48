// Simple script to compare maintenance calculations used in dashboard (user) and admin pages

function computeFromPayments(project) {
  // project: { completed_date, created_at, total_amount, payments[] }
  const completionDate = project.completed_date || project.created_at
  const freeEndDate = new Date(completionDate)
  freeEndDate.setDate(freeEndDate.getDate() + 90)

  const maintenancePayments = (project.payments || []).filter(p => p.status === 'completed' && p.payment_method && p.payment_method.includes('maintenance'))

  let totalPaidDays = 0
  let totalPaidAmount = 0
  let lastPlanName = null

  maintenancePayments.forEach(payment => {
    const planId = payment.payment_method.replace('maintenance_', '')
    const planDurationMap = { monthly: 30, quarterly: 90, yearly: 365 }
    const daysAdded = planDurationMap[planId] || 30
    totalPaidDays += daysAdded
    totalPaidAmount += payment.amount || 0

    const planNameMap = { monthly: 'Monthly', quarterly: 'Quarterly', yearly: 'Yearly' }
    lastPlanName = planNameMap[planId] || lastPlanName
  })

  const finalValidityEnd = new Date(freeEndDate)
  finalValidityEnd.setDate(finalValidityEnd.getDate() + totalPaidDays)

  const now = new Date()
  const totalDaysRemaining = Math.ceil((finalValidityEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  const maintenanceStatus = totalPaidDays > 0 ? 'active' : (totalDaysRemaining > 0 ? 'free' : 'expired')

  return {
    status: maintenanceStatus,
    start_date: completionDate,
    end_date: finalValidityEnd.toISOString(),
    next_payment_due: finalValidityEnd.toISOString(),
    maintenance_amount: totalPaidDays > 0 ? Math.round(project.total_amount * 0.08) : 0,
    base_amount: totalPaidAmount,
    plan_name: lastPlanName || (totalPaidDays > 0 ? 'Paid Plan' : null),
    days_remaining: Math.max(0, totalDaysRemaining),
    free_days_total: 90,
    paid_days_total: totalPaidDays,
    total_amount_paid: totalPaidAmount,
  }
}

function computeFromDbRecord(record) {
  // record: { start_date, end_date, next_payment_due, maintenance_amount, base_amount, status }
  const now = new Date()
  const validityEnd = record.end_date ? new Date(record.end_date) : null
  const daysRemaining = validityEnd ? Math.ceil((validityEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0

  return {
    status: record.status,
    start_date: record.start_date,
    end_date: record.end_date,
    next_payment_due: record.next_payment_due,
    maintenance_amount: record.maintenance_amount || 0,
    base_amount: record.base_amount || 0,
    plan_name: record.plan_name || 'Unknown',
    days_remaining: Math.max(0, daysRemaining),
    free_days_total: 90,
    paid_days_total: 0,
    total_amount_paid: 0,
  }
}

// Sample project data matching the screenshot scenario
const sampleProject = {
  id: 'proj_1',
  total_amount: 6999,
  created_at: '2025-11-01',
  completed_date: '2025-11-01',
  payments: [
    // a maintenance monthly payment that gives +30 days
    { id: 'm1', amount: 560, status: 'completed', payment_method: 'maintenance_monthly', created_at: '2025-11-05' },
    { id: 'm2', amount: 560, status: 'completed', payment_method: 'maintenance_monthly', created_at: '2025-12-05' }
  ]
}

// Case A: No DB record (fallback to payments) - user logic
const userComputed = computeFromPayments(sampleProject)

// Case B: DB record present (admin would prefer DB values). To simulate mismatch, create a DB record with end_date earlier
const dbRecord = {
  id: 'pm_1',
  project_id: 'proj_1',
  start_date: '2025-11-01',
  end_date: new Date(new Date('2025-11-01').setDate(new Date('2025-11-01').getDate() + 90 + 30)).toISOString(), // only +30 paid days in DB
  next_payment_due: new Date(new Date('2025-11-01').setDate(new Date('2025-11-01').getDate() + 90 + 30)).toISOString(),
  maintenance_amount: 560,
  base_amount: 560,
  status: 'active',
  plan_name: 'Monthly'
}

const adminFromDb = computeFromDbRecord(dbRecord)
const adminFromPayments = computeFromPayments(sampleProject)

console.log('USER computed (fallback/payments):')
console.log(userComputed)
console.log('\nADMIN computed (from DB):')
console.log(adminFromDb)
console.log('\nADMIN computed (payments fallback):')
console.log(adminFromPayments)

console.log('\nCompare days_remaining:')
console.log('user days:', userComputed.days_remaining)
console.log('admin days (db):', adminFromDb.days_remaining)
console.log('admin days (payments):', adminFromPayments.days_remaining)

// Result: If admin uses DB and DB is stale, values differ. Our change makes admin use DB when present but fall back to payments when DB missing.
