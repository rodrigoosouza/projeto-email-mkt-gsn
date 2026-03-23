'use client'

import {
  Users,
  Mail,
  Eye,
  MousePointerClick,
  Globe,
  FileText,
  Send,
  BarChart3,
  CalendarDays,
  Megaphone,
  Handshake,
  TrendingUp,
  DollarSign,
  Target,
  Zap,
  Plus,
  UserPlus,
  Sparkles,
  ArrowRight,
  ArrowUpRight,
  Loader2,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useDashboard } from '@/hooks/use-dashboard'
import { SetupChecklist } from '@/components/shared/setup-checklist'
import {
  CAMPAIGN_STATUS_LABELS,
  CAMPAIGN_STATUS_COLORS,
  LEAD_STATUS_LABELS,
  LEAD_STATUS_COLORS,
} from '@/lib/constants'

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatNumber(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
  return value.toLocaleString('pt-BR')
}

function MetricCard({
  label,
  value,
  icon: Icon,
  href,
  color = 'text-primary',
  subtitle,
}: {
  label: string
  value: string | number
  icon: React.ElementType
  href?: string
  color?: string
  subtitle?: string
}) {
  const content = (
    <div className="flex items-start justify-between">
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      <div className={`p-2.5 rounded-xl bg-muted/50 ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
    </div>
  )

  if (href) {
    return (
      <Link href={href}>
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-5">{content}</CardContent>
        </Card>
      </Link>
    )
  }

  return (
    <Card>
      <CardContent className="p-5">{content}</CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const { data, loading } = useDashboard()
  const router = useRouter()

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-72" />
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}><CardContent className="p-5"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
      </div>
    )
  }

  const hasAds = (data?.totalAdSpend ?? 0) > 0 || (data?.activeAdCampaigns ?? 0) > 0
  const hasCRM = (data?.openDeals ?? 0) > 0 || (data?.wonDealsThisMonth ?? 0) > 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Painel Geral</h2>
          <p className="text-sm text-muted-foreground">Visao completa da plataforma</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" asChild>
            <Link href="/campaigns/new"><Plus className="h-4 w-4 mr-1" /> Nova Campanha</Link>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link href="/growth/chat"><TrendingUp className="h-4 w-4 mr-1" /> Growth IA</Link>
          </Button>
        </div>
      </div>

      <SetupChecklist />

      {/* Main KPIs - 4 cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Leads"
          value={formatNumber(data?.totalLeads ?? 0)}
          icon={Users}
          href="/leads"
          color="text-blue-600"
          subtitle={data?.leadsThisMonth ? `+${data.leadsThisMonth} este mes` : undefined}
        />
        <MetricCard
          label="Campanhas"
          value={data?.totalCampaigns ?? 0}
          icon={Send}
          href="/campaigns"
          color="text-violet-600"
          subtitle={data?.activeCampaigns ? `${data.activeCampaigns} ativas` : undefined}
        />
        <MetricCard
          label="Emails Enviados"
          value={formatNumber(data?.totalEmailsSent ?? 0)}
          icon={Mail}
          href="/analytics"
          color="text-emerald-600"
          subtitle={data?.openRate ? `${data.openRate}% abertura` : undefined}
        />
        <MetricCard
          label="Conteudos"
          value={data?.totalPostsGenerated ?? 0}
          icon={CalendarDays}
          href="/content-calendar"
          color="text-amber-600"
          subtitle={data?.postsThisMonth ? `${data.postsThisMonth} este mes` : undefined}
        />
      </div>

      {/* Ads + CRM row (only if has data) */}
      {(hasAds || hasCRM) && (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {hasAds && (
            <>
              <MetricCard
                label="Investimento Ads"
                value={data?.totalAdSpend ? formatCurrency(data.totalAdSpend) : 'R$ 0'}
                icon={DollarSign}
                href="/ads/dashboard"
                color="text-rose-600"
              />
              <MetricCard
                label="Leads via Ads"
                value={formatNumber(data?.leadsFromAds ?? 0)}
                icon={Target}
                href="/ads/dashboard"
                color="text-orange-600"
              />
            </>
          )}
          {hasCRM && (
            <>
              <MetricCard
                label="Deals Abertos"
                value={data?.openDeals ?? 0}
                icon={Handshake}
                href="/pipedrive"
                color="text-cyan-600"
                subtitle={data?.wonDealsThisMonth ? `${data.wonDealsThisMonth} ganhos este mes` : undefined}
              />
              <MetricCard
                label="Pipeline"
                value={data?.pipelineValue ? formatCurrency(data.pipelineValue) : 'R$ 0'}
                icon={TrendingUp}
                href="/pipedrive"
                color="text-green-600"
              />
            </>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: 'Adicionar Lead', href: '/leads/new', icon: UserPlus },
          { label: 'Gerar Conteudo', href: '/content-calendar', icon: Sparkles },
          { label: 'Criar Template', href: '/templates/new', icon: FileText },
          { label: 'Criar Anuncio', href: '/ads', icon: Megaphone },
          { label: 'Nova Automacao', href: '/automations/new', icon: Zap },
          { label: 'Estrategia', href: '/marketing', icon: BarChart3 },
        ].map(action => (
          <Button key={action.href} size="sm" variant="ghost" className="h-8 text-xs" asChild>
            <Link href={action.href}>
              <action.icon className="h-3 w-3 mr-1" /> {action.label}
            </Link>
          </Button>
        ))}
      </div>

      {/* Recent Activity - 2 columns */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Campaigns */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Campanhas Recentes</CardTitle>
              <Link href="/campaigns" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                Ver todas <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {data?.recentCampaigns && data.recentCampaigns.length > 0 ? (
              <div className="space-y-2">
                {data.recentCampaigns.slice(0, 5).map((campaign) => (
                  <div
                    key={campaign.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => router.push(`/campaigns/${campaign.id}`)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
                        <Send className="h-4 w-4 text-violet-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{campaign.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(campaign.sent_at || campaign.created_at), { addSuffix: true, locale: ptBR })}
                        </p>
                      </div>
                    </div>
                    <Badge className={CAMPAIGN_STATUS_COLORS[campaign.status] || ''} variant="secondary">
                      {CAMPAIGN_STATUS_LABELS[campaign.status] || campaign.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Send className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Nenhuma campanha ainda</p>
                <Button size="sm" variant="outline" className="mt-3" asChild>
                  <Link href="/campaigns/new"><Plus className="h-3 w-3 mr-1" /> Criar primeira campanha</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Leads */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Leads Recentes</CardTitle>
              <Link href="/leads" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                Ver todos <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {data?.recentLeads && data.recentLeads.length > 0 ? (
              <div className="space-y-2">
                {data.recentLeads.slice(0, 5).map((lead) => {
                  const name = lead.first_name || lead.last_name
                    ? `${lead.first_name || ''} ${lead.last_name || ''}`.trim()
                    : lead.email
                  return (
                    <div
                      key={lead.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => router.push(`/leads/${lead.id}`)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                          <Users className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{name}</p>
                          {name !== lead.email && (
                            <p className="text-xs text-muted-foreground truncate">{lead.email}</p>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true, locale: ptBR })}
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Nenhum lead ainda</p>
                <Button size="sm" variant="outline" className="mt-3" asChild>
                  <Link href="/leads/new"><UserPlus className="h-3 w-3 mr-1" /> Adicionar lead</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
