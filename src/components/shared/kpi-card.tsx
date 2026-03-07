import { LucideIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface KpiCardProps {
  icon: LucideIcon
  label: string
  value: string | number
  change?: number
  changeLabel?: string
}

export function KpiCard({ icon: Icon, label, value, change, changeLabel }: KpiCardProps) {
  const isPositive = change !== undefined && change >= 0

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change !== undefined && (
          <p className="text-xs text-muted-foreground mt-1">
            <span
              className={cn(
                'inline-flex items-center font-medium',
                isPositive ? 'text-green-600' : 'text-red-600'
              )}
            >
              {isPositive ? '+' : ''}
              {change}%
            </span>
            {changeLabel && <span className="ml-1">{changeLabel}</span>}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
