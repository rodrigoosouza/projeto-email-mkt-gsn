'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Save, TrendingUp, Users, DollarSign, Target, BarChart3, Calendar,
  Briefcase, CheckCircle, ArrowRight, ShoppingCart, Calculator,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Slider } from '@/components/ui/slider'
import { useToast } from '@/components/ui/use-toast'
import { useOrganizationContext } from '@/contexts/organization-context'
import { saveBusinessPlan, getIndustryBenchmarks } from '@/lib/marketing/profiles'
import { calculateBusinessPlan, formatCurrency, formatPercent, formatNumber } from '@/lib/marketing/calculations'
import { cn } from '@/lib/utils'
import type { MarketingProfile, BusinessPlan, IndustryBenchmark } from '@/lib/marketing/types'

interface BusinessPlanTabProps {
  profile: MarketingProfile | null
  onRefresh: () => void
}

const defaultParams: BusinessPlan = {
  name: 'Plano Anual',
  year: new Date().getFullYear(),
  segment: 'consultoria',
  revenue_goal: 1200000,
  avg_ticket: 5000,
  net_margin: 0.30,
  sql_to_sale_rate: 0.25,
  mql_to_sql_rate: 0.30,
  tax_rate: 0.15,
  fixed_cost_growth: 0.05,
  marketing_investment_rate: 0.15,
  channels: {},
}

// ============= SUMMARY CARD =============

function SummaryCard({ title, value, subtitle, icon, variant = 'default' }: {
  title: string; value: string; subtitle?: string; icon: React.ReactNode
  variant?: 'default' | 'primary' | 'success' | 'warning'
}) {
  return (
    <div className={cn(
      'rounded-xl p-4 border transition-all',
      variant === 'primary' && 'bg-primary/10 border-primary/30',
      variant === 'success' && 'bg-emerald-500/10 border-emerald-500/30',
      variant === 'warning' && 'bg-amber-500/10 border-amber-500/30',
      variant === 'default' && 'bg-card border-border',
    )}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{title}</p>
          <p className={cn(
            'text-xl font-bold',
            variant === 'primary' && 'text-primary',
            variant === 'success' && 'text-emerald-500',
            variant === 'warning' && 'text-amber-500',
            variant === 'default' && 'text-foreground',
          )}>{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        <div className={cn(
          'p-2 rounded-lg',
          variant === 'primary' && 'bg-primary/20 text-primary',
          variant === 'success' && 'bg-emerald-500/20 text-emerald-500',
          variant === 'warning' && 'bg-amber-500/20 text-amber-500',
          variant === 'default' && 'bg-muted text-muted-foreground',
        )}>{icon}</div>
      </div>
    </div>
  )
}

// ============= CONTROL SLIDER =============

function ControlSlider({ label, value, onChange, min, max, step = 1, format = 'number' }: {
  label: string; value: number; onChange: (v: number) => void
  min: number; max: number; step?: number; format?: 'currency' | 'percent' | 'number'
}) {
  const fmt = (val: number) => {
    if (format === 'currency') return formatCurrency(val)
    if (format === 'percent') return formatPercent(val)
    return formatNumber(val)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">{label}</label>
        <span className="text-sm text-primary font-medium">{fmt(value)}</span>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={min}
        max={max}
        step={step}
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{fmt(min)}</span>
        <span>{fmt(max)}</span>
      </div>
    </div>
  )
}

// ============= DONUT (CSS-only, no recharts needed) =============

function DonutIndicator({ title, value, label, thresholds = { red: 15, yellow: 25 } }: {
  title: string; value: number; label: string; thresholds?: { red: number; yellow: number }
}) {
  const pct = Math.min(Math.max(value, 0), 100)
  const color = pct < thresholds.red ? 'text-red-500' : pct < thresholds.yellow ? 'text-amber-500' : 'text-emerald-500'
  const strokeColor = pct < thresholds.red ? '#ef4444' : pct < thresholds.yellow ? '#f59e0b' : '#10b981'
  const circumference = 2 * Math.PI * 40
  const dashoffset = circumference - (pct / 100) * circumference

  return (
    <div className="flex flex-col items-center">
      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{title}</p>
      <div className="relative w-24 h-24">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
          <circle cx="50" cy="50" r="40" fill="none" stroke={strokeColor} strokeWidth="8"
            strokeDasharray={circumference} strokeDashoffset={dashoffset} strokeLinecap="round"
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn('text-lg font-bold', color)}>{pct.toFixed(0)}%</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  )
}

