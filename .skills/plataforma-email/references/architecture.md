# Arquitetura Técnica da Plataforma de Email

## Índice
1. [Visão Geral do Sistema](#visão-geral-do-sistema)
2. [Infraestrutura](#infraestrutura)
3. [Arquitetura Frontend](#arquitetura-frontend)
4. [Arquitetura Backend](#arquitetura-backend)
5. [Fluxos de Dados](#fluxos-de-dados)
6. [Arquitetura Multi-Tenancy](#arquitetura-multi-tenancy)
7. [Arquitetura de Segurança](#arquitetura-de-segurança)
8. [Arquitetura de Performance](#arquitetura-de-performance)
9. [Coexistência com Projetos Existentes](#coexistência-com-projetos-existentes)
10. [Deployment & CI/CD](#deployment--cicd)

---

## Visão Geral do Sistema

### Diagrama de Componentes de Alto Nível

```
╔═════════════════════════════════════════════════════════════════════════════════╗
║                         PLATAFORMA DE EMAIL - ARQUITETURA COMPLETA               ║
╚═════════════════════════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────────────────────────┐
│                                  CAMADA FRONTEND                                  │
│                           (Next.js 14+ na Vercel)                                │
│                                                                                   │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  (auth)     │  │(dashboard)   │  │ (dashboard)  │  │(dashboard)   │          │
│  │             │  │              │  │              │  │              │          │
│  │ · Login     │  │ · Leads      │  │ · Campanhas  │  │ · Relatórios │          │
│  │ · Register  │  │ · Segments   │  │ · Templates  │  │ · Analytics  │          │
│  │ · Magic Link│  │ · Scoring    │  │ · Automações │  │ · Dados GA   │          │
│  └─────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│        │                 │                  │                 │                  │
│        └─────────────────┼──────────────────┼─────────────────┘                  │
│                          │                  │                                    │
│         ┌────────────────┼──────────────────┼────────────────┐                   │
│         │   Middleware.ts - Auth Guard     │                │                   │
│         └────────────────┼──────────────────┼────────────────┘                   │
│                          │                  │                                    │
│         ┌─────────────────┼──────────────────┴─────────────────┐                │
│         │ State Management (Zustand + React Query)            │                │
│         │ · Org Context  · Auth State  · UI State             │                │
│         └─────────────────┼───────────────────────────────────┘                │
│                           │ HTTPS                             │                │
│                           ▼                                   │                │
└───────────────────────────┼───────────────────────────────────┴────────────────┘
                            │
            ┌───────────────┼───────────────┐
            │               │               │
            ▼               ▼               ▼
   ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
   │   Domínio 1  │ │   Domínio 2  │ │   Domínio N  │
   │   (prod)     │ │  (staging)   │ │  (custom)    │
   └──────────────┘ └──────────────┘ └──────────────┘


┌─────────────────────────────────────────────────────────────────────────────────┐
│                         CAMADA BACKEND - SUPABASE (sa-east-1)                    │
│                     Projeto: tnpzoklepkvktbqouctf (hosted)                       │
│                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                          PostgreSQL + RLS Policies                           │ │
│  │                                                                               │ │
│  │  Tabelas Principais:                                                        │ │
│  │  ├─ organizations (tenant isolation)                                        │ │
│  │  ├─ users (auth + org_id)                                                   │ │
│  │  ├─ leads (contatos capturados)                                             │ │
│  │  ├─ lead_events (eventos, histórico)                                        │ │
│  │  ├─ segments (agrupamentos dinâmicos)                                       │ │
│  │  ├─ campaigns (campanhas de email)                                          │ │
│  │  ├─ email_templates (modelos de email)                                      │ │
│  │  ├─ email_sends (registro de envios)                                        │ │
│  │  ├─ automations (fluxos de automação)                                       │ │
│  │  ├─ scoring_rules (regras de pontuação)                                     │ │
│  │  ├─ integrations (chaves de API por org)                                    │ │
│  │  ├─ webhooks_events (log de eventos webhook)                                │ │
│  │  └─ analytics_snapshots (cache para relatórios)                             │ │
│  │                                                                               │ │
│  │  Todos possuem:                                                             │ │
│  │  · organization_id (filtro RLS)                                             │ │
│  │  · created_at / updated_at (auditoria)                                      │ │
│  │  · Políticas RLS que validam organization_id                                │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                      Supabase Auth (GoTrue)                                  │ │
│  │  ├─ Email/Password authentication                                           │ │
│  │  ├─ Magic link support                                                      │ │
│  │  ├─ JWT token generation (exp: 1 hora)                                      │ │
│  │  ├─ Refresh token (exp: 7 dias)                                             │ │
│  │  └─ Role-based access (anon, authenticated, admin)                          │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                     Supabase Realtime (WebSocket)                            │ │
│  │  ├─ Broadcast: mensagens de sistema                                         │ │
│  │  ├─ Presence: usuários online                                               │ │
│  │  └─ Postgres Changes: inscrições em lead_events, email_sends                │ │
│  │     (filtradas por organization_id via RLS)                                 │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                      Supabase Storage (S3)                                   │ │
│  │  ├─ Bucket: templates/ (uploads de imagens, HTML)                           │ │
│  │  ├─ Bucket: imports/ (histórico de CSVs)                                    │ │
│  │  ├─ Bucket: attachments/ (anexos de email)                                  │ │
│  │  └─ RLS policies: organization_id via metadata                              │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                   Supabase Edge Functions (Deno)                             │ │
│  │                                                                               │ │
│  │  Função                    │ Trigger      │ Timeout │ Propósito               │ │
│  │  ──────────────────────────┼──────────────┼─────────┼─────────────────────── │ │
│  │  handle-mailersend-webhook │ HTTP POST   │ 30s    │ Processar eventos MS    │ │
│  │  handle-meta-webhook       │ HTTP POST   │ 30s    │ Processar eventos Meta  │ │
│  │  handle-whatsapp-webhook   │ HTTP POST   │ 30s    │ Mensagens WhatsApp      │ │
│  │  handle-lead-webhook       │ HTTP POST   │ 30s    │ Entrada de leads extern │ │
│  │  send-campaign             │ HTTP POST   │ 300s   │ Enviar campanha bulk    │ │
│  │  generate-ai-email         │ HTTP POST   │ 60s    │ IA para gerar email     │ │
│  │  import-csv-batch          │ HTTP POST   │ 120s   │ Batch import de leads   │ │
│  │  calculate-scoring         │ DB trigger  │ 30s    │ Recalc score do lead    │ │
│  │  sync-analytics            │ Cron (h)    │ 120s   │ Puxar dados GA/Meta     │ │
│  │  consolidate-events        │ Cron (d)    │ 300s   │ Consolidar lead_events  │ │
│  │                                                                               │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                    pg_cron - Agendador de Tarefas                           │ │
│  │                                                                               │ │
│  │  · Sincronizar analytics (a cada 6h)                                        │ │
│  │  · Consolidar lead_events (diariamente 02:00 BRT)                           │ │
│  │  · Gerar snapshots analíticos (diariamente 06:00 BRT)                       │ │
│  │  · Limpar webhooks_events antigos (semanalmente)                            │ │
│  │  · Enviar relatórios agendados (conforme campanha)                          │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                     Supabase Vault - Secrets                                │ │
│  │                                                                               │ │
│  │  · mailersend_api_key_per_org                                               │ │
│  │  · meta_api_token                                                           │ │
│  │  · whatsapp_business_account_token                                          │ │
│  │  · google_analytics_service_account                                         │ │
│  │  · claude_api_key (para geração de email IA)                                │ │
│  │  · stripe_secret_key (se houver billing)                                    │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
│                          (Base de dados hospedada: 10 GB SSD)                    │
└─────────────────────────────────────────────────────────────────────────────────┘
          │                          │                          │
          │ REST API                 │ Real-time               │ Webhooks
          │ (json-rpc via JS client) │ (WebSocket)            │ (HTTP)
          │                          │                        │
          ▼                          ▼                        ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────────┐
│  MailerSend      │  │  Google          │  │  n8n                     │
│  (Email API)     │  │  Analytics / Meta│  │  (Automação, Webhooks)   │
│                  │  │  API Integration │  │                          │
│  · Envio bulk    │  │                  │  │  · Workflow Builder      │
│  · Webhook       │  │  · GA4 Real-time │  │  · Trigger-Action       │
│    events        │  │  · Meta Conv. API│  │  · Multi-channel        │
│  · Bounce/       │  │                  │  │  · Custom integrations   │
│    Complaint     │  │                  │  │                          │
│  · Tracking      │  │                  │  │  Hosted on:              │
│  · Template mgmt │  │                  │  │  VPS 187.77.227.3        │
│                  │  │                  │  │                          │
└──────────────────┘  └──────────────────┘  └──────────────────────────┘


┌──────────────────────────────────────────────────────────────────────────────────┐
│                          EXTERNAL INTEGRATIONS                                    │
│                                                                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ MailerSend   │  │ Google       │  │ Meta (FB)    │  │ WhatsApp     │         │
│  │              │  │ Analytics 4  │  │ Conversion   │  │ Business API │         │
│  │ API v1 REST  │  │              │  │ API          │  │              │         │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                           │
│  │ Anthropic    │  │ Vercel       │  │ GitHub       │                           │
│  │ Claude API   │  │ Edge Network │  │ (Git repo)   │                           │
│  │              │  │              │  │              │                           │
│  │ · Text gen.  │  │ · CDN        │  │ · Source     │                           │
│  │ · Email IA   │  │ · Analytics  │  │ · CI/CD      │                           │
│  └──────────────┘  └──────────────┘  └──────────────┘                           │
│                                                                                    │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## Infraestrutura

### Supabase (Hosted - sa-east-1)

**Projeto:** `tnpzoklepkvktbqouctf`
**Região:** São Paulo (sa-east-1) — latência ~10ms para usuários BR
**Plano:** [Especificar: Free/Pro/Team]

#### Configuração de Branching

```
Production Branch
  ├─ Deploy automático via Vercel
  ├─ Backup diário
  ├─ RLS policies ativas
  └─ Vault secrets encriptados

Staging Branch (tnpzoklepkvktbqouctf_staging)
  ├─ Ambiente de teste isolado
  ├─ Dados fictícios
  ├─ Deploy manual via CLI
  └─ Tests rodando antes de merge

Development (local)
  ├─ supabase start (Docker)
  ├─ Migrations sincronizadas
  └─ Seed data para testes
```

#### Limite de Recursos

| Recurso | Limite | Observação |
|---------|--------|-----------|
| Conexões simultâneas | 100 (Free) / 300+ (Pro) | Aumentar conforme demanda |
| Storage | 1GB (Free) / Escalável (Pro) | Imagens + CSVs |
| Realtime connections | 200 (Free) / Escalável | WebSocket simultâneos |
| Edge Functions | Execução + 10k invocações (Free) | Escalável |
| API requests | Rate limit: 2 req/s (Free) | Per endpoint |

### Vercel (Frontend Hosting)

**Framework:** Next.js 14+ (App Router)
**Build:** 60s ~ 180s (conforme tamanho)
**Deploy:** Automático via Git (main branch)

#### Domínios

```
Production:  plataforma-email.com (ou custom)
Staging:     staging.plataforma-email.com
Preview:     [branch].plataforma-email.vercel.app
```

#### Environment Variables (Vercel)

```
# Supabase (Public)
NEXT_PUBLIC_SUPABASE_URL=https://tnpzoklepkvktbqouctf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

# API Keys (Private)
SUPABASE_SERVICE_KEY=eyJhbGc...
CLAUDE_API_KEY=sk-...
STRIPE_SECRET_KEY=sk_live_... (se houver)

# Feature flags
NEXT_PUBLIC_ENABLE_AI_GENERATOR=true
NEXT_PUBLIC_ENABLE_AUTOMATIONS=true
NEXT_PUBLIC_ENABLE_ANALYTICS=true
```

#### Revalidation Strategy

```
next.revalidateTag('leads')        → 1 minuto
next.revalidateTag('campaigns')    → 5 minutos
next.revalidateTag('analytics')    → 30 minutos
```

### n8n (Self-hosted - VPS Hostinger 187.77.227.3)

**Localização:** VPS Hostinger em São Paulo
**Container:** Docker (dentro de rede isolada)
**Porta interna:** 5678 (acesso via SSH tunnel)

#### Comunicação com Supabase

```
n8n ←→ Supabase Edge Functions
├─ Webhook: n8n invoca Edge Functions via HTTP
├─ Database: Acesso direto a PostgreSQL (via supabase-js)
├─ Auth: Service Key do Supabase (com permissões específicas)
└─ Vault: Busca chaves de integração no Vault Supabase

Exemplo: Automação de Welcome Email
n8n recebe lead.created → valida → invoca send-email Edge Function
→ Edge Function queries lead + template → chama MailerSend → resposta
```

#### Workflows Disponíveis

| Workflow | Tipo | Entrada | Saída |
|----------|------|---------|-------|
| Welcome Email | Trigger | lead.created | email_send record |
| Abandoned Cart Reminder | Interval | Cart + 24h | email |
| Weekly Report | Scheduled | Seg. 09:00 | email + Slack |
| Lead Enrichment | Webhook | lead_event | atualiza campos lead |
| Data Sync | Cron | A cada 6h | syncroniza analytics |

### OpenClaw (VPS Hostinger 187.77.227.3)

**Localização:** VPS Hostinger, São Paulo
**Usuário:** `openclaw` (service account)
**Serviço:** systemd unit `openclaw.service`

#### Multi-Agent Development Team

```
Agentes (4 instâncias de Claude):
├─ Main/Jarvis
│   └─ Gestor geral, escalação de tarefas
├─ Intel
│   └─ Research, análise, documentação
├─ Hunter
│   └─ Bug hunting, testes, QA
└─ Ops
    └─ Deployment, infraestrutura, monitoring

Cada agente possui:
├─ Workspace isolado em /home/openclaw/.openclaw/
├─ memory/ próprio (arquivos .md)
├─ Acesso compartilhado a _memory/ (via symlink)
├─ USER.md (contexto do projeto)
└─ Acesso ao repositório Git
```

#### Git Workflow

```
main (production)
  ↓ (merge com PR review)
develop (staging)
  ↓ (merge com testes)
feature/xxx (agentes trabalham aqui)
  ├─ feature/architecture
  ├─ feature/api-integration
  └─ feature/ui-components
```

---

## Arquitetura Frontend

### Estrutura do App Router (Next.js 14+)

```
app/
│
├── layout.tsx                    ← RootLayout, providers, fonts
├── middleware.ts                 ← Auth guard, redirect logic
│
├── (auth)/                       ← Grupo sem layout (sem sidebar)
│   ├── layout.tsx
│   ├── login/
│   │   └── page.tsx             ← Formulário login
│   ├── register/
│   │   └── page.tsx             ← Formulário registro
│   ├── forgot-password/
│   │   └── page.tsx
│   └── reset-password/
│       └── page.tsx
│
├── (dashboard)/                  ← Grupo com layout (com sidebar)
│   ├── layout.tsx               ← Sidebar + Navbar + OrgSelector
│   ├── page.tsx                 ← Dashboard principal
│   │
│   ├── leads/
│   │   ├── page.tsx             ← Lista de leads (tabela)
│   │   ├── [id]/
│   │   │   └── page.tsx         ← Detalhe do lead (perfil)
│   │   ├── import/
│   │   │   └── page.tsx         ← Wizard de import CSV
│   │   └── export/
│   │       └── page.tsx         ← Export filtrado
│   │
│   ├── segments/
│   │   ├── page.tsx             ← Lista de segmentos
│   │   ├── [id]/
│   │   │   ├── page.tsx         ← Editor de segmento (dinâmico)
│   │   │   └── preview/page.tsx ← Preview leads do segmento
│   │   └── new/
│   │       └── page.tsx         ← Criar novo segmento
│   │
│   ├── campaigns/
│   │   ├── page.tsx             ← Lista campanhas (kanban view)
│   │   ├── [id]/
│   │   │   ├── page.tsx         ← Editor campanha (multi-step)
│   │   │   │                    ├─ Step 1: Template
│   │   │   │                    ├─ Step 2: Destinatários (segment)
│   │   │   │                    ├─ Step 3: Preview
│   │   │   │                    └─ Step 4: Send/Schedule
│   │   │   ├── preview/
│   │   │   │   └── page.tsx
│   │   │   └── analytics/
│   │   │       └── page.tsx     ← Stats: open rate, click, bounce
│   │   └── new/
│   │       └── page.tsx         ← Novo draft
│   │
│   ├── templates/
│   │   ├── page.tsx             ← Galeria de templates
│   │   ├── [id]/
│   │   │   └── edit/
│   │   │       └── page.tsx     ← Editor visual (Unlayer/GrapeJS)
│   │   └── ai-generator/
│   │       └── page.tsx         ← IA para gerar template
│   │
│   ├── automations/
│   │   ├── page.tsx             ← Lista workflows
│   │   ├── [id]/
│   │   │   ├── page.tsx         ← Editor workflow (trigger + actions)
│   │   │   └── log/
│   │   │       └── page.tsx     ← Execuções log
│   │   └── new/
│   │       └── page.tsx
│   │
│   ├── analytics/
│   │   ├── page.tsx             ← Dashboard análises gerais
│   │   ├── leads/
│   │   │   └── page.tsx         ← Análise de leads (scoring, fonte)
│   │   ├── campaigns/
│   │   │   └── page.tsx         ← Análise campanhas (ROI, engagement)
│   │   ├── channels/
│   │   │   └── page.tsx         ← Multi-channel (Email, WA, SMS)
│   │   ├── conversion/
│   │   │   └── page.tsx         ← Funil de conversão
│   │   └── ga/
│   │       └── page.tsx         ← Google Analytics integrado
│   │
│   └── settings/
│       ├── page.tsx             ← Settings principal
│       ├── organization/
│       │   └── page.tsx         ← Dados org, nome, logo, etc
│       ├── team/
│       │   └── page.tsx         ← Membros, roles, convites
│       ├── billing/
│       │   └── page.tsx         ← Planos, faturas, pagamento
│       ├── integrations/
│       │   └── page.tsx         ← Conectar MailerSend, GA, Meta, WA
│       ├── api-keys/
│       │   └── page.tsx         ← Gerenciar API keys da org
│       ├── webhooks/
│       │   └── page.tsx         ← Configurar webhooks saída
│       ├── domains/
│       │   └── page.tsx         ← Domínios customizados
│       └── security/
│           └── page.tsx         ← 2FA, sessions, recovery codes
│
├── api/                          ← Route Handlers (endpoint HTTP)
│   ├── webhooks/
│   │   ├── mailersend/
│   │   │   └── route.ts         ← POST /api/webhooks/mailersend
│   │   ├── meta/
│   │   │   └── route.ts         ← POST /api/webhooks/meta
│   │   ├── whatsapp/
│   │   │   └── route.ts         ← POST /api/webhooks/whatsapp
│   │   └── leads/
│   │       └── route.ts         ← POST /api/webhooks/leads (entrada pública)
│   │
│   ├── auth/
│   │   ├── callback/
│   │   │   └── route.ts         ← OAuth callback (se usado)
│   │   └── logout/
│   │       └── route.ts         ← POST /api/auth/logout
│   │
│   ├── cron/
│   │   ├── sync-analytics/
│   │   │   └── route.ts         ← GET /api/cron/sync-analytics (Vercel Cron)
│   │   └── consolidate-events/
│   │       └── route.ts         ← GET /api/cron/consolidate-events
│   │
│   └── health/
│       └── route.ts             ← GET /api/health (status)
│
└── public/
    ├── favicon.ico
    ├── og-image.png
    └── fonts/
```

### Hierarquia de Layouts e Providers

```
RootLayout (app/layout.tsx)
├─ Providers wrapper
│   ├─ Supabase Session Provider
│   ├─ React Query QueryClientProvider
│   ├─ Zustand Store Provider
│   ├─ Theme Provider (dark/light)
│   └─ Toaster (sonner)
├─ Fonts (Geist Sans + Mono)
└─ Analytics (Vercel Analytics)
    │
    └─ AuthLayout (app/(auth)/layout.tsx)
    │   ├─ No sidebar
    │   ├─ Centered form
    │   └─ Background pattern
    │
    └─ DashboardLayout (app/(dashboard)/layout.tsx)
        ├─ Sidebar (navigation)
        ├─ Navbar (user menu, org selector)
        ├─ Main content area
        └─ Footer
```

### Fluxo de Autenticação (Middleware)

```
1. Usuário acessa /dashboard
2. middleware.ts intercepta
3. ├─ Verifica session no Supabase
4. ├─ Se não autenticado → redirect /login
5. ├─ Se expirado → refresh token
6. ├─ Se válido → extrai user_id, org_id
7. └─ Injeta no header (X-User-Id, X-Org-Id) → passa para page
8. Page carrega dados com RLS automático
```

**Código middleware resumido:**

```typescript
// app/middleware.ts
export async function middleware(request: NextRequest) {
  const session = await supabase.auth.getSession()

  if (!session && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (session) {
    const response = NextResponse.next()
    response.headers.set('X-User-Id', session.user.id)
    response.headers.set('X-Org-Id', session.user.user_metadata.org_id)
    return response
  }
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/:path*']
}
```

### Estado da Aplicação (Zustand)

```typescript
// Estrutura de stores

authStore
├─ user: User | null
├─ session: Session | null
├─ organization: Organization | null
├─ isLoading: boolean
└─ methods: setUser(), logout(), switchOrg()

uiStore
├─ sidebarOpen: boolean
├─ theme: 'light' | 'dark'
├─ selectedLeadId: string | null
├─ campaignDraft: Partial<Campaign>
└─ methods: toggleSidebar(), setTheme(), setCampaignDraft()

campaignStore
├─ campaigns: Campaign[]
├─ selectedCampaign: Campaign | null
├─ isLoading: boolean
└─ methods: fetchCampaigns(), updateCampaign(), deleteC ampaign()
```

### Arquitetura de Componentes (Atomic Design)

```
components/
│
├── ui/                          ← shadcn/ui components
│   ├── button.tsx
│   ├── input.tsx
│   ├── select.tsx
│   ├── dialog.tsx
│   ├── table.tsx
│   ├── card.tsx
│   ├── tabs.tsx
│   ├── form.tsx
│   └── ... (50+ componentes)
│
├── domain/                       ← Domínio específico
│   ├── leads/
│   │   ├── LeadTable.tsx        ← Tabela de leads (com sorting, filtering)
│   │   ├── LeadFilters.tsx      ← Filtros (status, temperatura, etc)
│   │   ├── LeadCard.tsx         ← Card de preview
│   │   ├── LeadForm.tsx         ← Form para criar/editar
│   │   └── LeadImportWizard.tsx ← Wizard de import CSV
│   │
│   ├── campaigns/
│   │   ├── CampaignList.tsx
│   │   ├── CampaignEditor.tsx   ← Multi-step wizard
│   │   ├── TemplateSelector.tsx
│   │   ├── SegmentSelector.tsx
│   │   ├── PreviewFrame.tsx     ← iframe para preview do email
│   │   └── ScheduleForm.tsx
│   │
│   ├── templates/
│   │   ├── TemplateGallery.tsx
│   │   ├── TemplateEditor.tsx   ← Integ com Unlayer
│   │   ├── AIGenerator.tsx      ← Prompt → Claude → HTML
│   │   └── TemplatePreview.tsx
│   │
│   ├── automations/
│   │   ├── WorkflowBuilder.tsx  ← Drag-drop trigger + actions
│   │   ├── TriggerSelector.tsx
│   │   ├── ActionNode.tsx
│   │   └── ExecutionLog.tsx
│   │
│   ├── analytics/
│   │   ├── Dashboard.tsx        ← KPIs, gráficos
│   │   ├── MetricCard.tsx       ← Card com métrica
│   │   ├── ChartComponent.tsx   ← Gráficos Recharts
│   │   └── DateRangePicker.tsx
│   │
│   └── settings/
│       ├── OrgSettingsForm.tsx
│       ├── IntegrationList.tsx
│       ├── APIKeyManager.tsx
│       └── TeamMemberList.tsx
│
├── layout/
│   ├── Sidebar.tsx
│   ├── Navbar.tsx
│   ├── OrgSelector.tsx
│   └── Footer.tsx
│
└── common/
    ├── LoadingSpinner.tsx
    ├── ErrorBoundary.tsx
    ├── EmptyState.tsx
    └── ConfirmDialog.tsx
```

### Data Fetching & Caching (React Query)

```typescript
// Padrão de useQuery

// Fetch leads com filtros
export const useLeads = (filters?: LeadsFilters) => {
  return useQuery({
    queryKey: ['leads', filters],
    queryFn: async () => {
      const { data } = await supabase
        .from('leads')
        .select('*')
        .eq('organization_id', orgId)
        .match(filters)
      return data
    },
    staleTime: 5 * 60 * 1000,        // 5 min
    gcTime: 30 * 60 * 1000,          // 30 min (antiga cacheTime)
    refetchOnWindowFocus: false,
  })
}

// Mutation para criar lead
export const useCreateLead = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (lead: NewLead) => {
      const { data } = await supabase
        .from('leads')
        .insert([{ ...lead, organization_id: orgId }])
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
    },
  })
}
```

---

## Arquitetura Backend

### Supabase como BaaS (Backend-as-a-Service)

```
┌─────────────────────────────────────────────────────────┐
│         NÃO HAY BACKEND CUSTOMIZADO (Node/Python)       │
│       Toda lógica roda em Edge Functions (Deno)         │
└─────────────────────────────────────────────────────────┘

Benefícios:
├─ Serverless: pay-as-you-go
├─ Auto-scaling: sem infra para gerenciar
├─ Security: RLS policies automaticamente
├─ Real-time: Realtime subscriptions built-in
└─ CI/CD: Deploy automático via Git + Vercel
```

### RLS (Row Level Security) - Camada de Autorização

```
Todas as tabelas têm policies como:

CREATE POLICY "Users can only access their org leads"
  ON leads
  USING (organization_id = (
    SELECT organization_id FROM users WHERE id = auth.uid()
  ))
  WITH CHECK (organization_id = (
    SELECT organization_id FROM users WHERE id = auth.uid()
  ))

ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

Resultado:
· SELECT leads → filtra automaticamente por org
· INSERT/UPDATE/DELETE → validado por RLS
· Sem necessidade de WHERE organization_id
· Proteção contra SQL injection
```

### Edge Functions (Deno Runtime)

**Localização:** `/supabase/functions/` (no repo)

#### Function: handle-mailersend-webhook

```typescript
// supabase/functions/handle-mailersend-webhook/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import crypto from "https://deno.land/std@0.208.0/crypto/mod.ts";

const MAILERSEND_SECRET = Deno.env.get("MAILERSEND_WEBHOOK_SECRET")!;

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const signature = req.headers.get("x-mailersend-signature") || "";
  const body = await req.text();

  // Validar assinatura (HMAC-SHA256)
  const encoder = new TextEncoder();
  const keyData = encoder.encode(MAILERSEND_SECRET);
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signatureData = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(body)
  );
  const expected = Array.from(new Uint8Array(signatureData))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (signature !== expected) {
    return new Response("Signature mismatch", { status: 401 });
  }

  const event = JSON.parse(body);
  const { data, type } = event;

  // Processar evento
  switch (type) {
    case "email.sent":
      await handleEmailSent(data);
      break;
    case "email.opened":
      await handleEmailOpened(data);
      break;
    case "email.clicked":
      await handleEmailClicked(data);
      break;
    case "email.bounced":
      await handleEmailBounced(data);
      break;
    case "email.complained":
      await handleEmailComplained(data);
      break;
    default:
      console.log("Unknown event type:", type);
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" },
  });
});

async function handleEmailSent(data: any) {
  const { metadata: { email_send_id }, recipient_email } = data;

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  await supabaseClient
    .from("email_sends")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("id", email_send_id);

  // Log do evento
  await supabaseClient.from("webhooks_events").insert({
    event_type: "email.sent",
    source: "mailersend",
    email_send_id,
    recipient_email,
    payload: data,
  });
}

// ... handleEmailOpened, handleEmailClicked, handleEmailBounced, handleEmailComplained
```

#### Function: send-campaign

```typescript
// supabase/functions/send-campaign/index.ts

// Entrada: { campaign_id: string, organization_id: string }
// Lógica:
// 1. Query campaign + template
// 2. Query leads do segment
// 3. Batch para MailerSend bulk API
// 4. Create email_sends records
// 5. Return contagem + queue status

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const { campaign_id, organization_id } = await req.json();

  const campaign = await getCampaignWithTemplate(campaign_id, organization_id);
  const leads = await getSegmentLeads(campaign.segment_id, organization_id);

  const batches = chunk(leads, 500); // MailerSend max 500 per call
  let totalSent = 0;

  for (const batch of batches) {
    const mailersendKey = await getMailersendKey(organization_id);

    const mailersendBatch = batch.map(lead => ({
      to: [{ email: lead.email, personalization: { name: lead.name } }],
      template_id: campaign.template.mailersend_template_id,
      from: { email: campaign.from_email },
      subject: campaign.subject,
      metadata: { email_send_id: uuidv4() }
    }));

    const response = await fetch("https://api.mailersend.com/v1/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Mailersend-Key": mailersendKey,
      },
      body: JSON.stringify({ emails: mailersendBatch }),
    });

    const result = await response.json();
    totalSent += result.message_ids?.length || 0;

    // Criar registros email_sends
    await createEmailSendRecords(batch, campaign_id, organization_id, result.message_ids);
  }

  return new Response(
    JSON.stringify({ success: true, total_sent: totalSent }),
    { headers: { "Content-Type": "application/json" } }
  );
});
```

#### Function: generate-ai-email

```typescript
// supabase/functions/generate-ai-email/index.ts

