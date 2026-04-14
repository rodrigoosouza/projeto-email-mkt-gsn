'use client'

import { useEffect, useState, useMemo } from 'react'
import { useOrganizationContext } from '@/contexts/organization-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Download, RefreshCw } from 'lucide-react'

type Lead = Record<string, any>

type ComparisonRow = {
  date: string
  meta_leads: number
  lovable_leads: number
  pipedrive_deals: number
  lovable_to_pipe: number
  diff: number
  diff_pipe: number
  spend: number
  impressions: number
  clicks: number
}

// Colunas na ordem pedida
const COLUMNS: { key: string; label: string; width?: number }[] = [
  { key: 'lovable_id', label: 'ID', width: 120 },
  { key: 'nome', label: 'Nome', width: 120 },
  { key: 'sobrenome', label: 'Sobrenome', width: 120 },
  { key: 'email', label: 'Email', width: 220 },
  { key: 'whatsapp', label: 'WhatsApp', width: 140 },
  { key: 'empresa', label: 'Empresa', width: 180 },
  { key: 'oque_faz', label: 'O que faz', width: 200 },
  { key: 'cargo', label: 'Cargo', width: 140 },
  { key: 'faturamento', label: 'Faturamento', width: 140 },
  { key: 'funcionarios', label: 'Funcionários', width: 120 },
  { key: 'prioridade', label: 'Prioridade', width: 120 },
  { key: 'software_gestao', label: 'Software Gestão', width: 160 },
  { key: 'data_reuniao', label: 'Data Reunião', width: 120 },
  { key: 'horario_reuniao', label: 'Horário', width: 100 },
  { key: 'link_reuniao', label: 'Link Reunião', width: 200 },
  { key: 'status', label: 'Status', width: 120 },
  { key: 'status_reuniao', label: 'Status Reunião', width: 140 },
  { key: 'etapa_pipedrive', label: 'Etapa Pipedrive', width: 160 },
  { key: 'confirmou_participacao', label: 'Confirmou', width: 110 },
  { key: 'lembrete_enviado', label: 'Lembrete', width: 110 },
  { key: 'ligacao_confirmacao_enviada', label: 'Lig. Conf. Enviada', width: 140 },
  { key: 'ligacao_agendada', label: 'Lig. Agendada', width: 120 },
  { key: 'deseja_contato_vendedor', label: 'Quer Contato', width: 120 },
  { key: 'nps', label: 'NPS', width: 80 },
  { key: 'copy_variant', label: 'Copy Variant', width: 140 },
  { key: 'landing_page', label: 'Landing Page', width: 220 },
  { key: 'origin_page', label: 'Origin Page', width: 220 },
  { key: 'pipedrive_deal_id', label: 'Deal ID', width: 120 },
  { key: 'pipedrive_person_id', label: 'Person ID', width: 120 },
  { key: 'pipedrive_org_id', label: 'Org ID PD', width: 120 },
  { key: 'fbclid', label: 'fbclid', width: 140 },
  { key: 'gclid', label: 'gclid', width: 140 },
  { key: 'gbraid', label: 'gbraid', width: 140 },
  { key: 'wbraid', label: 'wbraid', width: 140 },
  { key: 'gad_campaignid', label: 'gad_campaignid', width: 140 },
  { key: 'gad_source', label: 'gad_source', width: 120 },
  { key: 'msclkid', label: 'msclkid', width: 120 },
  { key: 'li_fat_id', label: 'li_fat_id', width: 120 },
  { key: 'ttclid', label: 'ttclid', width: 120 },
  { key: 'sck', label: 'sck', width: 100 },
  { key: 'utm_source', label: 'utm_source', width: 140 },
  { key: 'utm_medium', label: 'utm_medium', width: 140 },
  { key: 'utm_campaign', label: 'utm_campaign', width: 180 },
  { key: 'utm_content', label: 'utm_content', width: 180 },
  { key: 'utm_term', label: 'utm_term', width: 140 },
  { key: 'manychat_subscriber_id', label: 'Manychat ID', width: 140 },
  { key: 'reschedule_token', label: 'Reschedule Token', width: 160 },
  { key: 'apex_session_id', label: 'Apex Session', width: 160 },
  { key: 'session_attributes_encoded', label: 'Session Attrs', width: 180 },
  { key: 'created_at', label: 'Criado em', width: 170 },
  { key: 'data_correta', label: 'Data Correta', width: 120 },
]

function formatCell(value: any): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não'
  if (typeof value === 'object') return JSON.stringify(value)
  const s = String(value)
  // timestamps ISO
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
    try {
      const d = new Date(s)
      return d.toLocaleString('pt-BR')
    } catch { return s }
  }
  return s
}

function last7Days() {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - 6)
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  }
}

