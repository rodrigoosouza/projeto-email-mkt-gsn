---
name: plataforma-email
description: "Plataforma de email marketing multi-tenant estilo RD Station. Usar esta skill SEMPRE que o projeto plataforma-email for mencionado, quando trabalhar em funcionalidades de email marketing, gestão de leads, automações de marketing, analytics de campanhas, integrações com MailerSend/Meta/Google, ou qualquer desenvolvimento relacionado a este SaaS. Também disparar quando o usuário mencionar: leads, segmentação, lead scoring, campanhas de email, WhatsApp marketing, dashboard de marketing, landing pages, formulários, ou automação de marketing. Esta skill contém toda a arquitetura, decisões técnicas, modelagem de dados e roadmap do projeto."
---

# Plataforma de Email Marketing

SaaS multi-tenant de marketing automation para substituir o RD Station (~R$8k/mês).
Clientes iniciais: **Templum**, **Evolutto**, **Orbit**.

## Stack Técnica

| Camada | Tecnologia | Propósito |
|--------|-----------|-----------|
| Frontend | Next.js 14+ (App Router) | Interface da plataforma |
| Backend/DB | Supabase (PostgreSQL + Auth + Realtime + Storage) | Dados, autenticação, file storage |
| Automações | n8n (self-hosted) | Engine de automação visual |
| Email | MailerSend | Envio transacional + bulk |
| WhatsApp | WhatsApp Cloud API (Meta) | Mensagens e fluxos conversacionais |
| Analytics | Google Analytics API + Meta Ads API | Dados de performance |
| Dados existentes | Supabase (GTM events) | Eventos já coletados via GTM |

## Módulos da Plataforma

A plataforma replica a estrutura do RD Station em 5 áreas principais:

### 1. Dashboard (Visão Geral)
- Seletor de empresa (multi-tenant)
- KPIs principais: leads, emails enviados, taxa abertura, conversões
- Gráficos de tendência
- Atividade recente

### 2. Atrair
- **RD Social** → Agendamento de posts (integração com APIs sociais)
- **Lead Ads** → Integração com Meta Lead Ads
- **Públicos para Anúncios** → Exportação de segmentos para Meta/Google Ads
- **SEO** → Otimização de páginas (análise on-page)
- **Link da Bio** → Gerador de link com UTMs automáticos

### 3. Converter
- **Landing Pages** → Integrar page builder existente do Rodrigo
- **Formulários** → Builder de formulários com campos personalizados
- **Pop-ups** → Triggers por tempo, scroll, exit-intent
- **Campos Personalizados** → Usar campos já existentes + criar novos
- **Botões de WhatsApp** → Widget com tracking
- **Web Push** → Notificações no browser

### 4. Relacionar (CORE - Fase 1)
- **Base de Leads** → Upload CSV, API/webhook de entrada, dedup
- **Lead Scoring** → Baseado em eventos GTM/Analytics + interações email
- **Listas Inteligentes** → Filtros dinâmicos com atualização automática
- **Lead Tracking** → Timeline de eventos por lead
- **Segmentação** → Por eventos, propriedades, scoring, comportamento
- **Email** → Campanhas, automações, editor drag-and-drop (Unlayer/GrapeJS)
- **WhatsApp** → Fluxos estilo ManyChat (tags, disparos, automações)
- **SMS** → Via gateway (Twilio/Zenvia)
- **Automação de Marketing** → Engine visual (n8n por trás)
- **Chatbot** → Fluxos conversacionais

### 5. Vídeos (Ad Director)
- **Pipeline de Vídeos** → Roteiro → Cenas IA → Imagens (Nano Banana) → Vídeos (Veo 3)
- **Review** → Aprovação/reprovação de cenas com preview de assets
- **Automação total** → Cole o roteiro, receba os vídeos prontos

### 6. Analisar
- **Análise de Canais** → Performance por fonte de tráfego
- **Marketing e Vendas** → Funil completo com taxas de conversão
- **Análise de Anúncios** → Dados Meta Ads + Google Ads via API
- **Exportar Relatórios** → PDF/CSV
- **Páginas Mais Acessadas** → Dados do GTM já no Supabase

## Fases de Desenvolvimento

O projeto está dividido em fases incrementais. Cada fase entrega valor independente.

### Fase 1 — Base de Leads + Email (MVP)
**Objetivo:** Sair do RD Station para envio de email.
- Multi-tenant com seletor de empresa
- CRUD de leads (import CSV, API/webhook de entrada)
- Segmentação básica por propriedades e tags
- Editor de email (Unlayer embed ou GrapeJS)
- Disparo de campanhas via MailerSend
- Tracking básico (abertura, clique, bounce)
- Dashboard com métricas de email

