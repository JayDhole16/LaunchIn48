"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

export default function TestSupabasePage() {
  const [status, setStatus] = useState<string>("Testing...")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const testSupabase = async () => {
      try {
        const supabase = createClient()
        setStatus("Supabase client created successfully")
        
        // Test a simple query
        const { data, error } = await supabase.from('users').select('id').limit(1)
        
        if (error) {
          setError(`Supabase error: ${error.message}`)
          setStatus("Test completed with error")
        } else {
          setStatus(`Supabase test successful. Found ${data?.length || 0} records`)
        }
      } catch (err) {
        setError(`Client error: ${err instanceof Error ? err.message : 'Unknown error'}`)
        setStatus("Test failed")
      }
    }

    testSupabase()
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-4">
        <h1 className="text-2xl font-bold text-center">Supabase Client Test</h1>
        <div className="p-4 bg-muted rounded-md">
          <p className="font-medium">Status:</p>
          <p>{status}</p>
        </div>
        {error && (
          <div className="p-4 bg-destructive/10 text-destructive rounded-md">
            <p className="font-medium">Error:</p>
            <p>{error}</p>
          </div>
        )}
      </div>
    </div>
  )
}