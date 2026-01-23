import "@/styles/globals.css"

import { Metadata, Viewport } from "next"
import { Toaster } from "sonner"

import { siteConfig } from "@/config/site"
import { fontSans } from "@/lib/fonts"
import { cn } from "@/lib/utils"
import GridPattern from "@/components/magicui/grid-pattern"
import { SiteHeader } from "@/components/site-header"
import { TailwindIndicator } from "@/components/tailwind-indicator"
import { ThemeProvider } from "@/components/theme-provider"

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.name,
    template: `%s - ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: siteConfig.keywords,
  authors: [{ name: siteConfig.author.name, url: siteConfig.links.twitter }],
  creator: siteConfig.author.name,
  publisher: siteConfig.author.name,
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteConfig.url,
    title: siteConfig.name,
    description: siteConfig.description,
    siteName: siteConfig.name,
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: siteConfig.name,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.description,
    images: ["/opengraph-image.png"],
    creator: siteConfig.author.twitter,
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
}

interface RootLayoutProps {
  children: React.ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <>
      <html lang="en" suppressHydrationWarning>
        <head>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "WebApplication",
                name: siteConfig.name,
                description: siteConfig.description,
                url: siteConfig.url,
                applicationCategory: "DeveloperApplication",
                operatingSystem: "Any",
                offers: {
                  "@type": "Offer",
                  price: "0",
                  priceCurrency: "USD",
                },
                author: {
                  "@type": "Person",
                  name: siteConfig.author.name,
                  url: siteConfig.links.twitter,
                },
              }),
            }}
          />
        </head>
        <body
          className={cn(
            "min-h-screen bg-background font-sans antialiased",
            fontSans.variable
          )}
        >
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <div className="relative flex min-h-screen flex-col">
              <SiteHeader />
              <div className="flex-1 relative flex flex-col">
                <div
                  className="w-full h-full absolute top-0 left-0 right-0 bottom-0"
                  style={{
                    opacity: 0.4,

                    backgroundImage: `radial-gradient(at 40% 20%, rgba(50, 172, 109, 0.3) 0px, transparent 50%),
            radial-gradient(at 80% 0%, rgba(152, 68, 183, 0.3) 0px, transparent 50%),
            radial-gradient(at 0% 50%, rgba(241, 130, 49, 0.3) 0px, transparent 50%),
            radial-gradient(at 80% 50%, rgba(76, 175, 80, 0.3) 0px, transparent 50%),
            radial-gradient(at 0% 100%, rgba(129, 61, 156, 0.3) 0px, transparent 50%),
            radial-gradient(at 80% 100%, rgba(255, 177, 66, 0.3) 0px, transparent 50%),
            radial-gradient(at 0% 0%, rgba(63, 81, 181, 0.3) 0px, transparent 50%)`,
                  }}
                />

                <GridPattern
                  width={50}
                  height={50}
                  x={-1}
                  y={-1}
                  strokeDasharray={"4 2"}
                  className={cn("opacity-20")}
                />
                <div className="z-10 w-full h-full flex flex-col">
                  {children}
                </div>
              </div>
            </div>
            <TailwindIndicator />
            <Toaster richColors />
          </ThemeProvider>
        </body>
      </html>
    </>
  )
}
