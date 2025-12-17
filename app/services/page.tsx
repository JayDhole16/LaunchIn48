import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { CheckCircle, MessageSquare, Globe, Zap, Star, Clock, ArrowRight, Sparkles } from "lucide-react"
import { ServicePurchaseButton } from "@/components/service-purchase-button"

export default function ServicesPage() {
  const services = [
    {
      id: "whatsapp-chatbot",
      icon: MessageSquare,
      title: "Chatbot Development", // Exact match from database
      description: "AI-powered chatbot with smart automation",
      setupPrice: "₹3,999",
      originalPrice: "₹6,999",
      maintenanceMonthly: "₹320",
      maintenanceQuarterly: "₹800",
      maintenanceYearly: "₹2,799",
      deliveryTime: "48 hours",
      features: [
        "AI-powered chatbot",
        "Interactive menus (Plans, FAQs, Contact)",
        "Payment link integration",
        "Auto-reminders & notifications",
        "Lead capture system",
        "24/7 automated responses",
        "Custom greeting messages",
        "Analytics dashboard",
      ],
      popular: false,
      gradient: "from-green-500 to-emerald-600",
    },
    {
      id: "basic-website",
      icon: Globe,
      title: "Basic Website", // Exact match from database
      description: "Modern responsive business website",
      setupPrice: "₹6,999",
      originalPrice: "₹11,999",
      maintenanceMonthly: "₹560",
      maintenanceQuarterly: "₹1,400",
      maintenanceYearly: "₹4,899",
      deliveryTime: "48 hours",
      features: [
        "Modern responsive website",
        "5 pages (Home, About, Services, Portfolio, Contact)",
        "Free hosting integration (Netlify/Vercel)",
        "SEO-ready optimization",
        "Mobile-first design",
        "Contact form integration",
        "Social media integration",
        "SSL certificate included",
      ],
      popular: false,
      gradient: "from-blue-500 to-cyan-600",
    },
    {
      id: "website-chatbot-combo",
      icon: Zap,
      title: "Website + Chatbot", // Updated to match more closely
      description: "Complete digital solution with full integration",
      setupPrice: "₹9,999",
      originalPrice: "₹17,999",
      maintenanceMonthly: "₹800",
      maintenanceQuarterly: "₹2,000",
      maintenanceYearly: "₹6,999",
      deliveryTime: "48 hours",
      features: [
        "Everything from Website + Chatbot",
        "Full integration between systems",
        "Client dashboard for tracking",
        "Lead management system",
        "Payment tracking",
        "Automated workflows",
        "Real-time notifications",
        "Priority support",
      ],
      popular: true,
      gradient: "from-purple-500 to-pink-600",
    },
    {
      id: "premium-growth",
      icon: Star,
      title: "Premium Growth Bundle", // Custom bundle
      description: "Complete growth solution for cafes, gyms & salons",
      setupPrice: "₹14,999",
      originalPrice: "₹23,999",
      maintenanceMonthly: "₹1,200",
      maintenanceQuarterly: "₹3,000",
      maintenanceYearly: "₹10,499",
      deliveryTime: "3-5 days",
      features: [
        "Website + Chatbot",
        "Google My Business optimization",
        "Free 1-month social media automation",
        "10 Canva-made posts included",
        "Local SEO optimization",
        "Review management system",
        "Social media scheduling",
        "Growth analytics dashboard",
      ],
      popular: false,
      gradient: "from-orange-500 to-red-600",
    },
  ]

  return (
    <div className="min-h-screen">
      <Header />

      {/* Hero Section */}
      <section className="py-20 lg:py-32 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-float"></div>
          <div
            className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-float"
            style={{ animationDelay: "2s" }}
          ></div>
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-4xl mx-auto">
            <Badge variant="secondary" className="mb-4 animate-pulse-glow">
              <Sparkles className="h-3 w-3 mr-1" />
              Our Services
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold text-balance mb-6 text-glow">
              Digital Solutions for{" "}
              <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent animate-gradient">
                Every Business
              </span>
            </h1>
            <p className="text-xl text-muted-foreground text-pretty mb-8 max-w-2xl mx-auto">
              From WhatsApp chatbots to complete websites, we deliver professional solutions in just 48 hours.
            </p>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {services.map((service, index) => {
              const IconComponent = service.icon
              return (
                <Card
                  key={service.id}
                  className={`glow-card relative ${service.popular ? "border-glow" : ""}`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {service.popular && (
                    <Badge className="absolute -top-3 left-6 bg-gradient-to-r from-primary to-blue-400 animate-pulse-glow">
                      <Star className="h-3 w-3 mr-1" />
                      Best Value
                    </Badge>
                  )}
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-4">
                        <div
                          className={`h-12 w-12 bg-gradient-to-br ${service.gradient} rounded-lg flex items-center justify-center animate-glow`}
                        >
                          <IconComponent className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-xl text-glow">{service.title}</CardTitle>
                          <CardDescription className="mt-1">{service.description}</CardDescription>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-4">
                      <div className="flex flex-col">
                        <div className="text-3xl font-bold text-primary text-glow">{service.setupPrice}</div>
                        {service.originalPrice && (
                          <div className="text-sm text-muted-foreground line-through">{service.originalPrice}</div>
                        )}
                        <div className="text-xs text-muted-foreground">One-time setup</div>
                      </div>
                      <Badge variant="outline" className="border-glow">
                        <Clock className="h-3 w-3 mr-1" />
                        {service.deliveryTime}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3 mb-6">
                      {service.features.map((feature, index) => (
                        <li key={index} className="flex items-center text-sm">
                          <CheckCircle className="h-4 w-4 text-primary mr-3 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>

                    <div className="mb-6 p-4 bg-muted/30 rounded-lg border border-muted">
                      <h4 className="font-semibold mb-2 text-sm">Maintenance (after 3 months):</h4>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="text-center">
                          <div className="font-semibold text-primary">{service.maintenanceMonthly}</div>
                          <div className="text-muted-foreground">Monthly</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-primary">{service.maintenanceQuarterly}</div>
                          <div className="text-muted-foreground">Quarterly</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-primary">{service.maintenanceYearly}</div>
                          <div className="text-muted-foreground">Yearly</div>
                        </div>
                      </div>
                    </div>

                    <ServicePurchaseButton
                      serviceId={service.id}
                      serviceName={service.title}
                      price={parseInt(service.setupPrice.replace(/[₹,]/g, ""))}
                      description={service.description}
                    />
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-20 relative">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-glow">Why Choose LaunchIn 48?</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              We deliver exceptional results with speed, quality, and ongoing support
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="glow-card text-center">
              <CardHeader>
                <div className="h-16 w-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-glow">
                  <Clock className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-glow">48-Hour Delivery</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Lightning-fast development without compromising on quality</p>
              </CardContent>
            </Card>

            <Card className="glow-card text-center">
              <CardHeader>
                <div className="h-16 w-16 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-glow">
                  <Star className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-glow">Premium Quality</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Professional designs and robust functionality for every project</p>
              </CardContent>
            </Card>

            <Card className="glow-card text-center">
              <CardHeader>
                <div className="h-16 w-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-glow">
                  <Zap className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-glow">3 Months Free Support</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Complete peace of mind with our comprehensive support package</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-blue-500/20 animate-gradient"></div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="glow-card p-8 md:p-12 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-glow">Ready to Launch Your Business?</h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Choose your perfect plan and let's transform your business in just 48 hours.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/contact">
                <Button size="lg" className="text-lg px-8 glow-button">
                  Start Your Project
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/portfolio">
                <Button size="lg" variant="outline" className="text-lg px-8 border-glow bg-transparent">
                  View Portfolio
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
