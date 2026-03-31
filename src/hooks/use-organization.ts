'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Organization, OrganizationMember } from '@/lib/types'
import { UserRole } from '@/lib/types'

const ORG_STORAGE_KEY = 'plataforma-email-org-id'

/**
 * Build a tree structure from a flat list of orgs.
 * Orgs without parent_org_id remain at root level.
 */
function buildOrgTree(flatOrgs: Organization[]): Organization[] {
  const orgMap = new Map<string, Organization>()
  flatOrgs.forEach((org) => {
    orgMap.set(org.id, { ...org, children: [] })
  })

  const roots: Organization[] = []
  orgMap.forEach((org) => {
    if (org.parent_org_id && orgMap.has(org.parent_org_id)) {
      orgMap.get(org.parent_org_id)!.children!.push(org)
    } else {
      roots.push(org)
    }
  })

  return roots
}

/**
 * Flatten a tree of orgs back into a flat list (depth-first).
 */
function flattenOrgTree(tree: Organization[]): Organization[] {
  const result: Organization[] = []
  function walk(orgs: Organization[]) {
    for (const org of orgs) {
      result.push(org)
      if (org.children && org.children.length > 0) {
        walk(org.children)
      }
    }
  }
  walk(tree)
  return result
}

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

  // Hierarchical org helpers — derived from organizations list
  const orgTree = useMemo(() => buildOrgTree(organizations), [organizations])
  const allVisibleOrgs = useMemo(() => flattenOrgTree(orgTree), [orgTree])
  const childOrgs = useMemo(() => {
    if (!currentOrg) return []
    const findInTree = (orgs: Organization[]): Organization[] => {
      for (const org of orgs) {
        if (org.id === currentOrg.id) return org.children || []
        if (org.children && org.children.length > 0) {
          const found = findInTree(org.children)
          if (found.length > 0) return found
        }
      }
      return []
    }
    return findInTree(orgTree)
  }, [currentOrg, orgTree])

  return {
    organizations,
    currentOrg,
    membership,
    loading,
    switchOrganization,
    isAdmin,
    isEditor,
    refetch: fetchOrganizations,
    childOrgs,
    allVisibleOrgs,
  }
}
