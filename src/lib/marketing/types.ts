// ============================================================
// Marketing Profile Types
// Ported from grow-automaton with adaptations for multi-tenant SaaS.
// Original: /DEV/grow-automaton/src/types/briefing.ts
//           /DEV/grow-automaton/src/types/businessPlan.ts
// ============================================================

// ============= BRIEFING (36 questions, 12 sections) =============

export interface BriefingAnswers {
  // SECAO 1: DADOS BASE (9 obrigatorias)
  segmento: string
  produtoServico: string
  publicoB2B: string
  decisorCompra: string
  maiorDor: string
  resultadoEsperado: string
  precoMedio: string
  diferenciais: string
  paginaDestino: string

  // SECAO 2: CONTEXTO E BIG NUMBERS
  numerosOperacao?: string
  indicadoresCriticos?: string

  // SECAO 3: OBJETIVOS E URGENCIA
  objetivo90Dias?: string
  porquePrioridade?: string
  impactoSemMudanca?: string

  // SECAO 4: ICP E COMPORTAMENTO DE COMPRA
  doresUrgentes?: string
  objecoesFrequentes?: string

  // SECAO 5: GARGALOS E BARREIRAS
  maiorGargalo?: string
  porqueNaoResolveu?: string
  impactoRemocaoBloqueio?: string

  // SECAO 6: MARKETING ATUAL
  comoAtraiClientes?: string

  // SECAO 7: NARRATIVA E CONTEUDO
  comoComunica?: string
  oquePublicoEntende?: string
  conteudosQuePerformaram?: string

  // SECAO 8: CONVERSAO / SITE
  paginasConversao?: string
  taxaConversaoAtual?: string
  oqueAtrapalhaDecisao?: string

  // SECAO 9: VENDAS
  processoComercial?: string
  ondePerdeoportunidades?: string
  clienteEntendeDiferenciais?: string

  // SECAO 10: MATURIDADE OPERACIONAL
  operacaoOrganizada?: string
  processosComRetrabalho?: string
  oqueAutomatizar?: string

  // SECAO 11: RECURSOS E LIMITACOES
  limiteOrcamento?: string
  restricoesTecnicas?: string

  // SECAO 12: PRIORIDADES IMEDIATAS
  resolver2Semanas?: string
  resultadoMinimoCurtoPrazo?: string
}

// ============= QUESTION MAPPING =============

export interface QuestionMappingItem {
  key: keyof BriefingAnswers
  label: string
  section: string
  sectionIcon: string
  sectionOrder: number
  questionOrder: number
  required?: boolean
  placeholder?: string
}

// ============= AI-GENERATED: PERSONA =============

export interface Persona {
  quemE: string
  idade: string
  cargo: string
  rotinaDiaria: string
  dorPrincipal: string
  doresSecundarias: string[]
  desejoPrimario: string
  desejosSecundarios: string[]
  medosObjecoes: string[]
  gatilhosMentais: string[]
  buscasGoogle: string[]
  palavrasUsadas: string[]
  momentoConsciencia: string
  jornada: string
  determinaConversao: string
  provaNecessaria: string[]
  influenciadores: string[]
  ondeConsome: string[]
}

// ============= AI-GENERATED: ICP =============

export interface ICP {
  tipoEmpresa: string
  segmentoMercado: string
  faturamentoAnual: string
  numeroFuncionarios: string
  ticketIdeal: string
  cargoComprador: string
  influenciadoresDecisao: string[]
  maturidadeCliente: string
  momentoEntrada: string
  gatilhosCompra: string[]
  barreiras: string[]
  sinaisProntidao: string[]
  ciclodeVenda: string
  canaisAquisicao: string[]
  concorrentesPrincipais: string[]
}

// ============= AI-GENERATED: STRATEGY =============

export interface Horarios {
  intencaoAlta: string[]
  pesquisaEmocional: string[]
  comercialB2B: string[]
  recomendacaoOtimizacao: string
  justificativas: Record<string, string>
}

