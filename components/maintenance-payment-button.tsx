"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"
import { Calendar, CreditCard, Loader2, AlertTriangle, CheckCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { getMaintenancePaymentRedirectUrl } from "@/lib/payment-redirect"

interface MaintenancePaymentButtonProps {
  projectMaintenanceId: string
  projectTitle: string
  maintenanceAmount: number
  planName: string
  nextPaymentDue: string
  status: 'active' | 'expired' | 'suspended' | 'cancelled'
  daysRemaining: number
}

interface MaintenancePlan {
  id: string
  name: string
  duration_months: number
  base_price: number
  price_multiplier: number
  description: string
}

// Declare Razorpay type for TypeScript
declare global {
  interface Window {
    Razorpay: any
  }
}

export function MaintenancePaymentButton({
  projectMaintenanceId,
  projectTitle,
  maintenanceAmount,
  planName,
  nextPaymentDue,
  status,
  daysRemaining
}: MaintenancePaymentButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showPlanSelection, setShowPlanSelection] = useState(false)
  const [plans, setPlans] = useState<MaintenancePlan[]>([])
  const [selectedPlanId, setSelectedPlanId] = useState<string>("")
  const router = useRouter()

  useEffect(() => {
    fetchPlans()
  }, [])

  const fetchPlans = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('maintenance_plans')
        .select('*')
        .order('duration_months')

      if (error) throw error
      setPlans(data || [])
    } catch (error) {
      console.error('Error fetching plans:', error)
    }
  }

  const calculateNewAmount = (planMultiplier: number, baseAmount: number) => {
    return Math.round(baseAmount * planMultiplier)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'expired':
        return 'bg-red-100 text-red-800'
      case 'suspended':
        return 'bg-yellow-100 text-yellow-800'
      case 'cancelled':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getDaysRemainingColor = (days: number) => {
    if (days < 0) return 'text-red-600 font-semibold'
    if (days <= 5) return 'text-orange-600 font-semibold'
    return 'text-green-600'
  }

  const handlePayment = async (useCurrentPlan: boolean = true) => {
    setIsLoading(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push("/auth/login")
        return
      }

      // Get user details
      const { data: userData } = await supabase
        .from("users")
        .select("full_name, email, phone")
        .eq("id", user.id)
        .single()

      let paymentAmount = maintenanceAmount
      let paymentPlanName = planName
      let paymentPeriodStart = nextPaymentDue
      let paymentPeriodEnd = nextPaymentDue

      // If changing plan, calculate new amount and period
      if (!useCurrentPlan && selectedPlanId) {
        const selectedPlan = plans.find(p => p.id === selectedPlanId)
        if (selectedPlan) {
          // Get base amount from current maintenance record
          const { data: maintenanceData } = await supabase
            .from('project_maintenance')
            .select('base_amount')
            .eq('id', projectMaintenanceId)
            .single()

          if (maintenanceData) {
            paymentAmount = calculateNewAmount(selectedPlan.price_multiplier, maintenanceData.base_amount)
            paymentPlanName = selectedPlan.name
            
            // Calculate period end based on new plan duration
            const startDate = new Date(nextPaymentDue)
            const endDate = new Date(startDate)
            endDate.setMonth(endDate.getMonth() + selectedPlan.duration_months)
            paymentPeriodEnd = endDate.toISOString().split('T')[0]
          }
        }
      } else {
        // Calculate period end based on current plan
        const currentPlan = plans.find(p => p.name === planName)
        if (currentPlan) {
          const startDate = new Date(nextPaymentDue)
          const endDate = new Date(startDate)
          endDate.setMonth(endDate.getMonth() + currentPlan.duration_months)
          paymentPeriodEnd = endDate.toISOString().split('T')[0]
        }
      }

      // Get Razorpay configuration
      const configResponse = await fetch("/api/razorpay-config")
      const configData = await configResponse.json()

      if (!configResponse.ok) {
        throw new Error("Failed to get payment configuration")
      }

      // Create maintenance order
      const response = await fetch("/api/create-maintenance-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectMaintenanceId,
          amount: paymentAmount,
          planName: paymentPlanName,
          paymentPeriodStart,
          paymentPeriodEnd,
        }),
      })

      const orderData = await response.json()

      if (!response.ok) {
        throw new Error(orderData.error || "Failed to create order")
      }

      // Load Razorpay script if not already loaded
      if (!window.Razorpay) {
        const script = document.createElement("script")
        script.src = "https://checkout.razorpay.com/v1/checkout.js"
        script.async = true
        document.body.appendChild(script)

        await new Promise((resolve) => {
          script.onload = resolve
        })
      }

      // Configure Razorpay options
      const options = {
        key: configData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "LaunchIn 48",
        description: `Maintenance Payment for ${projectTitle} (${paymentPlanName})`,
        order_id: orderData.orderId,
        prefill: {
          name: userData?.full_name || "",
          email: userData?.email || "",
          contact: userData?.phone || "",
        },
        theme: {
          color: "#000000",
        },
        handler: async (response: any) => {
          try {
            // Verify payment
            const verifyResponse = await fetch("/api/verify-maintenance-payment", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            })

            const verifyData = await verifyResponse.json()

            if (verifyResponse.ok) {
               // Payment successful - reload the current page so the updated maintenance
              // status shows immediately (stays in the same section/page).
              if (typeof window !== 'undefined') {
                window.location.reload()
              } else {
                // No-op on server side; client will handle reload when available.
              }
            } else {
              throw new Error(verifyData.error || "Payment verification failed")
            }
          } catch (error) {
            console.error("Payment verification error:", error)
            alert("Payment verification failed. Please contact support.")
          }
        },
        modal: {
          ondismiss: () => {
            setIsLoading(false)
          },
        },
      }

      // Open Razorpay checkout
      const razorpay = new window.Razorpay(options)
      razorpay.open()
    } catch (error) {
      console.error("Payment error:", error)
      alert("Failed to initiate payment. Please try again.")
      setIsLoading(false)
    }
  }

  if (status === 'cancelled') {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center text-gray-600">
            <CheckCircle className="mr-2 h-5 w-5" width={20} height={20} />
            Maintenance Cancelled
          </CardTitle>
          <CardDescription>
            Maintenance for this project has been cancelled.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (showPlanSelection) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Change Maintenance Plan</CardTitle>
          <CardDescription>
            Choose a new maintenance plan for {projectTitle}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Select New Plan</label>
            <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a plan" />
              </SelectTrigger>
              <SelectContent>
                {plans.map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    <div className="flex justify-between items-center w-full">
                      <span>{plan.name}</span>
                      <span className="ml-4 text-xs text-muted-foreground">
                        {plan.duration_months} month{plan.duration_months > 1 ? 's' : ''}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedPlanId && (
            <div className="space-y-2">
              {(() => {
                const selectedPlan = plans.find(p => p.id === selectedPlanId)
                if (!selectedPlan) return null

                // Estimate new amount based on current base amount
                const estimatedAmount = Math.round(
                  maintenanceAmount * selectedPlan.price_multiplier /
                  (plans.find(p => p.name === planName)?.price_multiplier ?? 1)
                )

                return (
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-sm">
                      <div className="font-medium">{selectedPlan.name} Plan</div>
                      <div className="text-muted-foreground">{selectedPlan.description}</div>
                      <div className="mt-2 font-medium">
                        Estimated Amount: ₹{estimatedAmount.toLocaleString()}
                      </div>
                    </div>
                  </div>
                )
              })()}
            </div>
          )}

          <div className="flex space-x-2">
            <Button
              onClick={() => handlePayment(false)}
              disabled={isLoading || !selectedPlanId}
              className="flex-1"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" width={16} height={16} />
              ) : (
                <CreditCard className="mr-2 h-4 w-4" width={16} height={16} />
              )}
              Pay Now
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowPlanSelection(false)}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Maintenance Payment</span>
          <Badge className={getStatusColor(status)} variant="secondary">
            {status}
          </Badge>
        </CardTitle>
        <CardDescription>{projectTitle}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Current Plan:</span>
            <span className="font-medium">{planName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Amount Due:</span>
            <span className="font-medium">₹{maintenanceAmount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Due Date:</span>
            <span className={getDaysRemainingColor(daysRemaining)}>
              {new Date(nextPaymentDue).toLocaleDateString()}
              {daysRemaining < 0 ? (
                <span className="ml-1">({Math.abs(daysRemaining)} days overdue)</span>
              ) : daysRemaining <= 5 ? (
                <span className="ml-1">({daysRemaining} days left)</span>
              ) : null}
            </span>
          </div>
        </div>

        {daysRemaining < 0 && (
          <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-lg text-red-800">
            <AlertTriangle className="mr-2 h-4 w-4 flex-shrink-0" width={16} height={16} />
            <span className="text-sm">Payment is overdue. Please pay immediately to continue service.</span>
          </div>
        )}

        {daysRemaining >= 0 && daysRemaining <= 5 && (
          <div className="flex items-center p-3 bg-orange-50 border border-orange-200 rounded-lg text-orange-800">
            <Calendar className="mr-2 h-4 w-4 flex-shrink-0" width={16} height={16} />
            <span className="text-sm">Payment due soon. Pay now to avoid service interruption.</span>
          </div>
        )}

        <div className="space-y-2">
          <Button
            onClick={() => handlePayment(true)}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" width={16} height={16} />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="mr-2 h-4 w-4" width={16} height={16} />
                Pay ₹{maintenanceAmount.toLocaleString()}
              </>
            )}
          </Button>

          <Button
            variant="outline"
            onClick={() => setShowPlanSelection(true)}
            disabled={isLoading}
            className="w-full"
          >
            Change Plan & Pay
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}