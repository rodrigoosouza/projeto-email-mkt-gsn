# Roadmap

## Plano de Evolucao — 12 Fases

### ✅ Fase 1 — Limpeza (2026-03-08)
- [x] Remover White Label (nao utilizado)
- [x] Remover Multi-idioma (nao utilizado)
- [x] Settings de 10 para 8 tabs

### ✅ Fase 2 — Contexto por Org (2026-03-08)
- [x] getOrgContext() carrega briefing/ICP/persona/strategy
- [x] Chatbot enriquecido com contexto automatico
- [x] LP Builder enriquecido com contexto automatico

### ✅ Fase 3 — Onboarding (2026-03-08)
- [x] Setup checklist no dashboard (6 itens)
- [x] Redirect para /marketing apos criar org

### ✅ Fase 4 — Dashboard Expandido (2026-03-08)
- [x] 10 KPIs de todos os modulos

### ✅ Fase 5 — Flow Builder WhatsApp (2026-03-08)
- [x] 6 tipos de blocos (Message, Condition, Smart Delay, Action, Webhook, Tag)
- [x] Editor visual com properties panel
- [x] Tags com convencao [action]_[event]_[brand]

### ✅ Fase 6 — Calendario de Conteudo (2026-03-08)
- [x] Metodo Hyesser (4 pilares)
- [x] Geracao IA ~30 posts/mes
- [x] Grid calendar + stats + status management

### ✅ Fase 7 — LP Deploy Independente (2026-03-09)
- [x] deployToVercelGeneric() para qualquer org
- [x] Custom domain alias via Vercel API
- [x] Endpoint /api/landing-pages/deploy org-aware

### ✅ Fase 8 — Integracoes UX (2026-03-09)
- [x] Teste real de credenciais (6 providers live + 4 field-check)
- [x] Endpoint /api/integrations/test

### ✅ Fase 9 — SEO Avancado (2026-03-09)
- [x] Keyword tracker com KPIs
- [x] Sugestoes IA de keywords
- [x] Migration 024: seo_keywords + seo_competitors

### ✅ Fase 10 — Visitor Analytics (2026-03-09)
- [x] Dashboard de comportamento (sessoes, scroll, device, source)
- [x] Tracking snippet JS para sites externos
- [x] Endpoints collect + snippet
- [x] Migration 025: visitor_sessions + page_analytics

### ✅ Fase 11 — Sidebar Reorganizada (2026-03-08)
- [x] 10 categorias logicas com labels

### ⬜ Fase 12 — Copy & Criativos
- [ ] Aguardando do usuario: estrutura webinar, estrutura copy, ideias criativos estaticos
- [ ] Gerador de copy para campanhas/emails
- [ ] Templates de criativos estaticos

---

## Fases Originais (Pre-Evolucao) — TODAS COMPLETAS

### ✅ Fase 1 — Base de Leads + Email (MVP)
- [x] Auth, Multi-tenant, CRUD Leads, Segmentos, Templates, Campanhas, Dashboard, Webhooks, Settings

### ✅ Fase 2 — Analytics
- [x] Lead timeline, Lead scoring, GA4, Meta Ads, Analytics, Lead tracking journey

### ✅ Fase 3 — Automacoes
- [x] Engine (9 triggers, 9 acoes), n8n, Interface, Logs

### ✅ Fase 4 — WhatsApp + SMS
- [x] WhatsApp Cloud API, Inbox, Templates, Broadcasts, Twilio SMS

### ✅ Fase 5 — Formularios
- [x] Form builder, 4 modos embed, 26 campos ocultos tracking

### ✅ Backlog — Chatbot, Publicos, SEO, Social, Bio, Dark Mode, PWA
- [x] Tudo implementado

### ✅ Integracao Tracking GTM + LP Builder
- [x] Dashboard tracking multi-org portado
- [x] LP Builder com chat IA + deploy Vercel

### ✅ Fase 6 — Videos / Ad Director
- [x] Pipeline: Roteiro → Cenas IA → Prompts Veo 3 + Nano Banana
- [ ] Integracao Nano Banana 2 (geracao automatica imagens) — pendente
- [ ] Integracao Veo 3.1 (geracao automatica videos) — pendente

---

## Itens Pendentes (Melhorias Futuras)

| Item | Complexidade | Prioridade |
|------|-------------|-----------|
| Deploy Vercel (conectar repo) | Baixa | ⚡ Alta |
| Aplicar migrations 020-025 no Supabase | Baixa | ⚡ Alta |
| Fase 12: Copy & Criativos | Media | Media |
| Nano Banana 2 (imagens IA) | Alta | Media |
| Veo 3.1 (videos IA) | Alta | Media |
| Leads anonimos → conhecidos | Alta | Baixa |
| Drip campaigns (sequencias email) | Alta | Media |
| Pop-ups (tempo, scroll, exit intent) | Media | Baixa |
| Web Push notifications | Media | Baixa |
| A/B testing forms | Media | Baixa |
| Trigger por data (aniversario) | Baixa | Baixa |

---

## Visao de Produto

Plataforma all-in-one de marketing automatizado que substitui:
- **RD Station** → Leads, Segmentos, Email Marketing, Automacoes
- **Semrush** → SEO Analyzer + Keyword Tracker
- **Clarity/Hotjar** → Visitor Analytics (sessoes, scroll depth, device)
- **ManyChat** → Flow Builder WhatsApp/Email/SMS
- **mLabs** → Social Media + Content Calendar (Metodo Hyesser)
- **Unbounce** → LP Builder com IA + Deploy Vercel

**Destino final:** OpenClaw para automacao total com agentes IA.
