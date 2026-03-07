# Ativos Existentes — Componentes Reaproveitáveis

Mapeamento de tudo que já existe nos projetos do Rodrigo e pode ser reaproveitado na plataforma de email.

## Índice
1. [Projetos Analisados](#projetos-analisados)
2. [Componentes UI Reaproveitáveis](#componentes-ui)
3. [Hooks Reaproveitáveis](#hooks)
4. [Utilitários](#utilitários)
5. [Charts](#charts)
6. [Componentes de Jornada](#jornada)
7. [Padrões Arquiteturais](#padrões)
8. [Schema Supabase Existente](#schema-existente)
9. [Mapa de Migração](#mapa-de-migração)

---

## Projetos Analisados

| Projeto | Local | Stack | Status |
|---------|-------|-------|--------|
| tracking-dashboard | `/tracking-dashboard` | Next.js 14 + Supabase + Recharts | ✅ Analisado |
| tracking avançado | `/tracking avançado` | Next.js 14 + Supabase + Recharts | ✅ Analisado |
| sistema de LP | `/sistema de lp` | Next.js 15 + Claude API + Vercel Deploy | ✅ Analisado |
| briefing LP foda | `/briefing lp foda` | Skill/Template (HTML puro + CSS + JS vanilla) | ✅ Analisado |
| OpenClaw | `/vps-openclaw` | OpenClaw + Docker + Node.js 22 + QMD + Claude Opus | ✅ Analisado |

> Tracking projects compartilham o mesmo Supabase (tnpzoklepkvktbqouctf).
> LP projects usam Claude AI para gerar HTML e Vercel API para deploy.
> OpenClaw é orquestrador de agentes AI multi-agent (VPS Hostinger) com memory pipeline + semantic search.

---

## Componentes UI

### Imediatamente Reaproveitáveis (copiar e adaptar)

#### KPICard
- **Origem:** `tracking-dashboard/src/components/ui/KPICard.tsx`
- **Props:** `title`, `value`, `subtitle?`, `trend?`, `icon?`, `accentColor?`
- **Uso na plataforma:** Métricas de email (taxa abertura, cliques, bounces, conversões)
- **Adaptação necessária:** Nenhuma — componente genérico

#### DataTable
- **Origem:** `tracking-dashboard/src/components/ui/DataTable.tsx`
- **Props:** `columns: Column[]`, `data: any[]`, `onRowClick?`, `emptyMessage?`
- **Column config:** `{ key, label, sortable?, render?, className? }`
- **Uso na plataforma:** Lista de leads, campanhas, envios, segmentos
- **Adaptação necessária:** Adicionar paginação server-side (atual é client-side com limit 500)

#### FilterBar
- **Origem:** `tracking-dashboard/src/components/ui/FilterBar.tsx`
- **Props:** `search`, `onSearchChange`, `filters[]`, `placeholder?`
- **Uso na plataforma:** Filtros em todas as páginas de listagem
- **Adaptação necessária:** Nenhuma

#### DateRangePicker
- **Origem:** `tracking-dashboard/src/components/ui/DateRangePicker.tsx`
- **Props:** `range`, `onRangeChange`, `onCustomRange?`, `startDate?`, `endDate?`
- **Presets:** 7d, 30d, 90d, custom
- **Uso na plataforma:** Filtro temporal em dashboards e relatórios
- **Adaptação necessária:** Nenhuma

#### OrganizationSelector
- **Origem:** `tracking-dashboard/src/components/ui/OrganizationSelector.tsx`
- **Props:** Nenhuma (usa Context)
- **Uso na plataforma:** Seletor de empresa multi-tenant
- **Adaptação necessária:** Trocar config estática por query ao Supabase (tabela organizations)

#### StatusBadge
- **Origem:** `tracking-dashboard/src/components/ui/StatusBadge.tsx`
- **Status atuais:** won, lost, open, deleted
- **Uso na plataforma:** Status de campanha (draft, scheduled, sending, sent, cancelled), status de lead (active, unsubscribed, bounced)
- **Adaptação necessária:** Adicionar novos status e cores

#### ChannelBadge
- **Origem:** `tracking-dashboard/src/components/ui/ChannelBadge.tsx`
- **Canais:** Google, Meta, Facebook, Instagram, TikTok, LinkedIn, organic, direct, referral, email
- **Uso na plataforma:** Origem do lead, canal de aquisição
- **Adaptação necessária:** Mínima — já tem os canais necessários

#### TemperatureBadge
- **Origem:** `tracking-dashboard/src/components/ui/TemperatureBadge.tsx`
- **Níveis:** frio, morno, quente, muito quente
- **Uso na plataforma:** Lead scoring visual, engajamento de email
- **Adaptação necessária:** Nenhuma

#### ScoreBar
- **Origem:** `tracking-dashboard/src/components/ui/ScoreBar.tsx`
- **Props:** `score: number`, `maxScore?: number`
- **Uso na plataforma:** Lead scoring, quality score de email
- **Adaptação necessária:** Nenhuma

#### Skeleton Components
- **Origem:** `tracking-dashboard/src/components/ui/Skeleton.tsx`
- **Componentes:** `Skeleton`, `KPICardSkeleton`, `TableSkeleton`, `ChartSkeleton`
- **Uso na plataforma:** Loading states em todas as páginas
- **Adaptação necessária:** Nenhuma

#### EmptyState
- **Origem:** `tracking-dashboard/src/components/ui/EmptyState.tsx`
- **Props:** `title?`, `description?`, `icon?`
- **Uso na plataforma:** Todas as páginas de listagem vazias
- **Adaptação necessária:** Nenhuma

### Layout Components

#### Sidebar
- **Origem:** `tracking-dashboard/src/components/layout/Sidebar.tsx`
- **Features:** Collapse, mobile menu, active route, context provider
- **Uso na plataforma:** Navegação principal
- **Adaptação necessária:** Trocar NAV_ITEMS pelos módulos da plataforma (Dashboard, Leads, Campanhas, Automações, Analytics, Configurações)

#### Header
- **Origem:** `tracking-dashboard/src/components/layout/Header.tsx`
- **Props:** `title`, `subtitle?`
- **Uso na plataforma:** Header de todas as páginas
- **Adaptação necessária:** Nenhuma

---

## Hooks

### Core Hooks (copiar padrão)

#### useOrganization
- **Origem:** `tracking-dashboard/src/hooks/useOrganization.tsx`
- **Returns:** `{ orgId, setOrgId, orgTables, orgName }`
- **Padrão:** Context + Provider
- **Adaptação:** Trocar ORGANIZATIONS estático por query ao Supabase
- **Importância:** CRÍTICO — base do multi-tenant

#### useDateFilter
- **Origem:** `tracking-dashboard/src/hooks/useDateFilter.ts`
- **Returns:** `{ range, startDate, endDate, setDateRange, setCustomRange }`
- **Adaptação:** Nenhuma — genérico
- **Importância:** ALTA — usado em todas as páginas

#### useFilters
- **Origem:** `tracking-dashboard/src/hooks/useFilters.ts`
- **Returns:** `{ search, setSearch, temperature, setTemperature, status, setStatus, channel, setChannel }`
- **Adaptação:** Trocar filtros por: status campanha, tipo email, segmento
- **Importância:** ALTA

### Data Hooks (adaptar padrão)

#### useLeads → useSubscribers
- **Padrão:** Fetch com filtros + multi-org + merge
- **Adaptação:** Trocar tabelas de events/lead_journey por leads da plataforma

#### useKPIs → useEmailKPIs
- **Padrão:** Contagens multi-org + cálculos de taxa
- **Adaptação:** KPIs de email (enviados, entregues, abertos, clicados, bounced)

#### useJourney → useLeadTimeline
- **Padrão:** Fetch lead + events ordenados cronologicamente
- **Adaptação:** Incluir eventos de email (open, click, unsubscribe) além de GTM

#### useDashboardCharts → useCampaignCharts
- **Padrão:** Fetch + agregação por período/canal/categoria
- **Adaptação:** Agregar por campanha, template, segmento

---

## Utilitários

### Formatação (copiar direto)

```typescript
// src/lib/utils.ts - 100% reaproveitável
formatDate(dateString): string           // 'dd/MM/yyyy'
formatDateTime(dateString): string       // 'dd/MM/yyyy HH:mm'
formatRelativeTime(dateString): string   // '2 dias atrás'
formatCurrency(value): string            // 'R$ 1.200'
formatNumber(value): string              // '1.200'
formatPercent(value, decimals?): string  // '45.2%'
getFullName(firstName, lastName): string
getDateRange(range): {startDate, endDate}
classNames(...classes): string
generateCSV(data, filename): void        // Download CSV client-side
```

### Supabase Multi-Org (adaptar)

```typescript
// src/lib/supabase.ts - Padrão de query multi-tenant
queryMultiOrg<T>(orgTablesList, tablePick, buildQuery): Promise<T[]>
countMultiOrg(orgTablesList, tablePick, buildQuery): Promise<number>
```

**Nota:** Na plataforma nova usamos RLS com organization_id em vez de tabelas por org. Esses helpers serão substituídos por queries simples com RLS automático. Porém, manter compatibilidade com dados legados (tracking) que usam tabelas separadas.

---

## Charts

### Diretamente Reaproveitáveis

| Chart | Origem | Uso na Plataforma |
|-------|--------|-------------------|
| LeadsOverTime | Area chart com gradiente | Leads/subscribers ao longo do tempo |
| ChannelBreakdown | Bar chart agrupado | Performance por canal de aquisição |
| FunnelChart | Barras horizontais com taxas | Funil de email: envios→entregas→aberturas→cliques→conversões |
| TopPages | Horizontal bar com labels | Top campanhas, top templates |
| TopReferrers | Horizontal bar | Top fontes de leads |
| CampaignTimeline | Bar chart temporal | Timeline de campanhas de email |

### Adaptáveis

| Chart | Origem | Adaptação |
|-------|--------|-----------|
| TemperatureDistribution | Donut chart | Distribuição de engajamento de subscribers |
| DeviceBreakdown | Donut chart | Email client breakdown (Gmail, Outlook, Apple Mail) |
| GeoDistribution | Horizontal bar | Geo de subscribers (menos prioritário) |

### Novos Charts Necessários

| Chart | Propósito |
|-------|-----------|
| EmailMetricsOverTime | Open rate, click rate, bounce rate ao longo do tempo |
| ABTestComparison | Comparação A/B de subject lines |
| HeatmapClicks | Mapa de calor de cliques no email |
| UnsubscribeReasons | Razões de descadastro (se coletadas) |

---

## Jornada

### Componentes de Journey (adaptar)

#### TimelineEvent
- **Origem:** `tracking-dashboard/src/components/journey/TimelineEvent.tsx`
- **Eventos atuais:** page_view, generate_lead, click, form_submit
- **Adaptação:** Adicionar: email_open, email_click, email_bounce, email_unsubscribe, whatsapp_sent, whatsapp_read
- **Importância:** ALTA — core da visualização de lead

#### SessionGroup
- **Origem:** `tracking-dashboard/src/components/journey/SessionGroup.tsx`
- **Adaptação:** Agrupar por "interação de email" em vez de sessão web

#### BehaviorMetrics
- **Origem:** `tracking-dashboard/src/components/journey/BehaviorMetrics.tsx`
- **Métricas atuais:** sessions, pageviews, forms, scroll depth, time
- **Adaptação:** Trocar por: emails recebidos, abertos, clicados, respondidos

#### AttributionCards
- **Origem:** `tracking-dashboard/src/components/journey/AttributionCards.tsx`
- **Dados:** First-touch e Last-touch UTMs
- **Adaptação:** Mínima — mesmo padrão de atribuição

---

## Padrões

### 1. Multi-Tenant

**Atual (tracking):** Tabela por empresa (`events`, `orbit_gestao_events`)
**Novo (plataforma):** Schema compartilhado com `organization_id` + RLS

**Estratégia de migração:**
- Plataforma nova usa RLS (melhor para SaaS)
- Views de compatibilidade para dados legados do tracking
- Hook useOrganization adaptado para buscar orgs do Supabase

### 2. Context-Based State

**Padrão comprovado:** Provider no layout → Context em hooks → Componentes consomem
- `OrganizationProvider` → `useOrganization()`
- `DateFilterProvider` → `useDateFilter()`
- `FiltersProvider` → `useFilters()`
- `SidebarProvider` → `useSidebar()`

**Manter este padrão** na plataforma para consistência.

### 3. Data Fetching com Multi-Org

**Padrão:** Hook recebe filtros + orgTables → useEffect → fetch → merge
**Manter** para hooks que precisam agregar dados cross-org.

### 4. CSV Export

**Padrão:** Mapeia dados → gera CSV client-side → download
**Manter** e expandir para exportação de relatórios.

---

## Schema Existente

### Supabase Project: tnpzoklepkvktbqouctf

#### Tabelas de Eventos

| Tabela | Empresa | ~Campos | Índices |
|--------|---------|---------|---------|
| `events` | Templum | 70+ | 10 (created_at, event_name, email, utm_source, session_id, etc) |
| `orbit_gestao_events` | Orbit | 70+ | Mesmo padrão |

**Campos principais:** event_name, session_id, client_id, email, phone, first_name, last_name, page_url, page_path, page_hostname, referrer, utm_source/medium/campaign/content/term, ft_utm_* (first-touch), gclid, fbclid, ttclid, geo_country/state/city, scroll_depth, time_on_page, lead_score, lead_temperature

#### Tabelas de Conversões

| Tabela | Empresa | Fonte |
|--------|---------|-------|
| `conversions` | Templum | Pipedrive via n8n |
| `orbit_gestao_conversions` | Orbit | Pipedrive via n8n |

**Campos principais:** deal_id, deal_title, deal_status (won/lost/open), deal_value, deal_value_monthly, deal_created_at, deal_won_at, email, phone, company_name, owner_name, UTMs, click IDs, lead_score, lead_temperature, sent_google, sent_meta_main/secondary

#### Views

| View | Empresa | Propósito |
|------|---------|-----------|
| `lead_journey` | Templum | Join events + conversions com métricas comportamentais |
| `orbit_gestao_lead_journey` | Orbit | Mesmo padrão |

**Métricas na view:** total_sessions, paginas_unicas_visitadas, total_pageviews, total_forms_preenchidos, max_scroll_depth, sessoes_scroll_90/75/50, max/avg_time_on_page, primeiro_contato_at, ultimo_evento_at, dias_primeiro_contato_ate_venda, canais_distintos

---

## Mapa de Migração

### O que já existe vs. o que precisa criar

| Funcionalidade | Status | Onde está | O que fazer |
|---------------|--------|-----------|-------------|
| Dados de eventos GTM | ✅ Existe | events, orbit_gestao_events | Criar view unificada com organization_id |
| Dados de conversões Pipedrive | ✅ Existe | conversions, orbit_gestao_conversions | Criar view unificada |
| Lead journey view | ✅ Existe | lead_journey, orbit_gestao_lead_journey | Adaptar para incluir dados de email |
| UI Components (13) | ✅ Existe | tracking-dashboard/src/components/ui/ | Copiar para plataforma |
| Chart Components (10) | ✅ Existe | tracking-dashboard/src/components/charts/ | Copiar e adaptar |
| Layout (Sidebar + Header) | ✅ Existe | tracking-dashboard/src/components/layout/ | Adaptar nav items |
| Journey Components (4) | ✅ Existe | tracking-dashboard/src/components/journey/ | Adicionar eventos de email |
| Hooks de data (8) | ✅ Existe | tracking-dashboard/src/hooks/ | Adaptar para RLS |
| Hooks de context (3) | ✅ Existe | tracking-dashboard/src/hooks/ | Adaptar orgs |
| Utilities | ✅ Existe | tracking-dashboard/src/lib/utils.ts | Copiar direto |
| Tabelas de email | ❌ Criar | — | email_templates, email_campaigns, email_sends |
| Tabelas de leads (plataforma) | ❌ Criar | — | leads, segments, segment_leads |
| Tabelas de automação | ❌ Criar | — | automations, scoring_rules |
| Tabelas de WhatsApp | ❌ Criar | — | whatsapp_contacts, whatsapp_messages |
| Editor de email | ❌ Criar | — | Unlayer/GrapeJS embed |
| Integração MailerSend | ❌ Criar | — | API + webhooks |
| Integração WhatsApp | ❌ Criar | — | Cloud API + webhooks |
| n8n workflows | ⚡ Parcial | n8n existente | Criar novos workflows para email |

### Estimativa de Reaproveitamento

- **Fase 1 (Leads + Email MVP):** ~30% reaproveitável (UI, layout, filtros, utilities)
- **Fase 2 (Analytics):** ~70% reaproveitável (charts, KPIs, journey, hooks)
- **Fase 3 (Automações):** ~10% reaproveitável (apenas UI genérica)
- **Fase 4 (WhatsApp/SMS):** ~15% reaproveitável (UI, timeline, badges)
- **Fase 5 (Converter):** ~20% reaproveitável (UI, forms pattern)

### Dependências Técnicas Compartilhadas

```json
{
  "@supabase/supabase-js": "^2.97.0",
  "next": "14.2.x",
  "react": "^18",
  "recharts": "^3.7.0",
  "date-fns": "^4.1.0",
  "lucide-react": "^0.575.0",
  "tailwindcss": "^3.4.1"
}
```

---

## Sistema de LP (LP Builder)

### O que é
App Next.js 15 (React 19, TypeScript strict) que gera landing pages via chat com Claude AI. O usuário seleciona a marca, cola o copy, e a IA gera HTML completo com tracking, responsividade e branding. Deploy automático para Vercel.

### Stack
- Next.js 15.5 + React 19 + TypeScript (strict)
- @anthropic-ai/sdk (Claude Haiku para geração)
- Vercel API v13 para deploy
- CSS puro (sem Tailwind — diferente do tracking)

### Reaproveitável na Plataforma

#### Padrão de Chat com IA (ALTO)
- **Origem:** `sistema de lp/app/page.tsx` + `lib/claude.ts`
- **O que faz:** Chat multi-turn com Claude, extração de HTML, injeção de imagens/logo
- **Uso na plataforma:** Gerador de email por IA — "descreva sua campanha e a IA gera o email"
- **Funções chave:**
  - `buildSystemPrompt(brand, imageCount)` — Monta prompt dinâmico com contextos
  - `sendMessage(systemPrompt, messages)` — Chama Claude API
  - `extractHtmlFromResponse(response)` — Extrai HTML (4 estratégias de fallback)
  - `injectLogoIntoHtml(html, logoUri, brand)` — Substitui placeholders
  - `injectImagesIntoHtml(html, images)` — Substitui `{{IMAGE_N}}` por data URIs

#### Preview com Iframe (ALTO)
- **Origem:** `sistema de lp/components/preview/PreviewFrame.tsx`
- **O que faz:** Preview do HTML em iframe com toggle desktop/mobile
- **Uso na plataforma:** Preview de email template antes de enviar
- **Adaptação:** Adicionar simulação de email clients (Gmail, Outlook)

#### Sistema de Brands/Contextos (ALTO)
- **Origem:** `sistema de lp/lib/brands.ts` + `context/brands/`
- **O que faz:** Config por marca (nome, logo, GTM ID, cookie domain) + contextos markdown carregados dinamicamente
- **Uso na plataforma:** Config de organização com branding para emails
- **Brands existentes:** Templum (com ICP), Evolutto (com ICP), Orbit

#### Upload e Redimensionamento de Imagens (MÉDIO)
- **Origem:** `sistema de lp/app/page.tsx` (client-side)
- **O que faz:** Upload, resize para 1200px max, converte para base64
- **Uso na plataforma:** Upload de imagens para email templates

#### State Machine com useReducer (MÉDIO)
- **Origem:** `sistema de lp/app/page.tsx`
- **Padrão:** `AppState` + `AppAction` + reducer para fases (select_brand → briefing → generating → reviewing → deploying → deployed)
- **Uso na plataforma:** Fluxo de criação de campanha (draft → preview → scheduled → sending → sent)

#### Deploy para Vercel (BAIXO para email, ALTO para Fase 5)
- **Origem:** `sistema de lp/lib/deploy.ts`
- **O que faz:** POST HTML para Vercel API, cria deployment, notifica webhook
- **Uso na plataforma:** Fase 5 (Converter) — deploy de landing pages

#### Componentes de Chat UI (MÉDIO)
| Componente | Propósito | Reuso |
|------------|-----------|-------|
| BrandSelector | Seleção de marca com cards | Adaptar para seletor de template |
| ChatInput | Input de texto + upload de imagem | Reutilizar para chat de IA |
| MessageBubble | Exibe mensagens (com imagens) | Reutilizar para chat de IA |
| QuickOptions | Botões de ação rápida | Adaptar para ações de campanha |
| ApprovalBar | Botões aprovar/ajustar | Reutilizar para aprovação de email |
| LoadingDots | Animação de loading | Reutilizar direto |
| StatusBadge | Indicador de fase | Reutilizar para status de campanha |

### Contextos Documentados (Muito Valiosos)

| Arquivo | Conteúdo | Tamanho |
|---------|----------|---------|
| `context/brands/templum.md` | Identidade visual + guidelines Templum | Brand identity completa |
| `context/brands/templum-icp.md` | ICP (Ideal Customer Profile) Templum | Público-alvo detalhado |
| `context/brands/evolutto.md` | Identidade visual Evolutto | Brand identity |
| `context/brands/evolutto-icp.md` | ICP Evolutto | Público-alvo |
| `context/brands/orbit.md` | Identidade visual Orbit | Brand identity |
| `context/prompts/system-prompt.md` | System prompt principal (143 linhas) | Prompt de geração |
| `context/references/design-system.md` | CSS patterns + componentes (702 linhas) | Design system completo |
| `context/references/generation-rules.md` | Regras de geração HTML (346 linhas) | Quality rules |
| `context/references/tracking-integration.md` | GTM + tracking code (691 linhas) | Tracking completo |
| `context/references/animations.md` | Catálogo de animações (392 linhas) | CSS animations |

**CRUCIAL:** Esses contextos de marca devem ser migrados/referenciados na plataforma de email para manter consistência visual entre LPs e emails.

---

## Briefing LP Foda (Skill/Template)

### O que é
Skill do Claude (não é código) que documenta como gerar landing pages de alta qualidade. Contém design system CSS, tracking integration e workflow de briefing. É o "cérebro" por trás do sistema de LP.

### Reaproveitável na Plataforma

#### Design System CSS (ALTO para Fase 5)
- **Origem:** `briefing lp foda/references/design-system.md` (702 linhas)
- **O que tem:** CSS variables system, componentes CSS (hero, cards, FAQ, CTA, forms, stats, trust bar), 7 paletas de cores, tipografia responsiva com clamp(), grid system
- **Uso na plataforma:** Base de estilos para landing pages da Fase 5

#### Tracking Integration (ALTO)
- **Origem:** `briefing lp foda/references/tracking-integration.md` (691 linhas)
- **O que tem:** Cookie management (first-touch/last-touch), UTM capture, click IDs (gclid, fbclid, ttclid), session ID, referrer mapping, scroll depth tracker, time on page heartbeat, phone mask, DataLayer events
- **Uso na plataforma:** Tracking de links em emails, landing pages da Fase 5
- **Funções JavaScript reaproveitáveis:**
  - `getCookie(name)` / `setCookie(name, value, days)`
  - `getParam(name)` — extrai UTMs da URL
  - `isInternalReferrer()` — distingue tráfego interno vs externo
  - Referrer mapper — mapeia domínios para fontes de tráfego
  - Form submit handler com payload completo (UTMs + click IDs + session)
  - Scroll depth tracker (25%, 50%, 75%, 90%)
  - Time on page heartbeat (30s intervals)

#### Payload de Lead (CRÍTICO)
O payload que as LPs enviam para webhooks é o mesmo formato que a plataforma de email deve receber:
```json
{
  "name": "João Silva",
  "email": "joao@email.com",
  "phone": "11999999999",
  "session_id": "1708901234_abc123def",
  "page_url": "https://dominio.com/lp-oferta",
  "utm_source": "google",
  "utm_medium": "cpc",
  "utm_campaign": "campanha-x",
  "gclid": "abc123...",
  "fbclid": "",
  "landing_page": "https://...",
  "origin_page": "https://google.com",
  "session_attributes_encoded": "eyJ..."
}
```
**Este formato deve ser o padrão do endpoint POST /api/webhooks/leads da plataforma.**

#### Workflow de Briefing (MÉDIO)
- **Origem:** `briefing lp foda/SKILL.md`
- **O que tem:** Fluxo de briefing para gerar LP (marca → tema → copy → geração → review)
- **Uso na plataforma:** Adaptar para fluxo de criação de email por IA

---

## OpenClaw (Orquestrador de Agentes AI)

### O que é
Orquestrador multi-agent AI rodando em VPS Hostinger (Ubuntu, Docker). 4 agentes especializados (main/Jarvis, intel, hunter, ops) com workspaces isolados, memory pipeline com semantic search (QMD), e integração com ClickUp, Discord, e APIs de AI.

### Stack
- **Runtime:** Node.js 22 + OpenClaw v2026.2.26
- **Infra:** Docker Engine 29.2.1 (sandbox per-session), systemd services
- **AI:** Claude Opus 4.6 (LLM principal), OpenAI GPT-4o (audio), Google Gemini 3 Pro (imagens)
- **Search:** QMD (BM25 + embeddings) com modelo local ggml-embedding-gemma-300M
- **Integrações:** ClickUp API, Discord bot (Genie), GitHub (read-only)

### Arquitetura Multi-Agent

| Agente | Workspace | Missão |
|--------|-----------|--------|
| **main** (Jarvis) | ~/.openclaw/workspace | Generalista, braço direito |
| **intel** | ~/.openclaw/workspaces/intel | RSS/X monitoring, criação de posts ClickUp |
| **hunter** | ~/.openclaw/workspaces/hunter | Pesquisa de leads, enriquecimento CNPJ |
| **ops** | ~/.openclaw/workspaces/ops | Deep research, tarefas ClickUp |

### Memory Pipeline
```
Conversa → sessions/*.jsonl → memory-core extrai fatos → memory/*.md
→ qmd re-indexa (5 min) → Dream Cycle (04:00 BRT) consolida → _memory/*.md
```

### Reaproveitável na Plataforma

#### Arquitetura Multi-Agent para Automações (ALTO — Fase 3)
- **O que é:** Padrão de orquestração onde um agente master coordena especialistas
- **Uso na plataforma:** Engine de automação inteligente — agente de email coordena agente de segmentação + agente de conteúdo + agente de deliverability
- **Padrão:** Task routing + skill discovery + isolated workspaces

#### Memory Pipeline para Lead Intelligence (ALTO — Fase 2+)
- **O que é:** Conversas → extração de fatos → indexação semântica → consolidação periódica
- **Uso na plataforma:** Histórico de interações do lead → extração de insights → scoring automático → segmentação inteligente
- **Padrão:** Event stream → fact extraction → vector index → periodic consolidation

#### QMD / Semantic Search (MÉDIO)
- **O que é:** BM25 keyword + vector embeddings + reranking via MCP
- **Uso na plataforma:** Busca de leads similares, descoberta de campanhas relacionadas, auto-tag baseado em conteúdo
- **Adaptação:** Substituir modelo local por cloud embeddings (Supabase pgvector ou API)

#### MCP Tools Pattern — Máquina de Marketing (ALTO)
- **O que é:** 7 tools de alto nível para fluxo de marketing (listar_clientes, obter_branding, criar_ideia, completar_briefing, salvar_angulos, adicionar_comentario, buscar_tarefas_pendentes)
- **Uso na plataforma:** Template para tools de email marketing (send_campaign, update_lead_status, segment_by_behavior, generate_email_content)
- **Padrão:** Status-driven workflow com progressão automática de fases

#### Skills como Módulos de Conhecimento (MÉDIO)
- **O que é:** Markdown SKILL.md com identity, behavior, outputs, limits carregado no system prompt
- **Uso na plataforma:** Configuração de automações por usuário — cada automação tem seu "cérebro" editável
- **Skills existentes:** head-de-marketing, growth, analista-trafego, social-media, seo, design, videomaker

#### Sandbox Per-Session / Isolamento (MÉDIO)
- **O que é:** Container Docker efêmero por conversa/usuário com workspace montado e tools restritos
- **Uso na plataforma:** Modelo de isolamento multi-tenant — cada cliente tem contexto separado
- **Padrão:** Per-channel-peer session scope + elevated tools disabled

#### Offline Conversion Tracking Pipeline (ALTO — Fase 2)
- **O que é:** CRM webhook → n8n → formata dados → API calls (Google/Meta) → audit log
- **Uso na plataforma:** Lead da plataforma → conversão em campanha → push para Google/Meta Ads → relatório
- **Já tem:** Pipeline Pipedrive → n8n → Google Ads OCI + Meta Conversions API

#### Systemd Service Pattern (BAIXO)
- **O que é:** Gerenciamento de serviços com EnvironmentFile, ProtectSystem, Restart policies
- **Uso na plataforma:** Template para microserviços da plataforma (se self-hosted)

### Clients & Contextos de Marketing
O OpenClaw tem contextos detalhados dos 3 clientes iniciais da plataforma:

| Cliente | Contextos Disponíveis |
|---------|----------------------|
| Templum | ICP detalhado, produto (certificações ISO), canais (Google + Meta Ads), vertical B2B |
| Evolutto | ICP, produto (plataforma de consultoria), canais (Meta Ads + ManyChat) |
| Orbit | ICP, produto (gestão de agências), canais (orgânico + ads) |

**IMPORTANTE:** Esses contextos de cliente devem ser unificados com as brand configs do sistema de LP e com a tabela `organizations` da plataforma.

---

## Mapa Consolidado — Todos os Projetos vs. Fases

| Fase | tracking-dashboard | tracking avançado | sistema de LP | briefing LP | OpenClaw |
|------|-------------------|-------------------|---------------|-------------|----------|
| 1 - Leads + Email | UI, layout, filtros, utils | Paginação, multi-company | Chat IA para gerar emails | Payload de lead (formato) | MCP tools pattern, client contexts |
| 2 - Analytics | Charts, KPIs, journey, hooks (~70%) | Charts extras, campaign timeline | — | Tracking integration | Offline conversion pipeline, memory pipeline |
| 3 - Automações | UI genérica | — | — | — | Multi-agent orchestration, skills pattern, task routing |
| 4 - WhatsApp/SMS | Timeline, badges | — | — | Phone mask, form handler | Channel integration pattern (Discord/WA/Telegram) |
| 5 - Converter | UI | — | LP builder inteiro, deploy Vercel, preview | Design system, animations, tracking | — |

### Estimativa Atualizada de Reaproveitamento

| Fase | % Reaproveitável | Detalhamento |
|------|-------------------|-------------|
| 1 - Leads + Email | ~35% | UI (tracking) + Chat IA para emails (LP) + payload format (briefing) + MCP tools (OpenClaw) |
| 2 - Analytics | ~70% | Charts, KPIs, journey, hooks (tracking) + tracking (briefing) + offline conversion pipeline (OpenClaw) |
| 3 - Automações | ~25% | UI genérica + multi-agent orchestration + skills pattern + task routing (OpenClaw) |
| 4 - WhatsApp/SMS | ~25% | Timeline, badges (tracking) + phone mask (briefing) + channel integration pattern (OpenClaw) |
| 5 - Converter | ~60% | LP builder completo + design system + animations + tracking + deploy |
