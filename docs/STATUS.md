# Status do Projeto — Plataforma Email

**Ultima atualizacao:** 2026-03-09
**Plano de Evolucao (12 Fases):** 11 de 12 COMPLETAS
**Fase 12 (Copy & Criativos):** PENDENTE (aguardando materiais do usuario)

---

## Resumo Rapido

| Area | Status |
|------|--------|
| Infra (Supabase, MailerSend, n8n, Vercel, OpenRouter) | ✅ Tudo configurado |
| Auth + Multi-tenant | ✅ Funcionando |
| Migrations | 25 arquivos (001-025), 50+ tabelas |
| Modulos | 25 modulos funcionais |
| Settings | 8 tabs |
| Build | ✅ 0 erros TypeScript |
| Deploy | Vercel (falta conectar repo) |

---

## Modulos Funcionais (25)

| Modulo | Status | Descricao |
|--------|--------|-----------|
| Auth | ✅ | Login, registro, magic link, middleware |
| Dashboard | ✅ | 10 KPIs + setup checklist de onboarding |
| Marketing (Briefing) | ✅ | 36 perguntas, estrategia IA, business plan, brand identity |
| Leads | ✅ | CRUD, import CSV, tags, campos custom, timeline, tracking journey |
| Segmentos | ✅ | Estaticos, dinamicos, rule builder |
| Templates | ✅ | HTML + Unlayer drag-and-drop, merge tags, send test |
| Campanhas | ✅ | Envio via MailerSend, agendamento, tracking |
| Analytics | ✅ | GA4, Meta Ads, sync integracoes |
| Automacoes | ✅ | 9 triggers, 9 acoes, logs, n8n |
| WhatsApp | ✅ | Cloud API, inbox, templates, broadcasts |
| Flow Builder | ✅ | 6 tipos de blocos, editor visual, tags, smart delay |
| SMS | ✅ | Twilio, broadcasts, webhook status |
| Formularios | ✅ | Builder, 4 modos embed, 26 campos ocultos tracking |
| Chatbot | ✅ | Regras + IA (Claude), widget embeddable |
| Tracking GTM | ✅ | 6 KPIs, 9 charts, multi-org, lead journey |
| Visitor Analytics | ✅ | Sessoes, scroll depth, device/source, tracking snippet |
| Landing Pages | ✅ | Chat IA, preview, deploy Vercel, custom domain |
| Audience Exports | ✅ | Meta Custom Audiences, Google Ads Customer Match |
| SEO | ✅ | Analisador 10+ checks + keyword tracker + sugestoes IA |
| Social Media | ✅ | 5 plataformas, posts, calendario |
| Bio Links | ✅ | Pagina publica /b/[slug], UTM tracking |
| Content Calendar | ✅ | Metodo Hyesser 4 pilares, geracao IA 30 posts/mes |
| Videos | ✅ | Roteiro IA, cenas, prompts Veo 3 + Nano Banana |
| Integracoes | ✅ | 10 providers, teste real de credenciais |
| Settings | ✅ | 8 tabs (org, membros, API keys, dominio, campos, scoring, integracoes, aparencia) |

---

## Plano de Evolucao — 12 Fases

### ✅ Fase 1 — Limpeza
- White Label e Multi-idioma removidos (simplificacao)
- Settings de 10 para 8 tabs

### ✅ Fase 2 — Contexto por Org
- `getOrgContext()` carrega briefing/ICP/persona/strategy
- Chatbot e LP Builder enriquecidos com contexto automatico

### ✅ Fase 3 — Onboarding
- Setup checklist no dashboard (6 itens)
- Redirect para `/marketing` apos criar organizacao

### ✅ Fase 4 — Dashboard Expandido
- 10 KPIs de todos os modulos (leads, campanhas, LPs, forms, templates, segmentos)

### ✅ Fase 5 — Flow Builder WhatsApp
- 6 tipos de blocos: Message, Condition, Smart Delay, Action, Webhook, Tag
- Editor visual com reorder, properties panel contextual
- Tags com convencao `[action]_[event]_[brand]`

### ✅ Fase 6 — Calendario de Conteudo
- Metodo Hyesser (4 pilares: Crescimento 44%, Conexao 22%, Quebra Objecoes 22%, Autoridade 12%)
- Geracao IA de ~30 posts/mes via OpenRouter
- Calendario grid, stats por pilar, status management

