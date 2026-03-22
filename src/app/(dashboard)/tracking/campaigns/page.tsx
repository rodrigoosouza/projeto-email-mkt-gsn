'use client'

import { useState, useMemo } from 'react'
import { Loader2, Search } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  useTrackingCampaigns,
  type TrackingCampaignData,
} from '@/hooks/tracking'
import { getTrackingOrgByOrgId } from '@/lib/tracking/organizations'
import type { OrgTables } from '@/lib/tracking/organizations'
// DateRange from types includes 'custom', but we only use 7d/30d/90d here
import {
  getDateRange,
  formatNumber,
  formatCurrency,
  formatPercent,
} from '@/lib/tracking/utils'
import { CHART_COLORS, CHANNEL_COLORS } from '@/lib/tracking/constants'
import { useOrganizationContext } from '@/contexts/organization-context'

type DateRangeOption = '7d' | '30d' | '90d'

const DATE_RANGE_OPTIONS: { label: string; value: DateRangeOption }[] = [
  { label: '7 dias', value: '7d' },
  { label: '30 dias', value: '30d' },
  { label: '90 dias', value: '90d' },
]

export default function TrackingCampaignsPage() {
  const { currentOrg } = useOrganizationContext()
  const [dateRange, setDateRange] = useState<DateRangeOption>('30d')
  const [search, setSearch] = useState('')

  const trackingOrg = useMemo(() => {
    if (!currentOrg) return null
    return getTrackingOrgByOrgId(currentOrg.id) || null
  }, [currentOrg?.id])

  const orgTablesList: OrgTables[] = useMemo(() => {
    if (trackingOrg) return [trackingOrg.tables]
    return []
  }, [trackingOrg])

  const { startDate, endDate } = useMemo(() => getDateRange(dateRange), [dateRange])

  const { campaigns, timeline, loading } = useTrackingCampaigns(
    startDate,
    endDate,
    orgTablesList
  )

  const filteredCampaigns = useMemo(() => {
    if (!search) return campaigns
    const s = search.toLowerCase()
    return campaigns.filter(
      (c) =>
        c.utm_source.toLowerCase().includes(s) ||
        c.utm_medium.toLowerCase().includes(s) ||
        c.utm_campaign.toLowerCase().includes(s)
    )
  }, [campaigns, search])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Campanhas</h2>
          <p className="text-muted-foreground">
            Performance por campanha, canal e midia.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1 border rounded-md p-0.5">
            {DATE_RANGE_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                variant={dateRange === opt.value ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setDateRange(opt.value)}
                className="text-xs h-7"
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Campaign Timeline Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Leads por Dia</CardTitle>
            </CardHeader>
            <CardContent>
              {timeline.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-end gap-1 h-32">
                    {timeline.map((point, i) => {
                      const maxVal = Math.max(...timeline.map((p) => p.leads), 1)
                      const height = (point.leads / maxVal) * 100
                      return (
                        <div
                          key={i}
                          className="flex-1 flex flex-col items-center justify-end gap-1"
                        >
                          <span className="text-[10px] text-muted-foreground">
                            {point.leads}
                          </span>
                          <div
                            className="w-full rounded-t"
                            style={{
                              height: `${Math.max(height, 2)}%`,
                              backgroundColor: CHART_COLORS[0],
                            }}
                          />
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex gap-1">
                    {timeline.map((point, i) => (
                      <div key={i} className="flex-1 text-center">
                        <span className="text-[9px] text-muted-foreground">{point.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Sem dados no periodo selecionado.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Search + Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Campanhas por UTM</CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar campanha..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 h-8 text-sm"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campanha</TableHead>
                    <TableHead className="text-right">Leads</TableHead>
                    <TableHead className="text-right">Conversoes</TableHead>
                    <TableHead className="text-right">Receita</TableHead>
                    <TableHead className="text-right">Taxa Conversao</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCampaigns.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center py-8 text-muted-foreground"
                      >
                        Nenhuma campanha encontrada.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCampaigns.map((c, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{
                                  backgroundColor:
                                    CHANNEL_COLORS[c.utm_source.toLowerCase()] ||
                                    CHART_COLORS[i % CHART_COLORS.length],
                                }}
                              />
                              <span className="font-medium text-sm">{c.utm_source}</span>
                              <span className="text-muted-foreground text-sm">
                                / {c.utm_medium}
                              </span>
                            </div>
                            {c.utm_campaign !== '(none)' && (
                              <p className="text-xs text-muted-foreground ml-3.5 truncate max-w-[300px]">
                                {c.utm_campaign}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatNumber(c.leads)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatNumber(c.conversions)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(c.revenue)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={
                              c.conversionRate > 5
                                ? 'text-green-600 font-medium'
                                : c.conversionRate > 0
                                  ? 'text-yellow-600'
                                  : 'text-muted-foreground'
                            }
                          >
                            {formatPercent(c.conversionRate)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
