'use client'

import { CHART_COLORS } from '@/lib/tracking/constants'

interface FunnelChartProps {
  steps: { name: string; value: number; rate: number }[]
}

export default function FunnelChart({ steps }: FunnelChartProps) {
  const maxValue = steps[0]?.value || 1

  return (
    <div className="space-y-3">
      {steps.map((step, i) => {
        const widthPercent = Math.max((step.value / maxValue) * 100, 8)

        return (
          <div key={step.name}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">{step.name}</span>
              <div className="flex items-center gap-2">
                {step.rate > 0 && i > 0 && (
                  <span className="text-[10px] text-muted-foreground">
                    {step.rate.toFixed(1)}%
                  </span>
                )}
                <span className="text-sm font-semibold text-foreground">
                  {step.value.toLocaleString('pt-BR')}
                </span>
              </div>
            </div>
            <div className="h-8 bg-muted rounded-lg overflow-hidden">
              <div
                className="h-full rounded-lg transition-all duration-700"
                style={{
                  width: `${widthPercent}%`,
                  backgroundColor: CHART_COLORS[i] || CHART_COLORS[0],
                  opacity: 0.85,
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