// Entrada: { brand_context: string, prompt: string, organization_id: string }
// Saída: { html: string, text: string, subject: string }

serve(async (req) => {
  const { brand_context, prompt, organization_id } = await req.json();

  const claudeApiKey = Deno.env.get("CLAUDE_API_KEY")!;

  const systemPrompt = `You are an expert email copywriter.
Brand context: ${brand_context}

Generate a professional, engaging HTML email based on the user's request.
Return ONLY valid HTML (no markdown, no code fences).
Ensure responsive design (mobile-first).
Include <subject> tag for email subject.`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": claudeApiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        { role: "user", content: prompt }
      ],
    }),
  });

  const data = await response.json();
  const content = data.content[0].text;

  // Parse <subject> from response
  const subjectMatch = content.match(/<subject>(.*?)<\/subject>/i);
  const subject = subjectMatch ? subjectMatch[1] : "No Subject";
  const html = content.replace(/<subject>.*?<\/subject>/i, "");

  return new Response(
    JSON.stringify({ html, subject }),
    { headers: { "Content-Type": "application/json" } }
  );
});
```

### pg_cron - Agendador de Tarefas

```sql
-- Sincronizar analytics a cada 6 horas
SELECT cron.schedule('sync-analytics-6h', '0 */6 * * *', $$
  SELECT
    net.http_post(
      url:='https://project.supabase.co/functions/v1/sync-analytics',
      headers:='{"Authorization": "Bearer <service-key>"}',
      body:=json_build_object('organization_id', 'all')
    )
$$);

