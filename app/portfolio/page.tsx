import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import Image from "next/image"
import { ExternalLink, ArrowRight } from "lucide-react"

export default function PortfolioPage() {
  const portfolioItems = [
    {
      id: 1,
      title: "TechCorp Business Website",
      description: "Modern corporate website with advanced features and responsive design",
      image: "/modern-corporate-website.png",
      technologies: ["Next.js", "Tailwind CSS", "TypeScript", "Supabase"],
      category: "Business Website",
      featured: true,
    },
    {
      id: 2,
      title: "ShopEasy E-commerce Platform",
      description: "Full-featured online store with payment integration and inventory management",
      image: "/ecommerce-website-design.png",
      technologies: ["React", "Node.js", "MongoDB", "Stripe"],
      category: "E-commerce",
      featured: true,
    },
    {
      id: 3,
      title: "HealthCare Management System",
      description: "Custom web application for healthcare providers with patient management",
      image: "/healthcare-management-dashboard.png",
      technologies: ["Vue.js", "Express.js", "PostgreSQL", "Chart.js"],
      category: "Web Application",
      featured: true,
    },
    {
      id: 4,
      title: "AI Customer Support Bot",
      description: "Intelligent chatbot for customer service with natural language processing",
      image: "/chatbot-interface-design.png",
      technologies: ["Python", "TensorFlow", "React", "WebSocket"],
      category: "Chatbot",
      featured: false,
    },
    {
      id: 5,
      title: "Restaurant Booking System",
      description: "Online reservation system with real-time availability and notifications",
      image: "/restaurant-booking-website.png",
      technologies: ["Next.js", "Prisma", "MySQL", "Twilio"],
      category: "Web Application",
      featured: false,
    },
    {
      id: 6,
      title: "Real Estate Portal",
      description: "Property listing website with advanced search and virtual tours",
      image: "/real-estate-website-design.png",
      technologies: ["React", "Node.js", "MongoDB", "Mapbox"],
      category: "Business Website",
      featured: false,
    },
  ]

  const categories = ["All", "Business Website", "E-commerce", "Web Application", "Chatbot"]

  return (
    <div className="min-h-screen">
      <Header />

      {/* Hero Section */}
      <section className="py-20 lg:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <Badge variant="secondary" className="mb-4">
              Our Work
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold text-balance mb-6">
              Portfolio of <span className="text-primary">Success Stories</span>
            </h1>
            <p className="text-xl text-muted-foreground text-pretty mb-8 max-w-2xl mx-auto">
              Explore our collection of successful projects delivered in 48 hours. From simple business websites to
              complex web applications and AI chatbots.
            </p>
          </div>
        </div>
      </section>

      {/* Portfolio Grid */}
      <section className="pb-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Featured Projects */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold mb-8">Featured Projects</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
              {portfolioItems
                .filter((item) => item.featured)
                .map((item) => (
                  <Card key={item.id} className="group hover:shadow-lg transition-all duration-300 overflow-hidden">
                    <div className="relative overflow-hidden">
                      <Image
                        src={item.image || "/placeholder.svg"}
                        alt={item.title}
                        width={600}
                        height={400}
                        className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-4 left-4">
                        <Badge variant="secondary">{item.category}</Badge>
                      </div>
                    </div>
                    <CardHeader>
                      <CardTitle className="text-xl group-hover:text-primary transition-colors">{item.title}</CardTitle>
                      <CardDescription>{item.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {item.technologies.map((tech) => (
                          <Badge key={tech} variant="outline" className="text-xs">
                            {tech}
                          </Badge>
                        ))}
                      </div>
                      <Button variant="outline" className="w-full group bg-transparent">
                        View Project
                        <ExternalLink className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>

          {/* All Projects */}
          <div>
            <h2 className="text-3xl font-bold mb-8">All Projects</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {portfolioItems.map((item) => (
                <Card key={item.id} className="group hover:shadow-lg transition-all duration-300 overflow-hidden">
                  <div className="relative overflow-hidden">
                    <Image
                      src={item.image || "/placeholder.svg"}
                      alt={item.title}
                      width={600}
                      height={400}
                      className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-4 left-4">
                      <Badge variant="secondary">{item.category}</Badge>
                    </div>
                    {item.featured && (
                      <div className="absolute top-4 right-4">
                        <Badge className="bg-primary">Featured</Badge>
                      </div>
                    )}
                  </div>
                  <CardHeader>
                    <CardTitle className="text-lg group-hover:text-primary transition-colors">{item.title}</CardTitle>
                    <CardDescription className="text-sm">{item.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1 mb-4">
                      {item.technologies.slice(0, 3).map((tech) => (
                        <Badge key={tech} variant="outline" className="text-xs">
                          {tech}
                        </Badge>
                      ))}
                      {item.technologies.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{item.technologies.length - 3}
                        </Badge>
                      )}
                    </div>
                    <Button variant="outline" size="sm" className="w-full bg-transparent">
                      View Details
                      <ExternalLink className="ml-2 h-3 w-3" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-primary to-primary/80 rounded-2xl p-8 md:p-12 text-center text-white">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Join Our Success Stories?</h2>
            <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
              Let's create something amazing together. Your project could be our next featured success story.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/contact">
                <Button size="lg" variant="secondary" className="text-lg px-8">
                  Start Your Project
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/services">
                <Button
                  size="lg"
                  variant="outline"
                  className="text-lg px-8 border-white text-white hover:bg-white hover:text-primary bg-transparent"
                >
                  View Services
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
