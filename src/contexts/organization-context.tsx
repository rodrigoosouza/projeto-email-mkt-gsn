'use client'

import { createContext, useContext, type ReactNode } from 'react'
import { useOrganization } from '@/hooks/use-organization'
import type { Organization, OrganizationMember } from '@/lib/types'

interface OrganizationContextType {
  organizations: Organization[]
  currentOrg: Organization | null
  membership: OrganizationMember | null
  loading: boolean
  switchOrganization: (orgId: string) => void
  isAdmin: boolean
  isEditor: boolean
  refetch: () => Promise<void>
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(
  undefined
)

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const org = useOrganization()

  return (
    <OrganizationContext.Provider value={org}>
      {children}
    </OrganizationContext.Provider>
  )
}

export function useOrganizationContext() {
  const context = useContext(OrganizationContext)
  if (context === undefined) {
    throw new Error(
      'useOrganizationContext must be used within an OrganizationProvider'
    )
  }
  return context
}