### ✅ Fase 7 — LP Deploy Independente
- `deployToVercelGeneric()` para qualquer org (nao so brands hardcoded)
- Suporte a custom domain alias via Vercel API
- Endpoint `/api/landing-pages/deploy` org-aware

### ✅ Fase 8 — Integracoes UX
- Teste REAL de credenciais via `/api/integrations/test`
- 6 providers com chamada live: MailerSend, WhatsApp, Twilio, OpenRouter, n8n, Vercel
- 4 providers com validacao de campos: GA4, GTM, Google Ads, Meta Ads

### ✅ Fase 9 — SEO Avancado
- Keyword tracker com KPIs (posicao, volume, dificuldade)
- Sugestoes de keywords via IA (analisa contexto da org)
- SEO page com tabs: Analisador + Keywords
- Migration 024: `seo_keywords` + `seo_competitors`

### ✅ Fase 10 — Visitor Analytics
- Dashboard de comportamento: sessoes, scroll depth, device/source
- Tracking snippet JS para instalar em sites externos
- Endpoints: `/api/tracking/collect` + `/api/tracking/snippet`
- Migration 025: `visitor_sessions` + `page_analytics`

### ✅ Fase 11 — Sidebar Reorganizada
- 10 categorias logicas com labels
- 22 itens organizados por funcao

### ⬜ Fase 12 — Copy & Criativos
- Aguardando materiais do usuario (estrutura webinar, estrutura copy, ideias criativos)

---

## Migrations (25 arquivos)

| # | Arquivo | Tabelas |
|---|---------|---------|
| 001-017 | Core | organizations, leads, segments, templates, campaigns, automations, whatsapp, sms, chatbot, audiences, seo, social, bio, white_label, landing_pages, etc. |
| 018 | Fix RLS | get_user_org_ids() + is_org_admin() SECURITY DEFINER |
| 019 | Marketing | org_marketing_profiles + industry_benchmarks |
| 020 | Org RPC | create_organization_with_member() |
| 021 | Videos | video_projects + video_scenes |
| 022 | Flows | automation_flows + automation_executions + lead_tags + tag_definitions |
| 023 | Calendar | content_calendar (Metodo Hyesser) |
| 024 | SEO KW | seo_keywords + seo_competitors |
| 025 | Analytics | visitor_sessions + page_analytics |

**Aplicadas no Supabase:** 001-019
**Pendentes de aplicar:** 020-025

---

## Sidebar Navigation

```
Dashboard

Marketing
  Estrategia
  Calendario

Leads & Segmentos
  Leads
  Segmentos
  Formularios

Email Marketing
  Campanhas
  Templates
  Automacoes
  Analytics

Mensageria
  WhatsApp
  Fluxos
  SMS
  Chatbot

Redes Sociais
  Posts
  Link da Bio

Criativos
  Videos

Web
  Landing Pages
  SEO
  Tracking
  Comportamento

Exportacoes
  Publicos

Configuracoes
```

---

## Credenciais

| Servico | Status | Env Var |
|---------|--------|---------|
| Supabase URL + Anon Key | ✅ | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Supabase Service Role | ✅ | `SUPABASE_SERVICE_ROLE_KEY` |
| MailerSend | ✅ | `MAILERSEND_API_KEY`, `MAILERSEND_DEFAULT_DOMAIN` |
| OpenRouter (IA) | ✅ | `OPENROUTER_API_KEY` |
| n8n | ✅ | `N8N_BASE_URL`, `N8N_API_KEY` |
| Vercel | ✅ | `VERCEL_ACCESS_TOKEN`, `VERCEL_TEAM_ID` |
| WhatsApp | ⬜ Opcional | `WHATSAPP_ACCESS_TOKEN`, etc. |
| Twilio SMS | ⬜ Opcional | `TWILIO_ACCOUNT_SID`, etc. |
| Meta/Google Ads | ⬜ Opcional | Via settings/integracoes |

---

## Para testar

### Pre-requisitos
1. `npm install`
2. `.env.local` com as credenciais acima
3. Aplicar migrations 020-025 no Supabase (via SQL Editor)

### Rodar local
```bash
npm run dev
# Abrir http://localhost:3000
# Login: rodrigoosouzaamarketing@gmail.com
```