// ============= OVERVIEW TAB =============

function OverviewTab({ plan, results, benchmarks, onParamChange, onBenchmark }: {
  plan: BusinessPlan; results: ReturnType<typeof calculateBusinessPlan>
  benchmarks: IndustryBenchmark[]; onParamChange: (key: keyof BusinessPlan, val: number) => void
  onBenchmark: (seg: string) => void
}) {
  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard title="Meta de Faturamento" value={formatCurrency(plan.revenue_goal)} subtitle="Anual" icon={<Target className="w-5 h-5" />} variant="primary" />
        <SummaryCard title="Lucro Liquido" value={formatCurrency(results.net_profit)} subtitle={formatPercent(plan.net_margin)} icon={<DollarSign className="w-5 h-5" />} variant="success" />
        <SummaryCard title="Vendas Necessarias" value={formatNumber(results.required_sales)} subtitle="Por ano" icon={<ShoppingCart className="w-5 h-5" />} />
        <SummaryCard title="Budget de Aquisicao" value={formatCurrency(results.acquisition_budget)} subtitle="Investimento total" icon={<TrendingUp className="w-5 h-5" />} variant="warning" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Control Panel */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Calculator className="w-4 h-4 text-primary" />
              Painel de Controle
            </CardTitle>
            <div className="space-y-2">
              <Label>Segmento (benchmarks)</Label>
              <Select value={plan.segment} onValueChange={onBenchmark}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {benchmarks.map((b) => (
                    <SelectItem key={b.segment} value={b.segment}>{b.segment_label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <ControlSlider label="Meta de Faturamento" value={plan.revenue_goal} onChange={(v) => onParamChange('revenue_goal', v)} min={100000} max={10000000} step={50000} format="currency" />
                <ControlSlider label="Ticket Medio" value={plan.avg_ticket} onChange={(v) => onParamChange('avg_ticket', v)} min={100} max={100000} step={100} format="currency" />
                <ControlSlider label="Margem Liquida" value={plan.net_margin} onChange={(v) => onParamChange('net_margin', v)} min={0.05} max={0.80} step={0.01} format="percent" />
                <ControlSlider label="Taxa de Impostos" value={plan.tax_rate} onChange={(v) => onParamChange('tax_rate', v)} min={0.05} max={0.35} step={0.01} format="percent" />
              </div>
              <div className="space-y-4">
                <ControlSlider label="Taxa SQL → Venda" value={plan.sql_to_sale_rate} onChange={(v) => onParamChange('sql_to_sale_rate', v)} min={0.05} max={0.50} step={0.01} format="percent" />
                <ControlSlider label="Taxa MQL → SQL" value={plan.mql_to_sql_rate} onChange={(v) => onParamChange('mql_to_sql_rate', v)} min={0.10} max={0.60} step={0.01} format="percent" />
                <ControlSlider label="Investimento Mkt" value={plan.marketing_investment_rate} onChange={(v) => onParamChange('marketing_investment_rate', v)} min={0.05} max={0.40} step={0.01} format="percent" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Performance Indicators */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-4"><CardTitle className="text-base">Indicadores de Performance</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <DonutIndicator title="SQL → Venda" value={plan.sql_to_sale_rate * 100} label={formatPercent(plan.sql_to_sale_rate)} />
                <DonutIndicator title="MQL → SQL" value={plan.mql_to_sql_rate * 100} label={formatPercent(plan.mql_to_sql_rate)} thresholds={{ red: 20, yellow: 35 }} />
                <DonutIndicator title="Margem Liquida" value={plan.net_margin * 100} label={formatPercent(plan.net_margin)} />
              </div>
            </CardContent>
          </Card>

          {/* Executive Summary */}
          <Card>
            <CardHeader className="pb-4"><CardTitle className="text-base">Resumo Executivo</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-muted/50 border">
                  <p className="text-xs text-muted-foreground uppercase">MQLs Necessarios</p>
                  <p className="text-2xl font-bold text-primary">{formatNumber(results.required_mqls)}</p>
                  <p className="text-xs text-muted-foreground mt-1">~{formatNumber(Math.round(results.required_mqls / 12))}/mes</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 border">
                  <p className="text-xs text-muted-foreground uppercase">SQLs Necessarios</p>
                  <p className="text-2xl font-bold text-emerald-500">{formatNumber(results.required_sqls)}</p>
                  <p className="text-xs text-muted-foreground mt-1">~{formatNumber(Math.round(results.required_sqls / 12))}/mes</p>
                </div>
              </div>
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
                <p className="text-sm">
                  Para atingir <span className="text-primary font-semibold">{formatCurrency(plan.revenue_goal)}</span> em faturamento anual,
                  voce precisa de <span className="text-primary font-semibold">{formatNumber(results.required_sales)}</span> vendas,
                  com investimento de <span className="text-primary font-semibold">{formatCurrency(results.acquisition_budget)}</span> em aquisicao.
                </p>
              </div>
              {/* Funnel */}
              <div className="space-y-2">
                {[
                  { label: 'Custo por Lead (CPL)', value: formatCurrency(results.cpl) },
                  { label: 'Custo por Reuniao', value: formatCurrency(results.cost_per_meeting) },
                  { label: 'CAC', value: formatCurrency(results.cac) },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-2 border-b last:border-0">
                    <span className="text-sm text-muted-foreground">{item.label}</span>
                    <span className="font-semibold text-sm">{item.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// ============= TACTICAL TAB =============

function TacticalTab({ plan, results }: { plan: BusinessPlan; results: ReturnType<typeof calculateBusinessPlan> }) {
  const fixedCostBase = plan.revenue_goal * 0.2
  const fixedCostGrowth = plan.fixed_cost_growth || 0.1

  return (
    <div className="space-y-6">
      {/* Sync Banner */}
      <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/10 border border-primary/30">
        <CheckCircle className="w-5 h-5 text-primary" />
        <div>
          <p className="text-sm font-medium">Dados sincronizados com o BP Estrategico</p>
          <p className="text-xs text-muted-foreground">
            Faturamento: {formatCurrency(plan.revenue_goal)} | Ticket: {formatCurrency(plan.avg_ticket)} | SQL→Venda: {formatPercent(plan.sql_to_sale_rate)}
          </p>
        </div>
      </div>

      {/* Annual Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <SummaryCard title="Investimento Total" value={formatCurrency(results.acquisition_budget + fixedCostBase)} icon={<DollarSign className="w-4 h-4" />} variant="primary" />
        <SummaryCard title="Custo Fixo Anual" value={formatCurrency(fixedCostBase)} icon={<Briefcase className="w-4 h-4" />} />
        <SummaryCard title="Budget Aquisicao" value={formatCurrency(results.acquisition_budget)} icon={<TrendingUp className="w-4 h-4" />} />
        <SummaryCard title="MQLs Anuais" value={formatNumber(results.required_mqls)} icon={<Users className="w-4 h-4" />} />
        <SummaryCard title="SQLs Anuais" value={formatNumber(results.required_sqls)} icon={<Target className="w-4 h-4" />} variant="success" />
        <SummaryCard title="Vendas Anuais" value={formatNumber(results.required_sales)} icon={<Calendar className="w-4 h-4" />} />
      </div>

      {/* Guaranteed Goals */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
            <CardTitle className="text-base">Metas Anuais Garantidas pelo BP</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 rounded-lg bg-muted/50 border">
              <p className="text-xs text-muted-foreground mb-1">Faturamento</p>
              <p className="text-xl font-bold text-primary">{formatCurrency(plan.revenue_goal)}</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50 border">
              <p className="text-xs text-muted-foreground mb-1">Vendas</p>
              <p className="text-xl font-bold">{formatNumber(results.required_sales)}</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50 border">
              <p className="text-xs text-muted-foreground mb-1">SQLs</p>
              <p className="text-xl font-bold">{formatNumber(results.required_sqls)}</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50 border">
              <p className="text-xs text-muted-foreground mb-1">MQLs</p>
              <p className="text-xl font-bold">{formatNumber(results.required_mqls)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fixed Cost Progression */}
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold">Progressao do Custo Fixo</h3>
              <p className="text-sm text-muted-foreground">
                Crescimento de {((fixedCostGrowth) * 100).toFixed(0)}% ao longo do ano
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Janeiro</p>
                <p className="text-lg font-bold">{formatCurrency(fixedCostBase / 12)}</p>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground" />
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Dezembro</p>
                <p className="text-lg font-bold text-primary">{formatCurrency((fixedCostBase / 12) * (1 + fixedCostGrowth))}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Cards Grid */}
      <div>
        <h3 className="text-base font-semibold mb-4">Distribuicao Mensal</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {results.monthly_distribution.map((m, i) => {
            const fixedCost = (fixedCostBase / 12) * (1 + (fixedCostGrowth * i / 11))
            const total = fixedCost + m.budget
            const seasonPct = (m.budget / (results.acquisition_budget / 12)) * 100

            return (
              <Card key={m.month} className="hover:border-primary/50 transition-colors">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-muted-foreground" />
                      <span className="text-sm font-medium">{m.month}</span>
                    </div>
                    <span className={cn(
                      'text-xs px-1.5 py-0.5 rounded-full',
                      seasonPct >= 100 ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                    )}>
                      {seasonPct.toFixed(0)}%
                    </span>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Fixo</span>
                      <span>{formatCurrency(fixedCost)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Aquisicao</span>
                      <span className="text-primary">{formatCurrency(m.budget)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-1">
                      <span className="text-muted-foreground">Total</span>
                      <span className="font-medium">{formatCurrency(total)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1 border-t">
                    <div className="flex-1 text-center p-1 rounded bg-muted/50">
                      <p className="text-[10px] text-muted-foreground">SQLs</p>
                      <p className="text-xs font-bold text-emerald-500">{formatNumber(m.sqls)}</p>
                    </div>
                    <div className="flex-1 text-center p-1 rounded bg-muted/50">
                      <p className="text-[10px] text-muted-foreground">Vendas</p>
                      <p className="text-xs font-bold text-primary">{formatNumber(m.sales)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Monthly Table */}
      <Card>
        <CardHeader className="pb-4"><CardTitle className="text-base">Plano Mensal Detalhado</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground">Mes</th>
                  <th className="text-right py-2 px-2 font-medium text-muted-foreground">MQLs</th>
                  <th className="text-right py-2 px-2 font-medium text-muted-foreground">SQLs</th>
                  <th className="text-right py-2 px-2 font-medium text-muted-foreground">Vendas</th>
                  <th className="text-right py-2 px-2 font-medium text-muted-foreground">Budget</th>
                  <th className="text-right py-2 px-2 font-medium text-muted-foreground">Faturamento</th>
                </tr>
              </thead>
              <tbody>
                {results.monthly_distribution.map((m) => (
                  <tr key={m.month} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="py-2 px-2 font-medium">{m.month}</td>
                    <td className="py-2 px-2 text-right">{formatNumber(m.mqls)}</td>
                    <td className="py-2 px-2 text-right text-emerald-500">{formatNumber(m.sqls)}</td>
                    <td className="py-2 px-2 text-right text-primary">{formatNumber(m.sales)}</td>
                    <td className="py-2 px-2 text-right text-amber-500">{formatCurrency(m.budget)}</td>
                    <td className="py-2 px-2 text-right font-medium">{formatCurrency(m.revenue)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-muted/20 font-bold">
                  <td className="py-2 px-2">TOTAL</td>
                  <td className="py-2 px-2 text-right">{formatNumber(results.required_mqls)}</td>
                  <td className="py-2 px-2 text-right text-emerald-500">{formatNumber(results.required_sqls)}</td>
                  <td className="py-2 px-2 text-right text-primary">{formatNumber(results.required_sales)}</td>
                  <td className="py-2 px-2 text-right text-amber-500">{formatCurrency(results.acquisition_budget)}</td>
                  <td className="py-2 px-2 text-right">{formatCurrency(plan.revenue_goal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ============= OPERATIONAL TAB =============

function OperationalTab({ plan, results }: { plan: BusinessPlan; results: ReturnType<typeof calculateBusinessPlan> }) {
  const [selectedMonth, setSelectedMonth] = useState(0)
  const months = ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

  const monthData = results.monthly_distribution[selectedMonth]
  const monthlyRevenue = (monthData?.sales || 0) * plan.avg_ticket
  const bpMonthlyBudget = results.acquisition_budget / 12
  const bpMonthlySql = Math.round(results.required_sqls / 12)
  const bpMonthlySales = Math.round(results.required_sales / 12)

  const totalProjectedRevenue = results.monthly_distribution.reduce((s, m) => s + m.revenue, 0)
  const annualProgress = (totalProjectedRevenue / plan.revenue_goal) * 100

  return (
    <div className="space-y-6">
      {/* Month Selector */}
      <div className="flex flex-wrap gap-4 items-center justify-between bg-muted/30 p-4 rounded-xl border">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Visualizando:</span>
          <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              {months.map((month, i) => (
                <SelectItem key={i} value={i.toString()}>{month}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="text-right text-sm">
          <span className="text-muted-foreground">Budget: </span>
          <span className="font-semibold">{formatCurrency(monthData?.budget || 0)}</span>
          <span className="text-muted-foreground mx-2">|</span>
          <span className="text-muted-foreground">Reunioes: </span>
          <span className="font-semibold">{formatNumber(monthData?.sqls || 0)}</span>
        </div>
      </div>

      {/* Monthly Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-muted/30 rounded-xl p-4 border">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-amber-500" />
            <span className="text-xs text-muted-foreground">Budget do Mes</span>
          </div>
          <p className="text-xl font-bold">{formatCurrency(monthData?.budget || 0)}</p>
        </div>
        <div className="bg-muted/30 rounded-xl p-4 border">
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Reunioes Esperadas</span>
          </div>
          <p className="text-xl font-bold">{formatNumber(monthData?.sqls || 0)}</p>
        </div>
        <div className="bg-muted/30 rounded-xl p-4 border">
          <div className="flex items-center gap-2 mb-1">
            <ShoppingCart className="w-4 h-4 text-emerald-500" />
            <span className="text-xs text-muted-foreground">Vendas Esperadas</span>
          </div>
          <p className="text-xl font-bold">{formatNumber(monthData?.sales || 0)}</p>
        </div>
        <div className="bg-muted/30 rounded-xl p-4 border">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span className="text-xs text-muted-foreground">Receita Projetada</span>
          </div>
          <p className="text-xl font-bold">{formatCurrency(monthlyRevenue)}</p>
        </div>
      </div>

      {/* Annual Progress */}
      <Card>
        <CardContent className="py-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Progresso para Meta Anual</span>
            <span className="text-sm">
              <span className="font-semibold">{formatCurrency(totalProjectedRevenue)}</span>
              <span className="text-muted-foreground"> / {formatCurrency(plan.revenue_goal)}</span>
              <span className="text-muted-foreground ml-2">({annualProgress.toFixed(0)}%)</span>
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.min(annualProgress, 100)}%` }} />
          </div>
        </CardContent>
      </Card>

      {/* Strategic Validation */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
            <CardTitle className="text-base">Validacao Estrategica — {months[selectedMonth]}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-muted/50 rounded-xl p-4 border">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Budget Mensal</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold">{formatCurrency(monthData?.budget || 0)}</span>
                <span className="text-xs text-muted-foreground">/ {formatCurrency(bpMonthlyBudget)}</span>
              </div>
            </div>
            <div className="bg-muted/50 rounded-xl p-4 border">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Reunioes/mes</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold">{formatNumber(monthData?.sqls || 0)}</span>
                <span className="text-xs text-muted-foreground">/ {formatNumber(bpMonthlySql)}</span>
              </div>
            </div>
            <div className="bg-muted/50 rounded-xl p-4 border">
              <div className="flex items-center gap-2 mb-2">
                <ShoppingCart className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Vendas/mes</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold">{formatNumber(monthData?.sales || 0)}</span>
                <span className="text-xs text-muted-foreground">/ {formatNumber(bpMonthlySales)}</span>
              </div>
            </div>
            <div className="bg-muted/50 rounded-xl p-4 border">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Custo/Reuniao</span>
              </div>
              <p className="text-lg font-bold">{formatCurrency(monthData && monthData.sqls > 0 ? monthData.budget / monthData.sqls : 0)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ============= MAIN COMPONENT =============

export function BusinessPlanTab({ profile, onRefresh }: BusinessPlanTabProps) {
  const { currentOrg } = useOrganizationContext()
  const { toast } = useToast()
  const [plan, setPlan] = useState<BusinessPlan>(profile?.business_plan || defaultParams)
  const [benchmarks, setBenchmarks] = useState<IndustryBenchmark[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getIndustryBenchmarks().then(setBenchmarks).catch(console.error)
  }, [])

  useEffect(() => {
    if (profile?.business_plan) {
      setPlan(profile.business_plan)
    }
  }, [profile?.business_plan])

  const results = useMemo(() => calculateBusinessPlan(plan), [plan])

  const handleBenchmark = (segment: string) => {
    const b = benchmarks.find((bm) => bm.segment === segment)
    if (b) {
      setPlan((prev) => ({
        ...prev,
        segment,
        avg_ticket: b.avg_ticket,
        net_margin: b.avg_margin,
        sql_to_sale_rate: b.sql_to_sale_rate,
        mql_to_sql_rate: b.mql_to_sql_rate,
        tax_rate: b.avg_tax_rate,
      }))
    }
  }

  const handleSave = async () => {
    if (!currentOrg?.id) return
    setSaving(true)
    try {
      await saveBusinessPlan(currentOrg.id, { ...plan, calculated_results: results })
      toast({ title: 'Business Plan salvo' })
      onRefresh()
    } catch (error) {
      console.error('Erro:', error)
      toast({ title: 'Erro ao salvar', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const onParamChange = (field: keyof BusinessPlan, value: number) => {
    setPlan((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Business Plan</h3>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-1" />
          {saving ? 'Salvando...' : 'Salvar Plano'}
        </Button>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">
            <BarChart3 className="h-3.5 w-3.5 mr-1" />
            Estrategico
          </TabsTrigger>
          <TabsTrigger value="tactical">
            <Target className="h-3.5 w-3.5 mr-1" />
            Tatico
          </TabsTrigger>
          <TabsTrigger value="operational">
            <Calendar className="h-3.5 w-3.5 mr-1" />
            Operacional
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab plan={plan} results={results} benchmarks={benchmarks} onParamChange={onParamChange} onBenchmark={handleBenchmark} />
        </TabsContent>

        <TabsContent value="tactical">
          <TacticalTab plan={plan} results={results} />
        </TabsContent>

        <TabsContent value="operational">
          <OperationalTab plan={plan} results={results} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
