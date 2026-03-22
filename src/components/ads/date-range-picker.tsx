// @ts-nocheck
'use client'

import * as React from 'react'
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, isAfter, isBefore, isSameDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

export interface DateRange {
  from: Date
  to: Date
}

interface Preset {
  label: string
  getValue: () => DateRange
}

const getPresets = (): Preset[] => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return [
    {
      label: 'Hoje',
      getValue: () => ({ from: today, to: today }),
    },
    {
      label: 'Ontem',
      getValue: () => {
        const yesterday = subDays(today, 1)
        return { from: yesterday, to: yesterday }
      },
    },
    {
      label: 'Últimos 7 dias',
      getValue: () => ({ from: subDays(today, 6), to: today }),
    },
    {
      label: 'Últimos 14 dias',
      getValue: () => ({ from: subDays(today, 13), to: today }),
    },
    {
      label: 'Últimos 30 dias',
      getValue: () => ({ from: subDays(today, 29), to: today }),
    },
    {
      label: 'Esta semana',
      getValue: () => ({
        from: startOfWeek(today, { weekStartsOn: 1 }),
        to: today,
      }),
    },
    {
      label: 'Semana passada',
      getValue: () => {
        const lastWeekStart = startOfWeek(subDays(today, 7), { weekStartsOn: 1 })
        const lastWeekEnd = endOfWeek(subDays(today, 7), { weekStartsOn: 1 })
        return { from: lastWeekStart, to: lastWeekEnd }
      },
    },
    {
      label: 'Este mês',
      getValue: () => ({
        from: startOfMonth(today),
        to: today,
      }),
    },
    {
      label: 'Mês passado',
      getValue: () => {
        const lastMonth = subMonths(today, 1)
        return {
          from: startOfMonth(lastMonth),
          to: endOfMonth(lastMonth),
        }
      },
    },
  ]
}

