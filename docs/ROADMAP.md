# Roadmap

## Fase 1 — Base de Leads + Email (MVP)
**Objetivo:** Ter o mínimo para sair do RD Station no envio de email.
**Data conclusao:** 2026-03-06

### Entregas

- [x] Setup do projeto Next.js com App Router
- [x] Configurar Supabase (projeto, auth, banco)
- [x] Modelagem de dados (migrations Fase 1)
- [x] Layout da plataforma (sidebar, org selector, header)
- [x] Autenticação (login, registro, proteção de rotas)
- [x] Multi-tenant: seletor de empresa + RLS
- [x] CRUD de Leads (listagem, detalhe, import CSV, API, campos personalizados)
- [x] Tags de leads (adicionar, remover, criar com cores)
- [x] Settings: organização, membros, convites, API keys, domínio
- [x] Segmentação (estáticos, dinâmicos, rule builder, evaluate rules)
- [x] Templates de email (HTML, variáveis, duplicar, Unlayer drag-and-drop)
- [x] Campanhas de email (criar, agendar, MailerSend, tracking)
- [x] Webhooks MailerSend + Dashboard + API de entrada de leads

---

## Fase 2 — Analytics (COMPLETA)
**Data conclusao:** 2026-03-06

### Entregas

- [ ] Mapear dados GTM existentes no Supabase
- [x] Migration para normalizar dados em lead_events
- [ ] Identificação de leads anônimos → conhecidos
- [x] Dashboard de analytics (visitas, sessões, top páginas, fontes)
- [x] Integração Google Analytics API (GA4)
- [x] Integração Meta Ads API
- [x] Lead tracking (timeline completa)
- [x] Lead tracking journey (jornada completa por email, sessões, atribuição, eventos)
- [x] Lead scoring (regras configuráveis, cálculo automático)
  - [ ] Ranking visual de leads por score
- [ ] Listas inteligentes (segmentos dinâmicos com auto-update)

---

## Fase 3 — Automações (COMPLETA)
**Data conclusao:** 2026-03-06

### Entregas

- [x] Interface de automações + Integração n8n
- [x] 9 triggers + 9 ações built-in
- [x] Logs de execução
- [ ] Trigger por data (aniversário, criação)
- [ ] Sequências de email (drip campaigns)

---

## Fase 4 — WhatsApp + SMS (COMPLETA)
**Data conclusao:** 2026-03-06

### Entregas

- [x] WhatsApp Cloud API (text, template, interactive, media)
- [x] WhatsApp inbox, templates, broadcasts
- [x] Twilio SMS (envio, broadcasts, webhook status)
- [ ] Fluxos conversacionais (builder estilo ManyChat)
- [ ] Tags de WhatsApp

---

## Fase 5 — Converter (COMPLETA)
**Data conclusao:** 2026-03-06

### Entregas

- [x] Formulários embeddable (4 modos, form builder, lead upsert)
- [x] Formulários com campos ocultos de tracking (19 campos: UTMs + click IDs + sessão)
- [x] Geração de código HTML com script de tracking completo
- [ ] Page builder para Landing Pages
- [ ] Pop-ups (tempo, scroll, exit intent)
- [ ] Botão WhatsApp com tracking
- [ ] Web Push notifications
- [ ] A/B testing em formulários

---

## Backlog Futuro (COMPLETO)
**Data conclusao:** 2026-03-06

### Entregas

- [x] Chatbot integrado (regras + IA Claude)
  - [x] Widget embeddable com chat bubble
  - [x] Rules engine (pattern matching)
  - [x] AI fallback (Anthropic API)
  - [x] Interface: CRUD configs, regras, conversas
- [x] Exportação de públicos para Meta/Google Ads
  - [x] Meta Custom Audiences (SHA256 hash)
  - [x] Google Ads Customer Match
  - [x] Sync por segmento
- [x] SEO analyzer
  - [x] Engine de análise (10+ checks)
  - [x] Score 0-100 com issues categorizadas
  - [x] Recomendações + métricas de performance
- [x] Social media scheduling
  - [x] 5 plataformas (Instagram, Facebook, LinkedIn, Twitter, TikTok)
  - [x] Posts (draft, schedule, publish)
  - [x] Calendário mensal
  - [x] Publisher com Facebook Graph API
