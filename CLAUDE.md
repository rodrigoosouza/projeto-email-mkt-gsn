# CLAUDE.md — Plataforma de Email Marketing

## Projeto
SaaS multi-tenant de email marketing para substituir RD Station.
Clientes: Templum, Evolutto, Orbit.

## Stack
- **Frontend:** Next.js 14+ (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **Backend/DB:** Supabase (PostgreSQL + Auth + Realtime + Storage + Edge Functions)
- **Email:** MailerSend (transacional + bulk)
- **Automacoes:** n8n (self-hosted)
- **Deploy:** Vercel

## Convencoes

### Idioma
- **Codigo:** Ingles (variaveis, funcoes, componentes, tipos)
- **UI:** Portugues (interface do usuario)
- **Documentacao:** Portugues
- **Commits:** Conventional Commits em portugues

### Estrutura
```
src/
  app/           # Next.js App Router pages
    (auth)/      # Paginas de autenticacao (login, registro)
    (dashboard)/ # Paginas protegidas com sidebar
    api/         # API routes
    auth/        # Auth callbacks
  components/
    ui/          # shadcn/ui components
    layout/      # Sidebar, Header
    shared/      # Componentes reutilizaveis
    leads/       # Componentes de leads
    campaigns/   # Componentes de campanhas
    templates/   # Componentes de templates
  lib/
    supabase/    # Clientes Supabase (client, server, admin, middleware)
    types.ts     # Tipos TypeScript centrais
    constants.ts # Constantes e configuracoes
    utils.ts     # Utilidades (cn, formatters)
  hooks/         # React hooks customizados
  contexts/      # React contexts (organization)
supabase/
  migrations/    # SQL migrations (numeradas)
```

### Padroes
- Server Components por padrao, Client Components apenas quando necessario
- RLS (Row Level Security) em todas as tabelas — filtra por `organization_id`
- `useOrganizationContext()` para acessar org atual em client components
- `createClient()` de `@/lib/supabase/server` para server components
- Todos os dados filtrados automaticamente por org via RLS
- shadcn/ui para componentes de UI — nao criar componentes primitivos do zero
- `cn()` de `@/lib/utils` para merge de classes CSS
- React Hook Form + Zod para validacao de formularios
- TanStack Table para tabelas de dados

### Multi-tenancy
- Schema compartilhado com `org_id` em todas as tabelas
- RLS filtra automaticamente por organizacao do usuario logado
- Seletor de org no sidebar para usuarios com acesso a multiplas orgs
- `organization_members` controla acesso (roles: admin, editor, viewer)

### Supabase
- Projeto: `tnpzoklepkvktbqouctf.supabase.co` (sa-east-1)
- Dados GTM existentes — nao mexer nas tabelas `events`, `conversions`, `orbit_gestao_*`
- Usar `@supabase/ssr` para clientes (nao `@supabase/auth-helpers-nextjs`)

### Antes de criar componentes
- Verificar `.skills/plataforma-email/references/existing-assets.md` para componentes reaproveitaveis
- 29 componentes do tracking-dashboard podem ser adaptados

### Meta Ads Integration
- **App Meta:** App Orbit (ID: 749222631460522)
- **Token:** Long-lived user token (60 dias, renovar antes de expirar)
- **Ad Account Orbit:** `act_866448806166587` (conta principal com campanhas)
- **Tabelas Supabase:**
  - `meta_ad_accounts` — contas de anuncio conectadas por org (token, ad_account_id)
  - `meta_campaign_insights` — metricas diarias por campanha (impressoes, cliques, spend, leads, CPL)
  - `meta_adsets` — conjuntos de anuncio
  - `meta_ads` — anuncios individuais
  - `meta_adset_insights` — metricas diarias por adset
  - `meta_ad_insights` — metricas diarias por anuncio
  - `meta_sync_logs` — log de sincronizacao
- **Dashboard:** `/ads/dashboard` — dashboard interativo com filtros por dia e campanha
- **RLS:** Todas as tabelas meta_* tem RLS habilitado por org_id
- **API Meta:** Graph API v22.0, endpoint insights com `time_increment=1` para dados diarios
- **Organizacoes no Supabase:**
  - Templum: `d7a3cbaa-6f5c-4f21-9326-03d9c30a6c7b`
  - Evolutto: `657d0237-5a96-4dc4-bc9a-a3638278de04`
  - Orbit Gestao: `aa652b9a-5a03-4c59-be37-8a81cd6ecdb9`

### Git
- Branch strategy: main -> develop -> feature/xxx
- Nunca commitar .env.local ou credentials/
