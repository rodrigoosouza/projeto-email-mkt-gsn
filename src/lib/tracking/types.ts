// === Tracking Types ===
// Adapted from tracking-dashboard. These map to existing Supabase tables
// (events, conversions, lead_journey, orbit_gestao_*, evolutto_*).

// === Tabela events ===
export interface TrackingEvent {
  id: number
  created_at: string
  event_name: string
  session_id: string | null
  client_id: string | null
  ga_client_id: string | null
  external_id: string | null
  event_id: string | null

  // Pagina
  page_url: string | null
  page_path: string | null
  page_hostname: string | null
  referrer: string | null
  landing_page: string | null
  origin_page: string | null

  // UTMs last-touch
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  utm_content: string | null
  utm_term: string | null

  // UTMs first-touch
  ft_utm_source: string | null
  ft_utm_medium: string | null
  ft_utm_campaign: string | null
  ft_utm_content: string | null
  ft_utm_term: string | null

  // Click IDs
  gclid: string | null
  fbclid: string | null
  ttclid: string | null
  gbraid: string | null
  wbraid: string | null
  msclkid: string | null
  gad_campaignid: string | null
  gad_source: string | null
  li_fat_id: string | null
  twclid: string | null
  sck: string | null

  // Cookies Meta/TikTok
  fbc: string | null
  fbp: string | null
  ttp: string | null

  // Geo
  geo_country: string | null
  geo_state: string | null
  geo_city: string | null
  geo_zip: string | null

  // Lead data
  email: string | null
  phone: string | null
  first_name: string | null
  last_name: string | null

  // Comportamento
  scroll_depth: string | null
  time_on_page: number | null
  ref: string | null

  // Lead Scoring
  lead_score: number | null
  lead_temperature: string | null

  // Tecnico
  user_agent: string | null
  first_visit: string | null
  session_attributes_encoded: string | null
  custom_data: Record<string, unknown> | null

  // Timezone
  created_at_brasilia: string | null
}

// === Tabela conversions ===
export interface Conversion {
  id: number
  created_at: string
  deal_id: string
  deal_title: string | null
  deal_status: string | null
  deal_value: number | null
  deal_value_monthly: number | null
  deal_currency: string | null
  deal_won_at: string | null
  deal_created_at: string | null
  pipeline_id: string | null
  stage_id: string | null

  // Pessoas
  email: string | null
  phone: string | null
  first_name: string | null
  last_name: string | null
  company_name: string | null
  owner_name: string | null
  owner_email: string | null

  // Sessao original
  session_id: string | null
  external_id: string | null

  // Atribuicao last-touch
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  utm_content: string | null
  utm_term: string | null

  // Atribuicao first-touch
  ft_utm_source: string | null
  ft_utm_medium: string | null
  ft_utm_campaign: string | null
  ft_utm_content: string | null
  ft_utm_term: string | null

  // Click IDs
  gclid: string | null
  gbraid: string | null
  wbraid: string | null
  fbclid: string | null
  ttclid: string | null
  msclkid: string | null
  gad_campaignid: string | null
  gad_source: string | null

  // Cookies
  fbc: string | null
  fbp: string | null

  // Lead Scoring
  lead_score: number | null
  lead_temperature: string | null

  // Status de envio
  sent_google: boolean
  sent_meta_main: boolean
  sent_meta_secondary: boolean

  // Respostas
  google_response: Record<string, unknown> | null
  meta_main_response: Record<string, unknown> | null
  meta_secondary_response: Record<string, unknown> | null

  // Tecnico
  session_attributes_encoded: string | null
  custom_data: Record<string, unknown> | null
}

// === View lead_journey ===
export interface LeadJourney {
  deal_id: string
  email: string | null
  first_name: string | null
  last_name: string | null
  phone: string | null
  company_name: string | null
  deal_title: string | null
  deal_status: string | null
  deal_value: number | null
  deal_value_monthly: number | null
  deal_currency: string | null
  deal_won_at: string | null
  deal_created_at: string | null
  pipeline_id: string | null
  stage_id: string | null
  owner_name: string | null

  // Atribuicao
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  utm_content: string | null
  utm_term: string | null
  ft_utm_source: string | null
  ft_utm_medium: string | null
  ft_utm_campaign: string | null
  ft_utm_content: string | null
  ft_utm_term: string | null

  // Click IDs
  gclid: string | null
  gbraid: string | null
  wbraid: string | null
  fbclid: string | null
  ttclid: string | null
  msclkid: string | null
  fbc: string | null
  fbp: string | null

  // Comportamento agregado
  total_sessions: number
  paginas_unicas_visitadas: number
  paginas_visitadas: string[] | null
  total_pageviews: number
  total_forms_preenchidos: number

  // Scroll
  max_scroll_depth: number | null
  sessoes_scroll_90: number
  sessoes_scroll_75: number
  sessoes_scroll_50: number

  // Tempo
  max_time_on_page_segundos: number | null
  avg_time_on_page_segundos: number | null
  total_heartbeats: number

  // Lead Scoring
  lead_score: number | null
  lead_temperature: string | null

  // Timeline
  primeiro_contato_at: string | null
  ultimo_evento_at: string | null
  dias_primeiro_contato_ate_venda: number | null
  dias_lead_ate_venda: number | null

  // Canais
  canais_distintos: number
  canais_visitados: string[] | null

  // Geo
  geo_country: string | null
  geo_state: string | null
  geo_city: string | null

  // Status plataformas
  sent_google: boolean
  sent_meta_main: boolean
  sent_meta_secondary: boolean
}

// === Tipos auxiliares ===
export type Temperature = 'frio' | 'morno' | 'quente' | 'muito quente'

export type DateRange = '7d' | '30d' | '90d' | 'custom'

export interface DateFilter {
  range: DateRange
  startDate: string
  endDate: string
}

export interface KPIData {
  totalVisitors: number
  totalSessions: number
  totalLeads: number
  totalConversions: number
  conversionRate: number
  totalRevenue: number
  avgScore: number
  hotLeadsPercent: number
  temperatureDistribution: Record<string, number>
}
