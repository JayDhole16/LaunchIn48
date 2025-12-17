import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import Image from "next/image"
import { CheckCircle, Mail } from "lucide-react"

export default function SignUpSuccessPage() {
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
            <div className="mx-auto mb-4 h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Thanks! We'll connect within 30 minutes</CardTitle>
            <CardDescription>Our team will call or email you shortly and create your account accordingly</CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg">
              <Mail className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                You don't need to do anything right now. We'll reach out within 30 minutes to confirm details and set up your access.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Need help sooner? Call us at <span className="font-semibold">+91 96995 68708</span></p>
            </div>

            <div className="flex flex-col space-y-2">
              <Link href="/auth/login">
                <Button className="w-full">Go to Login</Button>
              </Link>
              <Link href="/">
                <Button variant="outline" className="w-full bg-transparent">
                  Back to Home
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
