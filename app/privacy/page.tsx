import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Shield, Eye, Database, Lock, Users, Cookie } from "lucide-react"

export default function PrivacyPage() {
  return (
    <div className="min-h-screen">
      <Header />

      {/* Hero Section */}
      <section className="py-20 lg:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <Badge variant="secondary" className="mb-4">
              <Shield className="h-3 w-3 mr-1" />
              Privacy & Security
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold text-balance mb-6">
              Privacy <span className="text-primary">Policy</span>
            </h1>
            <p className="text-xl text-muted-foreground text-pretty mb-8 max-w-2xl mx-auto">
              Your privacy is important to us. This policy explains how we collect, use, and protect your information.
            </p>
            <div className="text-sm text-muted-foreground">
              Last updated: {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
        </div>
      </section>

      {/* Privacy Policy Content */}
      <section className="pb-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto space-y-8">
            
            {/* Introduction */}
            <Card>
              <CardContent className="p-8">
                <div className="flex items-center mb-6">
                  <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center mr-4">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold">1. Introduction</h2>
                </div>
                <div className="prose prose-gray max-w-none">
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    LaunchIn48 ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website www.launchin48.com or use our services.
                  </p>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    This policy applies to all services offered by LaunchIn48, including website development, chatbot development, digital marketing, and related services. By using our services, you consent to the data practices described in this policy.
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "last updated" date.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Information We Collect */}
            <Card>
              <CardContent className="p-8">
                <div className="flex items-center mb-6">
                  <div className="h-10 w-10 bg-blue-500/10 rounded-lg flex items-center justify-center mr-4">
                    <Database className="h-5 w-5 text-blue-500" />
                  </div>
                  <h2 className="text-2xl font-bold">2. Information We Collect</h2>
                </div>
                <div className="prose prose-gray max-w-none">
                  <h3 className="font-semibold mb-3">2.1 Personal Information</h3>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    We collect personal information you voluntarily provide when you:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-6">
                    <li>Fill out contact forms or request consultations</li>
                    <li>Create an account on our platform</li>
                    <li>Make payments for our services</li>
                    <li>Communicate with us via email, phone, or chat</li>
                    <li>Subscribe to our newsletters or marketing materials</li>
                  </ul>
                  
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    This information may include:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-6">
                    <li>Name and contact information (email, phone number, address)</li>
                    <li>Company name and business information</li>
                    <li>Project requirements and specifications</li>
                    <li>Payment information (processed securely through Razorpay)</li>
                    <li>Communication preferences</li>
                  </ul>

                  <h3 className="font-semibold mb-3">2.2 Automatically Collected Information</h3>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    When you visit our website, we automatically collect certain information:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-6">
                    <li>IP address and location data</li>
                    <li>Browser type and version</li>
                    <li>Device information and operating system</li>
                    <li>Pages visited and time spent on our website</li>
                    <li>Referral sources and exit pages</li>
                    <li>Cookies and similar tracking technologies</li>
                  </ul>

                  <h3 className="font-semibold mb-3">2.3 Project-Related Information</h3>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    During service delivery, we may collect and process:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                    <li>Content, images, and materials you provide for projects</li>
                    <li>Branding guidelines and design preferences</li>
                    <li>Business processes and workflow information</li>
                    <li>Feedback and revision requests</li>
                    <li>Usage analytics for delivered solutions</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* How We Use Information */}
            <Card>
              <CardContent className="p-8">
                <div className="flex items-center mb-6">
                  <div className="h-10 w-10 bg-green-500/10 rounded-lg flex items-center justify-center mr-4">
                    <Eye className="h-5 w-5 text-green-500" />
                  </div>
                  <h2 className="text-2xl font-bold">3. How We Use Your Information</h2>
                </div>
                <div className="prose prose-gray max-w-none">
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    We use the collected information for the following purposes:
                  </p>
                  
                  <h3 className="font-semibold mb-3">3.1 Service Delivery</h3>
                  <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-6">
                    <li>Provide website development, chatbot development, and related services</li>
                    <li>Communicate with you about project requirements and progress</li>
                    <li>Process payments and maintain billing records</li>
                    <li>Provide customer support and technical assistance</li>
                    <li>Deliver maintenance and ongoing support services</li>
                  </ul>

                  <h3 className="font-semibold mb-3">3.2 Business Operations</h3>
                  <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-6">
                    <li>Improve our services and develop new offerings</li>
                    <li>Analyze usage patterns and service performance</li>
                    <li>Conduct market research and customer satisfaction surveys</li>
                    <li>Maintain security and prevent fraud</li>
                    <li>Comply with legal obligations and regulations</li>
                  </ul>

                  <h3 className="font-semibold mb-3">3.3 Marketing and Communication</h3>
                  <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                    <li>Send service updates and maintenance notifications</li>
                    <li>Provide information about new services or features</li>
                    <li>Send promotional materials (with your consent)</li>
                    <li>Respond to your inquiries and support requests</li>
                    <li>Create case studies and testimonials (with permission)</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Information Sharing */}
            <Card>
              <CardContent className="p-8">
                <div className="flex items-center mb-6">
                  <div className="h-10 w-10 bg-purple-500/10 rounded-lg flex items-center justify-center mr-4">
                    <Users className="h-5 w-5 text-purple-500" />
                  </div>
                  <h2 className="text-2xl font-bold">4. Information Sharing and Disclosure</h2>
                </div>
                <div className="prose prose-gray max-w-none">
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:
                  </p>

                  <h3 className="font-semibold mb-3">4.1 Service Providers</h3>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    We may share information with trusted third-party service providers who assist us in:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-6">
                    <li>Payment processing (Razorpay for secure transactions)</li>
                    <li>Email marketing and communication services</li>
                    <li>Cloud hosting and data storage (Supabase, Vercel)</li>
                    <li>Analytics and performance monitoring</li>
                    <li>Customer support platforms</li>
                  </ul>

                  <h3 className="font-semibold mb-3">4.2 Legal Requirements</h3>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    We may disclose your information if required by law or if we believe such action is necessary to:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-6">
                    <li>Comply with legal process or government requests</li>
                    <li>Protect our rights, property, or safety</li>
                    <li>Protect the rights, property, or safety of our users</li>
                    <li>Investigate fraud or security issues</li>
                    <li>Enforce our terms and conditions</li>
                  </ul>

                  <h3 className="font-semibold mb-3">4.3 Business Transfers</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    In the event of a merger, acquisition, or sale of assets, your information may be transferred as part of the transaction. We will provide notice before your information is transferred and becomes subject to a different privacy policy.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Data Security */}
            <Card>
              <CardContent className="p-8">
                <div className="flex items-center mb-6">
                  <div className="h-10 w-10 bg-red-500/10 rounded-lg flex items-center justify-center mr-4">
                    <Lock className="h-5 w-5 text-red-500" />
                  </div>
                  <h2 className="text-2xl font-bold">5. Data Security</h2>
                </div>
                <div className="prose prose-gray max-w-none">
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
                  </p>

                  <h3 className="font-semibold mb-3">5.1 Security Measures</h3>
                  <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-6">
                    <li>SSL/TLS encryption for data transmission</li>
                    <li>Encrypted database storage</li>
                    <li>Regular security audits and updates</li>
                    <li>Access controls and authentication systems</li>
                    <li>Employee training on data protection</li>
                    <li>Incident response procedures</li>
                  </ul>

                  <h3 className="font-semibold mb-3">5.2 Payment Security</h3>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    All payment information is processed securely through Razorpay, a PCI-DSS compliant payment processor. We do not store your credit card or debit card information on our servers.
                  </p>

                  <h3 className="font-semibold mb-3">5.3 Data Breach Notification</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    In the unlikely event of a data breach that affects your personal information, we will notify you and relevant authorities as required by applicable laws, typically within 72 hours of discovery.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Cookies and Tracking */}
            <Card>
              <CardContent className="p-8">
                <div className="flex items-center mb-6">
                  <div className="h-10 w-10 bg-orange-500/10 rounded-lg flex items-center justify-center mr-4">
                    <Cookie className="h-5 w-5 text-orange-500" />
                  </div>
                  <h2 className="text-2xl font-bold">6. Cookies and Tracking Technologies</h2>
                </div>
                <div className="prose prose-gray max-w-none">
                  <h3 className="font-semibold mb-3">6.1 What Are Cookies</h3>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    Cookies are small text files stored on your device when you visit our website. They help us provide you with a better browsing experience and analyze how our website is used.
                  </p>

                  <h3 className="font-semibold mb-3">6.2 Types of Cookies We Use</h3>
                  <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-6">
                    <li><strong>Essential Cookies:</strong> Necessary for basic website functionality</li>
                    <li><strong>Authentication Cookies:</strong> Keep you logged in to your account</li>
                    <li><strong>Analytics Cookies:</strong> Help us understand website usage and performance</li>
                    <li><strong>Preference Cookies:</strong> Remember your settings and preferences</li>
                    <li><strong>Marketing Cookies:</strong> Used for targeted advertising (with consent)</li>
                  </ul>

                  <h3 className="font-semibold mb-3">6.3 Managing Cookies</h3>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    You can control cookies through your browser settings. However, disabling certain cookies may affect the functionality of our website.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Your Rights */}
            <Card>
              <CardContent className="p-8">
                <div className="flex items-center mb-6">
                  <div className="h-10 w-10 bg-indigo-500/10 rounded-lg flex items-center justify-center mr-4">
                    <Shield className="h-5 w-5 text-indigo-500" />
                  </div>
                  <h2 className="text-2xl font-bold">7. Your Privacy Rights</h2>
                </div>
                <div className="prose prose-gray max-w-none">
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    You have certain rights regarding your personal information:
                  </p>

                  <h3 className="font-semibold mb-3">7.1 Access and Portability</h3>
                  <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-6">
                    <li>Request a copy of the personal information we hold about you</li>
                    <li>Request information about how we use your data</li>
                    <li>Export your data in a portable format</li>
                  </ul>

                  <h3 className="font-semibold mb-3">7.2 Correction and Updates</h3>
                  <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-6">
                    <li>Update or correct inaccurate information</li>
                    <li>Add missing information to your profile</li>
                    <li>Change your communication preferences</li>
                  </ul>

                  <h3 className="font-semibold mb-3">7.3 Deletion and Restriction</h3>
                  <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-6">
                    <li>Request deletion of your personal information</li>
                    <li>Restrict processing of your data in certain circumstances</li>
                    <li>Withdraw consent for marketing communications</li>
                  </ul>

                  <h3 className="font-semibold mb-3">7.4 Exercising Your Rights</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    To exercise any of these rights, please contact us using the information provided below. We will respond to your request within 30 days.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Data Retention */}
            <Card>
              <CardContent className="p-8">
                <div className="flex items-center mb-6">
                  <div className="h-10 w-10 bg-teal-500/10 rounded-lg flex items-center justify-center mr-4">
                    <Database className="h-5 w-5 text-teal-500" />
                  </div>
                  <h2 className="text-2xl font-bold">8. Data Retention</h2>
                </div>
                <div className="prose prose-gray max-w-none">
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    We retain your personal information only as long as necessary to fulfill the purposes outlined in this privacy policy:
                  </p>
                  
                  <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-6">
                    <li><strong>Account Information:</strong> Until you delete your account or request deletion</li>
                    <li><strong>Project Data:</strong> For the duration of our service relationship and maintenance period</li>
                    <li><strong>Payment Records:</strong> As required by tax and accounting regulations (typically 7 years)</li>
                    <li><strong>Marketing Data:</strong> Until you unsubscribe or withdraw consent</li>
                    <li><strong>Website Analytics:</strong> Typically 24-36 months for trend analysis</li>
                  </ul>

                  <p className="text-muted-foreground leading-relaxed">
                    After the retention period expires, we securely delete or anonymize your personal information unless we are required to retain it for legal purposes.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card>
              <CardContent className="p-8">
                <div className="flex items-center mb-6">
                  <div className="h-10 w-10 bg-pink-500/10 rounded-lg flex items-center justify-center mr-4">
                    <Users className="h-5 w-5 text-pink-500" />
                  </div>
                  <h2 className="text-2xl font-bold">9. Contact Us</h2>
                </div>
                <div className="prose prose-gray max-w-none">
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    If you have any questions about this Privacy Policy, or if you would like to exercise your privacy rights, please contact us:
                  </p>
                  
                  <div className="bg-muted/30 p-6 rounded-lg">
                    <h3 className="font-semibold mb-4">LaunchIn48 Privacy Team</h3>
                    <p className="text-muted-foreground mb-2"><strong>Email:</strong> launchin48@gmail.com</p>
                    <p className="text-muted-foreground mb-2"><strong>Phone:</strong> +91 96995 68708</p>
                    <p className="text-muted-foreground mb-4"><strong>Address:</strong> Mumbai, Maharashtra, India</p>
                    
                    <div className="border-t pt-4">
                      <p className="text-sm text-muted-foreground mb-2">
                        <strong>Response Time:</strong> We aim to respond to all privacy-related inquiries within 48 hours.
                      </p>
                      <p className="text-sm text-muted-foreground">
                        <strong>Data Protection Officer:</strong> For complex privacy matters, you may request to speak with our data protection officer.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}