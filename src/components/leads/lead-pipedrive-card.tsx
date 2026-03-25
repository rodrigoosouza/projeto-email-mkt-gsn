'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Building2,
  User,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  GitBranch,
  UserCog,
  MessageSquare,
  Activity,
  FileText,
  ChevronDown,
  ChevronRight,
  Loader2,
  ExternalLink,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { createClient } from '@/lib/supabase/client'

// ============= Types =============

interface PipedriveDeal {
  deal_id: number
  title: string
  value: number
  currency: string
  status: string
  stage_name: string
  pipeline_name: string
  person_name: string
  person_email: string
  person_phone: string
  org_name: string
  owner_name: string
  add_time: string
  update_time: string
  close_time: string | null
  won_time: string | null
  lost_time: string | null
  lost_reason: string | null
  expected_close_date: string | null
  probability: number | null
  label: string | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  utm_content: string | null
  utm_term: string | null
}

interface PipedriveNote {
  content: string
  add_time: string
  user: { name: string } | null
}

interface PipedriveActivity {
  subject: string
  type: string
  done: boolean
  due_date: string
  due_time: string
  note: string | null
  user_id: number
}

interface CustomField {
  label: string
  value: string
}

interface LeadPipedriveCardProps {
  leadEmail: string
  leadName: string
  orgId: string
}