-- Consolidar lead_events diariamente às 02:00
SELECT cron.schedule('consolidate-events-daily', '0 2 * * *', $$
  INSERT INTO analytics_snapshots (organization_id, date, leads_created, emails_sent, opens, clicks)
  SELECT
    organization_id,
    DATE(created_at),
    COUNT(CASE WHEN event_type = 'lead.created' THEN 1 END),
    COUNT(CASE WHEN event_type = 'email.sent' THEN 1 END),
    COUNT(CASE WHEN event_type = 'email.opened' THEN 1 END),
    COUNT(CASE WHEN event_type = 'email.clicked' THEN 1 END)
  FROM lead_events
  WHERE created_at >= CURRENT_DATE - INTERVAL '1 day'
  GROUP BY organization_id, DATE(created_at)
  ON CONFLICT (organization_id, date) DO UPDATE SET
    leads_created = EXCLUDED.leads_created,
    emails_sent = EXCLUDED.emails_sent,
    opens = EXCLUDED.opens,
    clicks = EXCLUDED.clicks;
$$);

-- Limpar webhooks_events antigos (semanalmente)
SELECT cron.schedule('cleanup-webhooks-weekly', '0 3 * * 1', $$
  DELETE FROM webhooks_events WHERE created_at < CURRENT_DATE - INTERVAL '90 days';
$$);
```

---

## Fluxos de Dados

### 5.1 Lead Capture Flow (Entrada de Leads Externos)

```
┌──────────────────────────────────────────────────────────────────┐
│                   LEAD CAPTURE FLOW                              │
└──────────────────────────────────────────────────────────────────┘

