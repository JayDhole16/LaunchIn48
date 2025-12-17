"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import Image from 'next/image'
import { Loader2 } from 'lucide-react'

export default function CompleteProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    companyName: ''
  })

  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient()
      
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        
        if (error || !user) {
          router.push('/auth/login')
          return
        }

        // Get existing user data
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single()

        if (userError && userError.code !== 'PGRST116') {
          console.error('Error fetching user data:', userError)
          setError('Error loading profile. Please try again.')
          setLoading(false)
          return
        }

        setUser(user)
        
        // Pre-fill form with existing data
        setFormData({
          fullName: userData?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || '',
          phone: userData?.phone || '',
          companyName: userData?.company_name || ''
        })
        
        setLoading(false)
      } catch (error) {
        console.error('Error in profile completion setup:', error)
        setError('An error occurred. Please try again.')
        setLoading(false)
      }
    }

    getUser()
  }, [router])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsSubmitting(true)
    setError(null)

    // Validation
    if (!formData.fullName.trim()) {
      setError('❌ Please enter your full name')
      setIsSubmitting(false)
      return
    }

    if (!formData.phone.trim()) {
      setError('❌ Please enter your phone number')
      setIsSubmitting(false)
      return
    }

    // Validate phone number
    const cleanPhone = formData.phone.replace(/[\\s\\-\\(\\)\\+]/g, '')
    const phoneRegex = /^[0-9]{10,15}$/
    if (!phoneRegex.test(cleanPhone)) {
      setError('❌ Please enter a valid phone number (10-15 digits)')
      setIsSubmitting(false)
      return
    }

    // Additional validation for Indian phone numbers
    if (cleanPhone.length === 10 && !cleanPhone.match(/^[6-9][0-9]{9}$/)) {
      setError('❌ Please enter a valid mobile number')
      setIsSubmitting(false)
      return
    }

    try {
      // Update user profile
      const { error } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          email: user.email,
          full_name: formData.fullName.trim(),
          phone: formData.phone.trim(),
          company_name: formData.companyName.trim() || null,
          role: 'customer'
        })

      if (error) {
        console.error('Error updating profile:', error)
        setError('Failed to update profile. Please try again.')
        setIsSubmitting(false)
        return
      }

      // Check user role for redirect
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      if (userData?.role === 'admin') {
        router.push('/admin')
      } else {
        router.push('/dashboard')
      }
    } catch (error) {
      console.error('Error completing profile:', error)
      setError('An error occurred. Please try again.')
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Loading Profile...</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          </CardContent>
        </Card>
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
            <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
            <CardDescription>
              We need a few more details to set up your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-blue-600 mb-6 p-3 bg-blue-50 rounded-md border border-blue-200">
              <span className="font-medium">Almost there!</span> Please provide the required information to complete your Google sign-up.
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
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

              {error && (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Completing Setup...
                  </>
                ) : (
                  'Complete Profile'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => router.push('/auth/login')}
                className="text-sm text-muted-foreground hover:text-primary"
              >
                ← Back to Sign In
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}