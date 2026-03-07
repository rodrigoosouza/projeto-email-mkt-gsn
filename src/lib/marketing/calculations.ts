// ============================================================
// Business Plan Calculations
// Ported from grow-automaton/src/hooks/useBPCalculations.ts
// Pure functions (no React dependency) for server/client use.
// ============================================================

import type { BusinessPlanParams, BPCalculatedResults, MonthlyDistribution } from './types'

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const SEASONALITY = [0.8, 0.85, 1.0, 1.0, 1.0, 0.95, 0.9, 0.95, 1.0, 1.1, 1.2, 0.7]

export function calculateBusinessPlan(params: BusinessPlanParams): BPCalculatedResults {
  const {
    revenue_goal,
    avg_ticket,
    net_margin,
    sql_to_sale_rate,
    mql_to_sql_rate,
    marketing_investment_rate = 0.15,
  } = params

  // Core calculations
  const net_profit = revenue_goal * net_margin
  const required_sales = Math.ceil(revenue_goal / avg_ticket)
  const required_sqls = Math.ceil(required_sales / sql_to_sale_rate)
  const required_mqls = Math.ceil(required_sqls / mql_to_sql_rate)

  // Budget
  const acquisition_budget = revenue_goal * marketing_investment_rate

  const cpl = required_mqls > 0 ? acquisition_budget / required_mqls : 0
  const cost_per_meeting = required_sqls > 0 ? acquisition_budget / required_sqls : 0
  const cac = required_sales > 0 ? acquisition_budget / required_sales : 0

  // Monthly distribution based on seasonality
  const totalSeasonality = SEASONALITY.reduce((a, b) => a + b, 0)
  const monthly_distribution: MonthlyDistribution[] = MONTHS.map((month, index) => {
    const factor = SEASONALITY[index] / totalSeasonality
    return {
      month,
      revenue: revenue_goal * factor,
      sales: Math.ceil(required_sales * factor),
      sqls: Math.ceil(required_sqls * factor),
      mqls: Math.ceil(required_mqls * factor),
      budget: acquisition_budget * factor,
    }
  })

  return {
    net_profit,
    required_sales,
    acquisition_budget,
    required_mqls,
    required_sqls,
    cpl,
    cost_per_meeting,
    cac,
    monthly_distribution,
  }
}

// ============= FORMATTERS =============

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(Math.round(value))
}
