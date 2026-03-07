/**
 * Tracking-specific utility functions.
 *
 * NOTE: The base `cn()` utility lives in `@/lib/utils`.
 * These are tracking/analytics-specific formatters and helpers.
 */

import { format, formatDistanceToNow, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// === Formatadores de Data ===

export function formatDate(dateString: string | null): string {
  if (!dateString) return '\u2014'
  return format(parseISO(dateString), 'dd/MM/yyyy', { locale: ptBR })
}

export function formatDateTime(dateString: string | null): string {
  if (!dateString) return '\u2014'
  return format(parseISO(dateString), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })
}

export function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return '\u2014'
  return formatDistanceToNow(parseISO(dateString), { addSuffix: true, locale: ptBR })
}

// === Formatadores de Moeda ===

export function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return 'R$ 0'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

// === Formatadores de Numero ===

export function formatNumber(value: number | null): string {
  if (value === null || value === undefined) return '0'
  return new Intl.NumberFormat('pt-BR').format(value)
}

export function formatPercent(value: number | null, decimals = 1): string {
  if (value === null || value === undefined) return '0%'
  return `${value.toFixed(decimals)}%`
}

// === Helpers ===

export function getFullName(firstName: string | null, lastName: string | null): string {
  return [firstName, lastName].filter(Boolean).join(' ') || '\u2014'
}

export function getDateRange(range: '7d' | '30d' | '90d'): { startDate: string; endDate: string } {
  const now = new Date()
  const endDate = now.toISOString()
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90
  const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
  const startDate = start.toISOString()
  return { startDate, endDate }
}

export function generateCSV(data: Record<string, unknown>[], filename: string): void {
  if (!data.length) return
  const headers = Object.keys(data[0])
  const csvContent = [
    headers.join(','),
    ...data.map(row =>
      headers.map(h => {
        const val = row[h]
        const str = val === null || val === undefined ? '' : String(val)
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"`
          : str
      }).join(',')
    ),
  ].join('\n')

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