┌──────────────┐
│ External LP  │ (Landing Page, Form, Chatbot)
│ ou Formulário│
└──────┬───────┘
       │
       │ POST /api/webhooks/leads
       │ Headers: x-api-key: org_api_key_XXXX
       │ Body:
       │ {
       │   "email": "lead@example.com",
       │   "name": "João Silva",
       │   "phone": "+5511999999999",
       │   "source": "contact-form-homepage",
       │   "campaign_id": "camp_123",
       │   "custom_fields": {
       │     "company": "Acme Corp",
       │     "job_title": "Manager"
       │   }
       │ }
       │
       ▼
┌──────────────────────────────────┐
│ Edge Function: handle-lead-webhook│
│  · Validar API key               │
│  · Validar email (RFC 5322)      │
│  · Limpar duplicatas (email)     │
└──────┬───────────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│ Upsert na tabela `leads`        │
│  · ON CONFLICT (org, email)     │
│  · Se novo → status: active     │
│  · Se existe → merge custom_flds │
└──────┬───────────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│ Criar `lead_event`              │
│  · event_type: lead.captured    │
│  · source: contact-form-homepage│
│  · metadata: { campaign_id, ... }│
└──────┬───────────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│ Trigger: calculate-scoring      │
│  · Find matching rules          │
│  · Calculate score (ex: +10)    │
│  · Update lead.score + temp     │
└──────┬───────────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│ Realtime: Broadcast novo lead   │
│  · Sidebar atualiza contagem    │
│  · Tabela reload com novo lead  │
└──────┬───────────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│ HTTP 200 Response               │
│ { success: true, lead_id: "..." }│
└──────────────────────────────────┘
```

### 5.2 Email Campaign Send Flow (Envio de Campanha)

```
┌────────────────────────────────────────────────────────────────────┐
│                EMAIL CAMPAIGN SEND FLOW                            │
└────────────────────────────────────────────────────────────────────┘

Frontend: Usuário clica "Enviar Campanha"
│
├─ Step 1: Seleciona template (HTML preview)
├─ Step 2: Seleciona segmento (ex: "Leads Quentes")
├─ Step 3: Revisa preview
└─ Step 4: Clica "Enviar Agora" ou "Agendar"
       │
       ▼
┌──────────────────────────────┐
│ Criar campaign record        │
│  · state: draft → scheduled  │
│  · scheduled_at: ISO 8601    │
│  · segment_id, template_id   │
└──────┬───────────────────────┘
       │
       │ Se "Enviar Agora" → Edge Function invoke imediato
       │ Se "Agendar" → pg_cron chama no horário
       │
       ▼
┌──────────────────────────────────────────┐
│ Edge Function: send-campaign             │
│ Input: { campaign_id, organization_id }  │
└──────┬───────────────────────────────────┘
       │
       ├─ 1. Query campaign + template
       ├─ 2. Query segment → get leads (RLS filtra by org)
       │     SELECT * FROM leads WHERE segment_rules match
       │     Exemplo: temperature = 'hot' AND status = 'active'
       │
       ├─ 3. Chunk leads into batches (max 500 per MailerSend)
       │
       ├─ 4. Para cada batch:
       │     │
       │     ├─ Montar payload MailerSend
       │     │  {
       │     │    emails: [
       │     │      {
       │     │        to: [{ email: "lead@ex.com" }],
       │     │        template_id: "mailersend_template_uuid",
       │     │        from: "noreply@domain.com",
       │     │        subject: "Olá {{name}}!",
       │     │        metadata: { email_send_id: "es_XXXX" }
       │     │      },
       │     │      ...
       │     │    ]
       │     │  }
       │     │
       │     ├─ POST https://api.mailersend.com/v1/email
       │     │  Headers: X-Mailersend-Key: <api_key>
       │     │
       │     ├─ Response: { message_ids: ["msg_1", "msg_2", ...] }
       │     │
       │     └─ Criar email_sends records (1 por lead)
       │        INSERT INTO email_sends (
       │          lead_id, campaign_id, mailersend_message_id,
       │          status, created_at, organization_id
       │        )
       │
       ├─ 5. Atualizar campaign.state = 'sent'
       ├─ 6. Log na tabela webhooks_events
       └─ 7. Return HTTP 200 { total_sent: N }
           │
           ▼
Frontend: Toast "Campanha enviada para N leads"
Dashboard: Campaign stats atualiza em tempo real (via Realtime)
```

### 5.3 MailerSend Webhook Flow (Processamento de Eventos)

```
┌─────────────────────────────────────────────────────┐
│          MAILERSEND WEBHOOK FLOW                    │
└─────────────────────────────────────────────────────┘

MailerSend detects email.opened event
│
├─ Build webhook payload:
│  {
│    "type": "email.opened",
│    "data": {
│      "message_id": "msg_XXX",
│      "recipient_email": "lead@ex.com",
│      "opened_at": "2024-01-15T10:30:00Z",
│      "user_agent": "..."
│    }
│  }
│
├─ Sign with HMAC-SHA256 (secret key)
│  X-Mailersend-Signature: 8b1a9953c4611296aaf...
│
└─ POST https://plataforma-email.com/api/webhooks/mailersend
   │
   ▼
