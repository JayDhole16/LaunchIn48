import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
})

export const metadata: Metadata = {
  metadataBase: new URL('https://launchin48.com'),
  title: "LaunchIn 48 - Website & Chatbot Development in 48 Hours",
  description:
    "Professional website and chatbot development services delivered in just 48 hours. Transform your business with our rapid development solutions.",
  keywords: "website development, chatbot development, 48 hours, rapid development, business websites, e-commerce",
  authors: [{ name: "LaunchIn 48" }],
  icons: {
    icon: [
      { url: '/images/logo.png', sizes: 'any', type: 'image/png' },
      { url: '/favicon.png', sizes: '32x32', type: 'image/png' },
    ],
    shortcut: '/images/logo.png',
    apple: '/images/logo.png',
  },
  openGraph: {
    title: "LaunchIn 48 - Website & Chatbot Development in 48 Hours",
    description: "Professional website and chatbot development services delivered in just 48 hours.",
    type: "website",
    url: "https://launchin48.com",
    images: [
      {
        url: "/images/logo.png",
        width: 1200,
        height: 630,
        alt: "LaunchIn 48 Logo",
      },
    ],
  },
  generator: 'v0.app'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} dark`}>
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