// Simple inline calendar component for the date range picker
function MiniCalendar({
  month,
  onMonthChange,
  selectedRange,
  onDayClick,
  hoveredDay,
  onDayHover,
}: {
  month: Date
  onMonthChange: (date: Date) => void
  selectedRange: { from: Date | null; to: Date | null }
  onDayClick: (day: Date) => void
  hoveredDay: Date | null
  onDayHover: (day: Date | null) => void
}) {
  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  const firstDayOfMonth = new Date(year, monthIndex, 1).getDay()
  // Adjust to Monday start (0=Mon, 6=Sun)
  const startDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1
  const weekDays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
  const monthNames = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

  const prevMonth = () => onMonthChange(new Date(year, monthIndex - 1, 1))
  const nextMonth = () => onMonthChange(new Date(year, monthIndex + 1, 1))

  const isInRange = (day: Date) => {
    const { from, to } = selectedRange
    if (!from) return false
    const end = to || hoveredDay
    if (!end) return false
    const start = isBefore(from, end) ? from : end
    const finish = isAfter(from, end) ? from : end
    return (isAfter(day, start) || isSameDay(day, start)) && (isBefore(day, finish) || isSameDay(day, finish))
  }

  const isStart = (day: Date) => {
    const { from, to } = selectedRange
    if (!from) return false
    const end = to || hoveredDay
    if (!end) return isSameDay(day, from)
    return isSameDay(day, isBefore(from, end) ? from : end)
  }

  const isEnd = (day: Date) => {
    const { from, to } = selectedRange
    if (!from) return false
    const end = to || hoveredDay
    if (!end) return false
    return isSameDay(day, isAfter(from, end) ? from : end)
  }

  const days = []
  for (let i = 0; i < startDay; i++) {
    days.push(<div key={`empty-${i}`} className="h-8 w-8" />)
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, monthIndex, d)
    date.setHours(0, 0, 0, 0)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const isToday = isSameDay(date, today)
    const inRange = isInRange(date)
    const start = isStart(date)
    const end = isEnd(date)
    const isFuture = isAfter(date, today)

    days.push(
      <button
        key={d}
        type="button"
        disabled={isFuture}
        onClick={() => onDayClick(date)}
        onMouseEnter={() => onDayHover(date)}
        className={cn(
          'h-8 w-8 text-sm rounded-md transition-colors relative',
          isFuture && 'text-muted-foreground/30 cursor-not-allowed',
          !isFuture && !inRange && 'hover:bg-accent',
          inRange && !start && !end && 'bg-primary/10 text-primary',
          (start || end) && 'bg-primary text-primary-foreground font-semibold',
          isToday && !inRange && 'border border-primary/50 font-semibold',
        )}
      >
        {d}
      </button>
    )
  }

  return (
    <div className="w-[260px]">
      <div className="flex items-center justify-between mb-3 px-1">
        <button type="button" onClick={prevMonth} className="p-1 hover:bg-accent rounded">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium capitalize">
          {monthNames[monthIndex]} {year}
        </span>
        <button type="button" onClick={nextMonth} className="p-1 hover:bg-accent rounded">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {weekDays.map((wd) => (
          <div key={wd} className="h-8 w-8 flex items-center justify-center text-xs text-muted-foreground font-medium">
            {wd}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {days}
      </div>
    </div>
  )
}

interface DateRangePickerProps {
  value: DateRange
  onChange: (range: DateRange) => void
  className?: string
}

export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [activePreset, setActivePreset] = React.useState<string | null>('Últimos 30 dias')
  const [tempRange, setTempRange] = React.useState<{ from: Date | null; to: Date | null }>({
    from: value.from,
    to: value.to,
  })
  const [selectingEnd, setSelectingEnd] = React.useState(false)
  const [hoveredDay, setHoveredDay] = React.useState<Date | null>(null)
  const [leftMonth, setLeftMonth] = React.useState(() => {
    const d = new Date(value.from)
    d.setDate(1)
    return d
  })
  const [rightMonth, setRightMonth] = React.useState(() => {
    const d = new Date(value.from)
    d.setMonth(d.getMonth() + 1)
    d.setDate(1)
    return d
  })

  const presets = React.useMemo(() => getPresets(), [])

  const handlePresetClick = (preset: Preset) => {
    const range = preset.getValue()
    setActivePreset(preset.label)
    setTempRange({ from: range.from, to: range.to })
    setSelectingEnd(false)
    // Update calendar months to show the range
    const leftM = new Date(range.from)
    leftM.setDate(1)
    setLeftMonth(leftM)
    const rightM = new Date(leftM)
    rightM.setMonth(rightM.getMonth() + 1)
    setRightMonth(rightM)
  }

  const handleDayClick = (day: Date) => {
    setActivePreset(null)
    if (!selectingEnd || !tempRange.from) {
      setTempRange({ from: day, to: null })
      setSelectingEnd(true)
    } else {
      if (isBefore(day, tempRange.from)) {
        setTempRange({ from: day, to: tempRange.from })
      } else {
        setTempRange({ from: tempRange.from, to: day })
      }
      setSelectingEnd(false)
    }
  }

  const handleApply = () => {
    if (tempRange.from && tempRange.to) {
      onChange({ from: tempRange.from, to: tempRange.to })
      setOpen(false)
    }
  }

  const handleCancel = () => {
    setTempRange({ from: value.from, to: value.to })
    setOpen(false)
  }

  const handleLeftMonthChange = (m: Date) => {
    setLeftMonth(m)
    const right = new Date(m)
    right.setMonth(right.getMonth() + 1)
    setRightMonth(right)
  }

  const handleRightMonthChange = (m: Date) => {
    setRightMonth(m)
    const left = new Date(m)
    left.setMonth(left.getMonth() - 1)
    setLeftMonth(left)
  }

  const formatRangeLabel = () => {
    if (activePreset) {
      return `${activePreset}: ${format(value.from, 'd MMM', { locale: ptBR })} - ${format(value.to, 'd MMM yyyy', { locale: ptBR })}`
    }
    return `${format(value.from, 'd MMM', { locale: ptBR })} - ${format(value.to, 'd MMM yyyy', { locale: ptBR })}`
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'justify-start text-left font-normal min-w-[280px]',
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {formatRangeLabel()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" sideOffset={8}>
        <div className="flex">
          {/* Presets sidebar */}
          <div className="border-r p-3 w-[180px] space-y-0.5">
            <p className="text-xs font-medium text-muted-foreground mb-2 px-2">Período</p>
            {presets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => handlePresetClick(preset)}
                className={cn(
                  'w-full text-left text-sm px-2 py-1.5 rounded-md transition-colors',
                  activePreset === preset.label
                    ? 'bg-primary text-primary-foreground font-medium'
                    : 'hover:bg-accent'
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Calendars */}
          <div className="p-3">
            <div className="flex gap-4">
              <MiniCalendar
                month={leftMonth}
                onMonthChange={handleLeftMonthChange}
                selectedRange={tempRange}
                onDayClick={handleDayClick}
                hoveredDay={selectingEnd ? hoveredDay : null}
                onDayHover={setHoveredDay}
              />
              <MiniCalendar
                month={rightMonth}
                onMonthChange={handleRightMonthChange}
                selectedRange={tempRange}
                onDayClick={handleDayClick}
                hoveredDay={selectingEnd ? hoveredDay : null}
                onDayHover={setHoveredDay}
              />
            </div>

            {/* Range summary + actions */}
            <div className="flex items-center justify-between mt-4 pt-3 border-t">
              <div className="text-sm text-muted-foreground">
                {tempRange.from && tempRange.to ? (
                  <span>
                    {format(tempRange.from, 'd MMM yyyy', { locale: ptBR })} — {format(tempRange.to, 'd MMM yyyy', { locale: ptBR })}
                  </span>
                ) : tempRange.from ? (
                  <span>Selecione a data final...</span>
                ) : (
                  <span>Selecione o período</span>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={handleCancel}>
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handleApply}
                  disabled={!tempRange.from || !tempRange.to}
                >
                  Aplicar
                </Button>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
