'use client'

interface TopListProps {
  data: { label: string; value: number }[]
  color?: string
  title: string
}

export default function TopList({ data, color = '#3B82F6', title }: TopListProps) {
  const max = data[0]?.value || 1

  return (
    <div>
      <h4 className="text-sm font-medium text-foreground mb-3">{title}</h4>
      <div className="space-y-2.5 max-h-[260px] overflow-y-auto">
        {data.map((item, i) => (
          <div key={i}>
            <div className="flex justify-between items-center mb-1">
              <span
                className="text-xs text-muted-foreground truncate max-w-[75%]"
                title={item.label}
              >
                {item.label}
              </span>
              <span className="text-xs font-medium text-foreground">
                {item.value.toLocaleString('pt-BR')}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5">
              <div
                className="h-1.5 rounded-full transition-all"
                style={{
                  width: `${(item.value / max) * 100}%`,
                  backgroundColor: color,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
