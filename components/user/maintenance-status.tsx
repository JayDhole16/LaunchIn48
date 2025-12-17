"use client"

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, Calendar, CreditCard, CheckCircle, AlertTriangle, Wrench, ChevronDown, ChevronUp } from 'lucide-react'
import { calculateFreeMaintenance } from '@/lib/maintenance-utils'
import { PaymentButton } from '@/components/payment-button'
import { getProjectMaintenanceState, extendProjectMaintenance, MaintenanceState } from '@/lib/maintenance-state'

interface UserMaintenanceStatusProps {
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
  maintenancePlans: Array<{
    id: string
    name: string
    description: string
    price_multiplier: number
    base_price: number
    duration_months: number
    features?: string[]
  }>
}

export function UserMaintenanceStatus({ project, maintenanceData, maintenancePlans }: UserMaintenanceStatusProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [clientMaintenanceState, setClientMaintenanceState] = useState<MaintenanceState | null>(null)
  const [isClient, setIsClient] = useState(false)
  
  // Load maintenance state on client side
  useEffect(() => {
    setIsClient(true)
    const storedState = getProjectMaintenanceState(project.id)
    setClientMaintenanceState(storedState)
    
  }, [project.id, project.title])
  
  // Listen for maintenance state updates
  useEffect(() => {
    if (!isClient) return
    
    const handleMaintenanceUpdate = (event: CustomEvent) => {
      if (event.detail.projectId === project.id) {
        setClientMaintenanceState(event.detail.state)
      }
    }
    
    const handlePaymentSuccess = () => {
      // Reload the entire page after payment to refresh maintenance data
      setTimeout(() => {
        window.location.reload()
      }, 2000) // Give time for payment processing
    }
    
    window.addEventListener('maintenance-updated', handleMaintenanceUpdate as EventListener)
    window.addEventListener('payment-success', handlePaymentSuccess)
    
    return () => {
      window.removeEventListener('maintenance-updated', handleMaintenanceUpdate as EventListener)
      window.removeEventListener('payment-success', handlePaymentSuccess)
    }
  }, [isClient, project.id, project.title])
  
  
  // Show for completed projects and review projects that are fully paid
  if (project.status !== 'completed' && !(project.status === 'review' && project.total_amount)) {
    return null
  }
  
  // Use actual completed_date or mock it for testing with review status
  const effectiveCompletedDate = project.completed_date || new Date().toISOString()

  const freeMaintenanceInfo = calculateFreeMaintenance(effectiveCompletedDate)
  const isInFreePeriod = freeMaintenanceInfo.isActive
  const isFreePeriodEndingSoon = freeMaintenanceInfo.isEndingSoon

  // Use client-side maintenance state if available, otherwise fall back to props
  const effectiveMaintenanceData = isClient && clientMaintenanceState ? {
    status: clientMaintenanceState.status,
    start_date: clientMaintenanceState.start_date,
    end_date: clientMaintenanceState.end_date,
    next_payment_due: clientMaintenanceState.next_payment_due,
    maintenance_amount: clientMaintenanceState.maintenance_amount,
    base_amount: clientMaintenanceState.base_amount,
    plan_name: clientMaintenanceState.plan_name
  } : maintenanceData
  
  // Check if there's paid maintenance (either active status or paid days > 0)
  const hasPaidMaintenance = effectiveMaintenanceData && 
    (effectiveMaintenanceData.status === 'active' || 
     (effectiveMaintenanceData.paid_days_total && effectiveMaintenanceData.paid_days_total > 0))
  
  // Debug log to track maintenance data
  if (isClient) {
    console.log('🔧 UserMaintenanceStatus Debug:', {
      project: project.title,
      maintenanceData,
      clientMaintenanceState,
      effectiveMaintenanceData,
      plan_name: effectiveMaintenanceData?.plan_name,
      hasPaidMaintenance,
      maintenanceStatus: 'will be calculated next'
    })
  }

  // Calculate maintenance status
  let maintenanceStatus: 'free' | 'paid' | 'expired' | 'overdue' | 'active' = 'free'
  let dueDate = freeMaintenanceInfo.endDate
  let daysRemaining = freeMaintenanceInfo.daysRemaining
  
  // Use actual maintenance data if available
  if (effectiveMaintenanceData && effectiveMaintenanceData.days_remaining !== undefined) {
    daysRemaining = effectiveMaintenanceData.days_remaining
    dueDate = effectiveMaintenanceData.end_date || freeMaintenanceInfo.endDate
  }

  if (hasPaidMaintenance && effectiveMaintenanceData) {
    // Use the status from maintenance data (active, free, expired)
    if (effectiveMaintenanceData.status === 'active' || effectiveMaintenanceData.paid_days_total > 0) {
      maintenanceStatus = daysRemaining > 0 ? 'active' : 'expired'
    } else {
      maintenanceStatus = daysRemaining > 0 ? 'free' : 'expired' 
    }
    
  } else if (!isInFreePeriod) {
    maintenanceStatus = 'expired'
    daysRemaining = Math.abs(daysRemaining)
  }

  const getStatusInfo = () => {
    switch (maintenanceStatus) {
      case 'free':
        return {
          title: isFreePeriodEndingSoon ? '⚠️ Free Period Ending Soon' : '🆓 Free Maintenance Active',
          description: isFreePeriodEndingSoon 
            ? `Your free maintenance period ends in ${daysRemaining} days. Consider upgrading to a paid plan to continue receiving support.`
            : `You have ${daysRemaining} days of free maintenance remaining. This includes bug fixes, security updates, and technical support.`,
          color: isFreePeriodEndingSoon ? 'text-orange-800' : 'text-green-800',
          bgColor: isFreePeriodEndingSoon ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200',
          badgeColor: isFreePeriodEndingSoon ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'
        }
      case 'paid':
      case 'active':
        return {
          title: '💳 Paid Maintenance Active',
          description: effectiveMaintenanceData?.plan_name ? 
            `Your ${effectiveMaintenanceData.plan_name} maintenance plan is active with ${daysRemaining} days remaining.` :
            `You have ${daysRemaining} days of maintenance remaining (${effectiveMaintenanceData?.free_days_total || 90} free + ${effectiveMaintenanceData?.paid_days_total || 0} paid days).`,
          color: 'text-blue-800',
          bgColor: 'bg-blue-50 border-blue-200',
          badgeColor: 'bg-blue-100 text-blue-800'
        }
      case 'expired':
        return {
          title: '❌ Maintenance Period Expired',
          description: `Your free maintenance period ended ${daysRemaining} days ago. Choose a maintenance plan to continue receiving updates and support.`,
          color: 'text-red-800',
          bgColor: 'bg-red-50 border-red-200',
          badgeColor: 'bg-red-100 text-red-800'
        }
      case 'overdue':
        return {
          title: '🚨 Payment Overdue',
          description: `Your maintenance payment is ${Math.abs(daysRemaining)} days overdue. Please make payment to continue receiving support.`,
          color: 'text-red-800',
          bgColor: 'bg-red-50 border-red-200',
          badgeColor: 'bg-red-100 text-red-800'
        }
    }
  }

  const statusInfo = getStatusInfo()

  const canUpgrade = true // Always allow maintenance plan upgrades/renewals
  const needsPayment = maintenanceStatus === 'overdue'
  
  // Fallback maintenance plans if none provided
  const effectivePlans = maintenancePlans.length > 0 ? maintenancePlans : [
    {
      id: 'monthly',
      name: 'Monthly',
      description: 'Monthly maintenance plan with basic support',
      price_multiplier: 0.08,
      base_price: 800,
      duration_months: 1,
      features: [
        'Bug fixes and security patches',
        'Technical support via email',
        'Monthly updates',
        'Performance monitoring'
      ]
    },
    {
      id: 'quarterly',
      name: 'Quarterly', 
      description: 'Quarterly maintenance plan with enhanced support',
      price_multiplier: 0.20,
      base_price: 2000,
      duration_months: 3,
      features: [
        'Everything in Monthly',
        'Priority technical support',
        'Feature enhancements',
        'Weekly backups',
        'Performance optimization'
      ]
    },
    {
      id: 'yearly',
      name: 'Yearly',
      description: 'Yearly maintenance plan with premium support and priority updates',
      price_multiplier: 0.70,
      base_price: 7000,
      duration_months: 12,
      features: [
        'Everything in Quarterly',
        'Dedicated support manager',
        'Custom feature development',
        'Daily backups',
        'Advanced analytics',
        'Priority feature requests'
      ]
    }
  ]
  

  return (
    <div className="mt-4">
      {/* Compact Maintenance Header */}
      <div 
        className="flex items-center justify-between p-3 bg-gray-900/50 border border-gray-700 rounded-lg cursor-pointer hover:bg-gray-800/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-3">
          <Wrench className="h-4 w-4 text-gray-400" />
          <div className="flex items-center space-x-2">
            <Badge className={statusInfo.badgeColor} variant="secondary" className="text-xs">
              {(() => {
                // If expired or overdue
                if (daysRemaining <= 0) return 'Expired'
                if (maintenanceStatus === 'overdue') return 'Overdue'
                
                // If has paid maintenance with valid plan name
                if (hasPaidMaintenance && effectiveMaintenanceData?.plan_name && effectiveMaintenanceData.plan_name !== 'Unknown') {
                  return `${effectiveMaintenanceData.plan_name} Plan`
                }
                
                // If has paid maintenance but unknown plan name, try to determine
                if (hasPaidMaintenance) {
                  return 'Paid Plan'
                }
                
                // If in free period
                if (maintenanceStatus === 'free') {
                  return isFreePeriodEndingSoon ? 'Free (Ending Soon)' : 'Free Period'
                }
                
                // Default fallback
                return 'Active'
              })()} 
            </Badge>
            <span className="text-sm font-medium text-gray-200">
              {daysRemaining > 0 ? `${daysRemaining} days left` : 'Expired'}
            </span>
            {effectiveMaintenanceData?.paid_days_total > 0 && (
              <span className="text-xs text-blue-400">
                (+{effectiveMaintenanceData.paid_days_total} paid days)
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Quick Action Button */}
          {needsPayment && (
            <div onClick={(e) => e.stopPropagation()}>
              <PaymentButton
                projectId={project.id}
                amount={effectiveMaintenanceData?.maintenance_amount || 0}
                projectTitle={`${project.title} - Maintenance Payment`}
                paymentType="maintenance"
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 text-xs"
              >
                Pay Now
              </PaymentButton>
            </div>
          )}
          
          {/* Always show expand arrow */}
          <div className="text-xs p-1 h-7 w-7 flex items-center justify-center text-gray-400">
            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="mt-2 bg-gray-800/50 border border-gray-600 rounded-lg p-4 space-y-4">
          <div>
            <h4 className={`font-medium mb-2 ${
              maintenanceStatus === 'free' ? (isFreePeriodEndingSoon ? 'text-orange-400' : 'text-green-400') :
              maintenanceStatus === 'paid' ? 'text-blue-400' :
              'text-red-400'
            }`}>
              {statusInfo.title}
            </h4>
            <p className="text-sm text-gray-300">
              {statusInfo.description}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Due Date:</span>
              <span className="font-medium text-gray-200">{new Date(dueDate).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Days Remaining:</span>
              <span className={`font-medium ${
                maintenanceStatus === 'overdue' || maintenanceStatus === 'expired' 
                  ? 'text-red-400' 
                  : isFreePeriodEndingSoon 
                  ? 'text-orange-400' 
                  : 'text-green-400'
              }`}>
                {daysRemaining > 0 ? `${daysRemaining} days` : 'Due today'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Total Maintenance Paid:</span>
              <span className="font-medium text-blue-400">
                ₹{Math.max(0, (project.paid_amount || 0) - (project.total_amount || 0)).toLocaleString()}
              </span>
            </div>
            {hasPaidMaintenance && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Plan:</span>
                  <span className="font-medium text-gray-200">
                    {effectiveMaintenanceData?.plan_name && effectiveMaintenanceData.plan_name !== 'Unknown' 
                      ? effectiveMaintenanceData.plan_name 
                      : 'Paid Plan'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Total Paid:</span>
                  <span className="font-medium text-blue-400">
                    ₹{(project.paid_amount || 0).toLocaleString()}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Maintenance Plans and Payment Options - Always Available */}
          <div className="mt-4 pt-4 border-t border-gray-600">
            {needsPayment ? (
                <div className="space-y-3">
                  <h5 className="font-medium text-red-400">Make Payment</h5>
                    <PaymentButton
                      projectId={project.id}
                      amount={maintenanceData?.maintenance_amount || 0}
                      projectTitle={`${project.title} - Maintenance Payment`}
                      paymentType="maintenance"
                      className="w-full"
                    />
                  </div>
              ) : (
                <div className="space-y-3">
                  <h5 className="font-medium text-gray-200">Available Maintenance Plans</h5>
                  <div className="grid gap-3">
                    {effectivePlans.map((plan) => {
                      const planAmount = Math.round(project.total_amount * plan.price_multiplier)
                      
                      return (
                        <div key={plan.id} className="p-3 bg-gray-700/50 border border-gray-600 rounded-lg">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h6 className="font-medium text-gray-100">{plan.name}</h6>
                              <p className="text-xs text-gray-400">{plan.description}</p>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-gray-100">₹{planAmount.toLocaleString()}</div>
                              <div className="text-xs text-gray-400">per {plan.duration_months > 1 ? `${plan.duration_months} months` : 'month'}</div>
                            </div>
                          </div>
                            
                          <div className="space-y-1 mb-3">
                            {(plan.features || []).length > 0 ? (
                              plan.features!.map((feature, index) => (
                                <div key={index} className="flex items-center text-xs text-gray-300">
                                  <CheckCircle className="h-3 w-3 text-green-400 mr-1 flex-shrink-0" />
                                  <span>{feature}</span>
                                </div>
                              ))
                            ) : (
                              <div className="text-xs text-gray-400">
                                {plan.description} - Duration: {plan.duration_months} month{plan.duration_months > 1 ? 's' : ''}
                              </div>
                            )}
                          </div>

                          <PaymentButton
                            projectId={project.id}
                            amount={planAmount}
                            projectTitle={`${project.title} - ${plan.name} Plan`}
                            paymentType="maintenance"
                            planId={plan.id}
                            className="w-full"
                            size="sm"
                          >
                            Choose {plan.name}
                          </PaymentButton>
                        </div>
                      )
                    })}
                  </div>
                  
                  {maintenanceStatus === 'free' && isFreePeriodEndingSoon && (
                    <div className="text-xs text-orange-400 mt-2">
                      💡 Pay now to start your maintenance plan immediately after the free period ends.
                    </div>
                  )}
                </div>
              )}
            </div>

          {/* Features included in current plan */}
          {maintenanceStatus === 'free' && (
            <div className="mt-4 pt-4 border-t border-gray-600">
              <h5 className="font-medium text-green-400 mb-2">What's Included in Free Period</h5>
              <div className="space-y-1">
                {[
                  'Bug fixes and critical issues',
                  'Security updates and patches',
                  'Basic technical support',
                  'Minor content updates'
                ].map((feature, index) => (
                  <div key={index} className="flex items-center text-xs text-green-300">
                    <CheckCircle className="h-3 w-3 text-green-400 mr-2 flex-shrink-0" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {maintenanceStatus === 'paid' && (
            <div className="mt-4 pt-4 border-t border-gray-600">
              <h5 className="font-medium text-blue-400 mb-2">Your Current Plan Benefits</h5>
              <div className="space-y-1">
                {effectivePlans
                  .find(plan => plan.name === maintenanceData?.plan_name)
                  ?.features?.map((feature, index) => (
                    <div key={index} className="flex items-center text-xs text-blue-300">
                      <CheckCircle className="h-3 w-3 text-blue-400 mr-2 flex-shrink-0" />
                      <span>{feature}</span>
                    </div>
                  )) || (
                    <div className="text-xs text-blue-300">All maintenance features included</div>
                  )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}