export default function LeadsLovablePage() {
  const { currentOrg } = useOrganizationContext()
  const [leads, setLeads] = useState<Lead[]>([])
  const [comparison, setComparison] = useState<ComparisonRow[]>([])
  const [totals, setTotals] = useState({ lovable: 0, meta: 0, pipedrive: 0, lovable_to_pipe: 0 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [{ from, to }, setRange] = useState(last7Days())
  const [search, setSearch] = useState('')
  const [metaOnly, setMetaOnly] = useState(false)

  async function load() {
    if (!currentOrg) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ orgId: currentOrg.id, from, to, limit: '2000' })
      if (metaOnly) params.set('metaOnly', '1')
      const res = await fetch(`/api/leads-lovable/list?${params}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao carregar')
      setLeads(data.leads || [])
      setComparison(data.comparison || [])
      setTotals(data.totals || { lovable: 0, meta: 0, pipedrive: 0, lovable_to_pipe: 0 })
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [currentOrg?.id, from, to, metaOnly]) // eslint-disable-line

  const filtered = useMemo(() => {
    if (!search) return leads
    const q = search.toLowerCase()
    return leads.filter((l) =>
      COLUMNS.some((c) => String(l[c.key] ?? '').toLowerCase().includes(q))
    )
  }, [leads, search])

  function exportCsv() {
    const header = COLUMNS.map((c) => c.label).join(',')
    const rows = filtered.map((l) =>
      COLUMNS.map((c) => {
        const v = formatCell(l[c.key])
        return `"${v.replace(/"/g, '""')}"`
      }).join(',')
    )
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `leads-lovable-${from}-a-${to}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Leads Lovable</h1>
          <p className="text-sm text-muted-foreground">
            Comparação entre leads recebidos do Lovable e leads reportados pelo Meta Ads
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={filtered.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6 flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">De</label>
            <Input type="date" value={from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} className="w-40" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Até</label>
            <Input type="date" value={to} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} className="w-40" />
          </div>
          <div className="space-y-1 flex-1 min-w-[200px]">
            <label className="text-xs text-muted-foreground">Buscar</label>
            <Input placeholder="email, empresa, utm..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Canal</label>
            <Button
              type="button"
              variant={metaOnly ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMetaOnly((v) => !v)}
              className="h-10"
            >
              {metaOnly ? '✓ Só Meta (fbclid)' : 'Só canal Meta'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-300 bg-red-50">
          <CardContent className="pt-6 text-red-700 text-sm">{error}</CardContent>
        </Card>
      )}

      {/* Totais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Meta Ads</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{totals.meta}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Lovable</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{totals.lovable}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Pipedrive (deals)</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totals.pipedrive}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Lovable → Pipe: {totals.lovable_to_pipe}/{totals.lovable}
              {totals.lovable > 0 && ` (${Math.round((totals.lovable_to_pipe / totals.lovable) * 100)}%)`}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Δ Lovable - Meta</CardTitle></CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${totals.lovable - totals.meta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {totals.lovable - totals.meta > 0 ? '+' : ''}{totals.lovable - totals.meta}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Comparação por dia */}
      <Card>
        <CardHeader><CardTitle>Comparação Meta Ads × Lovable × Pipedrive por dia</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-auto border rounded-md">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-2 font-medium">Dia</th>
                  <th className="text-right p-2 font-medium">Meta</th>
                  <th className="text-right p-2 font-medium">Lovable</th>
                  <th className="text-right p-2 font-medium">Pipedrive</th>
                  <th className="text-right p-2 font-medium">Lovable→Pipe</th>
                  <th className="text-right p-2 font-medium">Δ Lov-Meta</th>
                  <th className="text-right p-2 font-medium">Δ Pipe-Lov</th>
                  <th className="text-right p-2 font-medium">Spend</th>
                  <th className="text-right p-2 font-medium">Impressões</th>
                  <th className="text-right p-2 font-medium">Cliques</th>
                </tr>
              </thead>
              <tbody>
                {comparison.length === 0 && (
                  <tr><td colSpan={10} className="text-center p-4 text-muted-foreground">Sem dados no período</td></tr>
                )}
                {comparison.map((r) => (
                  <tr key={r.date} className="border-t">
                    <td className="p-2">{r.date}</td>
                    <td className="p-2 text-right">{r.meta_leads}</td>
                    <td className="p-2 text-right">{r.lovable_leads}</td>
                    <td className="p-2 text-right">{r.pipedrive_deals}</td>
                    <td className="p-2 text-right">
                      <span className="text-muted-foreground">{r.lovable_to_pipe}/{r.lovable_leads}</span>
                    </td>
                    <td className="p-2 text-right">
                      <Badge variant={r.diff === 0 ? 'secondary' : r.diff > 0 ? 'default' : 'destructive'}>
                        {r.diff > 0 ? '+' : ''}{r.diff}
                      </Badge>
                    </td>
                    <td className="p-2 text-right">
                      <Badge variant={r.diff_pipe === 0 ? 'secondary' : r.diff_pipe > 0 ? 'default' : 'destructive'}>
                        {r.diff_pipe > 0 ? '+' : ''}{r.diff_pipe}
                      </Badge>
                    </td>
                    <td className="p-2 text-right">R$ {r.spend.toFixed(2)}</td>
                    <td className="p-2 text-right">{r.impressions.toLocaleString('pt-BR')}</td>
                    <td className="p-2 text-right">{r.clicks.toLocaleString('pt-BR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Planilha de leads */}
      <Card>
        <CardHeader>
          <CardTitle>
            Leads Lovable — {filtered.length} {filtered.length === 1 ? 'registro' : 'registros'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto border rounded-md max-h-[70vh]">
            <table className="text-xs">
              <thead className="bg-muted sticky top-0 z-10">
                <tr>
                  {COLUMNS.map((c) => (
                    <th
                      key={c.key}
                      className="text-left p-2 font-medium border-r whitespace-nowrap"
                      style={{ minWidth: c.width || 120 }}
                    >
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={COLUMNS.length} className="text-center p-6 text-muted-foreground">
                    {loading ? 'Carregando...' : 'Nenhum lead encontrado no período'}
                  </td></tr>
                )}
                {filtered.map((l) => (
                  <tr key={l.id} className="border-t hover:bg-muted/50">
                    {COLUMNS.map((c) => (
                      <td
                        key={c.key}
                        className="p-2 border-r whitespace-nowrap max-w-[300px] truncate"
                        title={formatCell(l[c.key])}
                      >
                        {formatCell(l[c.key])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