┌─────────────────────────────────────────────────────┐
│ Edge Function: handle-mailersend-webhook            │
│  · Validar signature (HMAC-SHA256)                  │
│  · Parse JSON body                                  │
└──────┬────────────────────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────────────────┐
│ Switch (event.type)                               │
└──────┬─────────────────────────┬──────────────────┘
       │                         │
       ▼                         ▼
   email.opened          email.clicked
   │                     │
   ├─ Query email_sends  ├─ Query email_sends
   │  WHERE              │  WHERE
   │  mailersend_msg_id  │  mailersend_msg_id
   │                     │
   ├─ Update status      ├─ Update status
   │  opened_at          │  clicked_at
   │                     │
   ├─ Insert event       ├─ Insert event
   │  lead_events        │  lead_events
   │  type: email.opened │  type: email.clicked
   │                     │
   └─ Update campaign    └─ Update campaign
      stats (JSONB)         stats (JSONB)
      open_count++          click_count++


Other events: email.bounced, email.complained, email.unsubscribed
│
├─ Query lead by email
├─ Update lead.status = 'bounced' / 'complained' / 'unsubscribed'
├─ Insert lead_event with reason
└─ Check automation triggers (ex: send recovery email)
   │
   ▼
All paths converge:
│
├─ Insert webhooks_events record (audit log)
├─ Broadcast via Realtime
│  (if dashboard open, stats update live)
└─ Return HTTP 200 { success: true }
```

### 5.4 Lead Scoring Flow (Cálculo de Pontuação)

```
┌──────────────────────────────────────────────────┐
│           LEAD SCORING FLOW                      │
└──────────────────────────────────────────────────┘

Trigger: lead_event INSERTED
│ (qualquer evento: email.opened, form.submitted, page.visited)
│
▼
┌──────────────────────────────────────────────────┐
│ DB Trigger → Edge Function: calculate-scoring   │
│ Input: { lead_id, organization_id, event_type }  │
└──────┬───────────────────────────────────────────┘
       │
       ├─ 1. Query lead
       │     SELECT * FROM leads WHERE id = lead_id
       │
       ├─ 2. Query scoring_rules (org-specific)
       │     SELECT * FROM scoring_rules
       │     WHERE organization_id = org_id
       │       AND (
       │         trigger_event = event_type
       │         OR trigger_event = 'all'
       │       )
       │
       ├─ 3. Calcular novo score
       │  scores = []
       │
       │  Para cada rule:
       │  ├─ IF event_type = 'email.opened' → +10 pts
       │  ├─ IF event_type = 'email.clicked' → +15 pts
       │  ├─ IF source = 'organic_search' → +5 pts
       │  ├─ IF company IN ['Acme', 'TechCorp'] → +20 pts
       │  └─ IF job_title LIKE '%Manager%' → +10 pts
       │
       │  new_score = current_score + SUM(scores)
       │
       ├─ 4. Derivar temperature (baseado em score)
       │  IF score >= 100 → temperature = 'hot'
       │  IF score >= 50 AND score < 100 → 'warm'
       │  IF score < 50 → 'cold'
       │
       ├─ 5. UPDATE lead
       │     UPDATE leads SET
       │       score = new_score,
       │       temperature = new_temp,
       │       last_scored_at = NOW()
       │     WHERE id = lead_id
       │
       ├─ 6. Verificar automation triggers
       │     IF new_temp = 'hot' AND old_temp != 'hot'
       │       → Check automations que triggerem em 'lead.became_hot'
       │       → Queue send welcome email, etc.
       │
       ├─ 7. Update segment memberships (dinâmico)
       │     Recalculate segments que dependem de score/temp
       │
       └─ 8. Broadcast via Realtime
           (Lead card atualiza score em tempo real)
           │
           ▼
         Return HTTP 200 { new_score, temperature }
```

### 5.5 AI Email Generation Flow (Geração de Email com IA)

```
┌──────────────────────────────────────────────────┐
│      AI EMAIL GENERATION FLOW                    │
└──────────────────────────────────────────────────┘

Frontend: User clica "AI Generator" ou "Gerar com IA"
│
▼
┌──────────────────────────────────────────────────┐
│ Modal/Page: AI Email Generator                   │
│  · Select brand (dropdown)                       │
│  · Input prompt (textarea)                       │
│    Exemplo: "Email de boas-vindas para leads,   │
│             mencionar promoção de 20%,           │
│             tom informal"                       │
└──────┬───────────────────────────────────────────┘
       │
       │ User clica "Gerar"
       │
       ▼
┌──────────────────────────────────────────────────┐
│ Frontend: POST /api/templates/ai-generate        │
│ Body: {                                          │
│   brand_id: "brand_123",                         │
│   prompt: "...",                                 │
│   organization_id: "org_123"                     │
│ }                                                │
└──────┬───────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────┐
│ Edge Function: generate-ai-email                 │
│  1. Query brand context (colors, fonts, tone)    │
│  2. Build system prompt                          │
└──────┬───────────────────────────────────────────┘
       │
       ├─ System Prompt Example:
       │  "You are an expert email copywriter.
       │   Brand: [brand_name]
       │   Brand Voice: [formal/casual/technical]
       │   Brand Colors: [color_hex]
       │   Please generate a professional HTML email
       │   based on the following request..."
       │
       ├─ Call Claude API (v3.5 Sonnet)
       │  https://api.anthropic.com/v1/messages
       │  Method: POST
       │  Headers: x-api-key: <CLAUDE_API_KEY>
       │  Body: {
       │    model: "claude-3-5-sonnet-20241022",
       │    max_tokens: 4096,
       │    system: [system_prompt],
       │    messages: [{ role: "user", content: prompt }]
       │  }
       │
       ├─ Response: Claude retorna HTML puro
       │  <!DOCTYPE html>
       │  <html>
       │    <head><style>...</style></head>
       │    <body>
       │      <table role="presentation">
       │        ...content...
       │      </table>
       │    </body>
       │  </html>
       │
       ├─ Extract <subject> tag (if present)
       │  Fallback: generate if missing
       │
       └─ Return HTTP 200
           {
             html: "<!DOCTYPE...>",
             subject: "Bem-vindo!"
           }
           │
           ▼
Frontend: Display preview em iframe
│ · User revê HTML
│ · Opções: Edit manualmente, Regenerate, Usar template
│
▼
User clica "Salvar como Template"
│
▼
Create email_templates record
├─ name: "Welcome Email - Brand"
├─ html: "[HTML gerado]"
├─ subject: "[subject gerado]"
├─ created_by_ai: true
└─ organization_id: "org_123"
│
▼
Toast: "Template salvo com sucesso!"
Template fica disponível no Template Selector
```

### 5.6 CSV Import Flow (Importação de Leads)

```
┌────────────────────────────────────────────────┐
│         CSV IMPORT FLOW                        │
└────────────────────────────────────────────────┘

Frontend: User vai para /leads/import
│
▼
┌────────────────────────────────────────────────┐
│ Step 1: Upload CSV File                        │
│  · Drag-drop ou file input                     │
│  · File validation (size < 50 MB, CSV/XLSX)    │
│  · Usando Papa Parse (client-side)             │
└──────┬─────────────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────────────┐
│ Step 2: Column Mapping                         │
│                                                │
│  CSV header detectado: [email, name, company] │
│                                                │
│  User mapeia para database fields:             │
│  email → email                                 │
│  name → name                                   │
│  company → custom_fields.company               │
│  (novo campo, adiciona dinamicamente)          │
└──────┬─────────────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────────────┐
│ Step 3: Data Preview & Validation              │
│                                                │
│  Show first 10 rows                            │
│  Highlight issues:                             │
│  · Invalid emails (red)                        │
│  · Duplicates (yellow)                         │
│  · Missing required fields (orange)            │
│                                                │
│  User pode fazer pequenos ajustes              │
└──────┬─────────────────────────────────────────┘
       │
       │ User clica "Confirmar & Importar"
       │
       ▼
┌────────────────────────────────────────────────┐
│ Frontend: POST /api/leads/import               │
│ Body: {                                        │
│   rows: [ /* parsed & mapped */ ],             │
│   mapping: { email, name, company... },        │
│   organization_id: "org_123",                  │
│   campaign_id: "camp_456" (opcional)           │
│ }                                              │
└──────┬─────────────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────────────┐
│ Edge Function: import-csv-batch                │
│  · Validar cada row novamente                  │
│  · Clean email addresses (toLowerCase, trim)   │
│  · Chunk: max 1000 por INSERT                  │
└──────┬─────────────────────────────────────────┘
       │
       ├─ For each chunk:
       │  │
       │  ├─ UPSERT INTO leads (
       │  │    organization_id, email, name, custom_fields
       │  │  )
       │  │  VALUES (...)
       │  │  ON CONFLICT (organization_id, email) DO UPDATE SET
       │  │    name = COALESCE(EXCLUDED.name, name),
       │  │    custom_fields = custom_fields || EXCLUDED.custom_fields,
       │  │    updated_at = NOW()
       │  │
       │  ├─ Return { inserted: N, updated: M }
       │  │
       │  └─ For each new lead:
       │     ├─ Create lead_event (type: lead.imported)
       │     ├─ Trigger scoring
       │     └─ Add to campaign if provided
       │
       ├─ Total: X leads inserted, Y updated
       │
       ├─ Save file to Storage (imports bucket)
       │
       └─ Return HTTP 200
           {
             success: true,
             inserted: X,
             updated: Y,
             duplicates_merged: Z,
             errors: [ /* any validation errors */ ]
           }
           │
           ▼