export interface PalavrasChave {
  topo: string[]
  dorContratacao: string[]
  defesaMarca: string[]
  negativas: string[]
  estrategiaCorrespondencia: string
  regrasSegmentacao: string
  insightsIntencao: string
}

export interface Anuncios {
  titulos: string[]
  descricoes: string[]
}

export interface PaginaCRO {
  headlinePrincipal: string
  subheadline: string
  porqueImportaAgora: string
  beneficiosDiretos: string[]
  provaSocial: string
  urgencia: string
  quebraObjecoes: string[]
  comoFunciona: string[]
  ctaPrincipal: string
  microcopyProva: string
  roteiroVideo: string
}

export interface Campanha {
  nome: string
  estrategia: string
  configuracoes: string[]
  segmentacoes: string[]
  lanceSugerido: string
  ajusteOrcamento: string
  objetivo: string
  palavrasChave?: string[]
  tiposAnuncio?: string[]
  metricasEsperadas?: string[]
  observacoes?: string
}

export interface EstruturaCampanhas {
  topo: Campanha
  dorContratacao: Campanha
  defesaMarca: Campanha
  remarketing: Campanha
}

export interface FullStrategy {
  persona: Persona
  icp: ICP
  horarios: Horarios
  palavrasChave: PalavrasChave
  anuncios: Anuncios
  paginaCRO: PaginaCRO
  campanhas: EstruturaCampanhas
}

// ============= BUSINESS PLAN =============

export interface BusinessPlanParams {
  name: string
  year: number
  segment: string
  revenue_goal: number
  avg_ticket: number
  net_margin: number
  sql_to_sale_rate: number
  mql_to_sql_rate: number
  tax_rate: number
  fixed_cost_growth: number
  marketing_investment_rate: number
  channels: Record<string, ChannelConfig>
}

export interface ChannelConfig {
  name: string
  label: string
  enabled: boolean
  allocation: number
  budget?: number
  leads?: number
  sales?: number
  icon?: string
  category?: 'pago' | 'organico' | 'referral' | 'eventos'
  priority?: 'alta' | 'media' | 'baixa'
  cost_per_meeting?: number
  monthly_investment?: number
}

export interface BPCalculatedResults {
  net_profit: number
  required_sales: number
  acquisition_budget: number
  required_mqls: number
  required_sqls: number
  cpl: number
  cost_per_meeting: number
  cac: number
  monthly_distribution: MonthlyDistribution[]
}

export interface MonthlyDistribution {
  month: string
  revenue: number
  sales: number
  sqls: number
  mqls: number
  budget: number
}

export interface BusinessPlan extends BusinessPlanParams {
  calculated_results?: BPCalculatedResults
}

// ============= BRAND IDENTITY =============

export interface BrandIdentity {
  primary_color?: string
  secondary_color?: string
  accent_color?: string
  tone_of_voice?: string
  brand_values?: string[]
  visual_style?: string
  target_audience_summary?: string
  brand_archetype?: string
  brand_archetype_description?: string
  brand_personality?: string[]
  brand_promise?: string
  tagline_suggestions?: string[]
}

// ============= INDUSTRY BENCHMARKS =============

export interface IndustryBenchmark {
  id: string
  segment: string
  segment_label: string
  avg_ticket: number
  mql_to_sql_rate: number
  sql_to_sale_rate: number
  avg_cpl: number
  avg_margin: number
  avg_tax_rate: number
  seasonality: Record<string, number>
  channels: Record<string, number>
  created_at: string
}

// ============= MARKETING PROFILE (DB entity) =============

export type MarketingProfileStatus = 'draft' | 'briefing_done' | 'strategy_generated' | 'complete'

export interface MarketingProfile {
  id: string
  org_id: string
  briefing: BriefingAnswers
  briefing_completed_at: string | null
  persona: Persona | null
  icp: ICP | null
  strategy: FullStrategy | null
  strategy_generated_at: string | null
  strategy_model: string | null
  business_plan: BusinessPlan | null
  business_plan_updated_at: string | null
  brand_identity: BrandIdentity
  status: MarketingProfileStatus
  created_at: string
  updated_at: string
  created_by: string | null
}
