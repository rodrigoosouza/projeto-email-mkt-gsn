'use client'

interface ScoreBarProps {
  score: number | null
  maxScore?: number
}

export default function ScoreBar({ score, maxScore = 100 }: ScoreBarProps) {
  const value = score ?? 0
  const percent = Math.min((value / maxScore) * 100, 100)

  const getColor = () => {
    if (percent >= 75) return '#dc2626'
    if (percent >= 50) return '#f59e0b'
    if (percent >= 25) return '#3b82f6'
    return '#94a3b8'
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${percent}%`, backgroundColor: getColor() }}
        />
      </div>
      <span className="text-xs text-muted-foreground w-8 text-right tabular-nums">
        {value}
      </span>
    </div>
  )
}
