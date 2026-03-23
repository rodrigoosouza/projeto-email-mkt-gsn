'use client'

import {
  Users,
  Mail,
  Eye,
  MousePointerClick,
  Globe,
  FileText,
  Send,
  Filter,
  FormInput,
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
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { KpiCard } from '@/components/shared/kpi-card'
import { EmptyState } from '@/components/shared/empty-state'
import { useDashboard } from '@/hooks/use-dashboard'
import { SetupChecklist } from '@/components/shared/setup-checklist'
import {
  CAMPAIGN_STATUS_LABELS,
  CAMPAIGN_STATUS_COLORS,
  LEAD_STATUS_LABELS,
  LEAD_STATUS_COLORS,
} from '@/lib/constants'

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-4 w-96 mt-2" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function SectionHeader({ title, href, icon: Icon }: { title: string; href: string; icon: React.ElementType }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      <Link href={href} className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
        Ver tudo <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  )
}

export default function DashboardPage() {
  const { data, loading } = useDashboard()
  const router = useRouter()

  if (loading) {
    return <DashboardSkeleton />
  }

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Painel Geral
        </h2>
        <p className="text-muted-foreground">
          Visao completa de todas as areas da plataforma.
        </p>
      </div>

      {/* Setup Checklist */}
      <SetupChecklist />

      {/* ===== QUICK ACTIONS ===== */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Acoes Rapidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" asChild>
              <Link href="/campaigns/new">
                <Plus className="h-4 w-4 mr-1" />
                Nova Campanha
              </Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link href="/leads/new">
                <UserPlus className="h-4 w-4 mr-1" />
                Adicionar Lead
              </Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link href="/content-calendar">
                <Sparkles className="h-4 w-4 mr-1" />
                Gerar Conteudo
              </Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link href="/templates/new">
                <FileText className="h-4 w-4 mr-1" />
                Criar Template
              </Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link href="/ads">
                <Megaphone className="h-4 w-4 mr-1" />
                Criar Anuncio
              </Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link href="/automations/new">
                <Zap className="h-4 w-4 mr-1" />
                Nova Automacao
              </Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link href="/growth/chat">
                <TrendingUp className="h-4 w-4 mr-1" />
                IA Growth Copilot
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ===== EMAIL MARKETING SECTION ===== */}
      <div className="space-y-4">
        <SectionHeader title="Email Marketing" href="/campaigns" icon={Mail} />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            icon={Send}
            label="Campanhas"
            value={data?.totalCampaigns ?? 0}
          />
          <KpiCard
            icon={Mail}
            label="Emails Enviados"
            value={data?.totalEmailsSent ?? 0}
          />
          <KpiCard
            icon={Eye}
            label="Taxa de Abertura"
            value={`${data?.openRate ?? 0}%`}
          />
          <KpiCard
            icon={MousePointerClick}
            label="Taxa de Clique"
            value={`${data?.clickRate ?? 0}%`}
          />
        </div>
      </div>

      {/* ===== LEADS SECTION ===== */}
      <div className="space-y-4">
        <SectionHeader title="Leads & Contatos" href="/leads" icon={Users} />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            icon={Users}
            label="Total de Leads"
            value={data?.totalLeads ?? 0}
          />
          <KpiCard
            icon={UserPlus}
            label="Novos este Mes"
            value={data?.leadsThisMonth ?? 0}
          />
          <KpiCard
            icon={FormInput}
            label="Formularios"
            value={data?.totalForms ?? 0}
          />
          <KpiCard
            icon={Filter}
            label="Segmentos"
            value={data?.totalSegments ?? 0}
          />
        </div>
        {/* Leads by status bar */}
        {data?.leadsByStatus && data.leadsByStatus.length > 0 && (
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-wrap gap-4">
                {data.leadsByStatus.map((s) => (
                  <div key={s.status} className="flex items-center gap-2">
                    <Badge className={LEAD_STATUS_COLORS[s.status] || ''} variant="secondary">
                      {LEAD_STATUS_LABELS[s.status] || s.status}
                    </Badge>
                    <span className="text-sm font-medium">{s.count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ===== CONTENT SECTION ===== */}
      <div className="space-y-4">
        <SectionHeader title="Conteudo & Calendario" href="/content-calendar" icon={CalendarDays} />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            icon={CalendarDays}
            label="Posts este Mes"
            value={data?.postsThisMonth ?? 0}
          />
          <KpiCard
            icon={Sparkles}
            label="Total Gerados"
            value={data?.totalPostsGenerated ?? 0}
          />
          <KpiCard
            icon={FileText}
            label="Templates Email"
            value={data?.totalTemplates ?? 0}
          />
          <KpiCard
            icon={Globe}
            label="Landing Pages"
            value={data?.totalLandingPages ?? 0}
          />
        </div>
      </div>

      {/* ===== ADS SECTION ===== */}
      <div className="space-y-4">
        <SectionHeader title="Trafego Pago" href="/ads/dashboard" icon={Megaphone} />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <KpiCard
            icon={BarChart3}
            label="Registros de Insights"
            value={data?.activeAdCampaigns ?? '—'}
          />
          <KpiCard
            icon={DollarSign}
            label="Investimento Total"
            value={data?.totalAdSpend ? formatCurrency(data.totalAdSpend) : '—'}
          />
          <KpiCard
            icon={Target}
            label="Leads via Ads"
            value={data?.leadsFromAds ?? '—'}
          />
        </div>
      </div>

      {/* ===== CRM SECTION ===== */}
      <div className="space-y-4">
        <SectionHeader title="CRM & Pipeline" href="/pipedrive" icon={Handshake} />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <KpiCard
            icon={Handshake}
            label="Negocios Abertos"
            value={data?.openDeals ?? '—'}
          />
          <KpiCard
            icon={TrendingUp}
            label="Ganhos este Mes"
            value={data?.wonDealsThisMonth ?? '—'}
          />
          <KpiCard
            icon={DollarSign}
            label="Valor no Pipeline"
            value={data?.pipelineValue ? formatCurrency(data.pipelineValue) : '—'}
          />
        </div>
      </div>

      {/* ===== AUTOMATIONS SECTION ===== */}
      <div className="space-y-4">
        <SectionHeader title="Automacoes" href="/automations" icon={Zap} />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            icon={Zap}
            label="Total de Automacoes"
            value={data?.totalAutomations ?? 0}
          />
          <KpiCard
            icon={Zap}
            label="Ativas"
            value={data?.activeAutomations ?? 0}
          />
          <KpiCard
            icon={BarChart3}
            label="Submissions"
            value={data?.totalFormSubmissions ?? 0}
          />
          <KpiCard
            icon={Send}
            label="Campanhas Ativas"
            value={data?.activeCampaigns ?? 0}
          />
        </div>
      </div>

      <Separator />

      {/* ===== RECENT ACTIVITY ===== */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Atividade Recente</h3>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Campanhas Recentes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Campanhas Recentes</CardTitle>
              <CardDescription>Ultimas campanhas de email marketing</CardDescription>
            </CardHeader>
            <CardContent>
              {data?.recentCampaigns && data.recentCampaigns.length > 0 ? (
                <div className="space-y-1">
                  <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-3 py-2 text-xs font-medium text-muted-foreground">
                    <span>Nome</span>
                    <span>Status</span>
                    <span>Leads</span>
                    <span>Data</span>
                  </div>
                  {data.recentCampaigns.map((campaign) => (
                    <div
                      key={campaign.id}
                      className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-3 py-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => router.push(`/campaigns/${campaign.id}`)}
                    >
                      <span className="text-sm font-medium truncate">
                        {campaign.name}
                      </span>
                      <Badge
                        className={
                          CAMPAIGN_STATUS_COLORS[campaign.status] || ''
                        }
                        variant="secondary"
                      >
                        {CAMPAIGN_STATUS_LABELS[campaign.status] ||
                          campaign.status}
                      </Badge>
                      <span className="text-sm text-muted-foreground text-right">
                        {campaign.total_leads}
                      </span>
                      <span className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(
                          new Date(campaign.sent_at || campaign.created_at),
                          { addSuffix: true, locale: ptBR }
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Mail}
                  title="Nenhuma campanha ainda"
                  description="Crie sua primeira campanha para comecar a enviar emails para seus leads."
                />
              )}
            </CardContent>
          </Card>

          {/* Leads Recentes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Leads Recentes</CardTitle>
              <CardDescription>Ultimos leads adicionados a plataforma</CardDescription>
            </CardHeader>
            <CardContent>
              {data?.recentLeads && data.recentLeads.length > 0 ? (
                <div className="space-y-1">
                  <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-3 py-2 text-xs font-medium text-muted-foreground">
                    <span>Nome / Email</span>
                    <span>Status</span>
                    <span>Data</span>
                  </div>
                  {data.recentLeads.map((lead) => {
                    const displayName =
                      lead.first_name || lead.last_name
                        ? `${lead.first_name || ''} ${lead.last_name || ''}`.trim()
                        : lead.email
                    return (
                      <div
                        key={lead.id}
                        className="grid grid-cols-[1fr_auto_auto] gap-4 items-center px-3 py-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => router.push(`/leads/${lead.id}`)}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {displayName}
                          </p>
                          {displayName !== lead.email && (
                            <p className="text-xs text-muted-foreground truncate">
                              {lead.email}
                            </p>
                          )}
                        </div>
                        <Badge
                          className={LEAD_STATUS_COLORS[lead.status] || ''}
                          variant="secondary"
                        >
                          {LEAD_STATUS_LABELS[lead.status] || lead.status}
                        </Badge>
                        <span className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatDistanceToNow(new Date(lead.created_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <EmptyState
                  icon={Users}
                  title="Nenhum lead ainda"
                  description="Adicione leads manualmente ou importe uma lista CSV para comecar."
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
