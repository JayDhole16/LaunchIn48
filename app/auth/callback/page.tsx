"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export default function AuthCallbackPage() {
	const router = useRouter()

	useEffect(() => {
		const handleCallback = async () => {
			const supabase = createClient()

			try {
				// Attempt to process the session from the URL (OAuth redirect)
				// This will clear URL fragments and return the session/user when present.
				// If the SDK already processed the URL, this will be a no-op.
				// @ts-ignore - supabase client exposes getSessionFromUrl in the browser SDK
				const { data, error } = await supabase.auth.getSessionFromUrl().catch(() => ({ data: null, error: null }))

				if (error) {
					console.warn("OAuth callback returned error:", error)
				}

				// Prefer returned user, fallback to getUser()
				const user = data?.user ?? (await supabase.auth.getUser()).data?.user

				if (user) {
					try {
						const { data: profile } = await supabase.from("users").select("must_change_password, role").eq("id", user.id).single()
						
						// Check if user needs to change password first
						if (profile?.must_change_password) {
							router.replace("/auth/change-password")
							return
						}
						
						if (profile?.role === "admin") {
							router.replace("/admin")
							return
						}
					} catch (e) {
						// ignore lookup errors and continue to default
					}
				}

				// Default redirect
				router.replace("/dashboard")
			} catch (e) {
				// On any unexpected error navigate to dashboard
				router.replace("/dashboard")
			}
		}

		handleCallback()
	}, [router])

	return (
		<div className="min-h-screen flex items-center justify-center">
			<div className="text-center">
				<p className="text-lg">Signing you in…</p>
			</div>
		</div>
	)
}

