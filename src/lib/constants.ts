export const APP_NAME = 'Plataforma Email'
export const APP_DESCRIPTION = 'Plataforma de Email Marketing'

export const LEAD_STATUS_LABELS: Record<string, string> = {
  active: 'Ativo',
  unsubscribed: 'Descadastrado',
  bounced: 'Bounce',
  complained: 'Spam',
}

export const LEAD_STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  unsubscribed: 'bg-gray-100 text-gray-800',
  bounced: 'bg-red-100 text-red-800',
  complained: 'bg-orange-100 text-orange-800',
}

export const CAMPAIGN_STATUS_LABELS: Record<string, string> = {
  draft: 'Rascunho',
  scheduled: 'Agendada',
  sending: 'Enviando',
  sent: 'Enviada',
  paused: 'Pausada',
  failed: 'Falhou',
}

export const CAMPAIGN_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  scheduled: 'bg-blue-100 text-blue-800',
  sending: 'bg-yellow-100 text-yellow-800',
  sent: 'bg-green-100 text-green-800',
  paused: 'bg-orange-100 text-orange-800',
  failed: 'bg-red-100 text-red-800',
}

export const USER_ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  editor: 'Editor',
  viewer: 'Visualizador',
}

export const SEGMENT_TYPE_LABELS: Record<string, string> = {
  static: 'Estatico',
  dynamic: 'Dinamico',
}

export const SEGMENT_TYPE_COLORS: Record<string, string> = {
  static: 'bg-blue-100 text-blue-800',
  dynamic: 'bg-purple-100 text-purple-800',
}

export const SEGMENT_RULE_FIELDS: { value: string; label: string; group?: string }[] = [
  // Dados do lead
  { value: 'email', label: 'Email', group: 'Dados' },
  { value: 'first_name', label: 'Nome', group: 'Dados' },
  { value: 'last_name', label: 'Sobrenome', group: 'Dados' },
  { value: 'company', label: 'Empresa', group: 'Dados' },
  { value: 'position', label: 'Cargo', group: 'Dados' },
  { value: 'status', label: 'Status', group: 'Dados' },
  { value: 'score', label: 'Score', group: 'Dados' },
  { value: 'source', label: 'Fonte', group: 'Dados' },
  // Eventos de conversao
  { value: 'has_event', label: 'Converteu no evento', group: 'Eventos' },
  { value: 'email_opened', label: 'Abriu email', group: 'Eventos' },
  { value: 'email_clicked', label: 'Clicou no email', group: 'Eventos' },
  { value: 'email_bounced', label: 'Email bounce', group: 'Eventos' },
  // Tags
  { value: 'has_tag', label: 'Possui tag', group: 'Tags' },
  // Datas
  { value: 'created_at', label: 'Data de criacao', group: 'Datas' },
  { value: 'last_event_at', label: 'Ultimo evento em', group: 'Datas' },
]

export const OPERATOR_LABELS: Record<string, string> = {
  equals: 'e igual a',
  not_equals: 'nao e igual a',
  contains: 'contem',
  starts_with: 'comeca com',
  ends_with: 'termina com',
  greater_than: 'maior que',
  less_than: 'menor que',
  is_empty: 'esta vazio',
  is_not_empty: 'nao esta vazio',
  // Event operators
  has_occurred: 'ocorreu',
  has_not_occurred: 'nao ocorreu',
  occurred_after: 'ocorreu apos',
  occurred_before: 'ocorreu antes de',
  // Date operators
  before: 'antes de',
  after: 'apos',
  in_last_days: 'nos ultimos X dias',
}

export const SCORING_CONDITION_LABELS: Record<string, string> = {
  email_opened: 'Email aberto',
  email_clicked: 'Link clicado no email',
  email_bounced: 'Email bounce',
  email_complained: 'Reclamacao de spam',
  tag_added: 'Tag adicionada',
  tag_removed: 'Tag removida',
  field_equals: 'Campo igual a',
  field_contains: 'Campo contem',
  field_not_empty: 'Campo preenchido',
  page_visited: 'Pagina visitada',
  form_submitted: 'Formulario enviado',
  days_since_last_activity: 'Dias sem atividade',
}

export const AUTOMATION_TRIGGER_LABELS: Record<string, string> = {
  lead_created: 'Lead criado',
  tag_added: 'Tag adicionada',
  tag_removed: 'Tag removida',
  score_threshold: 'Score atingiu limite',
  email_opened: 'Email aberto',
  email_clicked: 'Link clicado',
  status_changed: 'Status alterado',
  custom_event: 'Evento customizado',
  scheduled: 'Agendado',
}

export const AUTOMATION_ACTION_LABELS: Record<string, string> = {
  send_email: 'Enviar email',
  add_tag: 'Adicionar tag',
  remove_tag: 'Remover tag',
  update_field: 'Atualizar campo',
  webhook: 'Webhook',
  notify: 'Notificar',
  add_to_segment: 'Adicionar ao segmento',
  remove_from_segment: 'Remover do segmento',
  update_score: 'Alterar score',
  wait: 'Aguardar',
}