### Fase 2 — Analytics
**Objetivo:** Centralizar dados que já existem.
- Integrar dados GTM do Supabase (Templum, Evolutto, Orbit)
- Dashboard de analytics com dados Google Analytics API
- Integração Meta Ads API para dados de anúncios
- Lead tracking com timeline de eventos
- Lead scoring baseado em eventos

### Fase 3 — Automações
**Objetivo:** Substituir automações do RD Station.
- n8n como engine por trás
- Interface visual simplificada na plataforma
- Triggers: evento de lead, tag adicionada, email aberto, data, webhook
- Actions: enviar email, adicionar tag, mover segmento, webhook, notificação

### Fase 4 — WhatsApp + SMS
**Objetivo:** Canal direto com leads.
- Integração WhatsApp Cloud API
- Fluxos conversacionais estilo ManyChat
- Tags e segmentação dentro do WhatsApp
- Disparos em massa com templates aprovados
- SMS via Twilio/Zenvia

### Fase 5 — Converter
**Objetivo:** Completar o ciclo de captura.
- Integrar page builder existente para LPs
- Formulários como componentes embeddable
- Pop-ups com regras de exibição
- Web push notifications

## Ativos Existentes (Projetos do Rodrigo)

A plataforma NÃO começa do zero. Rodrigo já tem projetos em produção com componentes reaproveitáveis:

### tracking-dashboard + tracking avançado
- **Stack:** Next.js 14 + Supabase + Recharts + Tailwind
- **Supabase:** tnpzoklepkvktbqouctf.supabase.co (sa-east-1)
- **Orgs ativas:** Templum, Orbit Gestão (Evolutto pendente)
- **O que tem:** 13 UI components, 10 charts, 4 journey components, 11 hooks, utilities completas
- **Multi-tenant:** Table-per-company (events, orbit_gestao_events) — diferente do RLS planejado
- **Dados fluindo:** GTM → Supabase (events 70+ campos), Pipedrive → conversions, lead_journey views

### sistema de LP (LP Builder)
- **Stack:** Next.js 15 + React 19 + TypeScript strict + Claude API (Haiku)
- **O que faz:** Chat com IA que gera landing pages completas, preview desktop/mobile, deploy automático Vercel
- **Multi-brand:** Templum, Evolutto, Orbit (com identidade visual e ICP documentados)
- **Reaproveitável:** Padrão de chat com IA (adaptar para gerador de email), preview iframe, upload de imagens, state machine com useReducer, deploy Vercel (Fase 5), contextos de marca documentados

### briefing LP foda (Skill/Template)
- **O que é:** Skill do Claude com design system CSS (702 linhas), tracking integration (691 linhas), animações (392 linhas), regras de geração HTML (346 linhas)
- **Reaproveitável:** Design system para Fase 5, tracking de links, payload de lead (formato padrão para API /webhooks/leads), phone mask, referrer mapping, scroll/time tracking

### OpenClaw (Orquestrador AI)
- **Stack:** OpenClaw v2026.2.26 + Docker + Node.js 22 + QMD (semantic search) + Claude Opus 4.6
- **Onde:** VPS Hostinger, 4 agentes AI (main/Jarvis, intel, hunter, ops) com memory pipeline e sandbox per-session
- **Reaproveitável:** Multi-agent orchestration (Fase 3), memory pipeline para lead intelligence (Fase 2+), MCP tools pattern, offline conversion pipeline (Fase 2), channel integration (Fase 4), skills como módulos editáveis (Fase 3)
- **Contextos:** Templum, Evolutto, Orbit — ICPs e canais já documentados

### Estimativa de Reaproveitamento por Fase
| Fase | % Reaproveitável | Principais componentes |
|------|-------------------|----------------------|
| 1 - Leads + Email | ~35% | UI tracking + Chat IA para emails (LP) + payload format (briefing) + MCP tools (OpenClaw) |
| 2 - Analytics | ~70% | Charts, KPIs, journey, hooks + tracking (briefing) + offline conversion pipeline (OpenClaw) |
| 3 - Automações | ~25% | UI genérica + multi-agent orchestration + skills pattern + task routing (OpenClaw) |
| 4 - WhatsApp/SMS | ~25% | Timeline, badges + phone mask + channel integration pattern (OpenClaw) |
| 5 - Converter | ~60% | LP builder inteiro + design system + animations + tracking + deploy |

