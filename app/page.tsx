import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import {
  Rocket,
  Clock,
  Shield,
  Zap,
  CheckCircle,
  Star,
  ArrowRight,
  Globe,
  MessageSquare,
  Sparkles,
  TrendingUp,
} from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <Header />

      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/20 rounded-full blur-3xl animate-float"></div>
          <div
            className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-float"
            style={{ animationDelay: "2s" }}
          ></div>
          <div
            className="absolute top-1/2 left-1/2 w-32 h-32 bg-purple-500/20 rounded-full blur-2xl animate-float"
            style={{ animationDelay: "4s" }}
          ></div>
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-4xl mx-auto">
            <Badge variant="secondary" className="mb-4 animate-pulse-glow">
              <Rocket className="h-3 w-3 mr-1" />
              Launch Your Digital Presence
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold text-balance mb-6 text-glow">
              Website & Chatbot Development in{" "}
              <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent animate-gradient">
                48 Hours
              </span>
            </h1>
            <p className="text-xl text-muted-foreground text-pretty mb-8 max-w-2xl mx-auto">
              Transform your business with professional websites and intelligent chatbots. From concept to launch in
              just 48 hours, guaranteed.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/services">
                <Button size="lg" className="text-lg px-8 glow-button">
                  Get Started Now
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/portfolio">
                <Button variant="outline" size="lg" className="text-lg px-8 border-glow bg-transparent">
                  View Portfolio
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16">
              <div className="text-center animate-float">
                <div className="text-3xl font-bold text-primary text-glow">48</div>
                <div className="text-sm text-muted-foreground">Hours Delivery</div>
              </div>
              <div className="text-center animate-float" style={{ animationDelay: "0.5s" }}>
                <div className="text-3xl font-bold text-primary text-glow">500+</div>
                <div className="text-sm text-muted-foreground">Projects Completed</div>
              </div>
              <div className="text-center animate-float" style={{ animationDelay: "1s" }}>
                <div className="text-3xl font-bold text-primary text-glow">99%</div>
                <div className="text-sm text-muted-foreground">Client Satisfaction</div>
              </div>
              <div className="text-center animate-float" style={{ animationDelay: "1.5s" }}>
                <div className="text-3xl font-bold text-primary text-glow">24/7</div>
                <div className="text-sm text-muted-foreground">Support</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-glow">Our Services</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Comprehensive digital solutions tailored to your business needs
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Link href="/services">
              <Card className="glow-card group cursor-pointer hover:scale-105 transition-transform">
                <CardHeader>
                  <div className="h-12 w-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center mb-4 animate-glow">
                    <MessageSquare className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-xl text-glow">WhatsApp Chatbot</CardTitle>
                  <CardDescription>AI-powered WhatsApp bot with smart automation</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-primary mr-2" />
                      AI-powered responses
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-primary mr-2" />
                      Payment integration
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-primary mr-2" />
                      Auto-reminders
                    </li>
                  </ul>
                  <div className="mt-4 text-2xl font-bold text-primary text-glow">₹3,999</div>
                  <div className="text-sm text-muted-foreground line-through">₹6,999</div>
                  <div className="text-xs text-muted-foreground">One-time setup</div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/services">
              <Card className="glow-card group cursor-pointer hover:scale-105 transition-transform">
                <CardHeader>
                  <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center mb-4 animate-glow">
                    <Globe className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-xl text-glow">Business Website</CardTitle>
                  <CardDescription>Modern responsive business website</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-primary mr-2" />
                      Responsive Design
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-primary mr-2" />
                      SEO Optimized
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-primary mr-2" />
                      Free Hosting
                    </li>
                  </ul>
                  <div className="mt-4 text-2xl font-bold text-primary text-glow">₹6,999</div>
                  <div className="text-sm text-muted-foreground line-through">₹11,999</div>
                  <div className="text-xs text-muted-foreground">One-time setup</div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/services">
              <Card className="glow-card group border-glow cursor-pointer hover:scale-105 transition-transform">
                <Badge className="absolute -top-3 left-6 bg-gradient-to-r from-primary to-blue-400 animate-pulse-glow">
                  <Star className="h-3 w-3 mr-1" />
                  Best Value
                </Badge>
                <CardHeader>
                  <div className="h-12 w-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center mb-4 animate-glow">
                    <Zap className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-xl text-glow">Website + Chatbot</CardTitle>
                  <CardDescription>Complete digital solution with full integration</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-primary mr-2" />
                      Full Integration
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-primary mr-2" />
                      Client Dashboard
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-primary mr-2" />
                      Priority Support
                    </li>
                  </ul>
                  <div className="mt-4">
                    <div className="text-2xl font-bold text-primary text-glow">₹9,999</div>
                    <div className="text-sm text-muted-foreground line-through">₹17,998</div>
                    <div className="text-xs text-muted-foreground">One-time setup</div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/services">
              <Card className="glow-card group cursor-pointer hover:scale-105 transition-transform">
                <CardHeader>
                  <div className="h-12 w-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center mb-4 animate-glow">
                    <TrendingUp className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-xl text-glow">Premium Growth</CardTitle>
                  <CardDescription>Complete growth solution for businesses</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-primary mr-2" />
                      GMB Optimization
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-primary mr-2" />
                      Social Media
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-primary mr-2" />
                      Growth Analytics
                    </li>
                  </ul>
                  <div className="mt-4 text-2xl font-bold text-primary text-glow">₹14,999</div>
                  <div className="text-sm text-muted-foreground line-through">₹23,998</div>
                  <div className="text-xs text-muted-foreground">One-time setup</div>
                </CardContent>
              </Card>
            </Link>
          </div>

          <div className="text-center mt-12">
            <Link href="/services">
              <Button size="lg" className="glow-button">
                View All Services
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-20 relative">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-glow">Why Choose LaunchIn 48?</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              We deliver exceptional results with unmatched speed and quality
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="text-center group">
              <div className="h-16 w-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-glow">
                <Clock className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-4 text-glow">Lightning Fast Delivery</h3>
              <p className="text-muted-foreground">
                Get your website or chatbot delivered in just 48 hours without compromising on quality.
              </p>
            </div>

            <div className="text-center group">
              <div className="h-16 w-16 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-glow">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-4 text-glow">100% Quality Guarantee</h3>
              <p className="text-muted-foreground">
                We ensure every project meets the highest standards with unlimited revisions.
              </p>
            </div>

            <div className="text-center group">
              <div className="h-16 w-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-glow">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-4 text-glow">3 Months Free Support</h3>
              <p className="text-muted-foreground">
                Complete peace of mind with our comprehensive support package included.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-glow">What Our Clients Say</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Don't just take our word for it - hear from our satisfied clients
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="glow-card">
              <CardContent className="pt-6">
                <div className="flex items-center mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-muted-foreground mb-4">
                  "LaunchIn 48 delivered our website exactly as promised - in just 48 hours! The quality exceeded our
                  expectations and the team was incredibly professional."
                </p>
                <div className="flex items-center">
                  <div className="h-10 w-10 bg-gradient-to-br from-primary to-blue-400 rounded-full flex items-center justify-center mr-3 animate-glow">
                    <span className="text-sm font-semibold text-white">RK</span>
                  </div>
                  <div>
                    <div className="font-semibold text-glow">Rajesh Kumar</div>
                    <div className="text-sm text-muted-foreground">TechSolutions Pvt Ltd</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glow-card">
              <CardContent className="pt-6">
                <div className="flex items-center mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-muted-foreground mb-4">
                  "Amazing work on our e-commerce platform. The design is beautiful and the functionality is perfect.
                  Our sales have increased by 40% since launch!"
                </p>
                <div className="flex items-center">
                  <div className="h-10 w-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mr-3 animate-glow">
                    <span className="text-sm font-semibold text-white">PS</span>
                  </div>
                  <div>
                    <div className="font-semibold text-glow">Priya Sharma</div>
                    <div className="text-sm text-muted-foreground">Fashion Forward</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glow-card">
              <CardContent className="pt-6">
                <div className="flex items-center mb-4">
                  {[...Array(4)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                  ))}
                  <Star className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground mb-4">
                  "Their chatbot solution has revolutionized our customer support. We now handle 3x more queries with
                  better satisfaction rates."
                </p>
                <div className="flex items-center">
                  <div className="h-10 w-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center mr-3 animate-glow">
                    <span className="text-sm font-semibold text-white">SR</span>
                  </div>
                  <div>
                    <div className="font-semibold text-glow">Sneha Reddy</div>
                    <div className="text-sm text-muted-foreground">Digital Marketing Pro</div>
                  </div>
                </div>
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
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-glow">Ready to Launch Your Project?</h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join hundreds of satisfied clients who have transformed their business with our rapid development
              solutions.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/services">
                <Button size="lg" className="text-lg px-8 glow-button">
                  Start Your Project
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/services">
                <Button size="lg" variant="outline" className="text-lg px-8 border-glow bg-transparent">
                  View Pricing
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
