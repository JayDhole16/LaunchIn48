"use client"

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Clock, Calendar, AlertTriangle, CheckCircle, CreditCard } from 'lucide-react'
import { calculateFreeMaintenance } from '@/lib/maintenance-utils'

interface MaintenanceStatusProps {
  project: {
    id: string
    title: string
    status: string
    completed_date?: string
    total_amount: number
  }
  maintenanceData?: {
    status: 'active' | 'expired' | 'suspended' | 'cancelled'
    start_date: string
    end_date: string
    next_payment_due: string
    maintenance_amount: number
    base_amount: number
    plan_name?: string
  } | null
}

export function MaintenanceStatus({ project, maintenanceData }: MaintenanceStatusProps) {
  // Only show for completed projects
  if (project.status !== 'completed' || !project.completed_date) {
    return null
  }

  const freeMaintenanceInfo = calculateFreeMaintenance(project.completed_date)
  const isInFreePeriod = freeMaintenanceInfo.isActive
  const isFreePeriodEndingSoon = freeMaintenanceInfo.isEndingSoon

  // If there's maintenance data, it means the project has paid maintenance
  const hasPaidMaintenance = maintenanceData && maintenanceData.status === 'active'

  // Calculate maintenance status
  let maintenanceStatus: 'free' | 'paid' | 'expired' | 'overdue' = 'free'
  let dueDate = freeMaintenanceInfo.endDate
  let daysRemaining = freeMaintenanceInfo.daysRemaining

  if (hasPaidMaintenance) {
    const today = new Date()
    const nextPaymentDue = new Date(maintenanceData.next_payment_due)
    const daysToDue = Math.ceil((nextPaymentDue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    
    maintenanceStatus = daysToDue >= 0 ? 'paid' : 'overdue'
    dueDate = maintenanceData.next_payment_due
    daysRemaining = daysToDue
  } else if (!isInFreePeriod) {
    maintenanceStatus = 'expired'
    daysRemaining = Math.abs(daysRemaining) // Show as positive overdue days
  }

  const getStatusBadge = () => {
    switch (maintenanceStatus) {
      case 'free':
        return (
          <Badge 
            className={`${isFreePeriodEndingSoon ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'} font-medium`}
            variant="secondary"
          >
            <Clock className="h-3 w-3 mr-1" />
            {isFreePeriodEndingSoon ? '⚠️ Free Ending Soon' : '🆓 Free Period'}
          </Badge>
        )
      case 'paid':
        return (
          <Badge className="bg-blue-100 text-blue-800 font-medium" variant="secondary">
            <CreditCard className="h-3 w-3 mr-1" />
            💳 Paid Maintenance
          </Badge>
        )
      case 'expired':
        return (
          <Badge className="bg-red-100 text-red-800 font-medium" variant="secondary">
            <AlertTriangle className="h-3 w-3 mr-1" />
            ❌ Free Period Expired
          </Badge>
        )
      case 'overdue':
        return (
          <Badge className="bg-red-100 text-red-800 font-medium" variant="secondary">
            <AlertTriangle className="h-3 w-3 mr-1" />
            🚨 Payment Overdue
          </Badge>
        )
      default:
        return null
    }
  }

  const getDaysRemainingText = () => {
    if (maintenanceStatus === 'free') {
      return daysRemaining > 0 ? `${daysRemaining} days left` : 'Expired today'
    } else if (maintenanceStatus === 'paid') {
      return daysRemaining > 0 ? `${daysRemaining} days until next payment` : 'Due today'
    } else if (maintenanceStatus === 'expired') {
      return `Expired ${daysRemaining} days ago`
    } else if (maintenanceStatus === 'overdue') {
      return `${Math.abs(daysRemaining)} days overdue`
    }
    return ''
  }

  const getAmountText = () => {
    if (maintenanceStatus === 'free') {
      return 'Free maintenance period'
    } else if (hasPaidMaintenance && maintenanceData) {
      return `₹${maintenanceData.maintenance_amount.toLocaleString()} (${maintenanceData.plan_name || 'Monthly'})`
    } else {
      // Calculate what the maintenance would cost (8% for monthly)
      const estimatedAmount = Math.round(project.total_amount * 0.08)
      return `Estimated: ₹${estimatedAmount.toLocaleString()}/month`
    }
  }

  return (
    <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-md">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Maintenance Status
          </span>
        </div>
        {getStatusBadge()}
      </div>
      
      <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
        <div className="flex items-center justify-between">
          <span>Due Date:</span>
          <span className="font-medium">{new Date(dueDate).toLocaleDateString()}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <span>Time Remaining:</span>
          <span className={`font-medium ${
            maintenanceStatus === 'overdue' || maintenanceStatus === 'expired' 
              ? 'text-red-600 dark:text-red-400' 
              : maintenanceStatus === 'free' && isFreePeriodEndingSoon
              ? 'text-orange-600 dark:text-orange-400'
              : 'text-green-600 dark:text-green-400'
          }`}>
            {getDaysRemainingText()}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <span>Amount:</span>
          <span className="font-medium">{getAmountText()}</span>
        </div>
        
        {hasPaidMaintenance && maintenanceData && (
          <div className="flex items-center justify-between">
            <span>Plan:</span>
            <span className="font-medium">{maintenanceData.plan_name || 'Monthly'} Plan</span>
          </div>
        )}
      </div>

      {/* Quick action hints */}
      <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {maintenanceStatus === 'free' && isFreePeriodEndingSoon && (
            <span className="text-orange-600">💡 Customer should be notified about billing start</span>
          )}
          {maintenanceStatus === 'expired' && (
            <span className="text-red-600">⚠️ Customer needs to choose maintenance plan</span>
          )}
          {maintenanceStatus === 'overdue' && (
            <span className="text-red-600">🚨 Payment reminder needed</span>
          )}
          {maintenanceStatus === 'paid' && daysRemaining <= 7 && daysRemaining > 0 && (
            <span className="text-blue-600">📅 Payment due soon - send reminder</span>
          )}
          {maintenanceStatus === 'free' && !isFreePeriodEndingSoon && (
            <span className="text-green-600">✅ Free maintenance period active</span>
          )}
        </div>
      </div>
    </div>
  )
}

export function getMaintenancePriority(project: { status: string, completed_date?: string }, maintenanceData?: any): number {
  if (project.status !== 'completed' || !project.completed_date) return 0
  
  const freeMaintenanceInfo = calculateFreeMaintenance(project.completed_date)
  const hasPaidMaintenance = maintenanceData && maintenanceData.status === 'active'
  
  if (hasPaidMaintenance) {
    const today = new Date()
    const nextPaymentDue = new Date(maintenanceData.next_payment_due)
    const daysToDue = Math.ceil((nextPaymentDue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysToDue < 0) return 10 // Overdue - highest priority
    if (daysToDue <= 3) return 8  // Due very soon
    if (daysToDue <= 7) return 6  // Due soon
    return 4 // Paid maintenance - medium priority
  }
  
  if (!freeMaintenanceInfo.isActive) return 9 // Free period expired - very high priority
  if (freeMaintenanceInfo.isEndingSoon) return 7 // Free period ending soon - high priority
  
  return 2 // Free period active - low priority
}