- [x] Link da Bio com UTMs
  - [x] Bio pages com slug customizado
  - [x] Links com UTM tracking
  - [x] Click/view tracking
  - [x] Página pública /b/[slug]
- [x] Multi-idioma na interface
  - [x] 3 locales: pt-BR, en, es
  - [x] ~60 chaves de tradução
  - [x] Seletor em Settings
- [x] White-label para clientes
  - [x] App name, logo, favicon customizáveis
  - [x] 3 cores (primary, secondary, accent)
  - [x] CSS customizado + hide branding
- [x] App mobile (PWA)
  - [x] Web manifest + service worker
  - [x] Install prompt
  - [x] Offline support (cache network-first)
- [x] Dark mode (tema escuro)
  - [x] next-themes com ThemeProvider (claro/escuro/sistema)
  - [x] Aba "Aparência" em Settings com preview visual
  - [x] CSS variáveis .dark no globals.css
- [x] Integracoes UX melhorada
  - [x] Instruções passo-a-passo para cada integração
  - [x] Links diretos para painéis/consoles dos serviços
  - [x] Help text em cada campo + toggle senha

---

## Integrações de Projetos Existentes (COMPLETAS)
**Data conclusao:** 2026-03-06

### Tracking Dashboard (GTM) — INTEGRADO
- [x] Portado data layer completo (8 hooks, 6 lib files, 16 componentes)
- [x] Multi-org (Templum/Orbit/Evolutto) com tabelas já existentes no Supabase
- [x] Dashboard tracking: 6 KPIs, 9 charts (Recharts), org/date selectors
- [x] Leads tracking: tabela paginada com filtros, badges, CSV export
- [x] Lead journey: info cards, atribuição (first/last touch), timeline sessões
- [x] Campanhas: performance por UTM, timeline chart
- [x] Conversões: funil visual 4 etapas, tabela com filtros

### LP Builder (Landing Pages) — INTEGRADO
- [x] Portado engine de geração (Claude AI + system prompts + design system)
- [x] Context files (brand guides, ICPs, tracking, animations, generation rules)
- [x] Chat interface: brand selector, theme selector, image upload, preview iframe
- [x] Deploy automático no Vercel (API v13, single-file HTML)
- [x] Persistência no Supabase (migration 017_landing_pages)
- [x] 3 marcas: Templum, Evolutto, Orbit (GTM + tracking integrado)

---

## Fase 6 — Vídeos / Ad Director
**Objetivo:** Automatizar criação de vídeos para anúncios (roteiro → cenas → imagens → vídeos).

### Entregas

- [x] Migration 021: tabelas video_projects + video_scenes com RLS
- [x] API generate-scenes (OpenRouter, claude-sonnet-4, 8-12 cenas)
- [x] Tela de listagem, criação e review de projetos
- [x] Aprovação/reprovação individual e em massa
- [x] Prompts otimizados para Veo 3 e Nano Banana 2
- [x] Sidebar atualizado com link Videos
- [ ] Integração Nano Banana 2 (Google Gemini API) — geração automática de imagens
- [ ] Integração Veo 3.1 (Google Gemini API) — geração automática de vídeos
- [ ] Preview de imagens/vídeos na tela de review
- [ ] Status intermediários (generating_image, generating_video)
- [ ] Supabase Realtime para atualizar UI durante geração
- [ ] Supabase Storage para assets gerados
- [ ] Trigger automático: gerar cenas → gerar imagens → gerar vídeos

---

## Itens pendentes (melhorias futuras)

| Item | Fase Original | Complexidade |
|------|--------------|-------------|
| Leads anônimos → conhecidos | 2 | Alta |
| Ranking visual por score | 2 | Baixa |
| Listas inteligentes | 2 | Média |
| Trigger por data | 3 | Baixa |
| Drip campaigns | 3 | Alta |
| Fluxos conversacionais WA | 4 | Alta |
| Tags WhatsApp | 4 | Baixa |
| Pop-ups | 5 | Média |
| Botão WA tracking | 5 | Baixa |
| Web Push | 5 | Média |
| A/B testing forms | 5 | Média |