**IMPORTANTE para Claude Code:** Antes de criar qualquer componente novo, verificar se já existe equivalente nos projetos existentes. Consultar `references/existing-assets.md` para o inventário completo.

## Implementação via OpenClaw

Este projeto será construído pelos agentes do OpenClaw (VPS Hostinger). Rodrigo fala com o **Head de Marketing** no Discord, que coordena **Growth** (backend), **Content** (frontend logic) e **Creative** (UI/components).

**Antes de qualquer tarefa:**
1. Ler esta SKILL.md para contexto geral
2. Ler `references/phase-1-spec.md` para saber o que fazer
3. Ler `references/existing-assets.md` antes de criar componentes novos
4. Consultar `references/openclaw-agents.md` para protocolo de operação

## Referências Detalhadas

Documentação aprofundada por área (todas prontas para implementação):

| Arquivo | Conteúdo | Público |
|---------|----------|---------|
| [existing-assets.md](references/existing-assets.md) ⭐ | Inventário de 5 projetos reaproveitáveis | Todos |
| [database-schema.md](references/database-schema.md) | 7 migrations SQL prontas + RLS + triggers + views | Growth |
| [api-endpoints.md](references/api-endpoints.md) | Todos os endpoints com contratos TypeScript | Growth + Content |
| [architecture.md](references/architecture.md) | Diagramas, fluxos de dados, segurança, deploy | Head + Todos |
| [integrations.md](references/integrations.md) | MailerSend, WhatsApp, GA, Meta/Google Ads, n8n | Growth |
| [file-structure.md](references/file-structure.md) | Estrutura exata de arquivos + package.json + env vars | Content + Creative |
| [phase-1-spec.md](references/phase-1-spec.md) | 6 sprints detalhados com critérios de aceite | Todos |
| [openclaw-agents.md](references/openclaw-agents.md) | Papéis, fluxo de trabalho, regras de operação | Head |
| [video-module.md](references/video-module.md) | Pipeline de vídeos: Nano Banana + Veo 3 + aprovação | Growth + Content |

## Decisões Técnicas Registradas

| Data | Decisão | Motivo |
|------|---------|--------|
| 2026-03-04 | MailerSend como backend de email | API bem documentada, suporta transacional + bulk, multi-domínio, webhooks nativos, preço competitivo |
| 2026-03-04 | Supabase como banco principal | Já tem dados de GTM fluindo, Auth + Realtime + Storage integrados |
| 2026-03-04 | n8n para automações | Já utilizado pela equipe, visual, self-hosted |
| 2026-03-04 | Next.js no frontend | SSR, App Router, boa DX, ecossistema rico |
| 2026-03-04 | Unlayer/GrapeJS para editor de email | Evitar construir editor drag-and-drop do zero |
| 2026-03-05 | Reaproveitar UI do tracking-dashboard | 29 componentes prontos (13 UI, 10 charts, 4 journey, 2 layout), 11 hooks, utilities completas |
| 2026-03-05 | RLS em vez de table-per-company | Tracking usa tabelas separadas (legado), plataforma nova usa schema compartilhado + RLS. Views de compatibilidade mantêm acesso aos dados legados |
| 2026-03-05 | Mesmo Supabase project | Reaproveitar tnpzoklepkvktbqouctf — dados de tracking já lá, adicionar tabelas de email no mesmo projeto |
| 2026-03-05 | Reaproveitar sistema de LP | Chat IA para geração de emails + preview iframe + contextos de marca. Fase 5 usa LP builder inteiro |
| 2026-03-05 | Payload de lead das LPs como contrato da API | Formato do webhook do briefing LP = formato do POST /api/webhooks/leads |
| 2026-03-05 | Reaproveitar patterns do OpenClaw | Multi-agent orchestration para Fase 3, memory pipeline para lead intelligence, MCP tools pattern, offline conversion pipeline para Fase 2 |
| 2026-03-09 | Google Gemini API para vídeos | Nano Banana 2 (imagens) + Veo 3.1 (vídeos) via mesma API key. Pipeline: roteiro → cenas IA → imagens → vídeos |
| 2026-03-09 | OpenRouter para gerar cenas | claude-sonnet-4 analisa roteiro e gera 8-12 cenas com prompts otimizados |

## Convenções do Projeto

- **Idioma do código:** Inglês (variáveis, funções, componentes)
- **Idioma da UI:** Português (interface voltada ao mercado BR)
- **Idioma da documentação:** Português
- **Branch strategy:** main → develop → feature/xxx
- **Commits:** Conventional Commits em português
- **Pasta do projeto:** `/plataforma-email`
