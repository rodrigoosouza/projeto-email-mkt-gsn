'use client'

import { ReactNode } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface TrackingKpiCardProps {
  title: string
  value: string | number
  subtitle?: string
  trend?: number
  icon?: ReactNode
}

export default function TrackingKpiCard({ title, value, subtitle, trend, icon }: TrackingKpiCardProps) {
  const trendColor =
    trend && trend > 0
      ? 'text-green-600'
      : trend && trend < 0
        ? 'text-red-600'
        : 'text-muted-foreground'

  const TrendIcon =
    trend && trend > 0
      ? TrendingUp
      : trend && trend < 0
        ? TrendingDown
        : Minus

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {title}
          </span>
          {icon && (
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              {icon}
            </div>
          )}
        </div>
        <div className="text-2xl font-bold text-foreground tracking-tight">{value}</div>
        <div className="flex items-center gap-2 mt-2">
          {trend !== undefined && (
            <span className={`flex items-center gap-1 text-xs font-medium ${trendColor}`}>
              <TrendIcon className="w-3 h-3" />
              {Math.abs(trend).toFixed(1)}%
            </span>
          )}
          {subtitle && (
            <span className="text-xs text-muted-foreground">{subtitle}</span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