### Testar modulos novos
1. **SEO Keywords** — `/seo` > tab Keywords > Adicionar keyword ou clicar "Sugestoes IA"
2. **Visitor Analytics** — `/tracking/analytics` (precisa de dados na tabela visitor_sessions)
3. **Teste de Integracoes** — `/settings` > tab Integracoes > clicar "Testar" (valida credenciais em tempo real)
4. **Content Calendar** — `/content-calendar` > selecionar mes > "Gerar com IA"
5. **Flow Builder** — `/whatsapp/flows` > Criar Fluxo > Adicionar blocos
6. **Deploy LP** — `/landing-pages/new` > gerar LP > Deploy (usa Vercel)

---

## Todas as paginas (40+ rotas)

| Rota | Tipo |
|------|------|
| `/` | Dashboard |
| `/login`, `/register`, `/magic-link`, `/reset-password`, `/update-password` | Auth |
| `/marketing` | Briefing + Estrategia IA |
| `/content-calendar` | Calendario Conteudo |
| `/leads`, `/leads/new`, `/leads/import`, `/leads/[id]` | Leads |
| `/segments`, `/segments/new`, `/segments/[id]` | Segmentos |
| `/forms`, `/forms/new`, `/forms/[id]` | Formularios |
| `/campaigns`, `/campaigns/new`, `/campaigns/[id]` | Campanhas |
| `/templates`, `/templates/new`, `/templates/[id]` | Templates |
| `/automations`, `/automations/new`, `/automations/[id]` | Automacoes |
| `/analytics` | Analytics |
| `/whatsapp`, `/whatsapp/templates`, `/whatsapp/broadcasts` | WhatsApp |
| `/whatsapp/flows`, `/whatsapp/flows/[id]` | Flow Builder |
| `/sms` | SMS |
| `/chatbot`, `/chatbot/new`, `/chatbot/[id]` | Chatbot |
| `/tracking`, `/tracking/leads`, `/tracking/leads/[email]`, `/tracking/campaigns`, `/tracking/conversions` | Tracking GTM |
| `/tracking/analytics` | Visitor Analytics |
| `/landing-pages`, `/landing-pages/new`, `/landing-pages/[id]` | Landing Pages |
| `/seo` | SEO (Analisador + Keywords) |
| `/social`, `/social/new` | Redes Sociais |
| `/bio`, `/bio/new`, `/bio/[id]` | Bio Links |
| `/b/[slug]` | Bio (publico) |
| `/videos`, `/videos/new`, `/videos/[id]` | Videos |
| `/audience-exports` | Publicos |
| `/settings` | Configuracoes (8 tabs) |

### API Routes (20+)

| Rota | Metodo | Funcao |
|------|--------|--------|
| `/api/campaigns/[id]/send` | POST | Enviar campanha |
| `/api/templates/send-test` | POST | Enviar email teste |
| `/api/analytics/sync` | POST | Sincronizar analytics |
| `/api/automations/trigger` | POST | Disparar automacao |
| `/api/whatsapp/send` | POST | Enviar WhatsApp |
| `/api/sms/send` | POST | Enviar SMS |
| `/api/forms/[id]/submit` | POST | Submeter formulario |
| `/api/forms/[id]/embed.js` | GET | Script embed form |
| `/api/chatbot/[id]/chat` | POST | Chat com bot |
| `/api/chatbot/[id]/embed.js` | GET | Script embed chatbot |
| `/api/audience-exports/[id]/sync` | POST | Sync publicos |
| `/api/seo/analyze` | POST | Analisar URL |
| `/api/seo/suggest-keywords` | POST | Sugestoes IA keywords |
| `/api/bio/track` | POST | Track bio click |
| `/api/lp-builder/chat` | POST | Chat LP Builder |
| `/api/lp-builder/deploy` | POST | Deploy LP (brand) |
| `/api/landing-pages/deploy` | POST | Deploy LP (org) |
| `/api/marketing/generate-strategy` | POST | Gerar estrategia IA |
| `/api/content-calendar/generate` | POST | Gerar calendario IA |
| `/api/integrations/test` | POST | Testar credenciais |
| `/api/tracking/collect` | POST | Coletar eventos tracking |
| `/api/tracking/snippet` | GET | Gerar snippet tracking |
| `/api/tracking/journey` | GET | Jornada do lead |
| `/api/webhooks/*` | POST | Webhooks (MailerSend, leads, events, WhatsApp, SMS) |
