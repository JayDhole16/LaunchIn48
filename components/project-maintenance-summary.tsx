"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, ChevronUp, CreditCard, Calendar, Receipt, Wrench } from 'lucide-react'
import { MaintenancePaymentSummary, formatMaintenanceAmount } from '@/lib/maintenance-summary'

interface ProjectMaintenanceSummaryProps {
  projectId: string
  projectTitle: string
  maintenanceSummary?: MaintenancePaymentSummary | null
  showDetails?: boolean
}

export function ProjectMaintenanceSummary({ 
  projectId, 
  projectTitle, 
  maintenanceSummary,
  showDetails = false 
}: ProjectMaintenanceSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(showDetails)

  // Don't render if no maintenance payments
  if (!maintenanceSummary || maintenanceSummary.totalMaintenanceAmount === 0) {
    return null
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <Card className="border-blue-200 bg-blue-50/30">
      <CardHeader className="pb-3">
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center space-x-2">
            <Wrench className="h-4 w-4 text-blue-600" />
            <CardTitle className="text-sm font-medium text-blue-800">
              Maintenance Payments
            </CardTitle>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              {maintenanceSummary.paymentCount} payment{maintenanceSummary.paymentCount !== 1 ? 's' : ''}
            </Badge>
          </div>
          <div className="flex items-center space-x-2">
            <span className="font-bold text-blue-700">
              {formatMaintenanceAmount(maintenanceSummary.totalMaintenanceAmount)}
            </span>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-blue-600" />
            ) : (
              <ChevronDown className="h-4 w-4 text-blue-600" />
            )}
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0">
          <div className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              <div className="flex flex-col">
                <span className="text-gray-500">Total Spent</span>
                <span className="font-semibold text-blue-700">
                  {formatMaintenanceAmount(maintenanceSummary.totalMaintenanceAmount)}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-gray-500">Latest Plan</span>
                <span className="font-semibold text-gray-700">
                  {maintenanceSummary.latestPlanName || 'N/A'}
                </span>
              </div>
              {maintenanceSummary.lastPaymentDate && (
                <div className="flex flex-col">
                  <span className="text-gray-500">Last Payment</span>
                  <span className="font-semibold text-gray-700">
                    {formatDate(maintenanceSummary.lastPaymentDate)}
                  </span>
                </div>
              )}
            </div>

            {/* Payment History */}
            <div className="border-t border-blue-200 pt-3">
              <h4 className="text-sm font-medium text-blue-800 mb-2 flex items-center">
                <Receipt className="h-3 w-3 mr-1" />
                Payment History
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {maintenanceSummary.payments.map((payment, index) => (
                  <div 
                    key={payment.id} 
                    className="flex items-center justify-between p-2 bg-white/60 rounded-md border border-blue-100"
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <CreditCard className="h-3 w-3 text-gray-400" />
                        <span className="text-xs font-medium">
                          {formatMaintenanceAmount(payment.amount)}
                        </span>
                        {payment.planName && (
                          <Badge variant="outline" className="text-xs py-0 px-1 h-5">
                            {payment.planName}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <Calendar className="h-3 w-3 text-gray-400" />
                        <span className="text-xs text-gray-500">
                          {formatDate(payment.paymentDate)}
                        </span>
                        <Badge 
                          variant="outline" 
                          className="text-xs py-0 px-1 h-5 bg-green-100 text-green-700 border-green-200"
                        >
                          {payment.status}
                        </Badge>
                      </div>
                    </div>
                    {payment.razorpayPaymentId && (
                      <div className="text-xs text-gray-400 font-mono">
                        #{payment.razorpayPaymentId.slice(-6)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Additional Info */}
            {maintenanceSummary.firstPaymentDate && maintenanceSummary.lastPaymentDate && 
             maintenanceSummary.firstPaymentDate !== maintenanceSummary.lastPaymentDate && (
              <div className="border-t border-blue-200 pt-2">
                <div className="text-xs text-gray-500">
                  Maintenance period: {formatDate(maintenanceSummary.firstPaymentDate)} to {formatDate(maintenanceSummary.lastPaymentDate)}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  )
}

interface ProjectMaintenanceDropdownProps {
  projectId: string
  projectTitle: string
  maintenanceSummary?: MaintenancePaymentSummary | null
  className?: string
}

export function ProjectMaintenanceDropdown({ 
  projectId, 
  projectTitle, 
  maintenanceSummary,
  className = ""
}: ProjectMaintenanceDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Don't render if no maintenance payments
  if (!maintenanceSummary || maintenanceSummary.totalMaintenanceAmount === 0) {
    return (
      <div className={`text-xs text-gray-500 ${className}`}>
        No maintenance payments
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="h-6 px-2 text-xs bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
      >
        <Wrench className="h-3 w-3 mr-1" />
        {formatMaintenanceAmount(maintenanceSummary.totalMaintenanceAmount)}
        {isOpen ? (
          <ChevronUp className="h-3 w-3 ml-1" />
        ) : (
          <ChevronDown className="h-3 w-3 ml-1" />
        )}
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 z-50 min-w-80">
          <Card className="border-blue-200 bg-white shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-blue-800">
                Maintenance Payments for {projectTitle}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-gray-500">Total:</span>
                    <div className="font-semibold text-blue-700">
                      {formatMaintenanceAmount(maintenanceSummary.totalMaintenanceAmount)}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">Payments:</span>
                    <div className="font-semibold text-gray-700">
                      {maintenanceSummary.paymentCount}
                    </div>
                  </div>
                </div>

                {/* Recent Payments (limit to 3) */}
                <div>
                  <h4 className="text-xs font-medium text-gray-700 mb-1">Recent Payments</h4>
                  <div className="space-y-1">
                    {maintenanceSummary.payments.slice(0, 3).map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">
                            {formatMaintenanceAmount(payment.amount)}
                          </span>
                          {payment.planName && (
                            <Badge variant="outline" className="text-xs py-0 px-1 h-4">
                              {payment.planName}
                            </Badge>
                          )}
                        </div>
                        <span className="text-gray-500">
                          {new Date(payment.paymentDate).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                  {maintenanceSummary.paymentCount > 3 && (
                    <div className="text-xs text-gray-500 mt-1">
                      ...and {maintenanceSummary.paymentCount - 3} more payment{maintenanceSummary.paymentCount - 3 !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}