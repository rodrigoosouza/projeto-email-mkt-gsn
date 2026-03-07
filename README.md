# Plataforma de Email Marketing

Plataforma SaaS multi-tenant de marketing automation, construída para substituir o RD Station.

## Por que este projeto existe

Investimento atual: ~R$8.000/mês no RD Station.
Esta plataforma cobre as funcionalidades mais utilizadas com stack própria, reduzindo custos e dando controle total sobre os dados.

## Clientes Iniciais

| Cliente | Slug | Status |
|---------|------|--------|
| Templum | `templum` | Dados GTM já no Supabase |
| Evolutto | `evolutto` | Dados GTM já no Supabase |
| Orbit | `orbit` | Dados GTM já no Supabase |

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 14+ (App Router) |
| UI | shadcn/ui + Tailwind CSS |
| Backend/DB | Supabase (PostgreSQL + Auth + Realtime) |
| Automações | n8n (self-hosted) |
| Email | MailerSend |
| WhatsApp | WhatsApp Cloud API (Meta) |
| Deploy | Vercel |

## Módulos

1. **Dashboard** — Visão geral com KPIs por empresa
2. **Atrair** — Social, Lead Ads, SEO, Link da Bio
3. **Converter** — Landing Pages, Formulários, Pop-ups, Web Push
4. **Relacionar** — Leads, Scoring, Segmentação, Email, WhatsApp, SMS, Automações
5. **Analisar** — Analytics, Canais, Anúncios, Relatórios

## Fases de Desenvolvimento

| Fase | Escopo | Status |
|------|--------|--------|
| 1 | Base de Leads + Email (MVP) | 🔵 Em planejamento |
| 2 | Analytics (dados GTM + GA + Meta Ads) | ⚪ Aguardando |
| 3 | Automações (n8n como engine) | ⚪ Aguardando |
| 4 | WhatsApp + SMS | ⚪ Aguardando |
| 5 | Converter (LP, Forms, Pop-ups) | ⚪ Aguardando |

## Ativos Existentes

Este projeto reaproveita componentes de projetos em produção:

| Projeto | Componentes | Reaproveitamento |
|---------|-------------|-----------------|
| tracking-dashboard | 13 UI, 10 charts, 4 journey, 11 hooks | Fase 2: ~70% pronto |
| tracking avançado | Multi-company, paginação, charts extras | Patterns avançados |
| sistema de LP | Chat IA + preview iframe + deploy Vercel + brands | Fase 1: chat IA p/ emails. Fase 5: ~60% pronto |
| briefing LP foda | Design system CSS, tracking JS, animações | Fase 5: design system. Fase 2: tracking |
| OpenClaw | Multi-agent AI, memory pipeline, MCP tools, semantic search | Fase 3: ~25% (orchestration). Fase 2: offline conversion pipeline |

Ver inventário completo em `.skills/plataforma-email/references/existing-assets.md`

## Estrutura do Projeto

```
plataforma-email/
├── .env.example              # Variáveis de ambiente necessárias
├── .gitignore                # Arquivos ignorados pelo git
├── README.md                 # Este arquivo
├── .skills/                  # Skill do Claude/OpenClaw para este projeto
│   └── plataforma-email/
│       ├── SKILL.md          # ⭐ Documento master — ler primeiro
│       └── references/       # Documentação detalhada
│           ├── existing-assets.md   # Inventário de 5 projetos reaproveitáveis
│           ├── database-schema.md   # 7 migrations SQL prontas + RLS
│           ├── api-endpoints.md     # Todos os endpoints + contratos
│           ├── architecture.md      # Diagramas + fluxos + segurança
│           ├── integrations.md      # MailerSend, WA, GA, Meta, n8n
│           ├── file-structure.md    # Estrutura exata de arquivos
│           ├── phase-1-spec.md      # 6 sprints detalhados (Fase 1)
│           └── openclaw-agents.md   # Manual de operação dos agentes AI
├── docs/                     # Documentação do projeto
│   ├── ARCHITECTURE.md       # Arquitetura técnica
│   ├── ROADMAP.md            # Roadmap detalhado
│   ├── DECISIONS.md          # Registro de decisões (ADR)
│   ├── INTEGRATION-MAP.md    # Mapa de integração entre projetos
│   └── SETUP.md              # Guia de setup local
└── src/                      # Código-fonte (Next.js) — a criar
```

## Setup Rápido

```bash
# 1. Clonar e instalar
git clone <repo-url>
cd plataforma-email
cp .env.example .env.local
npm install

# 2. Configurar variáveis em .env.local

# 3. Rodar em dev
npm run dev
```

## Documentação

- [Arquitetura Técnica](docs/ARCHITECTURE.md)
- [Roadmap Detalhado](docs/ROADMAP.md)
- [Registro de Decisões](docs/DECISIONS.md)
- [Guia de Setup](docs/SETUP.md)

## Decisões Técnicas

| Data | Decisão | Motivo |
|------|---------|--------|
| 2026-03-04 | MailerSend para envio de email | API sólida, transacional + bulk, multi-domínio, preço justo |
| 2026-03-04 | Supabase como backend | Dados GTM já existentes, Auth/Realtime/Storage integrados |
| 2026-03-04 | n8n para automações | Já utilizado, visual, self-hosted |
| 2026-03-04 | Next.js + Vercel | SSR, DX, deploy integrado |
| 2026-03-05 | Reaproveitar componentes do tracking | 29 componentes + 11 hooks prontos |
| 2026-03-05 | Reaproveitar patterns do OpenClaw | Multi-agent (Fase 3), memory pipeline, MCP tools, offline conversion |
| 2026-03-05 | RLS (não table-per-company) | Tracking usa tabelas separadas (legado), plataforma usa RLS |
| 2026-03-05 | Mesmo Supabase project | Dados de tracking já estão lá |
