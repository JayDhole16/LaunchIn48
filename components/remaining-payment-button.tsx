"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { CreditCard, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { getPaymentRedirectUrl } from "@/lib/payment-redirect"

interface RemainingPaymentButtonProps {
  projectId: string
  remainingAmount: number
  projectTitle: string
  paidAmount: number
  totalAmount: number
  disabled?: boolean
}

// Declare Razorpay type for TypeScript
declare global {
  interface Window {
    Razorpay: any
  }
}

export function RemainingPaymentButton({ 
  projectId, 
  remainingAmount, 
  projectTitle,
  paidAmount,
  totalAmount,
  disabled = false 
}: RemainingPaymentButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleRemainingPayment = async () => {
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

      // Create order for remaining amount
      const response = await fetch("/api/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: remainingAmount,
          currency: "INR",
          projectId: projectId,
          isRemainingPayment: true,
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
        description: `Remaining Payment for ${projectTitle}`,
        order_id: orderData.orderId,
        prefill: {
          name: userData?.full_name || "",
          email: userData?.email || "",
          contact: userData?.phone || "",
        },
        notes: {
          project_id: projectId,
          payment_type: "remaining",
          paid_amount: paidAmount,
          total_amount: totalAmount,
        },
        theme: {
          color: "#000000",
        },
        handler: async (response: any) => {
          try {
            // Verify payment
            const verifyResponse = await fetch("/api/verify-payment", {
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
        onClick={handleRemainingPayment} 
        disabled={disabled || isLoading || remainingAmount <= 0}
        className="w-full"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="mr-2 h-4 w-4" />
            Pay Remaining ₹{remainingAmount.toLocaleString()}
          </>
        )}
      </Button>
    </>
  )
}