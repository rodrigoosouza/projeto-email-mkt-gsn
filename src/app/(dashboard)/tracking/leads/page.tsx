'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Download, Search, Loader2 } from 'lucide-react'
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
import { useTrackingLeads } from '@/hooks/tracking'
import {
  TRACKING_ORGANIZATIONS,
  getAllOrgTables,
  getTrackingOrgById,
} from '@/lib/tracking/organizations'
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
} from '@/lib/tracking/constants'

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

const TEMP_OPTIONS = [
  { label: 'Todas', value: '' },
  { label: 'Frio', value: 'frio' },
  { label: 'Morno', value: 'morno' },
  { label: 'Quente', value: 'quente' },
  { label: 'Muito Quente', value: 'muito quente' },
]

export default function TrackingLeadsPage() {
  const router = useRouter()
  const [dateRange, setDateRange] = useState<DateRangeOption>('30d')
  const [selectedOrg, setSelectedOrg] = useState('all')
  const [search, setSearch] = useState('')
  const [temperature, setTemperature] = useState('')
  const [status, setStatus] = useState('')
  const [channel, setChannel] = useState('')

  const { startDate, endDate } = useMemo(() => getDateRange(dateRange), [dateRange])

  const orgTablesList: OrgTables[] = useMemo(() => {
    if (selectedOrg === 'all') return getAllOrgTables()
    const org = getTrackingOrgById(selectedOrg)
    return org ? [org.tables] : getAllOrgTables()
  }, [selectedOrg])

  const { data, loading, total, page, pageSize, setPage } = useTrackingLeads(
    {
      startDate,
      endDate,
      search: search || undefined,
      temperature: temperature || undefined,
      status: status || undefined,
      channel: channel || undefined,
    },
    orgTablesList
  )

  const totalPages = Math.ceil(total / pageSize)

  function handleExportCSV() {
    if (!data.length) return
    const rows = data.map((l) => ({
      nome: getFullName(l.first_name, l.last_name),
      email: l.email || '',
      empresa: l.company_name || '',
      temperatura: l.lead_temperature || '',
      score: l.lead_score ?? '',
      canal: l.utm_source || 'direct',
      status: l.deal_status || '',
      valor: l.deal_value || 0,
      data: l.deal_created_at || '',
    }))
    generateCSV(rows, `leads-tracking-${dateRange}`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Leads Tracking</h2>
          <p className="text-muted-foreground">
            Visualize leads capturados pelo tracking com scoring e temperatura.
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

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email ou empresa..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={temperature} onValueChange={setTemperature}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Temperatura" />
              </SelectTrigger>
              <SelectContent>
                {TEMP_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value || 'all'}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
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
            <Input
              placeholder="Canal (utm_source)"
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className="w-[160px]"
            />
          </div>
        </CardContent>
      </Card>

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
                  <TableHead>Nome / Email</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Temperatura</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Canal</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Nenhum lead encontrado no periodo selecionado.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((lead) => {
                    const name = getFullName(lead.first_name, lead.last_name)
                    const temp = lead.lead_temperature || 'frio'
                    const channelSource = lead.utm_source || 'direct'
                    const maxScore = 100
                    const scoreWidth = Math.min(
                      ((lead.lead_score || 0) / maxScore) * 100,
                      100
                    )
                    return (
                      <TableRow
                        key={lead.deal_id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() =>
                          router.push(
                            `/tracking/leads/${encodeURIComponent(lead.email || '')}`
                          )
                        }
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{name}</p>
                            <p className="text-xs text-muted-foreground">{lead.email || '\u2014'}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {lead.company_name || '\u2014'}
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
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${scoreWidth}%`,
                                  backgroundColor: TEMPERATURE_COLORS[temp] || '#4d85ff',
                                }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {lead.lead_score ?? 0}
                            </span>
                          </div>
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
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={
                              lead.deal_status === 'won'
                                ? 'bg-green-100 text-green-800'
                                : lead.deal_status === 'lost'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-blue-100 text-blue-800'
                            }
                          >
                            {lead.deal_status || 'open'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {formatCurrency(lead.deal_value)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatDate(lead.deal_created_at)}
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
                {formatNumber(total)} leads
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
