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

### Git
- Branch strategy: main -> develop -> feature/xxx
- Nunca commitar .env.local ou credentials/
