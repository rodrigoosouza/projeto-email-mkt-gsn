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
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
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
      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 3 }).map((_, j) => (
                <Skeleton key={j} className="h-10 w-full" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
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
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Bem-vindo ao Plataforma Email
        </h2>
        <p className="text-muted-foreground">
          Acompanhe suas metricas e gerencie suas campanhas de email marketing.
        </p>
      </div>

      {/* Setup Checklist */}
      <SetupChecklist />

      {/* KPI Cards - Row 1: Core */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={Users}
          label="Total de Leads"
          value={data?.totalLeads ?? 0}
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

      {/* KPI Cards - Row 2: Modules */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <KpiCard
          icon={Send}
          label="Campanhas Ativas"
          value={data?.activeCampaigns ?? 0}
        />
        <KpiCard
          icon={Globe}
          label="Landing Pages"
          value={data?.totalLandingPages ?? 0}
        />
        <KpiCard
          icon={FormInput}
          label="Formularios"
          value={data?.totalForms ?? 0}
        />
        <KpiCard
          icon={BarChart3}
          label="Submissions"
          value={data?.totalFormSubmissions ?? 0}
        />
        <KpiCard
          icon={FileText}
          label="Templates"
          value={data?.totalTemplates ?? 0}
        />
        <KpiCard
          icon={Filter}
          label="Segmentos"
          value={data?.totalSegments ?? 0}
        />
      </div>

      {/* Recent sections */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Campanhas Recentes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Campanhas Recentes</CardTitle>
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
  )
}
