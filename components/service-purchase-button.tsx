"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { Loader2, ArrowRight, CreditCard, Banknote } from "lucide-react"
import { useRouter } from "next/navigation"
import { getPaymentRedirectUrl } from "@/lib/payment-redirect"

interface ServicePurchaseButtonProps {
  serviceId: string
  serviceName: string
  price: number
  description?: string
  className?: string
  allowAdvancePayment?: boolean
}

// Declare Razorpay type for TypeScript
declare global {
  interface Window {
    Razorpay: any
  }
}

export function ServicePurchaseButton({
  serviceId,
  serviceName,
  price,
  description = "",
  className = "",
  allowAdvancePayment = true,
}: ServicePurchaseButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showAdvancePayment, setShowAdvancePayment] = useState(false)
  const [advanceAmount, setAdvanceAmount] = useState(Math.ceil(price * 0.2)) // Minimum 20%
  const router = useRouter()

  const handlePurchase = async (paymentAmount?: number) => {
    setIsLoading(true)
    const finalAmount = paymentAmount || price
    const isAdvancePayment = paymentAmount && paymentAmount < price

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      // If not logged in, redirect to login with return URL
      if (!user) {
        const returnUrl = `/services?purchase=${serviceId}`
        router.push(`/auth/login?returnUrl=${encodeURIComponent(returnUrl)}`)
        return
      }

      // Prefer auth user metadata to avoid RLS recursion issues on users table
      const userData = {
        full_name: (user.user_metadata as any)?.full_name || (user as any)?.user_metadata?.name || "",
        email: user.email || "",
        phone: (user.user_metadata as any)?.phone || "",
      }

      console.log("Service name being queried:", serviceName)

      // Fetch service UUID with more flexible matching
      let serviceData, serviceError;
      
      // Get all services first to see what's available
      const { data: allServices, error: allServicesError } = await supabase
        .from("services")
        .select("id, name")
      
      console.log("Available services:", allServices)
      console.log("Looking for service:", serviceName)
      
      if (allServices && !allServicesError) {
        // Try various matching strategies
        const normalizedServiceName = serviceName.toLowerCase().replace(/[^a-z0-9]/g, '');
        
        // Strategy 1: Exact match
        let matchedService = allServices.find(service => 
          service.name.toLowerCase() === serviceName.toLowerCase()
        );
        
        // Strategy 2: Contains match
        if (!matchedService) {
          matchedService = allServices.find(service => 
            service.name.toLowerCase().includes(serviceName.toLowerCase()) ||
            serviceName.toLowerCase().includes(service.name.toLowerCase())
          );
        }
        
        // Strategy 3: Normalized match (remove special characters)
        if (!matchedService) {
          matchedService = allServices.find(service => {
            const normalizedDbName = service.name.toLowerCase().replace(/[^a-z0-9]/g, '');
            return normalizedDbName.includes(normalizedServiceName) ||
                   normalizedServiceName.includes(normalizedDbName);
          });
        }
        
        // Strategy 4: Keyword matching for common variations
        if (!matchedService) {
          const keywords = serviceName.toLowerCase().split(/\s+/);
          matchedService = allServices.find(service => {
            const serviceWords = service.name.toLowerCase().split(/\s+/);
            return keywords.some(keyword => 
              serviceWords.some(word => 
                word.includes(keyword) || keyword.includes(word)
              )
            );
          });
        }
        
        if (matchedService) {
          serviceData = matchedService;
          console.log("Found matching service:", matchedService);
        } else {
          serviceError = "No matching service found";
          console.error("No service match found for:", serviceName);
          console.error("Available services:", allServices.map(s => s.name));
        }
      } else {
        serviceError = allServicesError || "Failed to fetch services";
      }

      // Handle missing service gracefully
      if (serviceError || !serviceData) {
        console.error("=== SERVICE LOOKUP FAILED ===")
        console.error("Service error:", JSON.stringify(serviceError, null, 2))
        console.error("Looking for service:", serviceName)
        console.error("Available services:", allServices?.map(s => s.name) || [])
        
        const errorMsg = `The selected service "${serviceName}" is not available in the database. Available services: ${allServices?.map(s => s.name).join(', ') || 'None found'}`
        console.error(errorMsg)
        alert(errorMsg + " Please contact support.")
        setIsLoading(false)
        return
      }

      // Create project via server API (service role inserts to avoid RLS recursion)
      const projectCreateRes = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: serviceName,
          description: description,
          service_id: serviceData.id,
          requirements: description,
          total_amount: price,
          timeline: null,
        }),
      })

      const projectCreatePayload = await projectCreateRes.json().catch(() => ({}))
      if (!projectCreateRes.ok) {
        console.error('=== PROJECT CREATION FAILED ===')
        console.error('Project error:', projectCreatePayload)
        throw new Error(projectCreatePayload?.error || 'Failed to create project')
      }
      const project = projectCreatePayload.project

      // Get Razorpay configuration
      const configResponse = await fetch("/api/razorpay-config")
      const configData = await configResponse.json()

      if (!configResponse.ok) {
        throw new Error(configData.error || "Failed to get payment configuration")
      }

      // Create order
      console.log("Creating order with:", {
        amount: finalAmount,
        currency: "INR",
        projectId: project.id,
        isAdvancePayment: isAdvancePayment,
      })
      
      const response = await fetch("/api/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: finalAmount,
          currency: "INR",
          projectId: project.id,
          isAdvancePayment: isAdvancePayment,
        }),
      })

      console.log("Create order response status:", response.status)
      console.log("Create order response headers:", response.headers)
      
      // Check if response is actually JSON
      const responseText = await response.text()
      console.log("Raw response text:", responseText)
      
      let orderData
      try {
        orderData = JSON.parse(responseText)
        console.log("Parsed order data:", orderData)
      } catch (parseError) {
        console.error("Failed to parse JSON response:", parseError)
        console.error("Response was:", responseText)
        throw new Error(`Server returned invalid response. Status: ${response.status}. Response: ${responseText.substring(0, 200)}...`)
      }

      if (!response.ok) {
        const errorMessage = orderData.error || `Failed to create order: ${response.status}`
        console.error("Order creation failed:", errorMessage)
        console.error("Full error response:", orderData)
        throw new Error(errorMessage)
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
      const paymentDescription = isAdvancePayment 
        ? `Advance Payment for ${serviceName} (₹${finalAmount} of ₹${price})`
        : `Payment for ${serviceName}`
      
      const options = {
        key: configData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "LaunchIn 48",
        description: paymentDescription,
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
    } catch (error: any) {
      console.error("Payment error:", error)
      alert(error.message || "Failed to initiate payment. Please try again.")
      setIsLoading(false)
    }
  }

  const minAdvanceAmount = Math.ceil(price * 0.2) // 20% minimum
  
  const handleAdvanceAmountChange = (value: string) => {
    // Allow empty input for user to type
    if (value === '') {
      setAdvanceAmount(0)
      return
    }
    
    const amount = parseInt(value) || 0
    // Allow user to type any amount, but validate before payment
    setAdvanceAmount(amount)
  }

  if (showAdvancePayment && allowAdvancePayment) {
    return (
      <>
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-lg">Payment Options</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Project Amount: ₹{price.toLocaleString()}
            </div>
          
          <div className="space-y-4">
            {/* Full Payment Option */}
            <Button 
              onClick={() => handlePurchase(price)} 
              disabled={isLoading}
              className="w-full justify-between"
              variant="outline"
            >
              <div className="flex items-center">
                <CreditCard className="mr-2 h-4 w-4" />
                Pay Full Amount
              </div>
              <span>₹{price.toLocaleString()}</span>
            </Button>
            
            {/* Advance Payment Option */}
            <div className="space-y-2">
              <Label>Advance Payment (Min: {Math.round((minAdvanceAmount/price)*100)}%)</Label>
              <div className="flex space-x-2">
                <Input
                  type="number"
                  value={advanceAmount}
                  onChange={(e) => handleAdvanceAmountChange(e.target.value)}
                  min={minAdvanceAmount}
                  max={price}
                  className="flex-1"
                />
                <Button 
                  onClick={() => {
                    // Validate amount before payment
                    if (advanceAmount < minAdvanceAmount) {
                      alert(`Minimum advance payment is ₹${minAdvanceAmount.toLocaleString()} (20% of total amount)`)
                      return
                    }
                    if (advanceAmount > price) {
                      alert(`Advance payment cannot exceed the total service amount of ₹${price.toLocaleString()}`)
                      return
                    }
                    handlePurchase(advanceAmount)
                  }} 
                  disabled={isLoading || advanceAmount <= 0}
                  className="px-6"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Banknote className="mr-2 h-4 w-4" />
                      Pay ₹{advanceAmount.toLocaleString()}
                    </>
                  )}
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">
                {advanceAmount > 0 && advanceAmount <= price ? (
                  <>Remaining: ₹{(price - advanceAmount).toLocaleString()} (to be paid after project completion)</>
                ) : advanceAmount < minAdvanceAmount ? (
                  <span className="text-red-500">⚠️ Minimum advance payment is ₹{minAdvanceAmount.toLocaleString()} (20%)</span>
                ) : advanceAmount > price ? (
                  <span className="text-red-500">⚠️ Amount cannot exceed total service cost of ₹{price.toLocaleString()}</span>
                ) : null}
              </div>
            </div>
          </div>
          
          <Button 
            variant="ghost" 
            onClick={() => setShowAdvancePayment(false)}
            className="w-full"
            disabled={isLoading}
          >
            Back
          </Button>
        </CardContent>
      </Card>
    </>
    )
  }

  return (
    <>
      <div className="space-y-2">
        <Button 
          onClick={() => allowAdvancePayment ? setShowAdvancePayment(true) : handlePurchase()} 
          disabled={isLoading}
          className={`w-full glow-button ${className}`}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
        {allowAdvancePayment && (
          <div className="text-center">
            <Button 
              variant="link" 
              size="sm" 
              onClick={() => setShowAdvancePayment(true)}
              className="text-xs"
              disabled={isLoading}
            >
              Choose payment option
            </Button>
          </div>
        )}
      </div>
    </>
  )
}