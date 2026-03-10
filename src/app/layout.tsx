import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { PwaRegister } from '@/components/shared/pwa-register'
import { PwaInstallPrompt } from '@/components/shared/pwa-install-prompt'
import { ThemeProvider } from '@/components/shared/theme-provider'

const inter = Inter({ subsets: ['latin'] })

export const viewport: Viewport = {
  themeColor: '#3B82F6',
}

export const metadata: Metadata = {
  title: 'Plataforma Email',
  description: 'Plataforma de Email Marketing',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Plataforma Email',
  },
  icons: {
    apple: '/icons/icon-192x192.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            {children}
            <Toaster />
            <PwaRegister />
            <PwaInstallPrompt />
        </ThemeProvider>
      </body>
    </html>
  )
}
