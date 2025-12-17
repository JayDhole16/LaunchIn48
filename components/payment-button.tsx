"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { CreditCard, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { getPaymentRedirectUrl } from "@/lib/payment-redirect"
import { extendProjectMaintenance } from "@/lib/maintenance-state"

interface PaymentButtonProps {
  projectId: string
  amount: number
  projectTitle: string
  disabled?: boolean
  allowAdvancePayment?: boolean
  paymentType?: 'project' | 'maintenance'
  planId?: string
  className?: string
  size?: 'sm' | 'default' | 'lg'
  children?: React.ReactNode
}

// Declare Razorpay type for TypeScript
declare global {
  interface Window {
    Razorpay: any
  }
}

export function PaymentButton({ 
  projectId, 
  amount, 
  projectTitle, 
  disabled = false, 
  allowAdvancePayment = false,
  paymentType = 'project',
  planId,
  className,
  size = 'default',
  children
}: PaymentButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handlePayment = async () => {
    setIsLoading(true)

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

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

      const configResponse = await fetch("/api/razorpay-config")
      const configData = await configResponse.json()

      if (!configResponse.ok) {
        throw new Error("Failed to get payment configuration")
      }

      // Create order using appropriate endpoint
      let response
      if (paymentType === 'maintenance') {
        // For maintenance payments, we need to get or create maintenance record first
        // This is a simplified approach - ideally should be handled better
        response = await fetch("/api/create-order", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: amount,
            currency: "INR",
            projectId: projectId,
            paymentType: paymentType,
            planId: planId,
          }),
        })
      } else {
        // Regular project payment
        response = await fetch("/api/create-order", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: amount,
            currency: "INR",
            projectId: projectId,
            paymentType: paymentType,
            planId: planId,
          }),
        })
      }

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
        description: `Payment for ${projectTitle}`,
        order_id: orderData.orderId,
        prefill: {
          name: userData?.full_name || "",
          email: userData?.email || "",
          contact: userData?.phone || "",
        },
        theme: {
          color: "#000000", // Primary color
        },
        handler: async (response: any) => {
          try {
            // Verify payment using appropriate endpoint
            const verifyEndpoint = paymentType === 'maintenance' 
              ? "/api/verify-maintenance-payment"
              : "/api/verify-payment"
              
            const verifyResponse = await fetch(verifyEndpoint, {
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
              // For maintenance payments, clear client-side state so dashboard shows fresh database data
              if (paymentType === 'maintenance' && verifyData.clearClientState) {
                console.log('🗑️ Clearing client maintenance state - payment processed via database')
                
                // Clear localStorage maintenance state
                if (typeof window !== 'undefined') {
                  try {
                    const stored = localStorage.getItem('launchin48_maintenance_state')
                    if (stored) {
                      const allStates = JSON.parse(stored)
                      delete allStates[projectId]
                      localStorage.setItem('launchin48_maintenance_state', JSON.stringify(allStates))
                      console.log('✅ Cleared maintenance state for project:', projectId)
                    }
                  } catch (error) {
                    console.error('Error clearing maintenance state:', error)
                  }
                }
                
                // Trigger event to refresh components
                window.dispatchEvent(new CustomEvent('payment-success', {
                  detail: {
                    projectId,
                    paymentType,
                    amount,
                    clearClientState: true
                  }
                }))
              } else if (paymentType === 'maintenance' && planId) {
                // Fallback: Use client-side state if backend doesn't clear it
                const planConfig = {
                  monthly: { name: 'Monthly', duration: 1 },
                  quarterly: { name: 'Quarterly', duration: 3 },
                  yearly: { name: 'Yearly', duration: 12 }
                }
                
                const config = planConfig[planId as keyof typeof planConfig]
                if (config) {
                  console.log('🔄 Fallback: Updating client maintenance state after payment:', {
                    projectId,
                    planName: config.name,
                    duration: config.duration,
                    amount
                  })
                  
                  extendProjectMaintenance(
                    projectId,
                    config.name,
                    planId,
                    config.duration,
                    amount
                  )
                  
                  // Trigger custom event for immediate UI update
                  window.dispatchEvent(new CustomEvent('payment-success', {
                    detail: {
                      projectId,
                      paymentType,
                      planId,
                      amount
                    }
                  }))
                }
              }
              
              // Payment successful - redirect appropriately
              const redirectUrl = getPaymentRedirectUrl(response.razorpay_payment_id)
              
              // If staying on payments page, do a full reload, otherwise use router
              if (typeof window !== 'undefined' && window.location.pathname === '/dashboard/payments') {
                window.location.href = redirectUrl
              } else {
                router.push(redirectUrl)
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

  return (
    <>
      <Button 
        onClick={handlePayment} 
        disabled={disabled || isLoading} 
        className={className || "w-full"}
        size={size}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : children ? (
          children
        ) : (
          <>
            <CreditCard className="mr-2 h-4 w-4" />
            Pay ₹{amount.toLocaleString()}
          </>
        )}
      </Button>
    </>
  )
}