Frontend: Show summary + download report
│ "✓ 1,500 leads importados com sucesso!"
│ "· 1,200 novos"
│ "· 300 atualizados"
│
▼
Toast success → Redirecionar para /leads
Tabela mostra novos leads
```

---

## Arquitetura Multi-Tenancy

### Isolamento por Organization_ID

```
┌──────────────────────────────────────────────────────────┐
│              MULTI-TENANCY ARCHITECTURE                  │
└──────────────────────────────────────────────────────────┘

┌─ Tabela: organizations (raiz)
│  ├─ id: UUID
│  ├─ name: "Acme Corp"
│  ├─ slug: "acme-corp"
│  ├─ custom_domain: "acme.plataforma-email.com" (opcional)
│  ├─ logo_url: URL
│  ├─ billing_plan: "pro"
│  └─ created_at, updated_at

├─ Tabela: users
│  ├─ id: UUID (auth.uid())
│  ├─ organization_id: UUID (foreign key → organizations.id)
│  ├─ email: "user@acme.com"
│  ├─ role: "admin" | "member" | "viewer"
│  └─ RLS: users can only read own user + own org

├─ Tabela: leads
│  ├─ id: UUID
│  ├─ organization_id: UUID ← CHAVE DE ISOLAMENTO
│  ├─ email: "lead@example.com"
│  ├─ name: "João"
│  ├─ status: "active"
│  ├─ score: 75
│  ├─ temperature: "warm"
│  └─ RLS Policy:
│     SELECT * FROM leads
│     WHERE organization_id = auth.user().organization_id
│
├─ Tabela: campaigns
│  ├─ id: UUID
│  ├─ organization_id: UUID ← CHAVE DE ISOLAMENTO
│  ├─ name: "Black Friday 2024"
│  ├─ template_id: UUID
│  ├─ segment_id: UUID
│  └─ RLS Policy: mesmo padrão

├─ Tabela: email_templates
│  ├─ id: UUID
│  ├─ organization_id: UUID ← CHAVE DE ISOLAMENTO
│  ├─ name: "Welcome Template"
│  ├─ html: "..."
│  └─ RLS Policy: mesmo padrão

├─ Tabela: integrations
│  ├─ id: UUID
│  ├─ organization_id: UUID ← CHAVE DE ISOLAMENTO
│  ├─ type: "mailersend" | "meta" | "ga4"
│  ├─ api_key_hash: SHA256(api_key)
│  │  └─ api_key armazenado encriptado no Vault
│  ├─ is_connected: boolean
│  └─ RLS Policy: mesmo padrão

└─ Tabela: api_keys (para integração com leads externos)
   ├─ id: UUID
   ├─ organization_id: UUID ← CHAVE DE ISOLAMENTO
   ├─ key_hash: SHA256(generated_key)
   │  └─ key completa nunca armazenada no DB
   ├─ name: "Landing Page Webhook"
   ├─ created_at
   └─ RLS Policy:
      SELECT * FROM api_keys
      WHERE organization_id = auth.user().organization_id
```

### Fluxo de Autenticação Multi-Org

```
1. User faz login (email + password)
   │
   ├─ Supabase Auth autentica via email
   ├─ Cria JWT com sub = user.id
   └─ Frontend armazena token em localStorage

2. Frontend chama supabase.auth.getSession()
   │
   ├─ Retorna { user, session }
   ├─ user.id = auth.uid()
   └─ session.access_token = JWT (válido por 1 hora)

3. Middleware (app/middleware.ts) intercepta request
   │
   ├─ Valida JWT
   ├─ Extrai sub (user.id)
   └─ Injeta headers: X-User-Id, X-Org-Id

4. Page fetches org_id via RLS
   │
   ├─ SELECT users WHERE id = auth.uid()
   ├─ Retorna organization_id via RLS
   └─ Frontend usa org_id para todas queries

5. Todas as queries automáticamente filtradas
   │
   ├─ SELECT * FROM leads
   │  WHERE organization_id = (
   │    SELECT organization_id FROM users WHERE id = auth.uid()
   │  )
   └─ Database aplica RLS automaticamente

Resultado: Zero chance de data leakage entre orgs
```

### API Keys para Integração Externa

```
┌─────────────────────────────────────────────────────────┐
│     API KEY GENERATION & VALIDATION                     │
└─────────────────────────────────────────────────────────┘

1. Admin vai para Settings > API Keys
2. Clica "Gerar Nova Chave"
3. Backend:
   │
   ├─ Gera 32 bytes aleatórios
   ├─ Codifica em base62: "plat_1a2b3c4d5e6f..."
   ├─ Calcula SHA-256 do valor completo
   ├─ Armazena no DB:
   │  {
   │    organization_id: "org_123",
   │    key_hash: "8b1a9953c4611296aaf...", ← hash
   │    created_at: ISO
   │  }
   └─ Retorna: "plat_1a2b3c4d5e6f..." (só mostra 1x)

4. Frontend mostra em toast:
   "Chave: plat_1a2b3c4d5e6f...
    ⚠ Será ocultada. Copie agora."

5. Integração externa usa:
   POST /api/webhooks/leads
   Headers: x-api-key: plat_1a2b3c4d5e6f...

6. Backend valida:
   │
   ├─ Extrai header
   ├─ Calcula SHA-256 do value
   ├─ Query: SELECT * FROM api_keys WHERE key_hash = ?
   ├─ Se encontrado → org_id = integrations.organization_id
   ├─ Valida rate limit por API key
   └─ Processa request com org_id validado

Segurança:
· Chave nunca armazenada em plain text
· Impossível recuperar chave original (hash one-way)
· Rate limiting por chave
· Audit log de todas as requisições via api_keys
```

---

## Arquitetura de Segurança

### Supabase Auth (GoTrue)

```
┌────────────────────────────────────────────────────┐
│          AUTHENTICATION FLOW                       │
└────────────────────────────────────────────────────┘

User clica "Login"
│
▼
Frontend: Input email + password
│
▼
POST https://tnpzoklepkvktbqouctf.supabase.co/auth/v1/token
Headers: Content-Type: application/json
Body: {
  grant_type: "password",
  email: "user@example.com",
  password: "SecurePass123!"
}

Supabase response:
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600,
  "refresh_token": "long_lived_token...",
  "user": {
    "id": "user_uuid_123",
    "email": "user@example.com",
    "user_metadata": {
      "organization_id": "org_uuid_456",
      "role": "admin"
    }
  }
}

Frontend:
├─ Armazena tokens em Secure Storage (httpOnly cookie + sessionStorage)
├─ Set authUser = session.user
├─ Redirect /dashboard
└─ Todos requests enviados com Authorization header

Backend (Supabase RLS):
├─ Verifica JWT signature
├─ Extrai user.id do token
├─ Aplica RLS policies
└─ Filtra dados por organization_id

