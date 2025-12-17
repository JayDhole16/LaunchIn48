"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import Image from "next/image"
import { CheckCircle } from "lucide-react"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  // Validate email format
  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return re.test(email)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate email before sending
    if (!validateEmail(email)) {
      setError("Please enter a valid email address")
      return
    }
    
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      
      // Create an AbortController to handle timeouts
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      // Send password reset email with timeout handling
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
        options: {
          // @ts-ignore - Add fetch options with AbortController
          fetchOptions: {
            signal: controller.signal
          }
        }
      });
      
      // Clear the timeout if the request completes
      clearTimeout(timeoutId);

      if (error) {
        console.error("Supabase error:", error)
        if (error.message.includes("Email not confirmed")) {
          setError("Please confirm your email address first before resetting your password")
        } else if (error.message.includes("User not found")) {
          // For security reasons, we don't tell the user if the email exists
          setSuccess(true)
        } else if (error.message.includes("rate limit")) {
          setError("Too many reset attempts. Please try again later.")
        } else {
          setError("Failed to send reset email. Please check the email address and try again.")
        }
        return
      }

      setSuccess(true)
    } catch (error: unknown) {
      console.error("Error:", error)
      if (error instanceof Error && error.message.includes("timed out")) {
        setError("The request is taking longer than expected. Please try again or contact support if the issue persists.")
      } else {
        setError(error instanceof Error ? error.message : "An error occurred. Please try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
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
              <div className="mx-auto mb-4">
                <CheckCircle className="h-12 w-12 text-green-500" />
              </div>
              <CardTitle className="text-2xl">Password Reset Email Sent</CardTitle>
              <CardDescription>
                Check your email for instructions to reset your password
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground mb-6 p-3 bg-muted/30 rounded-md border">
                <span className="font-medium">Didn't receive the email?</span>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Check your spam or junk folder</li>
                  <li>Make sure you entered the correct email address</li>
                  <li>Wait a few minutes for the email to arrive</li>
                </ul>
              </div>

              <div className="space-y-4">
                <Button 
                  onClick={() => router.push("/auth/login")} 
                  className="w-full"
                >
                  Back to Login
                </Button>
                
                <div className="text-center text-sm">
                  <button 
                    onClick={() => {
                      setSuccess(false)
                      setError(null)
                      setEmail("")
                    }}
                    className="text-primary hover:underline"
                  >
                    Resend Email
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
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
            <CardTitle className="text-2xl">Forgot Password</CardTitle>
            <CardDescription>
              Enter your email address and we'll send you a link to reset your password
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              {error && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>}

              <Button type="submit" className="w-full relative" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <span className="inline-block animate-pulse">Sending</span>
                    <span className="inline-block animate-bounce delay-75">.</span>
                    <span className="inline-block animate-bounce delay-100">.</span>
                    <span className="inline-block animate-bounce delay-150">.</span>
                  </>
                ) : "Send Reset Link"}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <p className="text-muted-foreground">
                Remember your password?{" "}
                <Link href="/auth/login" className="font-medium text-primary hover:underline">
                  Sign in
                </Link>
              </p>
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