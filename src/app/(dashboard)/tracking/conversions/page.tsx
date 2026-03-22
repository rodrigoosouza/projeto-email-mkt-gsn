'use client'

import { useState, useMemo } from 'react'
import { Loader2, Search, Download } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  useTrackingConversions,
  useTrackingFunnel,
} from '@/hooks/tracking'
import { getTrackingOrgByOrgId } from '@/lib/tracking/organizations'
import type { OrgTables } from '@/lib/tracking/organizations'
// DateRange from types includes 'custom', but we only use 7d/30d/90d here
import {
  getDateRange,
  formatNumber,
  formatCurrency,
  formatDate,
  getFullName,
  generateCSV,
} from '@/lib/tracking/utils'
import {
  TEMPERATURE_COLORS,
  TEMPERATURE_LABELS,
  CHANNEL_COLORS,
  CHART_COLORS,
} from '@/lib/tracking/constants'
import { useOrganizationContext } from '@/contexts/organization-context'

type DateRangeOption = '7d' | '30d' | '90d'

const DATE_RANGE_OPTIONS: { label: string; value: DateRangeOption }[] = [
  { label: '7 dias', value: '7d' },
  { label: '30 dias', value: '30d' },
  { label: '90 dias', value: '90d' },
]

const STATUS_OPTIONS = [
  { label: 'Todos', value: '' },
  { label: 'Won', value: 'won' },
  { label: 'Open', value: 'open' },
  { label: 'Lost', value: 'lost' },
]

export default function TrackingConversionsPage() {
  const { currentOrg } = useOrganizationContext()
  const [dateRange, setDateRange] = useState<DateRangeOption>('30d')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const trackingOrg = useMemo(() => {
    if (!currentOrg) return null
    return getTrackingOrgByOrgId(currentOrg.id) || null
  }, [currentOrg?.id])

  const orgTablesList: OrgTables[] = useMemo(() => {
    if (trackingOrg) return [trackingOrg.tables]
    return []
  }, [trackingOrg])

  const { startDate, endDate } = useMemo(() => getDateRange(dateRange), [dateRange])

  const { data, loading, total, page, pageSize, setPage } = useTrackingConversions(
    {
      startDate,
      endDate,
      status: statusFilter || undefined,
      search: search || undefined,
    },
    orgTablesList
  )

  const { steps: funnelSteps, loading: funnelLoading } = useTrackingFunnel(
    startDate,
    endDate,
    orgTablesList
  )

  const totalPages = Math.ceil(total / pageSize)

  function handleExportCSV() {
    if (!data.length) return
    const rows = data.map((c) => ({
      lead: getFullName(c.first_name, c.last_name),
      email: c.email || '',
      deal: c.deal_title || '',
      status: c.deal_status || '',
      temperatura: c.lead_temperature || '',
      canal: c.utm_source || 'direct',
      valor: c.deal_value || 0,
      data: c.created_at || '',
    }))
    generateCSV(rows, `conversoes-${dateRange}`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Conversoes</h2>
          <p className="text-muted-foreground">
            Acompanhe conversoes, funil e negocios fechados.
          </p>
        </div>
        <div className="flex items-center gap-2">
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
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Funil de Conversao</CardTitle>
        </CardHeader>
        <CardContent>
          {funnelLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : funnelSteps.length > 0 ? (
            <div className="flex items-end gap-4 justify-center">
              {funnelSteps.map((step, i) => {
                const maxVal = Math.max(...funnelSteps.map((s) => s.value), 1)
                const height = Math.max((step.value / maxVal) * 150, 20)
                const widthPct = 100 - i * 15
                return (
                  <div key={step.name} className="flex flex-col items-center gap-2 flex-1">
                    <span className="text-lg font-bold">{formatNumber(step.value)}</span>
                    <div
                      className="w-full rounded-t transition-all"
                      style={{
                        height: `${height}px`,
                        maxWidth: `${widthPct}%`,
                        backgroundColor: CHART_COLORS[i] || CHART_COLORS[0],
                        margin: '0 auto',
                      }}
                    />
                    <span className="text-xs text-muted-foreground text-center">{step.name}</span>
                    {step.rate !== null && (
                      <span className="text-[10px] text-muted-foreground">
                        ({step.rate.toFixed(1)}%)
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              Sem dados no periodo selecionado.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar lead, deal..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value || 'all'}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Data Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lead</TableHead>
                  <TableHead>Deal</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Temperatura</TableHead>
                  <TableHead>Canal</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhuma conversao encontrada no periodo selecionado.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((c) => {
                    const name = getFullName(c.first_name, c.last_name)
                    const temp = c.lead_temperature || 'frio'
                    const channelSource = c.utm_source || 'direct'
                    return (
                      <TableRow key={c.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{name}</p>
                            <p className="text-xs text-muted-foreground">{c.email || '\u2014'}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {c.deal_title || '\u2014'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={
                              c.deal_status === 'won'
                                ? 'bg-green-100 text-green-800'
                                : c.deal_status === 'lost'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-blue-100 text-blue-800'
                            }
                          >
                            {c.deal_status || 'open'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            style={{
                              backgroundColor: TEMPERATURE_COLORS[temp]
                                ? `${TEMPERATURE_COLORS[temp]}20`
                                : undefined,
                              color: TEMPERATURE_COLORS[temp] || undefined,
                            }}
                          >
                            {TEMPERATURE_LABELS[temp] || temp}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            style={{
                              borderColor:
                                CHANNEL_COLORS[channelSource.toLowerCase()] || undefined,
                              color:
                                CHANNEL_COLORS[channelSource.toLowerCase()] || undefined,
                            }}
                          >
                            {channelSource}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium">
                          {formatCurrency(c.deal_value)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatDate(c.created_at)}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-muted-foreground">
                Mostrando {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} de{' '}
                {formatNumber(total)} conversoes
              </p>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Proximo
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