Magic Link (Email):
├─ POST /auth/v1/otp
├─ Email enviado com link temporal
├─ Link contém token
├─ User clica → exchange por session
└─ Válido por 24h
```

### RLS Policies (Exemplos Concretos)

```sql
-- Tabela: leads
CREATE POLICY "users_can_read_leads_own_org"
  ON leads
  FOR SELECT
  USING (
    organization_id = (
      SELECT organization_id
      FROM users
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "users_can_insert_leads_own_org"
  ON leads
  FOR INSERT
  WITH CHECK (
    organization_id = (
      SELECT organization_id
      FROM users
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "users_can_update_leads_own_org"
  ON leads
  FOR UPDATE
  USING (
    organization_id = (
      SELECT organization_id
      FROM users
      WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id = (
      SELECT organization_id
      FROM users
      WHERE id = auth.uid()
    )
  );

-- Tabela: campaigns
CREATE POLICY "campaigns_isolated_by_org"
  ON campaigns
  FOR ALL
  USING (
    organization_id = (
      SELECT organization_id
      FROM users
      WHERE id = auth.uid()
    )
  );

-- Tabela: email_templates
CREATE POLICY "templates_isolated_by_org"
  ON email_templates
  FOR ALL
  USING (
    organization_id = (
      SELECT organization_id
      FROM users
      WHERE id = auth.uid()
    )
  );

-- Admin access (opcional, para super-admins)
CREATE POLICY "admin_bypass"
  ON leads
  FOR ALL
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'super_admin'
  );
```

### Webhook Signature Validation

```
┌────────────────────────────────────────────────────┐
│    WEBHOOK SIGNATURE VALIDATION (MailerSend)       │
└────────────────────────────────────────────────────┘

MailerSend Webhook Config:
├─ URL: https://plataforma-email.com/api/webhooks/mailersend
├─ Secret Key: "ms_sk_live_abc123def456..."
├─ Events: email.sent, email.opened, email.clicked, etc.
└─ Retry: 3x com backoff exponencial

MailerSend Server:
├─ Serializa event payload em JSON
├─ Calcula HMAC-SHA256(payload, secret_key)
├─ Converte em hex: "8b1a9953c4611296aaf..."
├─ Headers X-Mailersend-Signature: valor_hex
└─ POST webhook

Backend receives:
├─ Headers:
│  X-Mailersend-Signature: 8b1a9953c4611296aaf...
│
├─ Body: (raw, não parsed)
│  {
│    "type": "email.opened",
│    "data": { ... }
│  }
│
├─ Validação:
│  1. body_string = req.text() [não parse JSON ainda]
│  2. secret = Deno.env.get("MAILERSEND_WEBHOOK_SECRET")
│  3. computed = HMAC-SHA256(body_string, secret)
│  4. IF computed !== X-Mailersend-Signature → return 401
│  5. Agora parse JSON e processa

Segurança:
· Impede replay attacks (signature única por payload)
· Valida integridade do payload
· Impossível forjar webhook sem secret
· Secret armazenado em Supabase Vault (encrypted)
```

### LGPD Compliance

```
┌────────────────────────────────────────────────────┐
│     LGPD COMPLIANCE IMPLEMENTATION                 │
└────────────────────────────────────────────────────┘

Consentimento (Consent):
├─ Tabela: lead_consents
│  ├─ lead_id: UUID
│  ├─ consent_type: "email" | "sms" | "general"
│  ├─ status: "opt-in" | "opt-out"
│  ├─ created_at: ISO
│  └─ source: "form" | "import" | "api"
│
├─ Ao capturar lead:
│  ├─ Obrigatório checkbox de consentimento
│  ├─ Armazenar consent status
│  └─ Log fonte de consentimento
│
└─ Ao enviar email:
   ├─ Verificar consent_status = "opt-in"
   ├─ Incluir unsubscribe link em HTML
   └─ Processa unsubscribe → status = "opt-out"

Data Deletion (Direito ao esquecimento):
├─ Endpoint: DELETE /api/auth/data-deletion
├─ Requer autenticação (user_id)
├─ Workflow:
│  1. Verifica permissão (só user pode deletar seus dados)
│  2. Mark user como deleted (soft delete)
│  3. DELETE FROM leads WHERE organization_id = org_id
│  4. DELETE FROM email_sends WHERE organization_id = org_id
│  5. DELETE FROM campaigns WHERE organization_id = org_id
│  6. INSERT audit_log { action: 'data_deletion', reason: 'LGPD' }
│  7. Send confirmation email
│
└─ Hard delete (após 30 dias):
   └─ Cron job remove registro completamente

Data Portability:
├─ Endpoint: GET /api/export/data
├─ Retorna JSON com:
│  ├─ User profile
│  ├─ All leads (with consent info)
│  ├─ Campaign history
│  └─ Email send log
├─ Format: JSON ou CSV
└─ Zip archive downloadable

Audit Log:
├─ Tabela: audit_logs
│  ├─ user_id: UUID
│  ├─ action: "lead.created" | "campaign.sent" | "data.exported"
│  ├─ resource_id: UUID
│  ├─ timestamp: ISO
│  ├─ ip_address: (anonymized last octet)
│  └─ user_agent: (sanitized)
│
└─ Retenção: 3 anos (compliance)
```

### API Key Hashing

```
API Key lifecycle:

1. Geração (Backend)
   key = generate_random_base62(32)
   key_hash = SHA256(key)
   storage: INSERT { organization_id, key_hash, created_at }

2. Validação (Backend na requisição)
   received_key = headers.get('x-api-key')
   received_hash = SHA256(received_key)
   db_hash = SELECT key_hash FROM api_keys WHERE ...
   IF received_hash === db_hash → validar
   ELSE → 401 Unauthorized

3. Nunca armazenar key em plain text
   Impossível recuperar key original do hash
   Se leaked, hash sozinho não abre conta
```

---

## Arquitetura de Performance

### Estratégias de Escalabilidade

```
┌──────────────────────────────────────────────────────┐
│     PERFORMANCE & SCALABILITY STRATEGY               │
└──────────────────────────────────────────────────────┘

1. DATABASE PARTITIONING

   lead_events (tabela grande, muitos registros)
   ├─ Particionada por mês
   │  lead_events_2024_01
   │  lead_events_2024_02
   │  ...
   │  lead_events_2025_03
   │
   ├─ Benefícios:
   │  ├─ Queries mais rápidas (menos rows por table scan)
   │  ├─ Index menores (mais em cache)
   │  ├─ Arquivamento: drop partição antiga
   │  └─ Paralelismo de query
   │
   └─ Query automática rota para partição correta:
      SELECT * FROM lead_events WHERE created_at > '2025-01-01'
      → acessa lead_events_2025_01, lead_events_2025_02, lead_events_2025_03

2. MATERIALIZED VIEWS (para Analytics)

   view_campaign_stats
   ├─ Pre-computed: COUNT opens, clicks, bounces por campaign
   ├─ Refrescado: nightly cron
   │  REFRESH MATERIALIZED VIEW CONCURRENTLY view_campaign_stats
   │
   └─ Query analytics sem heavy aggregation:
      SELECT * FROM view_campaign_stats
      (em vez de: SELECT count(*) FROM email_sends GROUP BY campaign_id)

3. INDEXING STRATEGY

   Índices criados para queries frequentes:

   ├─ leads
   │  ├─ INDEX (organization_id, status) ← RLS filter + status search
   │  ├─ INDEX (organization_id, temperature) ← Segment queries
   │  ├─ INDEX (organization_id, created_at DESC) ← Recent leads
   │  └─ GIN (custom_fields) ← JSON search
   │
   ├─ lead_events
   │  ├─ INDEX (lead_id, created_at DESC) ← Timeline
   │  ├─ INDEX (event_type, created_at) ← Event filtering
   │  └─ INDEX (organization_id, created_at) ← Date range queries
   │
   ├─ email_sends
   │  ├─ INDEX (campaign_id, status) ← Campaign analytics
   │  ├─ INDEX (mailersend_message_id) ← Webhook lookups
   │  └─ INDEX (created_at DESC) ← Recent sends
   │
   └─ campaigns
      ├─ INDEX (organization_id, state) ← Draft/sent filtering
      └─ INDEX (created_at DESC) ← Recent campaigns

4. CACHING STRATEGY (Frontend)

   React Query / SWR:
   ├─ leads: staleTime 5 min, gcTime 30 min
   ├─ campaigns: staleTime 10 min, gcTime 60 min
   ├─ templates: staleTime 30 min, gcTime 120 min
   ├─ organization data: staleTime 60 min (não muda often)
   │
   └─ refetchOnFocus: false (não irritar user com refetches)

   Invalidation:
   ├─ Criar lead → invalidate(['leads'])
   ├─ Enviar campanha → invalidate(['campaigns', campaign_id])
   └─ Realtime subscription → update optimistically

5. BULK OPERATIONS (para MailerSend)

   Ao enviar campanha para 5.000 leads:
   ├─ Dividir em chunks de 500 (MailerSend max)
   ├─ POST 10x paralelos (ou sequencial com backoff)
   ├─ Total time: ~30-60 segundos
   │
   └─ Alternativa: queue async job
      ├─ POST /api/campaigns/send → return 202 Accepted
      ├─ Job runs em background (Edge Function)
      └─ Frontend polls status ou via Realtime

6. REALTIME SUBSCRIPTIONS (WebSocket)

   ```typescript
   supabase
     .from('email_sends')
     .on('*', payload => {
       // Listen mudanças em email_sends (broadcasts)
       setEmailSends(prev =>
         prev.map(es => es.id === payload.new.id ? payload.new : es)
       )
     })
     .subscribe()
   ```

   Benefícios:
   ├─ Zero polling → economia de bandwidth
   ├─ Live dashboard updates
   ├─ 1-2s latência (vs 30s com polling)
   └─ Supabase auto-scales WebSocket connections

7. CDN & EDGE (Vercel)

   ├─ Static assets (CSS, JS, images): cached globally
   ├─ Dynamic pages: ISR (Incremental Static Regeneration)
   │  revalidate: 3600 (1 hora)
   │
   └─ API routes: Vercel serverless (edge in future)

8. DATABASE QUERY OPTIMIZATION

   ❌ N+1 Problem:
      for lead in leads:
        segments = db.query('SELECT * FROM segments WHERE lead_id = ?')

   ✅ Single query:
      SELECT l.*, s.* FROM leads l
      LEFT JOIN lead_segments ls ON l.id = ls.lead_id
      LEFT JOIN segments s ON ls.segment_id = s.id

9. RATE LIMITING (Edge Functions)

   Por API key:
   ├─ 100 requests/minute (leads webhook)
   ├─ 10 requests/minute (campaign send)
   └─ Store counter em Supabase (Redis depois se needed)

10. MONITORING & OBSERVABILITY

    ├─ Vercel Analytics: Core Web Vitals
    ├─ Supabase Logs: Slow queries, RLS errors
    ├─ Custom logging: CloudFlare Logpush (ou Datadog)
    └─ Alertas: SlowQuery > 2s, ErrorRate > 1%
```

---

## Coexistência com Projetos Existentes

### Mesmo Supabase, Múltiplos Projetos

```
Projeto: tnpzoklepkvktbqouctf (sa-east-1)
│
├─ Tracking Dashboard (existente)
│  ├─ Tabelas: organizations (hardcoded), events, conversions
│  ├─ Frontend: React (legado)
│  └─ Auth: Nenhuma (público)
│
├─ Tracking Avançado (existente)
│  ├─ Tabelas: lead_journey, analytics_enhanced
│  ├─ Deploy: Vercel
│  └─ Auth: Token simples
│
└─ Plataforma de Email (novo)
   ├─ Tabelas: organizations (dinâmico), users, leads, campaigns
   ├─ Frontend: Next.js 14+ (novo)
   └─ Auth: Supabase Auth (real auth)
```

### Schema Integration

```sql
-- Tracking (legado) usa tabelas estáticas
CREATE TABLE organizations (
  id INT PRIMARY KEY,  -- hardcoded: 1=Acme, 2=TechCorp, ...
  name VARCHAR,
  slug VARCHAR UNIQUE
);

-- Plataforma (novo) usa tabelas dinâmicas
CREATE TABLE organizations (
  id UUID PRIMARY KEY,
  name VARCHAR,
  slug VARCHAR,
  created_at TIMESTAMP,
  billing_plan VARCHAR
);

-- Solução: UNION ou VIEW
-- Todos os dados podem coexistir

-- Tabelas compartilhadas (leads)
-- Tracking: leads armazenados em table_per_company
-- Plataforma: leads centralizados com organization_id

-- Estratégia: Mirror dados do tracking via trigger ou job
-- INSERT INTO leads_new (organization_id, email, ...)
-- SELECT 1 as organization_id, email, ... FROM acme_leads
```

### Componentes Copiados (não importados)

```
Estratégia: Copy-paste, não npm import

Razão:
├─ Evitar dependência entre projetos
├─ Permitir evolução independente
├─ Facilitar isolamento se projeto legado descontinuado
└─ Cada projeto pode customizar seus componentes

Exemplo: Button component
├─ Tracking: src/components/ui/Button.tsx
├─ Plataforma: components/ui/button.tsx (shadcn)
├─ Diferente versão, mesmo visual

Quando copiar:
1. Abrir existing-assets.md
2. Verificar se componente existe
3. Copy código relevante
4. Adaptar imports + tipos
5. Update existing-assets.md com nova referência
```

---

## Deployment & CI/CD

### Git Workflow

```
┌────────────────────────────────────────────────────┐
│           GIT WORKFLOW                             │
└────────────────────────────────────────────────────┘

main (production)
│
├─ Commits apenas via squash merge de PRs
├─ Proteção: require review + tests pass
├─ Deploy: automático via Vercel (main → production)
│
▼
develop (staging)
│
├─ Onde features são testadas
├─ Deploy: manual via Vercel (develop → staging.*)
│
▼
feature/* (local)
│
├─ feature/lead-scoring
├─ feature/campaign-editor
├─ feature/ai-generator
│
└─ Developer checkout:
   git checkout -b feature/lead-scoring develop
   ... commita ...
   git push origin feature/lead-scoring
   (abre PR para develop)

PR Workflow:
├─ Atribui reviewers (2+ pessoas)
├─ CI roda:
│  ├─ npm run lint
│  ├─ npm run test
│  ├─ npm run build
│  └─ Supabase migrations check
├─ Code review
├─ Aprovação → squash merge
└─ Auto-deploy para develop (se merge para develop)
   Auto-deploy para production (se merge para main)
```

### Vercel Deployment

```
┌────────────────────────────────────────────────────┐
│        VERCEL DEPLOYMENT FLOW                      │
└────────────────────────────────────────────────────┘

Push to main
│
▼ (via GitHub app integration)
┌────────────────────────────────────────────────────┐
│ Vercel Build                                       │
│  ├─ npm install                                    │
│  ├─ npm run build                                  │
│  │  ├─ Compila TypeScript
│  │  ├─ Otimiza Next.js bundles
│  │  └─ Gera .next/
│  │
│  ├─ Validação:
│  │  ├─ Build time < 3 min
│  │  ├─ Bundle size < 500 KB
│  │  └─ No errors
│  │
│  └─ Deploy to Edge Network
│     ├─ Upload bundle para CDN global
│     ├─ Propagate 150+ edge locations
│     └─ Instant global availability
│
▼
┌────────────────────────────────────────────────────┐
│ Post-Deployment                                    │
│  ├─ Health check: GET /api/health → 200 OK       │
│  ├─ Analytics: pageviews, errors, latency         │
│  ├─ Monitoring: Sentry (opcional)                 │
│  └─ Slack notification: "Deploy successful"       │
│
└─ Live on production
   └─ plataforma-email.com
```

### Supabase Migrations

```
Workflow de migrations:

Local development:
├─ Faz schema change
├─ supabase db push (aplica local)
├─ Verifica resultado
└─ supabase migration new add_scoring_column
   └─ Cria file: supabase/migrations/XXX_add_scoring_column.sql

Staging:
├─ git push feature → PR
├─ CI roda: supabase migration check
├─ Aprovação → merge develop
├─ Manual: supabase migration deploy (staging branch)
└─ Testa

Production:
├─ Aprova PR main
├─ Merge → CI roda test migrations
├─ Deploy: supabase migration deploy (production)
   └─ Executa em background, zero downtime
└─ Monitora: SELECT * FROM migrations (audit)
```

### Environment Management

```
.env.local (desenvolvimento local)
├─ NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
├─ NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
├─ SUPABASE_SERVICE_KEY=eyJ...
└─ CLAUDE_API_KEY=sk-...

.env.staging (teste)
├─ NEXT_PUBLIC_SUPABASE_URL=https://staging-proj.supabase.co
├─ Staging anon key
├─ Staging service key
└─ Staging Claude key (ou limite de uso)

.env.production (produção)
├─ NEXT_PUBLIC_SUPABASE_URL=https://tnpzoklepkvktbqouctf.supabase.co
├─ Production anon key (public)
├─ SUPABASE_SERVICE_KEY=eyJ... (Vercel secret)
├─ CLAUDE_API_KEY=sk-... (Vercel secret)
├─ STRIPE_SECRET_KEY=sk_live_... (Vercel secret)
└─ MAILERSEND_API_KEY=... (Vercel secret)

Vercel Dashboard:
├─ Settings → Environment Variables
├─ Override per deployment:
│  ├─ Production
│  ├─ Staging
│  └─ Preview
└─ Rotate secrets periodicamente
```

---

## Diagrama Completo (Resumo Visual)

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                     PLATAFORMA DE EMAIL - INFRAESTRUTURA COMPLETA                 │
│                                                                                    │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │ Frontend: Next.js 14+ (Vercel)                                              │ │
│  │ ├─ Route Groups: (auth), (dashboard)                                        │ │
│  │ ├─ Auth Middleware: Verifica JWT → org_id                                   │ │
│  │ ├─ State: Zustand (UI) + React Query (server)                              │ │
│  │ ├─ Componentes: shadcn/ui + domain-specific                                │ │
│  │ └─ Data Fetching: Supabase client (RLS automático)                         │ │
│  └────────────┬──────────────────────────────────────────────────────────────────┘ │
│               │ HTTPS                                                              │
│  ┌────────────▼──────────────────────────────────────────────────────────────────┐ │
│  │ Backend: Supabase (tnpzoklepkvktbqouctf, sa-east-1)                         │ │
│  │                                                                               │ │
│  │ ├─ PostgreSQL + RLS Policies (isolamento por org)                           │ │
│  │ ├─ Supabase Auth (JWT + refresh tokens)                                     │ │
│  │ ├─ Realtime (WebSocket subscriptions)                                       │ │
│  │ ├─ Storage (templates, imports, attachments)                                │ │
│  │ │                                                                             │ │
│  │ ├─ Edge Functions (Deno serverless):                                        │ │
│  │ │  ├─ handle-mailersend-webhook (validação + update)                      │ │
│  │ │  ├─ send-campaign (bulk email via MailerSend API)                        │ │
│  │ │  ├─ generate-ai-email (Claude API)                                        │ │
│  │ │  ├─ import-csv-batch (upsert em bulk)                                     │ │
│  │ │  └─ calculate-scoring (trigger on lead_event)                             │ │
│  │ │                                                                             │ │
│  │ ├─ pg_cron (background jobs):                                               │ │
│  │ │  ├─ sync-analytics (6h)                                                   │ │
│  │ │  ├─ consolidate-events (daily 02:00 BRT)                                  │ │
│  │ │  └─ cleanup-webhooks (weekly)                                             │ │
│  │ │                                                                             │ │
│  │ └─ Vault (secrets encriptados)                                              │ │
│  │    ├─ MailerSend API keys                                                   │ │
│  │    ├─ Meta/WhatsApp tokens                                                  │ │
│  │    ├─ Claude API key                                                        │ │
│  │    └─ Google Analytics credentials                                          │ │
│  └────────────┬──────────────────────────────────────────────────────────────────┘ │
│               │                                                                    │
│    ┌──────────┼──────────────┬────────────────┬──────────────┐                   │
│    │          │              │                │              │                   │
│    ▼          ▼              ▼                ▼              ▼                   │
│  ┌──────┐ ┌────────────┐ ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │GA4  │ │ MailerSend │ │ Meta     │  │ WhatsApp │  │ n8n      │             │
│  │      │ │            │ │ Conv API │  │ Business │  │          │             │
│  │      │ │ · Bulk API │ │          │  │ API      │  │ VPS      │             │
│  │      │ │ · Webhooks │ │          │  │          │  │ 187.77   │             │
│  │      │ │            │ │          │  │          │  │          │             │
│  └──────┘ └────────────┘ └──────────┘  └──────────┘  └──────────┘             │
│                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │ Versioning & CI/CD                                                          │ │
│  │                                                                               │ │
│  │ GitHub (main/develop + feature branches)                                    │ │
│  │   → Vercel (auto-deploy)                                                    │ │
│  │   → Supabase (migrations)                                                   │ │
│  │   → Monitoring (Sentry, Vercel Analytics)                                   │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                    │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## Conclusão

Esta arquitetura implementa uma **plataforma de email escalável, segura e multi-tenant** usando:

- **Frontend:** Next.js 14+ App Router com Zustand + React Query
- **Backend:** Supabase BaaS (PostgreSQL + RLS + Edge Functions)
- **Segurança:** Multi-tenancy via RLS, API key hashing, webhook validation
- **Performance:** Particionamento, índices, caching, Realtime
- **Integração:** MailerSend (email), n8n (automações), Claude (IA), GA4 (analytics)
- **DevOps:** Git workflow, Vercel auto-deploy, Supabase migrations

**Zero código backend customizado** — toda lógica rodaem Edge Functions serverless.
