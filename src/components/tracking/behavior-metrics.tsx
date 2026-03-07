'use client'

import { Activity, Eye, FileText, Clock, ArrowDown, Globe } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import type { LeadJourney } from '@/lib/tracking/types'

interface BehaviorMetricsProps {
  lead: LeadJourney
}

function formatNumber(n: number): string {
  return n.toLocaleString('pt-BR')
}

export default function BehaviorMetrics({ lead }: BehaviorMetricsProps) {
  const metrics = [
    {
      label: 'Sessoes',
      value: formatNumber(lead.total_sessions),
      icon: <Activity className="w-3.5 h-3.5" />,
    },
    {
      label: 'Pageviews',
      value: formatNumber(lead.total_pageviews),
      icon: <Eye className="w-3.5 h-3.5" />,
    },
    {
      label: 'Paginas Unicas',
      value: formatNumber(lead.paginas_unicas_visitadas),
      icon: <Globe className="w-3.5 h-3.5" />,
    },
    {
      label: 'Forms',
      value: formatNumber(lead.total_forms_preenchidos),
      icon: <FileText className="w-3.5 h-3.5" />,
    },
    {
      label: 'Max Scroll',
      value: lead.max_scroll_depth ? `${lead.max_scroll_depth}%` : '\u2014',
      icon: <ArrowDown className="w-3.5 h-3.5" />,
    },
    {
      label: 'Tempo Medio',
      value: lead.avg_time_on_page_segundos
        ? `${Math.round(lead.avg_time_on_page_segundos)}s`
        : '\u2014',
      icon: <Clock className="w-3.5 h-3.5" />,
    },
    {
      label: 'Canais Distintos',
      value: formatNumber(lead.canais_distintos),
      icon: <Globe className="w-3.5 h-3.5" />,
    },
    {
      label: 'Scroll 90%+',
      value: formatNumber(lead.sessoes_scroll_90),
      icon: <ArrowDown className="w-3.5 h-3.5" />,
    },
  ]

  return (
    <Card>
      <CardContent className="p-4">
        <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-4">
          Metricas de Comportamento
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {metrics.map((m) => (
            <div key={m.label}>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-muted-foreground">{m.icon}</span>
                <span className="text-[10px] text-muted-foreground">{m.label}</span>
              </div>
              <span className="text-lg font-bold text-foreground">{m.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
