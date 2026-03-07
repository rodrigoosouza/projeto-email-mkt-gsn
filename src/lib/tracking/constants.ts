// === Cores de Temperatura ===
export const TEMPERATURE_COLORS: Record<string, string> = {
  'frio': '#525270',
  'morno': '#4d85ff',
  'quente': '#ff9500',
  'muito quente': '#ff3b30',
}

export const TEMPERATURE_BG: Record<string, string> = {
  'frio': 'rgba(82,82,112,0.15)',
  'morno': 'rgba(77,133,255,0.15)',
  'quente': 'rgba(255,149,0,0.15)',
  'muito quente': 'rgba(255,59,48,0.15)',
}

export const TEMPERATURE_LABELS: Record<string, string> = {
  'frio': 'Frio',
  'morno': 'Morno',
  'quente': 'Quente',
  'muito quente': 'Muito Quente',
}

// === Cores de Canal ===
export const CHANNEL_COLORS: Record<string, string> = {
  'google': '#4285f4',
  'meta': '#0668e1',
  'facebook': '#0668e1',
  'instagram': '#e4405f',
  'tiktok': '#00f2ea',
  'linkedin': '#0a66c2',
  'organic': '#00e87a',
  'direct': '#a855f7',
  'referral': '#ff9500',
  'email': '#525270',
}

// === Cores dos Graficos ===
export const CHART_COLORS = [
  '#4d85ff', '#00e87a', '#ff9500', '#ff3b30',
  '#a855f7', '#00c4cc', '#e2e2f0', '#525270',
]

// === Event Names ===
export const PAGE_VIEW_EVENTS = ['page_view', 'custom_page_view']
export const ENGAGEMENT_EVENTS = ['user_engagement', 'scroll_depth', 'time_on_page_heartbeat']
export const FORM_EVENTS = ['form_start', 'form_submit']
export const LEAD_EVENTS = [
  'generate_lead',
  'form_submit',
  'conversion',
  'lead_auditoria',
  'lead_iso_9001',
  'lead_iso_14001',
  'lead_iso_27001',
  'lead_iso_45001',
  'lead_pbqph',
  'lead_sassmaq',
]
