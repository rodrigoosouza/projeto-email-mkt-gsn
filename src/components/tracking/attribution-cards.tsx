'use client'

import { Card, CardContent } from '@/components/ui/card'
import { ChannelBadge } from '@/components/tracking/tracking-badges'
import type { LeadJourney } from '@/lib/tracking/types'

interface AttributionCardsProps {
  lead: LeadJourney
}

function AttributionRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-muted-foreground">{label}</span>
      {typeof value === 'string' ? (
        <span className="text-xs text-foreground truncate max-w-[200px]">
          {value || '\u2014'}
        </span>
      ) : (
        value
      )}
    </div>
  )
}

export default function AttributionCards({ lead }: AttributionCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Last Touch */}
      <Card>
        <CardContent className="p-4">
          <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Last Touch Attribution
          </h4>
          <div className="space-y-2">
            <AttributionRow label="Source" value={<ChannelBadge channel={lead.utm_source} />} />
            <AttributionRow label="Medium" value={lead.utm_medium || '\u2014'} />
            <AttributionRow label="Campaign" value={lead.utm_campaign || '\u2014'} />
            <AttributionRow label="Content" value={lead.utm_content || '\u2014'} />
            <AttributionRow label="Term" value={lead.utm_term || '\u2014'} />
          </div>
        </CardContent>
      </Card>

      {/* First Touch */}
      <Card>
        <CardContent className="p-4">
          <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-3">
            First Touch Attribution
          </h4>
          <div className="space-y-2">
            <AttributionRow label="Source" value={<ChannelBadge channel={lead.ft_utm_source} />} />
            <AttributionRow label="Medium" value={lead.ft_utm_medium || '\u2014'} />
            <AttributionRow label="Campaign" value={lead.ft_utm_campaign || '\u2014'} />
            <AttributionRow label="Content" value={lead.ft_utm_content || '\u2014'} />
            <AttributionRow label="Term" value={lead.ft_utm_term || '\u2014'} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
