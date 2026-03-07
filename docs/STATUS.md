# Status do Projeto — Plataforma Email

**Ultima atualizacao:** 2026-03-07
**Phase 1 MVP:** COMPLETA
**Phase 2 (Analytics):** COMPLETA
**Phase 3 (Automacoes):** COMPLETA
**Phase 4 (WhatsApp + SMS):** COMPLETA
**Phase 5 (Formularios):** COMPLETA
**Backlog Futuro:** COMPLETO
**Integracao Tracking GTM:** COMPLETA
**Integracao LP Builder:** COMPLETA
**Lead Tracking Journey:** COMPLETA
**Dark Mode:** COMPLETO
**Forms com UTM/Tracking:** COMPLETO
**Credenciais:** CONFIGURADAS (Supabase, MailerSend, n8n, Vercel, OpenRouter)
**Email Sending:** FUNCIONAL (MailerSend trial domain verificado)

---

## O que foi construido (~250 arquivos)

### Modulos Funcionais

| Modulo | Pages | Components | Data Layer | API Routes |
|--------|-------|------------|------------|------------|
| Auth | 4 | — | middleware | callback |
| Dashboard | 1 | kpi-card, empty-state | dashboard.ts | — |
| Leads | 4 | 9 (table, filters, form, info-card, tags, csv-wizard, timeline, tracking-journey) | leads.ts, lead-events.ts | webhook/leads |
| Segments | 3 | 3 (table, form, rule-builder) | segments.ts | — |
| Templates | 3 | 4 (table, filters, form, unlayer-editor) | templates.ts | send-test |
| Campaigns | 3 | 3 (table, filters, form) | campaigns.ts | send route |
| Analytics | 1 | — | integrations.ts | sync route |
| Automations | 3 | 1 (automation-form) | automations.ts | trigger route |
| WhatsApp | 3 | — | whatsapp.ts | send + webhook |
| SMS | 1 | — | sms.ts | send + webhook |
| Formularios | 3 | 1 (form-builder) | forms.ts | submit + embed.js |
| Chatbot | 3 | — | chatbot.ts | chat + embed.js |
| Tracking GTM | 5 | 16 (charts, badges, tables, timeline) | tracking/ (8 hooks + 6 lib) | journey |
| Landing Pages | 3 | — | lp-builder/ (5 lib) + landing-pages.ts | chat + deploy |
| Audience Export | 1 | — | audience-exports.ts | sync route |
| SEO Analyzer | 1 | — | seo.ts | analyze route |
| Social Media | 2 | — | social.ts | — |
| Bio Links | 3+1 pub | 1 (bio-page-client) | bio-links.ts | track route |
| Settings | 1 | 12 (org, members, invite, api-keys, domain, custom-fields, scoring, integrations, appearance, white-label, language) | white-label.ts | — |
| Webhooks | — | — | — | 5 (mailersend, leads, events, whatsapp, sms) |

### Infraestrutura

| Item | Status | Detalhes |
|------|--------|---------|
| TypeScript | 0 erros | Strict mode, todas as interfaces tipadas |
| Supabase Auth | Implementado | Login, registro, magic link, middleware |
| Multi-tenancy | Implementado | RLS em todas as tabelas, org selector + criar org, roles |
| Migrations | 16 arquivos | 40+ tabelas + RLS + triggers + functions |
| shadcn/ui | 22 componentes | Todos os primitivos necessarios (incl. Switch, Tooltip) |
| MailerSend | Client pronto | sendEmail, sendBulkEmail, webhook handler, scoring integrado |
| Unlayer | Integrado | Editor drag-and-drop full-screen com merge tags PT-BR |
| next-themes | Integrado | Dark mode (claro/escuro/sistema) com ThemeProvider |
| n8n | Client pronto | REST API + webhook trigger |
| GA4 | Client pronto | Data API v1 com OAuth refresh |
| Meta Ads | Client pronto | Marketing API v19.0 |
| WhatsApp | Client pronto | Cloud API v19.0 (text, template, interactive, media) |
| Twilio SMS | Client pronto | REST API com dev-mode fallback |
| Anthropic AI | Client pronto | Claude API para chatbot (dev fallback) |
| Meta Audiences | Client pronto | Custom Audiences API com SHA256 |
| Google Ads | Client pronto | Customer Match (placeholder) |
| Social Publisher | Client pronto | Facebook Graph API + dev fallback |
| SEO Analyzer | Engine pronta | 10+ checks (title, meta, H1, images, canonical, viewport, HTTPS, OG, performance) |
| i18n | Implementado | 3 locales (pt-BR, en, es), ~60 chaves |
| White Label | Implementado | Cores, logo, dominio, CSS customizado |
| PWA | Implementado | Manifest, service worker, install prompt |

---

## O que foi feito (por fase)

