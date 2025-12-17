import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollText, Calendar, Shield, CreditCard, Users, AlertTriangle } from "lucide-react"

export default function TermsPage() {
  return (
    <div className="min-h-screen">
      <Header />

      {/* Hero Section */}
      <section className="py-20 lg:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <Badge variant="secondary" className="mb-4">
              <ScrollText className="h-3 w-3 mr-1" />
              Legal Information
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold text-balance mb-6">
              Terms and <span className="text-primary">Conditions</span>
            </h1>
            <p className="text-xl text-muted-foreground text-pretty mb-8 max-w-2xl mx-auto">
              Please read these terms and conditions carefully before using our services.
            </p>
            <div className="text-sm text-muted-foreground">
              Last updated: {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
        </div>
      </section>

      {/* Terms Content */}
      <section className="pb-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto space-y-8">
            
            {/* Introduction */}
            <Card>
              <CardContent className="p-8">
                <div className="flex items-center mb-6">
                  <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center mr-4">
                    <ScrollText className="h-5 w-5 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold">1. Introduction</h2>
                </div>
                <div className="prose prose-gray max-w-none">
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    Welcome to LaunchIn48 ("we," "our," or "us"). These Terms and Conditions ("Terms") govern your use of our website development, chatbot development, and related digital services located at www.launchin48.com (the "Service") operated by LaunchIn48.
                  </p>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    By accessing or using our Service, you agree to be bound by these Terms. If you disagree with any part of these terms, then you may not access the Service.
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    We are a digital solutions company based in Mumbai, Maharashtra, India, providing rapid website development, WhatsApp chatbot development, and digital marketing services with a commitment to deliver within 48 hours.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Services */}
            <Card>
              <CardContent className="p-8">
                <div className="flex items-center mb-6">
                  <div className="h-10 w-10 bg-blue-500/10 rounded-lg flex items-center justify-center mr-4">
                    <Users className="h-5 w-5 text-blue-500" />
                  </div>
                  <h2 className="text-2xl font-bold">2. Services Provided</h2>
                </div>
                <div className="prose prose-gray max-w-none">
                  <h3 className="font-semibold mb-3">2.1 Service Offerings</h3>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    LaunchIn48 provides the following services:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-6">
                    <li><strong>Chatbot Development:</strong> AI-powered WhatsApp chatbots starting from ₹3,999</li>
                    <li><strong>Basic Website Development:</strong> Modern responsive business websites starting from ₹6,999</li>
                    <li><strong>Website + Chatbot Combo:</strong> Integrated digital solutions starting from ₹9,999</li>
                    <li><strong>Premium Growth Bundle:</strong> Complete business growth solutions starting from ₹14,999</li>
                  </ul>

                  <h3 className="font-semibold mb-3">2.2 Delivery Timeline</h3>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    We guarantee delivery within 48 hours for standard packages (Chatbot Development, Basic Website, Website + Chatbot). Premium Growth Bundle may take 3-5 business days due to additional components.
                  </p>

                  <h3 className="font-semibold mb-3">2.3 Maintenance Services</h3>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    All services include 84 days of free maintenance. After this period, maintenance services begin automatically with the following plans:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                    <li><strong>Monthly:</strong> 8% of project cost per month</li>
                    <li><strong>Quarterly:</strong> 20% of project cost per quarter</li>
                    <li><strong>Yearly:</strong> 70% of project cost per year</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Payment Terms */}
            <Card>
              <CardContent className="p-8">
                <div className="flex items-center mb-6">
                  <div className="h-10 w-10 bg-green-500/10 rounded-lg flex items-center justify-center mr-4">
                    <CreditCard className="h-5 w-5 text-green-500" />
                  </div>
                  <h2 className="text-2xl font-bold">3. Payment Terms</h2>
                </div>
                <div className="prose prose-gray max-w-none">
                  <h3 className="font-semibold mb-3">3.1 Service Payments</h3>
                  <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-6">
                    <li>Full payment or minimum 20% advance payment required before project commencement</li>
                    <li>Advance payments cannot exceed 100% of the service amount</li>
                    <li>Remaining balance (if advance paid) due upon project completion</li>
                    <li>All payments processed securely through Razorpay payment gateway</li>
                    <li>Prices are in Indian Rupees (₹) and include applicable taxes</li>
                  </ul>

                  <h3 className="font-semibold mb-3">3.2 Maintenance Payments</h3>
                  <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-6">
                    <li>Maintenance charges begin 84 days after project completion</li>
                    <li>Full payment required (no advance payment option for maintenance)</li>
                    <li>Automatic notifications sent 5 days before payment due date</li>
                    <li>Service may be suspended for overdue payments beyond 7 days</li>
                    <li>Users can change maintenance plans during payment</li>
                  </ul>

                  <h3 className="font-semibold mb-3">3.3 Refund Policy</h3>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    Given our rapid delivery model, refunds are handled on a case-by-case basis:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                    <li>Full refund if we fail to deliver within promised timeframe</li>
                    <li>Partial refund if delivered product doesn't meet agreed specifications</li>
                    <li>No refund once project is completed and approved by client</li>
                    <li>Refunds processed within 7-10 business days</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* User Responsibilities */}
            <Card>
              <CardContent className="p-8">
                <div className="flex items-center mb-6">
                  <div className="h-10 w-10 bg-purple-500/10 rounded-lg flex items-center justify-center mr-4">
                    <Shield className="h-5 w-5 text-purple-500" />
                  </div>
                  <h2 className="text-2xl font-bold">4. User Responsibilities</h2>
                </div>
                <div className="prose prose-gray max-w-none">
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    As a client of LaunchIn48, you agree to:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-6">
                    <li>Provide accurate and complete information about your requirements</li>
                    <li>Respond to our queries within reasonable timeframes to avoid delays</li>
                    <li>Provide necessary content, images, and materials for your project</li>
                    <li>Review and approve delivered work within 48 hours of delivery</li>
                    <li>Make timely payments as per agreed terms</li>
                    <li>Use our services only for legal and legitimate business purposes</li>
                    <li>Not engage in any activity that could harm our reputation or services</li>
                  </ul>

                  <h3 className="font-semibold mb-3">4.1 Content Responsibility</h3>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    You are solely responsible for all content you provide, including text, images, logos, and other materials. You warrant that you have all necessary rights to use such content and that it does not infringe on any third-party rights.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Intellectual Property */}
            <Card>
              <CardContent className="p-8">
                <div className="flex items-center mb-6">
                  <div className="h-10 w-10 bg-orange-500/10 rounded-lg flex items-center justify-center mr-4">
                    <Shield className="h-5 w-5 text-orange-500" />
                  </div>
                  <h2 className="text-2xl font-bold">5. Intellectual Property</h2>
                </div>
                <div className="prose prose-gray max-w-none">
                  <h3 className="font-semibold mb-3">5.1 Ownership of Delivered Work</h3>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    Upon full payment, you will own the final delivered website, chatbot, or digital solution. This includes:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-6">
                    <li>Custom code and design elements created specifically for your project</li>
                    <li>Content provided by you or created with your input</li>
                    <li>Rights to modify, distribute, and use the delivered product</li>
                  </ul>

                  <h3 className="font-semibold mb-3">5.2 LaunchIn48 Retained Rights</h3>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    LaunchIn48 retains ownership of:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-6">
                    <li>Our proprietary development frameworks and methodologies</li>
                    <li>General coding techniques and approaches</li>
                    <li>Third-party libraries and tools used in development</li>
                    <li>The right to showcase your project in our portfolio (unless specifically requested otherwise)</li>
                  </ul>

                  <h3 className="font-semibold mb-3">5.3 Third-Party Components</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Some projects may include third-party components, libraries, or services. You are responsible for complying with their respective terms of service and licensing agreements.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Service Limitations */}
            <Card>
              <CardContent className="p-8">
                <div className="flex items-center mb-6">
                  <div className="h-10 w-10 bg-red-500/10 rounded-lg flex items-center justify-center mr-4">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                  </div>
                  <h2 className="text-2xl font-bold">6. Service Limitations & Disclaimers</h2>
                </div>
                <div className="prose prose-gray max-w-none">
                  <h3 className="font-semibold mb-3">6.1 Service Availability</h3>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    While we strive for 100% uptime, we cannot guarantee uninterrupted service availability. We may temporarily suspend services for maintenance, updates, or due to circumstances beyond our control.
                  </p>

                  <h3 className="font-semibold mb-3">6.2 Performance Disclaimer</h3>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    We build professional websites and chatbots but cannot guarantee specific business results, traffic volumes, conversion rates, or revenue outcomes. Success depends on various factors including your business model, marketing efforts, and market conditions.
                  </p>

                  <h3 className="font-semibold mb-3">6.3 Third-Party Services</h3>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    Our solutions may integrate with third-party services (WhatsApp Business API, payment gateways, hosting providers, etc.). We are not responsible for the availability, functionality, or terms of these external services.
                  </p>

                  <h3 className="font-semibold mb-3">6.4 Limitation of Liability</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Our total liability for any claim related to our services shall not exceed the total amount paid by you for the specific service in question. We shall not be liable for any indirect, incidental, or consequential damages.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Privacy and Data */}
            <Card>
              <CardContent className="p-8">
                <div className="flex items-center mb-6">
                  <div className="h-10 w-10 bg-indigo-500/10 rounded-lg flex items-center justify-center mr-4">
                    <Shield className="h-5 w-5 text-indigo-500" />
                  </div>
                  <h2 className="text-2xl font-bold">7. Privacy and Data Protection</h2>
                </div>
                <div className="prose prose-gray max-w-none">
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    We take your privacy seriously. Our collection and use of personal information is governed by our Privacy Policy, which forms an integral part of these Terms.
                  </p>
                  
                  <h3 className="font-semibold mb-3">7.1 Data Security</h3>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    We implement appropriate security measures to protect your personal information and project data. However, no method of transmission over the internet is 100% secure.
                  </p>

                  <h3 className="font-semibold mb-3">7.2 Data Retention</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    We retain project-related data only as long as necessary to provide services and comply with legal obligations. You may request deletion of your data subject to our legal and operational requirements.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Termination */}
            <Card>
              <CardContent className="p-8">
                <div className="flex items-center mb-6">
                  <div className="h-10 w-10 bg-yellow-500/10 rounded-lg flex items-center justify-center mr-4">
                    <Calendar className="h-5 w-5 text-yellow-500" />
                  </div>
                  <h2 className="text-2xl font-bold">8. Termination</h2>
                </div>
                <div className="prose prose-gray max-w-none">
                  <h3 className="font-semibold mb-3">8.1 Termination by Client</h3>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    You may terminate your relationship with us at any time. However, payments made for services already delivered are non-refundable.
                  </p>

                  <h3 className="font-semibold mb-3">8.2 Termination by LaunchIn48</h3>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    We may terminate or suspend your access to our services if you:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-6">
                    <li>Violate these Terms and Conditions</li>
                    <li>Fail to make required payments</li>
                    <li>Engage in fraudulent or illegal activities</li>
                    <li>Use our services in a way that could harm our business or reputation</li>
                  </ul>

                  <h3 className="font-semibold mb-3">8.3 Effect of Termination</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Upon termination, your access to our ongoing services will cease. However, you retain ownership of any completed and paid-for deliverables.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Governing Law */}
            <Card>
              <CardContent className="p-8">
                <div className="flex items-center mb-6">
                  <div className="h-10 w-10 bg-teal-500/10 rounded-lg flex items-center justify-center mr-4">
                    <ScrollText className="h-5 w-5 text-teal-500" />
                  </div>
                  <h2 className="text-2xl font-bold">9. Governing Law and Dispute Resolution</h2>
                </div>
                <div className="prose prose-gray max-w-none">
                  <h3 className="font-semibold mb-3">9.1 Governing Law</h3>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    These Terms shall be governed by and construed in accordance with the laws of India, without regard to its conflict of law provisions.
                  </p>

                  <h3 className="font-semibold mb-3">9.2 Jurisdiction</h3>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    Any disputes arising out of or in connection with these Terms shall be subject to the exclusive jurisdiction of the courts in Mumbai, Maharashtra, India.
                  </p>

                  <h3 className="font-semibold mb-3">9.3 Dispute Resolution</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    We encourage resolving disputes through direct communication. If a dispute cannot be resolved amicably, it may be settled through mediation or arbitration as per Indian arbitration laws.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Changes and Contact */}
            <Card>
              <CardContent className="p-8">
                <div className="flex items-center mb-6">
                  <div className="h-10 w-10 bg-pink-500/10 rounded-lg flex items-center justify-center mr-4">
                    <Calendar className="h-5 w-5 text-pink-500" />
                  </div>
                  <h2 className="text-2xl font-bold">10. Changes to Terms & Contact Information</h2>
                </div>
                <div className="prose prose-gray max-w-none">
                  <h3 className="font-semibold mb-3">10.1 Modifications</h3>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    We reserve the right to modify or replace these Terms at any time. We will provide notice of significant changes by posting the new Terms on our website. Your continued use of our services after such modifications constitutes acceptance of the updated Terms.
                  </p>

                  <h3 className="font-semibold mb-3">10.2 Contact Us</h3>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    If you have any questions about these Terms and Conditions, please contact us:
                  </p>
                  <div className="bg-muted/30 p-6 rounded-lg">
                    <p className="text-muted-foreground mb-2"><strong>LaunchIn48</strong></p>
                    <p className="text-muted-foreground mb-2"><strong>Email:</strong> launchin48@gmail.com</p>
                    <p className="text-muted-foreground mb-2"><strong>Phone:</strong> +91 96995 68708</p>
                    <p className="text-muted-foreground mb-4"><strong>Address:</strong> Mumbai, Maharashtra, India</p>
                    
                    <div className="border-t pt-4">
                      <p className="text-sm text-muted-foreground">
                        <strong>Response Time:</strong> We aim to respond to all legal inquiries within 48 hours during business days.
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