export const WHATSAPP_TEMPLATE_STATUS_LABELS: Record<string, string> = {
  draft: 'Rascunho',
  pending: 'Pendente',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
}

export const WHATSAPP_TEMPLATE_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
}

export const WHATSAPP_BROADCAST_STATUS_LABELS: Record<string, string> = {
  draft: 'Rascunho',
  sending: 'Enviando',
  sent: 'Enviado',
  failed: 'Falhou',
}

export const WHATSAPP_BROADCAST_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  sending: 'bg-yellow-100 text-yellow-800',
  sent: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
}

export const DEFAULT_PAGE_SIZE = 25

export const SIDEBAR_NAV = [
  {
    title: 'Dashboard',
    href: '/',
    icon: 'LayoutDashboard',
  },
  {
    title: 'Leads',
    href: '/leads',
    icon: 'Users',
  },
  {
    title: 'Segmentos',
    href: '/segments',
    icon: 'Filter',
  },
  {
    title: 'Templates',
    href: '/templates',
    icon: 'FileText',
  },
  {
    title: 'Campanhas',
    href: '/campaigns',
    icon: 'Send',
  },
  {
    title: 'Analytics',
    href: '/analytics',
    icon: 'BarChart3',
  },
  {
    title: 'Automacoes',
    href: '/automations',
    icon: 'Zap',
  },
  {
    title: 'WhatsApp',
    href: '/whatsapp',
    icon: 'MessageCircle',
  },
  {
    title: 'SMS',
    href: '/sms',
    icon: 'Smartphone',
  },
  {
    title: 'Formularios',
    href: '/forms',
    icon: 'FileInput',
  },
  {
    title: 'Publicos',
    href: '/audience-exports',
    icon: 'Share2',
  },
  {
    title: 'SEO',
    href: '/seo',
    icon: 'Search',
  },
  {
    title: 'Redes Sociais',
    href: '/social',
    icon: 'Share2',
  },
  {
    title: 'Link da Bio',
    href: '/bio',
    icon: 'Link',
  },
  {
    title: 'Configuracoes',
    href: '/settings',
    icon: 'Settings',
  },
] as const

export const TAG_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
] as const

export const SMS_STATUS_LABELS: Record<string, string> = {
  queued: 'Na fila',
  sent: 'Enviado',
  delivered: 'Entregue',
  failed: 'Falhou',
  received: 'Recebido',
}

export const SMS_STATUS_COLORS: Record<string, string> = {
  queued: 'bg-yellow-100 text-yellow-800',
  sent: 'bg-blue-100 text-blue-800',
  delivered: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  received: 'bg-purple-100 text-purple-800',
}

export const FORM_TYPE_LABELS: Record<string, string> = {
  inline: 'Inline',
  popup: 'Pop-up',
  slide_in: 'Slide-in',
  floating_button: 'Botao Flutuante',
}

export const FORM_TYPE_COLORS: Record<string, string> = {
  inline: 'bg-blue-100 text-blue-800',
  popup: 'bg-purple-100 text-purple-800',
  slide_in: 'bg-orange-100 text-orange-800',
  floating_button: 'bg-green-100 text-green-800',
}

export const TEMPLATE_CATEGORY_LABELS: Record<string, string> = {
  welcome: 'Boas-vindas',
  promotional: 'Promocional',
  abandoned: 'Carrinho Abandonado',
  educational: 'Educacional',
  newsletter: 'Newsletter',
  other: 'Outros',
}

export const TEMPLATE_CATEGORY_COLORS: Record<string, string> = {
  welcome: 'bg-green-100 text-green-800',
  promotional: 'bg-blue-100 text-blue-800',
  abandoned: 'bg-orange-100 text-orange-800',
  educational: 'bg-purple-100 text-purple-800',
  newsletter: 'bg-cyan-100 text-cyan-800',
  other: 'bg-gray-100 text-gray-800',
}

export const AUDIENCE_PLATFORM_LABELS: Record<string, string> = {
  meta_ads: 'Meta Ads',
  google_ads: 'Google Ads',
}

export const SEO_ISSUE_TYPE_LABELS: Record<string, string> = {
  error: 'Erro',
  warning: 'Aviso',
  info: 'Info',
}

export const SEO_ISSUE_TYPE_COLORS: Record<string, string> = {
  error: 'bg-red-100 text-red-800',
  warning: 'bg-yellow-100 text-yellow-800',
  info: 'bg-blue-100 text-blue-800',
}

export const SOCIAL_PLATFORM_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
  twitter: 'X (Twitter)',
  tiktok: 'TikTok',
}

export const SOCIAL_POST_STATUS_LABELS: Record<string, string> = {
  draft: 'Rascunho',
  scheduled: 'Agendado',
  published: 'Publicado',
  failed: 'Falhou',
}

export const SOCIAL_POST_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  scheduled: 'bg-blue-100 text-blue-800',
  published: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
}

export const BIO_LINK_BUTTON_STYLES: Record<string, string> = {
  rounded: 'Arredondado',
  pill: 'Pilula',
  square: 'Quadrado',
}