### Fase 1 — MVP (COMPLETA)
- [x] Auth, Multi-tenant, CRUD Leads, Segmentos, Templates, Campanhas, Dashboard, Webhooks, Settings

### Fase 2 — Analytics (COMPLETA)
- [x] Lead timeline, Lead scoring, GA4, Meta Ads, Analytics page, Event logging

### Fase 3 — Automacoes (COMPLETA)
- [x] Engine (9 triggers, 9 acoes), n8n, Interface completa, Logs

### Fase 4 — WhatsApp + SMS (COMPLETA)
- [x] WhatsApp Cloud API, Inbox, Templates, Broadcasts, Twilio SMS

### Fase 5 — Formularios (COMPLETA)
- [x] Form builder, 4 modos embed, Submissao publica, Lead upsert

### Backlog — Chatbot (COMPLETO)
- [x] Chatbot com regras + IA (Claude), Widget embeddable, Conversas, Rules CRUD

### Backlog — Exportacao de Publicos (COMPLETO)
- [x] Meta Custom Audiences (SHA256), Google Ads Customer Match, Sync por segmento

### Backlog — SEO Analyzer (COMPLETO)
- [x] Engine de analise (10+ checks), Score 0-100, Issues/recomendacoes, Performance metrics

### Backlog — Social Media (COMPLETO)
- [x] Contas (5 plataformas), Posts (draft/schedule/publish), Calendario, Publisher

### Backlog — Link da Bio (COMPLETO)
- [x] Bio pages, Links com UTMs, Reorder, Click/view tracking, Pagina publica /b/[slug]

### Backlog — Multi-idioma (COMPLETO)
- [x] 3 locales (pt-BR, en, es), ~60 chaves, LocaleProvider, Seletor em Settings

### Backlog — White Label (COMPLETO)
- [x] App name, logo, favicon, 3 cores, dominio, CSS, hide branding, email footer

### Backlog — App Mobile/PWA (COMPLETO)
- [x] Manifest, service worker, install prompt, offline support

### Lead Tracking Journey (COMPLETO)
- [x] Componente lead-tracking-journey integrado na pagina do lead
- [x] Jornada completa: sessoes, pageviews, atribuicao, eventos, deal info
- [x] Multi-org (consulta tabelas legadas por email)

### Dark Mode (COMPLETO)
- [x] next-themes com ThemeProvider (claro/escuro/sistema)
- [x] Aba "Aparencia" em Settings com preview visual
- [x] CSS variaveis .dark ja existiam no globals.css

### Formularios com Tracking (COMPLETO)
- [x] 19 campos ocultos (UTMs + click IDs + sessao)
- [x] Geracao de codigo HTML com script de tracking completo
- [x] Configuracao de cookie domain e webhook URL

### Integracoes UX (COMPLETO)
- [x] Instrucoes passo-a-passo para cada integracao
- [x] Links diretos para paineis/consoles dos servicos
- [x] Help text em cada campo + toggle senha

---

## O que falta

### Credenciais — Status (2026-03-07)

| Servico | Status | Env Var |
|---------|--------|---------|
| Supabase URL + Anon Key | ✅ Configurado | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Supabase Service Role | ✅ Configurado | `SUPABASE_SERVICE_ROLE_KEY` |
| MailerSend | ✅ Configurado | `MAILERSEND_API_KEY`, `MAILERSEND_DEFAULT_DOMAIN` |
| OpenRouter (IA) | ✅ Configurado | `OPENROUTER_API_KEY` |
| n8n | ✅ Configurado | `N8N_BASE_URL`, `N8N_API_KEY` |
| Vercel | ✅ Configurado | `VERCEL_ACCESS_TOKEN`, `VERCEL_TEAM_ID` |
| MailerSend Webhooks | ⬜ Plano free | `MAILERSEND_WEBHOOK_SECRET` |
| WhatsApp | ⬜ Opcional | `WHATSAPP_ACCESS_TOKEN`, etc. |
| Twilio SMS | ⬜ Opcional | `TWILIO_ACCOUNT_SID`, etc. |
| Meta/Google Ads | ⬜ Opcional | `META_ADS_ACCESS_TOKEN`, etc. |

### Para ir ao ar (bloqueante)

1. ~~Configurar `.env.local`~~ ✅ **FEITO** — todas as credenciais principais configuradas

2. ~~Rodar migrations~~ ✅ **FEITO** — 19 migrations aplicadas, 40+ tabelas criadas

3. ~~Configurar Supabase Auth~~ ✅ **FEITO** — Email/Password habilitado, usuario confirmado, callback route funcional

4. ~~Configurar MailerSend~~ ✅ **FEITO** — 2 dominios verificados (rodriguinhodomarketing.com.br + trial), email testado HTTP 202

5. **Configurar WhatsApp Business** — app Meta, numero verificado, webhook URL (opcional)

