'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Organization, OrganizationMember } from '@/lib/types'
import { UserRole } from '@/lib/types'

const ORG_STORAGE_KEY = 'plataforma-email-org-id'

export function useOrganization() {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null)
  const [membership, setMembership] = useState<OrganizationMember | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const orgsRef = useRef<Organization[]>([])

  const fetchOrganizations = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    const { data: members, error } = await supabase
      .from('organization_members')
      .select('*, organization:organizations(*)')
      .eq('user_id', user.id)

    if (error) {
      console.error('Erro ao buscar organizacoes:', error)
      setLoading(false)
      return
    }

    if (members && members.length > 0) {
      const orgs = members
        .map((m: Record<string, unknown>) => m.organization)
        .filter(Boolean) as Organization[]
      setOrganizations(orgs)
      orgsRef.current = orgs

      const savedOrgId = localStorage.getItem(ORG_STORAGE_KEY)
      const savedOrg = orgs.find((o) => o.id === savedOrgId)
      const selected = savedOrg || orgs[0]
      setCurrentOrg(selected)
      localStorage.setItem(ORG_STORAGE_KEY, selected.id)

      const currentMember = members.find(
        (m: Record<string, unknown>) => (m.organization as Organization | null)?.id === selected.id
      )
      if (currentMember) {
        setMembership({
          id: currentMember.id as string,
          org_id: currentMember.org_id as string,
          user_id: currentMember.user_id as string,
          role: currentMember.role as UserRole,
          created_at: currentMember.created_at as string,
        })
      }
    } else {
      setOrganizations([])
      orgsRef.current = []
      setCurrentOrg(null)
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchOrganizations()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          fetchOrganizations()
        }
        if (event === 'SIGNED_OUT') {
          setOrganizations([])
          orgsRef.current = []
          setCurrentOrg(null)
          setMembership(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [fetchOrganizations, supabase])

  const switchOrganization = useCallback(
    (orgId: string) => {
      const org = orgsRef.current.find((o) => o.id === orgId)
      if (org) {
        setCurrentOrg(org)
        localStorage.setItem(ORG_STORAGE_KEY, orgId)
      }
    },
    []
  )

  const isAdmin = membership?.role === UserRole.ADMIN
  const isEditor = membership?.role === UserRole.EDITOR || isAdmin

  return {
    organizations,
    currentOrg,
    membership,
    loading,
    switchOrganization,
    isAdmin,
    isEditor,
    refetch: fetchOrganizations,
  }
}
