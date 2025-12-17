"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"

export default function SignUpPage() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    companyName: "",
    notes: "",
  })
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    // Validate all required fields
    if (!formData.fullName.trim()) {
      setError("❌ Please enter your full name")
      setIsLoading(false)
      return
    }

    if (!formData.email.trim()) {
      setError("❌ Please enter your email address")
      setIsLoading(false)
      return
    }

    if (!formData.phone.trim()) {
      setError("❌ Please enter your phone number")
      setIsLoading(false)
      return
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      setError("❌ Please enter a valid email address")
      setIsLoading(false)
      return
    }

    // Validate phone number (supports various formats)
    const cleanPhone = formData.phone.replace(/[\s\-\(\)\+]/g, '')
    const phoneRegex = /^[0-9]{10,15}$/
    if (!phoneRegex.test(cleanPhone)) {
      setError("❌ Please enter a valid phone number (10-15 digits only)")
      setIsLoading(false)
      return
    }

    // Additional validation for Indian phone numbers (optional but recommended)
    if (cleanPhone.length === 10 && !cleanPhone.match(/^[6-9][0-9]{9}$/)) {
      setError("❌ Please enter a valid mobile number")
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true);
      setError(null);
      // Send manual signup email to admin
      const res = await fetch('/api/manual-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          companyName: formData.companyName || null,
          notes: formData.notes || null,
        }),
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        throw new Error(payload?.error || 'Failed to submit request. Please try calling us directly.')
      }

      router.push("/auth/sign-up-success")
    } catch (error: unknown) {
      console.error("Registration error:", error);
      if (error instanceof Error && error.message.includes("timeout")) {
        setError("Registration is taking longer than expected. Please try again or contact support if the issue persists.");
      } else {
        setError(error instanceof Error ? error.message : "An error occurred during registration. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center space-x-2">
            <Image src="/images/logo.png" alt="LaunchIn 48" width={48} height={48} className="h-12 w-12" />
            <span className="text-2xl font-bold text-primary">LaunchIn 48</span>
          </Link>
        </div>

        <Card>
            <CardHeader className="text-center">
            <CardTitle className="text-2xl">Fill the form to connect with us</CardTitle>
            <CardDescription>Share your details and we'll reach out to set up your account</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground mb-6 p-3 bg-muted/30 rounded-md border">
              <span className="font-medium">Required Information:</span> Fields marked with <span className="text-red-500 font-semibold">*</span> are required to create your account
            </div>
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name <span className="text-red-500">*</span></Label>
                <Input
                  id="fullName"
                  name="fullName"
                  type="text"
                  placeholder="Enter your full name"
                  required
                  value={formData.fullName}
                  onChange={handleInputChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Enter your email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number <span className="text-red-500">*</span></Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="Enter your phone number"
                  required
                  value={formData.phone}
                  onChange={handleInputChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name (Optional)</Label>
                <Input
                  id="companyName"
                  name="companyName"
                  type="text"
                  placeholder="Enter your company name"
                  value={formData.companyName}
                  onChange={handleInputChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Input
                  id="notes"
                  name="notes"
                  type="text"
                  placeholder="Share anything we should know"
                  value={formData.notes}
                  onChange={handleInputChange}
                />
              </div>

              {error && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>}

              <Button type="submit" className="w-full relative" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <span className="inline-block animate-pulse">Creating account</span>
                    <span className="inline-block animate-bounce delay-75">.</span>
                    <span className="inline-block animate-bounce delay-100">.</span>
                    <span className="inline-block animate-bounce delay-150">.</span>
                  </>
                ) : "Create Account"}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <p className="text-muted-foreground">Have questions? Call us at <span className="font-semibold">+91 96995 68708</span></p>
            </div>

            <div className="mt-4 text-center">
              <Link href="/" className="text-sm text-muted-foreground hover:text-primary">
                ← Back to Home
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}