6. ~~Criar icones PWA~~ ✅ **FEITO** — icon-192x192.png e icon-512x512.png criados

7. **Deploy na Vercel** — conectar repo + env vars (**UNICO BLOQUEANTE**)

### Itens pendentes (nao-bloqueantes)

| Item | Fase | Descricao |
|------|------|-----------|
| Mapear dados GTM | 2 | Normalizar dados GTM existentes |
| Leads anonimos | 2 | Identificacao anonimos → conhecidos |
| Ranking de leads | 2 | Visualizacao ranking por score |
| Listas inteligentes | 2 | Segmentos com auto-update |
| Trigger por data | 3 | Automacao por data (aniversario) |
| Drip campaigns | 3 | Sequencias de email |
| Fluxos conversacionais | 4 | Builder estilo ManyChat |
| Tags de WhatsApp | 4 | Tags para conversas WA |
| Pop-ups | 5 | Regras tempo/scroll/exit intent |
| Botao WA tracking | 5 | Botao WhatsApp embeddable |
| Web Push | 5 | Notificacoes push browser |
| A/B testing forms | 5 | Testes A/B formularios |
| Page builder LPs | 5 | Landing pages |

---

## Todas as paginas testadas (30+ paginas + 15+ API routes)

| Pagina | Status |
|--------|--------|
| `/` (Dashboard) | 200 |
| `/login`, `/register`, `/magic-link` | 200 |
| `/leads`, `/leads/new`, `/leads/import`, `/leads/[id]` | 200 |
| `/segments`, `/segments/new`, `/segments/[id]` | 200 |
| `/templates`, `/templates/new`, `/templates/[id]` | 200 |
| `/campaigns`, `/campaigns/new`, `/campaigns/[id]` | 200 |
| `/analytics` | 200 |
| `/automations`, `/automations/new`, `/automations/[id]` | 200 |
| `/whatsapp`, `/whatsapp/templates`, `/whatsapp/broadcasts` | 200 |
| `/sms` | 200 |
| `/forms`, `/forms/new`, `/forms/[id]` | 200 |
| `/chatbot`, `/chatbot/new`, `/chatbot/[id]` | 200 |
| `/audience-exports` | 200 |
| `/seo` | 200 |
| `/social`, `/social/new` | 200 |
| `/bio`, `/bio/new`, `/bio/[id]` | 200 |
| `/b/[slug]` (publico) | 200/404 |
| `/settings` (10 tabs) | 200 |

---

## Sidebar Navigation

```
Dashboard
Leads
Segmentos
Templates
Campanhas
Analytics
Automacoes
WhatsApp
SMS
Formularios
Chatbot
Publicos
SEO
Redes Sociais
Link da Bio
Configuracoes (10 tabs)
```

---

## Arvore de arquivos

```
src/
  app/
    (auth)/login, register, magic-link
    (dashboard)/
      page.tsx
      leads/ (page, new, import, [id])
      segments/ (page, new, [id])
      templates/ (page, new, [id])
      campaigns/ (page, new, [id])
      analytics/page.tsx
      automations/ (page, new, [id])
      whatsapp/ (page, templates, broadcasts)
      sms/page.tsx
      forms/ (page, new, [id])
      chatbot/ (page, new, [id])
      audience-exports/page.tsx
      seo/page.tsx
      social/ (page, new)
      bio/ (page, new, [id])
      settings/page.tsx (10 tabs)
    api/
      campaigns/[id]/send/
      templates/send-test/
      analytics/sync/
      automations/trigger/
      whatsapp/send/
      sms/send/ + webhook/
      forms/[id]/submit/ + embed.js/
      chatbot/[id]/chat/ + embed.js/
      audience-exports/[id]/sync/
      seo/analyze/
      bio/track/
      webhooks/ (mailersend, leads, events, whatsapp)
    b/[slug]/ (bio page publica)
    auth/callback/
  components/
    ui/ (22 shadcn/ui)
    layout/ (sidebar, header)
    shared/ (kpi-card, empty-state, pwa-register, pwa-install-prompt, theme-provider)
    leads/ (8), segments/ (3), templates/ (4), campaigns/ (3)
    automations/ (1), forms/ (1)
    settings/ (12 incl. appearance, white-label, language)
  lib/
    supabase/ (client, server, admin, middleware, +15 data helpers)
    mailersend/, analytics/, whatsapp/, sms/, n8n/
    chatbot/, audience/, seo/, social/
    i18n/translations.ts
    automation-engine.ts, template-utils.ts
    types.ts, constants.ts, utils.ts, csv.ts
  hooks/ (7), contexts/ (organization, locale)
  public/
    manifest.json, sw.js, icons/
supabase/
  migrations/ (16 SQL files, 40+ tabelas)
```