// ============= Helpers =============

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function formatDate(date: string | null | undefined) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatDateTime(date: string | null | undefined) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatCurrency(value: number, currency: string = 'BRL') {
  if (!value) return '-'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(value)
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'won':
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-0"><CheckCircle2 className="mr-1 h-3 w-3" />Ganho</Badge>
    case 'lost':
      return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-0"><XCircle className="mr-1 h-3 w-3" />Perdido</Badge>
    case 'open':
      return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-0"><Clock className="mr-1 h-3 w-3" />Aberto</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

// ============= Collapsible Section =============

function Section({
  title,
  icon: Icon,
  iconColor,
  defaultOpen = true,
  count,
  children,
}: {
  title: string
  icon: React.ElementType
  iconColor: string
  defaultOpen?: boolean
  count?: number
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full text-left py-2 group hover:opacity-80 transition-opacity"
      >
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        <Icon className={`h-4 w-4 ${iconColor}`} />
        <span className="text-sm font-semibold">{title}</span>
        {count !== undefined && count > 0 && <Badge variant="secondary" className="text-xs ml-1">{count}</Badge>}
      </button>
      {open && <div className="pl-10 pb-2">{children}</div>}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-start justify-between py-1">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right max-w-[60%] break-all">{value || '-'}</span>
    </div>
  )
}

// ============= Main Component =============

export function LeadPipedriveCard({ leadEmail, leadName, orgId }: LeadPipedriveCardProps) {
  const [deal, setDeal] = useState<PipedriveDeal | null>(null)
  const [notes, setNotes] = useState<PipedriveNote[]>([])
  const [activities, setActivities] = useState<PipedriveActivity[]>([])
  const [customFields, setCustomFields] = useState<CustomField[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const fetched = useRef(false)

  useEffect(() => {
    if (fetched.current || !leadEmail || !orgId) return
    fetched.current = true

    async function loadPipedriveData() {
      try {
        const supabase = createClient()

        // 1. Find matching deal by email
        const { data: deals } = await supabase
          .from('pipedrive_deals')
          .select('deal_id,title,value,currency,status,stage_name,pipeline_name,person_name,person_email,person_phone,org_name,owner_name,add_time,update_time,close_time,won_time,lost_time,lost_reason,expected_close_date,probability,label,utm_source,utm_medium,utm_campaign,utm_content,utm_term')
          .eq('org_id', orgId)
          .eq('person_email', leadEmail)
          .order('add_time', { ascending: false })
          .limit(1)

        if (!deals || deals.length === 0) {
          // Try by name
          const { data: dealsByName } = await supabase
            .from('pipedrive_deals')
            .select('deal_id,title,value,currency,status,stage_name,pipeline_name,person_name,person_email,person_phone,org_name,owner_name,add_time,update_time,close_time,won_time,lost_time,lost_reason,expected_close_date,probability,label,utm_source,utm_medium,utm_campaign,utm_content,utm_term')
            .eq('org_id', orgId)
            .ilike('person_name', `%${leadName}%`)
            .order('add_time', { ascending: false })
            .limit(1)

          if (!dealsByName || dealsByName.length === 0) {
            setError('nenhum_deal')
            setLoading(false)
            return
          }
          setDeal(dealsByName[0])

          // Fetch extended data from Pipedrive API
          await fetchDealDetails(dealsByName[0].deal_id)
        } else {
          setDeal(deals[0])
          await fetchDealDetails(deals[0].deal_id)
        }
      } catch (err) {
        console.error('[PipedriveCard] Error:', err)
        setError('erro')
      } finally {
        setLoading(false)
      }
    }

    async function fetchDealDetails(dealId: number) {
      try {
        const res = await fetch(`/api/pipedrive/deal?dealId=${dealId}&orgId=${orgId}`)
        if (!res.ok) return

        const data = await res.json()
        if (data.notes) {
          setNotes(data.notes.map((n: any) => ({
            content: n.content ? stripHtml(n.content) : '',
            add_time: n.add_time,
            user: n.user,
          })).filter((n: PipedriveNote) => n.content.length > 5))
        }
        if (data.activities) {
          setActivities(data.activities)
        }
        if (data.customFields) {
          setCustomFields(data.customFields)
        }
      } catch {
        // Non-critical: deal basic data still shows
      }
    }

    loadPipedriveData()
  }, [leadEmail, leadName, orgId])

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="h-6 w-48" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error === 'nenhum_deal') {
    return (
      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
              <GitBranch className="h-5 w-5 text-gray-400" />
            </div>
            <CardTitle className="text-lg text-muted-foreground">Dados do CRM</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum deal encontrado no Pipedrive para este lead.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (!deal) return null

  const doneActivities = activities.filter(a => a.done)
  const pendingActivities = activities.filter(a => !a.done)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-green-500 to-emerald-600">
            <GitBranch className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-lg">Dados do CRM</CardTitle>
            <p className="text-sm text-muted-foreground">{deal.title}</p>
          </div>
          <div className="ml-2">{getStatusBadge(deal.status)}</div>
        </div>
      </CardHeader>

      <CardContent className="space-y-1">
        {/* Deal Info */}
        <Section title="Informacoes do Deal" icon={Building2} iconColor="text-green-500">
          <div className="space-y-0.5">
            <InfoRow label="Pipeline" value={deal.pipeline_name} />
            <InfoRow label="Etapa" value={deal.stage_name} />
            <InfoRow label="Responsavel" value={deal.owner_name} />
            {deal.value > 0 && <InfoRow label="Valor" value={formatCurrency(deal.value, deal.currency)} />}
            {deal.probability !== null && deal.probability > 0 && <InfoRow label="Probabilidade" value={`${deal.probability}%`} />}
            <InfoRow label="Criado em" value={formatDateTime(deal.add_time)} />
            {deal.expected_close_date && <InfoRow label="Previsao de fechamento" value={formatDate(deal.expected_close_date)} />}
            {deal.won_time && <InfoRow label="Ganho em" value={formatDateTime(deal.won_time)} />}
            {deal.lost_time && <InfoRow label="Perdido em" value={formatDateTime(deal.lost_time)} />}
            {deal.lost_reason && <InfoRow label="Motivo da perda" value={deal.lost_reason} />}
          </div>
        </Section>

        <Separator />

        {/* Custom Fields from Pipedrive */}
        {customFields.length > 0 && (
          <>
            <Section title="Campos do Pipedrive" icon={FileText} iconColor="text-blue-500" count={customFields.length}>
              <div className="space-y-0.5">
                {customFields.map((field, i) => (
                  <InfoRow key={i} label={field.label} value={field.value} />
                ))}
              </div>
            </Section>
            <Separator />
          </>
        )}

        {/* UTM / Tracking */}
        {(deal.utm_source || deal.utm_medium || deal.utm_campaign) && (
          <>
            <Section title="Rastreamento" icon={Activity} iconColor="text-orange-500">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-y-2 gap-x-4">
                {deal.utm_source && (
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">Fonte</p>
                    <p className="text-xs font-medium">{deal.utm_source}</p>
                  </div>
                )}
                {deal.utm_medium && (
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">Midia</p>
                    <p className="text-xs font-medium">{deal.utm_medium}</p>
                  </div>
                )}
                {deal.utm_campaign && (
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">Campanha</p>
                    <p className="text-xs font-medium truncate" title={deal.utm_campaign}>{deal.utm_campaign}</p>
                  </div>
                )}
                {deal.utm_content && (
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">Publico</p>
                    <p className="text-xs font-medium truncate" title={deal.utm_content}>{deal.utm_content}</p>
                  </div>
                )}
                {deal.utm_term && (
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">Criativo</p>
                    <p className="text-xs font-medium">{deal.utm_term}</p>
                  </div>
                )}
              </div>
            </Section>
            <Separator />
          </>
        )}

        {/* Notes */}
        {notes.length > 0 && (
          <>
            <Section title="Notas do Pipedrive" icon={MessageSquare} iconColor="text-purple-500" count={notes.length}>
              <div className="space-y-3">
                {notes.map((note, i) => (
                  <div key={i} className="rounded-lg border bg-muted/30 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        {note.user?.name || 'Sistema'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(note.add_time)}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-line leading-relaxed break-all">{note.content}</p>
                  </div>
                ))}
              </div>
            </Section>
            <Separator />
          </>
        )}

        {/* Activities */}
        {activities.length > 0 && (
          <Section title="Atividades" icon={Calendar} iconColor="text-indigo-500" count={activities.length} defaultOpen={false}>
            <div className="space-y-2">
              {pendingActivities.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-2">
                    Pendentes ({pendingActivities.length})
                  </p>
                  {pendingActivities.map((act, i) => (
                    <div key={`p-${i}`} className="flex items-start gap-2 py-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium">{act.subject}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(act.due_date)}{act.due_time ? ` ${act.due_time}` : ''} — {act.type}
                        </p>
                        {act.note && <p className="text-xs text-muted-foreground mt-0.5">{stripHtml(act.note)}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {doneActivities.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wider mb-2">
                    Concluidas ({doneActivities.length})
                  </p>
                  {doneActivities.slice(0, 10).map((act, i) => (
                    <div key={`d-${i}`} className="flex items-start gap-2 py-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm">{act.subject}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(act.due_date)} — {act.type}
                        </p>
                      </div>
                    </div>
                  ))}
                  {doneActivities.length > 10 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      + {doneActivities.length - 10} atividades anteriores
                    </p>
                  )}
                </div>
              )}
            </div>
          </Section>
        )}
      </CardContent>
    </Card>
  )
}
