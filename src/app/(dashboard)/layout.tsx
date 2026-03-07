'use client'

import { useState } from 'react'
import { OrganizationProvider, useOrganizationContext } from '@/contexts/organization-context'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { OnboardingScreen } from '@/components/shared/onboarding-screen'
import { Loader2 } from 'lucide-react'

function DashboardContent({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { organizations, loading, currentOrg, refetch } = useOrganizationContext()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (organizations.length === 0 && !currentOrg) {
    return <OnboardingScreen onComplete={refetch} />
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <OrganizationProvider>
      <DashboardContent>{children}</DashboardContent>
    </OrganizationProvider>
  )
}
