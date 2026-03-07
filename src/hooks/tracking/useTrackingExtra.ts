'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { queryMultiOrg } from '@/lib/tracking/query-helpers'
import type { OrgTables } from '@/lib/tracking/organizations'

interface DeviceData {
  device: string
  count: number
}

interface GeoData {
  state: string
  count: number
}

interface PageData {
  path: string
  count: number
}

interface ReferrerData {
  referrer: string
  count: number
}

interface SiteData {
  hostname: string
  count: number
}

export interface TrackingExtraData {
  devices: DeviceData[]
  geoStates: GeoData[]
  topPages: PageData[]
  topReferrers: ReferrerData[]
  topSites: SiteData[]
  avgTimeOnPage: number
}

interface UseTrackingExtraReturn {
  data: TrackingExtraData | null
  loading: boolean
  error: string | null
  retry: () => void
}

export function useTrackingExtra(startDate: string, endDate: string, orgTablesList: OrgTables[]): UseTrackingExtraReturn {
  const [data, setData] = useState<TrackingExtraData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  const retry = useCallback(() => setRetryCount(c => c + 1), [])

  useEffect(() => {
    const supabase = createClient()

    async function fetchExtra() {
      setLoading(true)
      setError(null)

      try {
        const pageviews = await queryMultiOrg(orgTablesList, t => t.events, (table) =>
          supabase.from(table).select('user_agent, geo_state, page_path, page_hostname, referrer')
            .eq('event_name', 'page_view')
            .gte('created_at', startDate).lte('created_at', endDate)
        )

        const timeData = await queryMultiOrg(orgTablesList, t => t.events, (table) =>
          supabase.from(table).select('time_on_page')
            .eq('event_name', 'time_on_page_heartbeat')
            .gte('created_at', startDate).lte('created_at', endDate)
            .not('time_on_page', 'is', null)
        )

        // Device breakdown
        const deviceMap: Record<string, number> = { Desktop: 0, Mobile: 0, Tablet: 0 }
        pageviews.forEach(p => {
          const ua = (p.user_agent || '').toLowerCase()
          if (/ipad|tablet/.test(ua)) deviceMap['Tablet']++
          else if (/mobile|android|iphone/.test(ua)) deviceMap['Mobile']++
          else deviceMap['Desktop']++
        })
        const devices = Object.entries(deviceMap)
          .filter(([, count]) => count > 0)
          .map(([device, count]) => ({ device, count }))
          .sort((a, b) => b.count - a.count)

        // Geo by state
        const stateMap: Record<string, number> = {}
        pageviews.forEach(p => {
          if (p.geo_state) stateMap[p.geo_state] = (stateMap[p.geo_state] || 0) + 1
        })
        const geoStates = Object.entries(stateMap)
          .map(([state, count]) => ({ state, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)

        // Top pages
        const pageMap: Record<string, number> = {}
        pageviews.forEach(p => {
          if (p.page_path) pageMap[p.page_path] = (pageMap[p.page_path] || 0) + 1
        })
        const topPages = Object.entries(pageMap)
          .map(([path, count]) => ({ path, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)

        // Top referrers
        const refMap: Record<string, number> = {}
        pageviews.forEach(p => {
          if (p.referrer) {
            try {
              const hostname = new URL(p.referrer).hostname.replace('www.', '')
              refMap[hostname] = (refMap[hostname] || 0) + 1
            } catch { /* ignore */ }
          }
        })
        const topReferrers = Object.entries(refMap)
          .map(([referrer, count]) => ({ referrer, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)

        // Top sites
        const siteMap: Record<string, number> = {}
        pageviews.forEach(p => {
          if (p.page_hostname && !p.page_hostname.includes('lovable') && !p.page_hostname.includes('localhost') && !p.page_hostname.includes('framer')) {
            siteMap[p.page_hostname] = (siteMap[p.page_hostname] || 0) + 1
          }
        })
        const topSites = Object.entries(siteMap)
          .map(([hostname, count]) => ({ hostname, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)

        // Avg time on page
        const times = timeData.map(t => t.time_on_page).filter(Boolean) as number[]
        const avgTimeOnPage = times.length ? times.reduce((a, b) => a + b, 0) / times.length : 0

        setData({ devices, geoStates, topPages, topReferrers, topSites, avgTimeOnPage })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados extras')
      } finally {
        setLoading(false)
      }
    }

    fetchExtra()
  }, [startDate, endDate, orgTablesList, retryCount])

  return { data, loading, error, retry }
}
