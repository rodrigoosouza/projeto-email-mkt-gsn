'use client'

import {
  TEMPERATURE_COLORS,
  TEMPERATURE_BG,
  TEMPERATURE_LABELS,
  CHANNEL_COLORS,
} from '@/lib/tracking/constants'

// === Temperature Badge ===

interface TemperatureBadgeProps {
  temperature: string | null
}

export function TemperatureBadge({ temperature }: TemperatureBadgeProps) {
  const temp = temperature?.toLowerCase() || 'frio'
  const color = TEMPERATURE_COLORS[temp] || TEMPERATURE_COLORS['frio']
  const bg = TEMPERATURE_BG[temp] || TEMPERATURE_BG['frio']
  const label = TEMPERATURE_LABELS[temp] || temp

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold"
      style={{ backgroundColor: bg, color }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  )
}

// === Status Badge ===

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  won: { color: '#16a34a', bg: '#f0fdf4', label: 'Ganho' },
  lost: { color: '#dc2626', bg: '#fef2f2', label: 'Perdido' },
  open: { color: '#2563eb', bg: '#eff6ff', label: 'Aberto' },
  deleted: { color: '#6b7280', bg: '#f3f4f6', label: 'Deletado' },
}

interface StatusBadgeProps {
  status: string | null
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const s = status?.toLowerCase() || 'open'
  const config = STATUS_CONFIG[s] || STATUS_CONFIG['open']

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold"
      style={{ backgroundColor: config.bg, color: config.color }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: config.color }}
      />
      {config.label}
    </span>
  )
}

// === Channel Badge ===

interface ChannelBadgeProps {
  channel: string | null
}

export function ChannelBadge({ channel }: ChannelBadgeProps) {
  const ch = channel?.toLowerCase() || 'direct'
  const color = CHANNEL_COLORS[ch] || '#6b7280'

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold"
      style={{ backgroundColor: `${color}15`, color }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {channel || 'Direct'}
    </span>
  )
}
