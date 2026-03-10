'use client'

import { useState, useEffect } from 'react'
import type { OrgTables } from '@/lib/tracking/organizations'
import type { TrackingEvent, LeadJourney } from '@/lib/tracking/types'

interface UseTrackingJourneyReturn {
  lead: LeadJourney | null
  events: TrackingEvent[]
  loading: boolean
  error: string | null
}

export function useTrackingJourney(email: string, orgTablesList: OrgTables[], orgSlug?: string, phone?: string | null): UseTrackingJourneyReturn {
  const [lead, setLead] = useState<LeadJourney | null>(null)
  const [events, setEvents] = useState<TrackingEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchJourney() {
      setLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams()
        if (email) params.set('email', email)
        if (phone) params.set('phone', phone)
        if (orgSlug) params.set('orgSlug', orgSlug)

        const res = await fetch(`/api/tracking/journey?${params.toString()}`)
        if (!res.ok) {
          const errData = await res.json().catch(() => null)
          throw new Error(errData?.error || `Erro ${res.status}`)
        }

        const data = await res.json()
        setLead(data.lead || null)
        setEvents(data.events || [])
      } catch (err) {
        console.error('[useTrackingJourney] Error:', err)
        setError(err instanceof Error ? err.message : 'Erro ao carregar jornada')
      } finally {
        setLoading(false)
      }
    }

    if (email || phone) fetchJourney()
  }, [email, phone, orgSlug])

  return { lead, events, loading, error }
}
