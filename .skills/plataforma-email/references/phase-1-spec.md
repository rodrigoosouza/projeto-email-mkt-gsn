# Plataforma Email - Especificação de Implementação Phase 1

**Versão:** 1.0
**Data:** 2026-03-05
**Escopo:** MVP de Leads + Email (6 sprints, 5 semanas)
**Linguagem:** Next.js 14+ App Router
**Stack:** Supabase + MailerSend + Tailwind + shadcn/ui

---

## Sumário Executivo

Phase 1 implementa o MVP completo de gerenciamento de leads e envio de emails. O sistema permitirá:
- **Leads Module:** Criar, importar (CSV), filtrar, segmentar e marcar leads
- **Email Templates:** Galeria de templates, editor Unlayer, gerador IA
- **Campaigns:** Criar campanhas, configurar segmentos, agendar e enviar, rastrear métricas
- **Dashboard:** Visão geral de KPIs, campanhas recentes, leads recentes

Este documento é o **contrato de implementação** entre agentes IA e o sistema. Cada tarefa inclui:
- Arquivos envolvidos (caminhos exatos)
- Dependências (o que precisa existir antes)
- Componentes reaproveitados (cópia de projetos existentes)
- Contrato de dados (tipos TypeScript)
- Lógica principal (pseudocódigo + notas)
- Critérios de aceite (testes e validações)

---

## Arquitetura Geral Phase 1

### Layout de Pastas

```
/plataforma-email
├── .skills/
│   └── plataforma-email/
│       ├── references/         ← este arquivo
│       └── tasks/              ← tarefas geradas via parser
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   └── magic-link/
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx        (Home - KPIs)
│   │   │   ├── leads/
│   │   │   ├── segments/
│   │   │   ├── templates/
│   │   │   ├── campaigns/
│   │   │   └── settings/
│   │   ├── api/
│   │   │   ├── webhooks/
│   │   │   ├── auth/
│   │   │   └── [...]
│   │   ├── middleware.ts
│   │   └── globals.css
│   ├── components/
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── leads/
│   │   ├── templates/
│   │   ├── campaigns/
│   │   ├── ui/              ← shadcn/ui (copy from tracking-dashboard)
│   │   └── shared/
│   ├── lib/
│   │   ├── supabase/
│   │   ├── mailersend/
│   │   ├── types.ts
│   │   ├── constants.ts
│   │   └── utils.ts
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useOrganization.ts
│   │   └── [...]
│   └── styles/
├── supabase/
│   ├── migrations/
│   │   ├── 001_core_tables.sql
│   │   └── 006_api_keys.sql
│   └── edge-functions/
│       └── handle-mailersend-webhook/
├── public/
├── .env.example
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

### Fluxo de Dados Principal

```
Lead Webhook → POST /api/webhooks/leads → Supabase (leads table)
                ↓
            Tags + Status
                ↓
            Segment Rules → Dynamic Segments
                ↓
            Campaign Selection → Email Template
                ↓
            MailerSend API → Send Email
                ↓
            Event Webhook ← MailerSend → Edge Function
                ↓
            Update Campaign Stats
```

### Padrões de Autenticação

1. **Supabase Auth:** Email/password + magic link
2. **Row-Level Security (RLS):** Filtra dados por `org_id`
3. **API Keys:** Para webhooks (público, mas validado via header)
4. **JWT:** Para endpoints autenticados (cookies seguras)

---

## Sprint 1: Foundation (1 semana)

### Sprint 1.1: Project Scaffold

**Arquivos envolvidos:**
- `package.json` (nova criação)
- `tsconfig.json` (nova criação)
- `next.config.js` (nova criação)
- `tailwind.config.ts` (nova criação)
- `postcss.config.js` (nova criação)
- `.env.example` (nova criação)
- `src/app/globals.css` (nova criação)
- `src/app/layout.tsx` (nova criação)
- `src/lib/types.ts` (nova criação)

**Dependências:** Node.js 18+, npm/yarn

**Componentes reaproveitados:** Nenhum nesta tarefa

**Contrato de dados:**
```typescript
// src/lib/types.ts

// ============= ENUMS =============
export enum UserRole {
  ADMIN = 'admin',
  EDITOR = 'editor',
  VIEWER = 'viewer',
}

export enum LeadStatus {
  ACTIVE = 'active',
  UNSUBSCRIBED = 'unsubscribed',
  BOUNCED = 'bounced',
  COMPLAINED = 'complained',
}

export enum CampaignStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  SENDING = 'sending',
  SENT = 'sent',
  PAUSED = 'paused',
  FAILED = 'failed',
}

export enum SegmentType {
  STATIC = 'static',
  DYNAMIC = 'dynamic',
}

export enum OperatorType {
  EQUALS = 'equals',
  CONTAINS = 'contains',
  STARTS_WITH = 'starts_with',
  ENDS_WITH = 'ends_with',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  IS_EMPTY = 'is_empty',
  IS_NOT_EMPTY = 'is_not_empty',
}

// ============= ORGANIZATIONS =============
export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  website: string | null;
  sender_email: string | null;
  sender_name: string | null;
  custom_domain: string | null;
  domain_verified: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
}

// ============= USERS =============
export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface OrganizationMember {
  id: string;
  org_id: string;
  user_id: string;
  role: UserRole;
  created_at: string;
  user?: User;
  organization?: Organization;
}

// ============= LEADS =============
export interface Lead {
  id: string;
  org_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  company: string | null;
  position: string | null;
  status: LeadStatus;
  score: number; // 0-100
  custom_fields: Record<string, any>;
  source: string | null; // 'manual', 'csv', 'webhook', 'api'
  external_id: string | null; // Para integração externa
  created_at: string;
  updated_at: string;
  last_contacted_at: string | null;
}

export interface LeadTag {
  id: string;
  org_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface LeadTagAssignment {
  id: string;
  lead_id: string;
  tag_id: string;
  created_at: string;
}

// ============= SEGMENTS =============
export interface Segment {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  type: SegmentType;
  rules: SegmentRule[] | null; // null para STATIC
  lead_count: number;
  created_at: string;
  updated_at: string;
}

export interface SegmentRule {
  id: string;
  segment_id: string;
  field: string; // 'email', 'first_name', 'score', 'status', etc.
  operator: OperatorType;
  value: any;
  logic: 'AND' | 'OR'; // Para múltiplas regras
}

export interface SegmentMembership {
  id: string;
  segment_id: string;
  lead_id: string;
  created_at: string;
}

// ============= TEMPLATES =============
export interface EmailTemplate {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  category: string; // 'welcome', 'promotional', 'abandoned', 'educational', 'other'
  subject: string;
  html_content: string;
  unlayer_json: any; // Dados brutos do Unlayer (editor)
  preview_text: string | null;
  is_ai_generated: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
}

// ============= CAMPAIGNS =============
export interface Campaign {
  id: string;
  org_id: string;
  name: string;
  status: CampaignStatus;
  template_id: string;
  segment_id: string;
  total_leads: number;
  sent_at: string | null;
  scheduled_for: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
  template?: EmailTemplate;
  segment?: Segment;
}

export interface CampaignStats {
  id: string;
  campaign_id: string;
  total_sent: number;
  total_delivered: number;
  total_opened: number;
  total_clicked: number;
  total_bounced: number;
  total_complained: number;
  updated_at: string;
}

export interface CampaignSendLog {
  id: string;
  campaign_id: string;
  lead_id: string;
  email: string;
  status: 'pending' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complained';
  mailersend_message_id: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  bounced_at: string | null;
  complained_at: string | null;
  error_message: string | null;
  updated_at: string;
}

// ============= API KEYS =============
export interface ApiKey {
  id: string;
  org_id: string;
  name: string;
  key_hash: string; // SHA-256 hash
  created_at: string;
  last_used_at: string | null;
  created_by: string;
}

// ============= REQUESTS/RESPONSES =============
export interface CreateLeadPayload {
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  company?: string;
  position?: string;
  score?: number;
  custom_fields?: Record<string, any>;
  source?: string;
  external_id?: string;
  tags?: string[]; // tag names
}

export interface CreateCampaignPayload {
  name: string;
  template_id: string;
  segment_id: string;
  scheduled_for?: string; // ISO timestamp (opcional para agendamento)
}

export interface EventWebhookPayload {
  event: string; // 'email.sent', 'email.delivered', 'email.opened', etc.
  data: {
    message_id: string;
    email: string;
    timestamp: string;
    [key: string]: any;
  };
}
```

**Lógica principal:**

1. Iniciar projeto Next.js 14 com `create-next-app`:
   ```bash
   npx create-next-app@latest plataforma-email --typescript --tailwind --eslint
   ```

2. Instalar dependências adicionais:
   ```bash
   npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
   npm install @supabase/auth-ui-react @supabase/auth-ui-shared
   npm install @hookform/resolvers react-hook-form zod
   npm install date-fns
   npm install lucide-react
   npm install axios
   npm install class-variance-authority clsx tailwind-merge
   npm install -D @types/node @types/react @types/react-dom typescript
   ```

3. Configurar `tsconfig.json` com paths:
   ```json
   {
     "compilerOptions": {
       "baseUrl": ".",
       "paths": {
         "@/*": ["./src/*"],
         "@/components/*": ["./src/components/*"],
         "@/lib/*": ["./src/lib/*"],
         "@/hooks/*": ["./src/hooks/*"]
       }
     }
   }
   ```

4. Criar `.env.example`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE_KEY=
   MAILERSEND_API_KEY=
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

5. Copiar `globals.css` do tracking-dashboard (ou criar novo com Tailwind defaults)

6. Criar `src/app/layout.tsx` com estrutura básica

**Critério de aceite:**
- [ ] Projeto Next.js funciona com `npm run dev`
- [ ] Páginas carregam sem erros
- [ ] TypeScript compila sem warnings
- [ ] Tailwind está funcionando (classes CSS aplicadas)
- [ ] `.env.example` contém todas as variáveis necessárias

---

### Sprint 1.2: Migrations (Core Tables + API Keys)

**Arquivos envolvidos:**
- `supabase/migrations/001_core_tables.sql`
- `supabase/migrations/006_api_keys.sql`

**Dependências:** Projeto Supabase criado, acesso ao dashboard

**Componentes reaproveitados:** Nenhum

**Contrato de dados:** Tipos definidos em Sprint 1.1

**Lógica principal:**

Migration 001 cria as tabelas principais com RLS:

```sql
-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ==================== ORGANIZATIONS ====================
create table organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  logo_url text,
  website text,
  sender_email text,
  sender_name text,
  custom_domain text unique,
  domain_verified boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  created_by uuid not null
);

-- RLS for organizations
alter table organizations enable row level security;
create policy "Users can view their organizations"
  on organizations for select
  using (
    exists(
      select 1 from organization_members om
      where om.org_id = organizations.id
        and om.user_id = auth.uid()
    )
  );

-- ==================== USERS ====================
create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  name text,
  avatar_url text,
  created_at timestamp with time zone default now()
);

alter table users enable row level security;
create policy "Users can view their own data"
  on users for select
  using (id = auth.uid());

-- ==================== ORGANIZATION_MEMBERS ====================
create table organization_members (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role text not null check (role in ('admin', 'editor', 'viewer')),
  created_at timestamp with time zone default now(),
  unique(org_id, user_id)
);

alter table organization_members enable row level security;
create policy "Users can view members of their organizations"
  on organization_members for select
  using (
    exists(
      select 1 from organization_members om
      where om.org_id = organization_members.org_id
        and om.user_id = auth.uid()
    )
  );

create policy "Admins can manage members"
  on organization_members for all
  using (
    exists(
      select 1 from organization_members om
      where om.org_id = organization_members.org_id
        and om.user_id = auth.uid()
        and om.role = 'admin'
    )
  );

-- ==================== LEADS ====================
create table leads (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  email text not null,
  first_name text,
  last_name text,
  phone text,
  company text,
  position text,
  status text not null check (status in ('active', 'unsubscribed', 'bounced', 'complained'))
    default 'active',
  score integer check (score >= 0 and score <= 100) default 0,
  custom_fields jsonb default '{}'::jsonb,
  source text,
  external_id text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  last_contacted_at timestamp with time zone,
  unique(org_id, email)
);

create index leads_org_id_idx on leads(org_id);
create index leads_status_idx on leads(status);
create index leads_score_idx on leads(score);
create index leads_external_id_idx on leads(external_id);

alter table leads enable row level security;
create policy "Users can access leads from their org"
  on leads for all
  using (
    exists(
      select 1 from organization_members
      where org_id = leads.org_id and user_id = auth.uid()
    )
  );

-- ==================== LEAD_TAGS ====================
create table lead_tags (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  color text not null,
  created_at timestamp with time zone default now(),
  unique(org_id, name)
);

alter table lead_tags enable row level security;
create policy "Users can access tags from their org"
  on lead_tags for all
  using (
    exists(
      select 1 from organization_members
      where org_id = lead_tags.org_id and user_id = auth.uid()
    )
  );

-- ==================== LEAD_TAG_ASSIGNMENTS ====================
create table lead_tag_assignments (
  id uuid primary key default uuid_generate_v4(),
  lead_id uuid not null references leads(id) on delete cascade,
  tag_id uuid not null references lead_tags(id) on delete cascade,
  created_at timestamp with time zone default now(),
  unique(lead_id, tag_id)
);

create index lead_tag_assignments_lead_id_idx on lead_tag_assignments(lead_id);
create index lead_tag_assignments_tag_id_idx on lead_tag_assignments(tag_id);

alter table lead_tag_assignments enable row level security;
create policy "Users can manage tags on their leads"
  on lead_tag_assignments for all
  using (
    exists(
      select 1 from leads l
        join organization_members om on l.org_id = om.org_id
      where l.id = lead_tag_assignments.lead_id
        and om.user_id = auth.uid()
    )
  );

-- ==================== SEGMENTS ====================
create table segments (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  description text,
  type text not null check (type in ('static', 'dynamic')),
  rules jsonb, -- null para STATIC, array de rules para DYNAMIC
  lead_count integer default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(org_id, name)
);

create index segments_org_id_idx on segments(org_id);
create index segments_type_idx on segments(type);

alter table segments enable row level security;
create policy "Users can access segments from their org"
  on segments for all
  using (
    exists(
      select 1 from organization_members
      where org_id = segments.org_id and user_id = auth.uid()
    )
  );

-- ==================== SEGMENT_MEMBERSHIPS ====================
create table segment_memberships (
  id uuid primary key default uuid_generate_v4(),
  segment_id uuid not null references segments(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  created_at timestamp with time zone default now(),
  unique(segment_id, lead_id)
);

create index segment_memberships_segment_id_idx on segment_memberships(segment_id);
create index segment_memberships_lead_id_idx on segment_memberships(lead_id);

alter table segment_memberships enable row level security;
create policy "Users can manage segments on their leads"
  on segment_memberships for all
  using (
    exists(
      select 1 from segments s
        join organization_members om on s.org_id = om.org_id
      where s.id = segment_memberships.segment_id
        and om.user_id = auth.uid()
    )
  );

-- ==================== EMAIL_TEMPLATES ====================
create table email_templates (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  description text,
  category text,
  subject text not null,
  html_content text not null,
  unlayer_json jsonb,
  preview_text text,
  is_ai_generated boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  created_by uuid not null references users(id) on delete cascade,
  unique(org_id, name)
);

create index email_templates_org_id_idx on email_templates(org_id);
create index email_templates_category_idx on email_templates(category);

alter table email_templates enable row level security;
create policy "Users can access templates from their org"
  on email_templates for all
  using (
    exists(
      select 1 from organization_members
      where org_id = email_templates.org_id and user_id = auth.uid()
    )
  );

-- ==================== CAMPAIGNS ====================
create table campaigns (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  status text not null check (status in ('draft', 'scheduled', 'sending', 'sent', 'paused', 'failed'))
    default 'draft',
  template_id uuid not null references email_templates(id) on delete cascade,
  segment_id uuid not null references segments(id) on delete cascade,
  total_leads integer default 0,
  sent_at timestamp with time zone,
  scheduled_for timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  created_by uuid not null references users(id) on delete cascade
);

create index campaigns_org_id_idx on campaigns(org_id);
create index campaigns_status_idx on campaigns(status);
create index campaigns_template_id_idx on campaigns(template_id);
create index campaigns_segment_id_idx on campaigns(segment_id);

alter table campaigns enable row level security;
create policy "Users can access campaigns from their org"
  on campaigns for all
  using (
    exists(
      select 1 from organization_members
      where org_id = campaigns.org_id and user_id = auth.uid()
    )
  );

-- ==================== CAMPAIGN_STATS ====================
create table campaign_stats (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid not null unique references campaigns(id) on delete cascade,
  total_sent integer default 0,
  total_delivered integer default 0,
  total_opened integer default 0,
  total_clicked integer default 0,
  total_bounced integer default 0,
  total_complained integer default 0,
  updated_at timestamp with time zone default now()
);

create index campaign_stats_campaign_id_idx on campaign_stats(campaign_id);

alter table campaign_stats enable row level security;
create policy "Users can view stats for their campaigns"
  on campaign_stats for select
  using (
    exists(
      select 1 from campaigns c
        join organization_members om on c.org_id = om.org_id
      where c.id = campaign_stats.campaign_id
        and om.user_id = auth.uid()
    )
  );

-- ==================== CAMPAIGN_SEND_LOGS ====================
create table campaign_send_logs (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  email text not null,
  status text not null check (status in ('pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained'))
    default 'pending',
  mailersend_message_id text,
  sent_at timestamp with time zone,
  delivered_at timestamp with time zone,
  opened_at timestamp with time zone,
  clicked_at timestamp with time zone,
  bounced_at timestamp with time zone,
  complained_at timestamp with time zone,
  error_message text,
  updated_at timestamp with time zone default now()
);

create index campaign_send_logs_campaign_id_idx on campaign_send_logs(campaign_id);
create index campaign_send_logs_lead_id_idx on campaign_send_logs(lead_id);
create index campaign_send_logs_status_idx on campaign_send_logs(status);
create index campaign_send_logs_mailersend_message_id_idx on campaign_send_logs(mailersend_message_id);

alter table campaign_send_logs enable row level security;
create policy "Users can view send logs for their campaigns"
  on campaign_send_logs for all
  using (
    exists(
      select 1 from campaigns c
        join organization_members om on c.org_id = om.org_id
      where c.id = campaign_send_logs.campaign_id
        and om.user_id = auth.uid()
    )
  );

-- ==================== FUNCTIONS ====================

-- Update updated_at automatically
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger organizations_updated_at before update on organizations
  for each row execute function update_updated_at();

create trigger leads_updated_at before update on leads
  for each row execute function update_updated_at();

create trigger segments_updated_at before update on segments
  for each row execute function update_updated_at();

create trigger email_templates_updated_at before update on email_templates
  for each row execute function update_updated_at();

create trigger campaigns_updated_at before update on campaigns
  for each row execute function update_updated_at();

create trigger campaign_stats_updated_at before update on campaign_stats
  for each row execute function update_updated_at();

create trigger campaign_send_logs_updated_at before update on campaign_send_logs
  for each row execute function update_updated_at();
```

Migration 006 cria tabela de API Keys:

```sql
-- ==================== API_KEYS ====================
create table api_keys (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  key_hash text not null unique, -- SHA-256 hash
  created_at timestamp with time zone default now(),
  last_used_at timestamp with time zone,
  created_by uuid not null references users(id) on delete cascade
);

create index api_keys_org_id_idx on api_keys(org_id);

alter table api_keys enable row level security;
create policy "Users can manage API keys in their org"
  on api_keys for all
  using (
    exists(
      select 1 from organization_members
      where org_id = api_keys.org_id
        and user_id = auth.uid()
        and role = 'admin'
    )
  );
```

**Critério de aceite:**
- [ ] Migrations executam sem erros no Supabase
- [ ] Todas as tabelas estão criadas
- [ ] RLS está habilitado em todas as tabelas
- [ ] Índices estão criados
- [ ] Triggers de `updated_at` funcionam
- [ ] Testar inserção de dados com RLS ativo

---

### Sprint 1.3: Supabase Auth Setup

**Arquivos envolvidos:**
- `src/lib/supabase/client.ts` (novo)
- `src/lib/supabase/server.ts` (novo)
- `src/middleware.ts` (novo)
- `src/app/(auth)/login/page.tsx` (novo)
- `src/app/(auth)/register/page.tsx` (novo)
- `src/app/(auth)/magic-link/page.tsx` (novo)
- `src/hooks/useAuth.ts` (novo)
- `src/lib/supabase/actions.ts` (novo)

**Dependências:** Migrations executadas, Supabase project configurado

**Componentes reaproveitados:** Auth UI pattern de `sistema de LP`

**Contrato de dados:**
```typescript
// src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/auth-helpers-nextjs'
import { Database } from './database.types' // Gerado via Supabase CLI

export const createClient = () =>
  createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

// src/hooks/useAuth.ts
export interface AuthContext {
  user: User | null
  organization: Organization | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, name: string) => Promise<void>
  signOut: () => Promise<void>
  signInWithMagicLink: (email: string) => Promise<void>
}

export const useAuth = (): AuthContext => {
  // hook implementation
}
```

**Lógica principal:**

1. Criar cliente Supabase lado cliente:
   ```typescript
   // src/lib/supabase/client.ts
   import { createBrowserClient } from '@supabase/auth-helpers-nextjs'

   export const createClient = () =>
     createBrowserClient(
       process.env.NEXT_PUBLIC_SUPABASE_URL!,
       process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
     )
   ```

2. Criar cliente servidor-side:
   ```typescript
   // src/lib/supabase/server.ts
   import { createServerClient, serializeCookieHeader } from '@supabase/ssr'
   import { cookies } from 'next/headers'

   export const createClient = async () => {
     const cookieStore = await cookies()

     return createServerClient(
       process.env.NEXT_PUBLIC_SUPABASE_URL!,
       process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
       {
         cookies: {
           getAll() {
             return cookieStore.getAll()
           },
           setAll(cookiesToSet) {
             cookieStore.set(...cookiesToSet)
           }
         }
       }
     )
   }
   ```

3. Criar middleware de proteção:
   ```typescript
   // src/middleware.ts
   import { type NextRequest } from 'next/server'
   import { updateSession } from '@/lib/supabase/middleware'

   export async function middleware(request: NextRequest) {
     return await updateSession(request)
   }

   export const config = {
     matcher: [
       '/((?!_next/static|_next/image|favicon.ico|api/webhooks).*)',
     ],
   }
   ```

4. Criar página de login (email/password + magic link):
   ```typescript
   // src/app/(auth)/login/page.tsx
   'use client'

   import { useState } from 'react'
   import { useRouter } from 'next/navigation'
   import { createClient } from '@/lib/supabase/client'

   export default function LoginPage() {
     const [email, setEmail] = useState('')
     const [password, setPassword] = useState('')
     const [magicLinkSent, setMagicLinkSent] = useState(false)
     const [error, setError] = useState<string | null>(null)
     const router = useRouter()
     const supabase = createClient()

     const handleEmailPassword = async (e: React.FormEvent) => {
       e.preventDefault()
       setError(null)

       const { error } = await supabase.auth.signInWithPassword({
         email,
         password,
       })

       if (error) {
         setError(error.message)
       } else {
         router.push('/dashboard')
       }
     }

     const handleMagicLink = async (e: React.FormEvent) => {
       e.preventDefault()
       setError(null)

       const { error } = await supabase.auth.signInWithOtp({
         email,
         options: {
           emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
         },
       })

       if (error) {
         setError(error.message)
       } else {
         setMagicLinkSent(true)
       }
     }

     return (
       // Form UI aqui (Tailwind + shadcn/ui Button, Input, etc)
     )
   }
   ```

5. Criar página de registro (email/password):
   ```typescript
   // src/app/(auth)/register/page.tsx
   'use client'

   export default function RegisterPage() {
     // Similar ao login, mas com confirmação de email
   }
   ```

6. Criar hook `useAuth`:
   ```typescript
   // src/hooks/useAuth.ts
   'use client'

   import { useEffect, useState, createContext, useContext } from 'react'
   import { useRouter } from 'next/navigation'
   import { createClient } from '@/lib/supabase/client'
   import { User } from '@supabase/auth-helpers-nextjs'

   interface AuthContextType {
     user: User | null
     loading: boolean
     signOut: () => Promise<void>
   }

   const AuthContext = createContext<AuthContextType | null>(null)

   export function AuthProvider({ children }: { children: React.ReactNode }) {
     const [user, setUser] = useState<User | null>(null)
     const [loading, setLoading] = useState(true)
     const supabase = createClient()

     useEffect(() => {
       const getUser = async () => {
         const { data: { user } } = await supabase.auth.getUser()
         setUser(user ?? null)
         setLoading(false)
       }

       getUser()

       const { data: { subscription } } = supabase.auth.onAuthStateChange(
         (_event, session) => {
           setUser(session?.user ?? null)
         }
       )

       return () => subscription?.unsubscribe()
     }, [])

     const signOut = async () => {
       await supabase.auth.signOut()
       setUser(null)
     }

     return (
       <AuthContext.Provider value={{ user, loading, signOut }}>
         {children}
       </AuthContext.Provider>
     )
   }

   export const useAuth = () => {
     const context = useContext(AuthContext)
     if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider')
     return context
   }
   ```

7. Configurar opções de autenticação no Supabase:
   - Email/Password: Habilitado
   - Magic Link: Habilitado
   - Email confirmação: Automática ou manual (dependendo da estratégia)

**Critério de aceite:**
- [ ] Login com email/password funciona
- [ ] Magic link é enviado e funciona
- [ ] Middleware protege rotas `/dashboard`
- [ ] `useAuth()` retorna user corretamente
- [ ] Sign out funciona e redireciona para login
- [ ] User é criado na tabela `users` na primeira autenticação
- [ ] JWT tokens são armazenados em cookies seguras

---

### Sprint 1.4: Dashboard Layout + Organization Selector

**Arquivos envolvidos:**
- `src/app/(dashboard)/layout.tsx` (novo)
- `src/components/dashboard/Sidebar.tsx` (novo)
- `src/components/dashboard/Header.tsx` (novo)
- `src/components/dashboard/OrganizationSelector.tsx` (novo)
- `src/hooks/useOrganization.ts` (novo)
- `src/app/(dashboard)/page.tsx` (novo - placeholder)
- `src/lib/supabase/organizations.ts` (novo)

**Dependências:** Sprint 1.3 completo, migrations executadas

**Componentes reaproveitados:** Layout/sidebar/header do `tracking-dashboard`

**Contrato de dados:**
```typescript
// Tipos já definidos em Sprint 1.1

// src/hooks/useOrganization.ts
export interface OrganizationContext {
  organization: Organization | null
  organizations: Organization[]
  loading: boolean
  selectOrganization: (orgId: string) => void
  createOrganization: (name: string) => Promise<Organization>
}
```

**Lógica principal:**

1. Criar `useOrganization` hook:
   ```typescript
   // src/hooks/useOrganization.ts
   'use client'

   import { useEffect, useState, createContext, useContext } from 'react'
   import { useAuth } from './useAuth'
   import { createClient } from '@/lib/supabase/client'
   import type { Organization } from '@/lib/types'

   interface OrganizationContextType {
     organization: Organization | null
     organizations: Organization[]
     loading: boolean
     selectOrganization: (orgId: string) => void
     createOrganization: (name: string) => Promise<Organization>
   }

   const OrganizationContext = createContext<OrganizationContextType | null>(null)

   export function OrganizationProvider({ children }: { children: React.ReactNode }) {
     const { user } = useAuth()
     const [organizations, setOrganizations] = useState<Organization[]>([])
     const [organization, setOrganization] = useState<Organization | null>(null)
     const [loading, setLoading] = useState(true)
     const supabase = createClient()

     useEffect(() => {
       if (!user) {
         setOrganizations([])
         setOrganization(null)
         setLoading(false)
         return
       }

       const fetchOrganizations = async () => {
         // Query organizations_members para pegar orgs do user
         const { data, error } = await supabase
           .from('organization_members')
           .select('organizations(*)')
           .eq('user_id', user.id)

         if (error) {
           console.error('Erro ao buscar organizações:', error)
           setLoading(false)
           return
         }

         const orgs = (data as any[]).map(om => om.organizations)

         setOrganizations(orgs)

         // Recuperar organização selecionada do localStorage
         const selectedOrgId = localStorage.getItem('selected_org_id')
         const selectedOrg = orgs.find(o => o.id === selectedOrgId) || orgs[0]
         setOrganization(selectedOrg || null)
         setLoading(false)
       }

       fetchOrganizations()
     }, [user])

     const selectOrganization = (orgId: string) => {
       const org = organizations.find(o => o.id === orgId)
       if (org) {
         setOrganization(org)
         localStorage.setItem('selected_org_id', orgId)
       }
     }

     const createOrganization = async (name: string): Promise<Organization> => {
       const { data, error } = await supabase
         .from('organizations')
         .insert({
           name,
           slug: name.toLowerCase().replace(/\s+/g, '-'),
           created_by: user!.id,
         })
         .select()
         .single()

       if (error) throw error

       // Adicionar user como admin
       await supabase
         .from('organization_members')
         .insert({
           org_id: data.id,
           user_id: user!.id,
           role: 'admin',
         })

       const newOrg = data as Organization
       setOrganizations([...organizations, newOrg])
       setOrganization(newOrg)
       localStorage.setItem('selected_org_id', newOrg.id)

       return newOrg
     }

     return (
       <OrganizationContext.Provider value={{ organization, organizations, loading, selectOrganization, createOrganization }}>
         {children}
       </OrganizationContext.Provider>
     )
   }

   export const useOrganization = () => {
     const context = useContext(OrganizationContext)
     if (!context) throw new Error('useOrganization deve ser usado dentro de OrganizationProvider')
     return context
   }
   ```

2. Criar componente `OrganizationSelector`:
   ```typescript
   // src/components/dashboard/OrganizationSelector.tsx
   'use client'

   import { useOrganization } from '@/hooks/useOrganization'
   import {
     Select,
     SelectContent,
     SelectItem,
     SelectTrigger,
     SelectValue,
   } from '@/components/ui/select'
   import { Button } from '@/components/ui/button'

   export function OrganizationSelector() {
     const { organization, organizations, selectOrganization } = useOrganization()

     if (!organization) return null

     return (
       <div className="flex items-center gap-2">
         <Select value={organization.id} onValueChange={selectOrganization}>
           <SelectTrigger className="w-[200px]">
             <SelectValue />
           </SelectTrigger>
           <SelectContent>
             {organizations.map(org => (
               <SelectItem key={org.id} value={org.id}>
                 {org.name}
               </SelectItem>
             ))}
           </SelectContent>
         </Select>
       </div>
     )
   }
   ```

3. Criar `Sidebar` com navegação:
   ```typescript
   // src/components/dashboard/Sidebar.tsx
   'use client'

   import Link from 'next/link'
   import { usePathname } from 'next/navigation'
   import {
     BarChart3,
     Mail,
     Users,
     Zap,
     Settings,
     Home,
   } from 'lucide-react'

   const MENU_ITEMS = [
     { href: '/dashboard', label: 'Home', icon: Home },
     { href: '/dashboard/leads', label: 'Leads', icon: Users },
     { href: '/dashboard/segments', label: 'Segmentos', icon: Zap },
     { href: '/dashboard/templates', label: 'Templates', icon: Mail },
     { href: '/dashboard/campaigns', label: 'Campanhas', icon: BarChart3 },
     { href: '/dashboard/settings', label: 'Configurações', icon: Settings },
   ]

   export function Sidebar() {
     const pathname = usePathname()

     return (
       <aside className="w-64 bg-slate-900 text-white p-4">
         <div className="mb-8">
           <h1 className="text-xl font-bold">PlataformaEmail</h1>
         </div>
         <nav className="space-y-2">
           {MENU_ITEMS.map(item => {
             const Icon = item.icon
             const isActive = pathname.startsWith(item.href)
             return (
               <Link
                 key={item.href}
                 href={item.href}
                 className={`flex items-center gap-3 px-4 py-2 rounded-lg transition ${
                   isActive
                     ? 'bg-blue-600 text-white'
                     : 'hover:bg-slate-800'
                 }`}
               >
                 <Icon size={20} />
                 <span>{item.label}</span>
               </Link>
             )
           })}
         </nav>
       </aside>
     )
   }
   ```

4. Criar `Header`:
   ```typescript
   // src/components/dashboard/Header.tsx
   'use client'

   import { useAuth } from '@/hooks/useAuth'
   import { OrganizationSelector } from './OrganizationSelector'
   import { Button } from '@/components/ui/button'
   import { LogOut } from 'lucide-react'

   export function Header() {
     const { user, signOut } = useAuth()

     return (
       <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between">
         <OrganizationSelector />
         <div className="flex items-center gap-4">
           <span className="text-sm text-slate-600">{user?.email}</span>
           <Button
             variant="outline"
             size="sm"
             onClick={() => signOut()}
             className="gap-2"
           >
             <LogOut size={16} />
             Sair
           </Button>
         </div>
       </header>
     )
   }
   ```

5. Criar layout do dashboard:
   ```typescript
   // src/app/(dashboard)/layout.tsx
   import { AuthProvider } from '@/hooks/useAuth'
   import { OrganizationProvider } from '@/hooks/useOrganization'
   import { Sidebar } from '@/components/dashboard/Sidebar'
   import { Header } from '@/components/dashboard/Header'

   export default function DashboardLayout({
     children,
   }: {
     children: React.ReactNode
   }) {
     return (
       <AuthProvider>
         <OrganizationProvider>
           <div className="flex h-screen">
             <Sidebar />
             <div className="flex-1 flex flex-col">
               <Header />
               <main className="flex-1 overflow-auto p-8 bg-slate-50">
                 {children}
               </main>
             </div>
           </div>
         </OrganizationProvider>
       </AuthProvider>
     )
   }
   ```

6. Criar página home placeholder:
   ```typescript
   // src/app/(dashboard)/page.tsx
   'use client'

   export default function DashboardHome() {
     return (
       <div>
         <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
         <p>Bem-vindo! Selecione uma seção no menu.</p>
       </div>
     )
   }
   ```

**Critério de aceite:**
- [ ] Sidebar carrega com menu navegável
- [ ] Header mostra email do user e botão sign out
- [ ] Organization selector funciona
- [ ] Navegação entre seções funciona
- [ ] Layout é responsivo
- [ ] User é redirecionado para login se não autenticado
- [ ] Organization é persistida no localStorage

---

### Sprint 1.5: Organization CRUD in Settings

**Arquivos envolvidos:**
- `src/app/(dashboard)/settings/page.tsx` (novo)
- `src/components/settings/OrganizationForm.tsx` (novo)
- `src/components/settings/DomainVerification.tsx` (novo)
- `src/lib/supabase/organizations.ts` (novo)

**Dependências:** Sprint 1.4 completo

**Componentes reaproveitados:** Form components de `tracking-dashboard`

**Contrato de dados:** Já definido em Sprint 1.1

**Lógica principal:**

1. Criar `organizations.ts` com funções helper:
   ```typescript
   // src/lib/supabase/organizations.ts
   import { createClient } from './client'
   import type { Organization, OrganizationMember } from '@/lib/types'

   export async function updateOrganization(
     orgId: string,
     updates: Partial<Organization>
   ): Promise<Organization> {
     const supabase = createClient()

     const { data, error } = await supabase
       .from('organizations')
       .update(updates)
       .eq('id', orgId)
       .select()
       .single()

     if (error) throw error
     return data as Organization
   }

   export async function getOrganization(orgId: string): Promise<Organization> {
     const supabase = createClient()

     const { data, error } = await supabase
       .from('organizations')
       .select()
       .eq('id', orgId)
       .single()

     if (error) throw error
     return data as Organization
   }

   export async function getOrganizationMembers(orgId: string): Promise<OrganizationMember[]> {
     const supabase = createClient()

     const { data, error } = await supabase
       .from('organization_members')
       .select('*, user:users(*)')
       .eq('org_id', orgId)

     if (error) throw error
     return data as OrganizationMember[]
   }

   export async function updateMemberRole(
     memberId: string,
     role: string
   ): Promise<void> {
     const supabase = createClient()

     const { error } = await supabase
       .from('organization_members')
       .update({ role })
       .eq('id', memberId)

     if (error) throw error
   }

   export async function removeMember(memberId: string): Promise<void> {
     const supabase = createClient()

     const { error } = await supabase
       .from('organization_members')
       .delete()
       .eq('id', memberId)

     if (error) throw error
   }
   ```

2. Criar `OrganizationForm`:
   ```typescript
   // src/components/settings/OrganizationForm.tsx
   'use client'

   import { useState } from 'react'
   import { useOrganization } from '@/hooks/useOrganization'
   import { useForm } from 'react-hook-form'
   import { zodResolver } from '@hookform/resolvers/zod'
   import { z } from 'zod'
   import { Button } from '@/components/ui/button'
   import { Input } from '@/components/ui/input'
   import { updateOrganization } from '@/lib/supabase/organizations'

   const formSchema = z.object({
     name: z.string().min(1, 'Nome é obrigatório'),
     sender_email: z.string().email('Email inválido').optional().or(z.literal('')),
     sender_name: z.string().optional(),
     website: z.string().url().optional().or(z.literal('')),
   })

   type FormData = z.infer<typeof formSchema>

   export function OrganizationForm() {
     const { organization, setOrganization } = useOrganization()
     const [loading, setLoading] = useState(false)
     const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

     const form = useForm<FormData>({
       resolver: zodResolver(formSchema),
       values: {
         name: organization?.name || '',
         sender_email: organization?.sender_email || '',
         sender_name: organization?.sender_name || '',
         website: organization?.website || '',
       }
     })

     const onSubmit = async (data: FormData) => {
       if (!organization) return

       setLoading(true)
       try {
         const updated = await updateOrganization(organization.id, data)
         setOrganization(updated)
         setMessage({ type: 'success', text: 'Organização atualizada com sucesso!' })
       } catch (error) {
         setMessage({ type: 'error', text: 'Erro ao atualizar organização.' })
       } finally {
         setLoading(false)
       }
     }

     if (!organization) return null

     return (
       <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
         <div>
           <label className="block text-sm font-medium mb-2">Nome</label>
           <Input
             {...form.register('name')}
             placeholder="Nome da organização"
           />
           {form.formState.errors.name && (
             <p className="text-red-500 text-sm mt-1">{form.formState.errors.name.message}</p>
           )}
         </div>

         <div className="grid grid-cols-2 gap-4">
           <div>
             <label className="block text-sm font-medium mb-2">Email do Remetente</label>
             <Input
               {...form.register('sender_email')}
               type="email"
               placeholder="noreply@domain.com"
             />
           </div>
           <div>
             <label className="block text-sm font-medium mb-2">Nome do Remetente</label>
             <Input
               {...form.register('sender_name')}
               placeholder="Sua Empresa"
             />
           </div>
         </div>

         <div>
           <label className="block text-sm font-medium mb-2">Website</label>
           <Input
             {...form.register('website')}
             type="url"
             placeholder="https://seu-site.com"
           />
         </div>

         {message && (
           <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
             {message.text}
           </div>
         )}

         <Button type="submit" disabled={loading}>
           {loading ? 'Salvando...' : 'Salvar Alterações'}
         </Button>
       </form>
     )
   }
   ```

3. Criar componente de gerenciamento de membros:
   ```typescript
   // src/components/settings/MembersList.tsx
   'use client'

   import { useEffect, useState } from 'react'
   import { useOrganization } from '@/hooks/useOrganization'
   import { getOrganizationMembers, removeMember } from '@/lib/supabase/organizations'
   import { Button } from '@/components/ui/button'
   import { Trash2 } from 'lucide-react'
   import type { OrganizationMember } from '@/lib/types'

   export function MembersList() {
     const { organization } = useOrganization()
     const [members, setMembers] = useState<OrganizationMember[]>([])
     const [loading, setLoading] = useState(false)

     useEffect(() => {
       if (organization) {
         fetchMembers()
       }
     }, [organization?.id])

     const fetchMembers = async () => {
       if (!organization) return
       setLoading(true)
       try {
         const data = await getOrganizationMembers(organization.id)
         setMembers(data)
       } catch (error) {
         console.error('Erro ao buscar membros:', error)
       } finally {
         setLoading(false)
       }
     }

     const handleRemoveMember = async (memberId: string) => {
       if (!confirm('Tem certeza?')) return
       try {
         await removeMember(memberId)
         setMembers(members.filter(m => m.id !== memberId))
       } catch (error) {
         console.error('Erro ao remover membro:', error)
       }
     }

     return (
       <div>
         <h3 className="text-lg font-semibold mb-4">Membros</h3>
         <table className="w-full text-sm">
           <thead>
             <tr className="border-b">
               <th className="text-left py-2">Email</th>
               <th className="text-left py-2">Função</th>
               <th className="text-right py-2">Ações</th>
             </tr>
           </thead>
           <tbody>
             {members.map(member => (
               <tr key={member.id} className="border-b hover:bg-slate-50">
                 <td className="py-3">{member.user?.email}</td>
                 <td className="py-3 capitalize">{member.role}</td>
                 <td className="text-right py-3">
                   <Button
                     variant="ghost"
                     size="sm"
                     onClick={() => handleRemoveMember(member.id)}
                   >
                     <Trash2 size={16} />
                   </Button>
                 </td>
               </tr>
             ))}
           </tbody>
         </table>
       </div>
     )
   }
   ```

4. Criar página de settings:
   ```typescript
   // src/app/(dashboard)/settings/page.tsx
   'use client'

   import { OrganizationForm } from '@/components/settings/OrganizationForm'
   import { MembersList } from '@/components/settings/MembersList'
   import { DomainVerification } from '@/components/settings/DomainVerification'

   export default function SettingsPage() {
     return (
       <div className="space-y-12">
         <div>
           <h1 className="text-3xl font-bold mb-8">Configurações</h1>
         </div>

         <section>
           <h2 className="text-2xl font-semibold mb-6">Organização</h2>
           <div className="bg-white p-8 rounded-lg shadow">
             <OrganizationForm />
           </div>
         </section>

         <section>
           <h2 className="text-2xl font-semibold mb-6">Membros</h2>
           <div className="bg-white p-8 rounded-lg shadow">
             <MembersList />
           </div>
         </section>

         <section>
           <h2 className="text-2xl font-semibold mb-6">Domínio de Envio</h2>
           <div className="bg-white p-8 rounded-lg shadow">
             <DomainVerification />
           </div>
         </section>
       </div>
     )
   }
   ```

**Critério de aceite:**
- [ ] Settings page carrega corretamente
- [ ] Dados da organização podem ser editados
- [ ] Membros são listados corretamente
- [ ] Membros podem ser removidos
- [ ] Mensagens de sucesso/erro aparecem
- [ ] Todas as validações funcionam

---

### Sprint 1.6: User Management (Invite + Roles)

**Arquivos envolvidos:**
- `src/components/settings/InviteUserForm.tsx` (novo)
- `src/lib/supabase/invitations.ts` (novo)
- `supabase/migrations/007_invitations_table.sql` (novo)

**Dependências:** Sprint 1.5 completo

**Componentes reaproveitados:** Form components

**Contrato de dados:**
```typescript
export interface Invitation {
  id: string
  org_id: string
  email: string
  role: UserRole
  token: string
  status: 'pending' | 'accepted' | 'expired'
  created_at: string
  expires_at: string
  created_by: string
}
```

**Lógica principal:**

1. Criar migration para tabela de convites:
   ```sql
   -- supabase/migrations/007_invitations_table.sql
   create table invitations (
     id uuid primary key default uuid_generate_v4(),
     org_id uuid not null references organizations(id) on delete cascade,
     email text not null,
     role text not null check (role in ('admin', 'editor', 'viewer')),
     token text unique not null,
     status text not null check (status in ('pending', 'accepted', 'expired'))
       default 'pending',
     created_at timestamp with time zone default now(),
     expires_at timestamp with time zone default (now() + interval '7 days'),
     created_by uuid not null references users(id) on delete set null,
     unique(org_id, email)
   );

   create index invitations_org_id_idx on invitations(org_id);
   create index invitations_token_idx on invitations(token);

   alter table invitations enable row level security;
   create policy "Users can view invitations in their org"
     on invitations for select
     using (
       exists(
         select 1 from organization_members
         where org_id = invitations.org_id and user_id = auth.uid()
       )
     );
   ```

2. Criar funções helper:
   ```typescript
   // src/lib/supabase/invitations.ts
   import { createClient } from './client'
   import type { Invitation } from '@/lib/types'

   export async function inviteUser(
     orgId: string,
     email: string,
     role: string
   ): Promise<Invitation> {
     const supabase = createClient()

     // Gerar token único
     const token = crypto.randomUUID()

     const { data, error } = await supabase
       .from('invitations')
       .insert({
         org_id: orgId,
         email,
         role,
         token,
         created_by: (await supabase.auth.getUser()).data.user?.id,
       })
       .select()
       .single()

     if (error) throw error
     return data as Invitation
   }

   export async function acceptInvitation(token: string, userId: string): Promise<void> {
     const supabase = createClient()

     // Buscar convite
     const { data: invitation } = await supabase
       .from('invitations')
       .select()
       .eq('token', token)
       .single()

     if (!invitation) throw new Error('Convite inválido')
     if (invitation.status !== 'pending') throw new Error('Convite já foi utilizado')
     if (new Date(invitation.expires_at) < new Date()) throw new Error('Convite expirado')

     // Adicionar user à organização
     await supabase
       .from('organization_members')
       .insert({
         org_id: invitation.org_id,
         user_id: userId,
         role: invitation.role,
       })

     // Marcar convite como aceito
     await supabase
       .from('invitations')
       .update({ status: 'accepted' })
       .eq('id', invitation.id)
   }
   ```

3. Criar formulário de convite:
   ```typescript
   // src/components/settings/InviteUserForm.tsx
   'use client'

   import { useState } from 'react'
   import { useOrganization } from '@/hooks/useOrganization'
   import { useForm } from 'react-hook-form'
   import { inviteUser } from '@/lib/supabase/invitations'
   import { Button } from '@/components/ui/button'
   import { Input } from '@/components/ui/input'
   import {
     Select,
     SelectContent,
     SelectItem,
     SelectTrigger,
     SelectValue,
   } from '@/components/ui/select'

   interface FormData {
     email: string
     role: string
   }

   export function InviteUserForm() {
     const { organization } = useOrganization()
     const [loading, setLoading] = useState(false)
     const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
     const [email, setEmail] = useState('')
     const [role, setRole] = useState('editor')

     const handleSubmit = async (e: React.FormEvent) => {
       e.preventDefault()
       if (!organization) return

       setLoading(true)
       try {
         await inviteUser(organization.id, email, role)
         setMessage({ type: 'success', text: 'Convite enviado com sucesso!' })
         setEmail('')
         setRole('editor')
       } catch (error) {
         setMessage({ type: 'error', text: 'Erro ao enviar convite.' })
       } finally {
         setLoading(false)
       }
     }

     return (
       <form onSubmit={handleSubmit} className="space-y-4">
         <div>
           <label className="block text-sm font-medium mb-2">Email</label>
           <Input
             type="email"
             value={email}
             onChange={(e) => setEmail(e.target.value)}
             placeholder="user@example.com"
             required
           />
         </div>

         <div>
           <label className="block text-sm font-medium mb-2">Função</label>
           <Select value={role} onValueChange={setRole}>
             <SelectTrigger>
               <SelectValue />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="admin">Admin</SelectItem>
               <SelectItem value="editor">Editor</SelectItem>
               <SelectItem value="viewer">Visualizador</SelectItem>
             </SelectContent>
           </Select>
         </div>

         {message && (
           <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
             {message.text}
           </div>
         )}

         <Button type="submit" disabled={loading}>
           {loading ? 'Enviando...' : 'Enviar Convite'}
         </Button>
       </form>
     )
   }
   ```

**Critério de aceite:**
- [ ] Formulário de convite carrega
- [ ] Convite é enviado com sucesso
- [ ] Email de convite é enviado (será testado em Sprint 5)
- [ ] Convite pode ser aceito via link
- [ ] User é adicionado à organização automaticamente

---

## Sprint 2: Leads Module (1 semana)

### Sprint 2.1: Leads List Page (DataTable, Filters, Search, Pagination)

**Arquivos envolvidos:**
- `src/app/(dashboard)/leads/page.tsx` (novo)
- `src/components/leads/LeadsTable.tsx` (novo)
- `src/components/leads/LeadsFilters.tsx` (novo)
- `src/components/ui/DataTable.tsx` (novo - reaproveitado)
- `src/lib/supabase/leads.ts` (novo)
- `src/hooks/useLeads.ts` (novo)

**Dependências:** Sprint 1 completo

**Componentes reaproveitados:** DataTable do `tracking-dashboard`

**Contrato de dados:**
```typescript
// src/hooks/useLeads.ts
export interface LeadsFilter {
  status?: LeadStatus
  search?: string
  tags?: string[]
  minScore?: number
  maxScore?: number
}

export interface LeadsQuery {
  filters: LeadsFilter
  page: number
  pageSize: number
  sortBy: 'created_at' | 'score' | 'name'
  sortOrder: 'asc' | 'desc'
}

export interface LeadsResult {
  leads: Lead[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}
```

**Lógica principal:**

1. Criar funções de query na `leads.ts`:
   ```typescript
   // src/lib/supabase/leads.ts
   import { createClient } from './client'
   import type { Lead, LeadTag } from '@/lib/types'

   export async function queryLeads(
     orgId: string,
     filters: {
       search?: string
       status?: string
       tags?: string[]
       minScore?: number
       maxScore?: number
     },
     {
       page = 1,
       pageSize = 20,
       sortBy = 'created_at',
       sortOrder = 'desc',
     }: {
       page?: number
       pageSize?: number
       sortBy?: string
       sortOrder?: 'asc' | 'desc'
     } = {}
   ) {
     const supabase = createClient()

     let query = supabase
       .from('leads')
       .select(
         `
         *,
         lead_tag_assignments(tag:lead_tags(*))
         `,
         { count: 'exact' }
       )
       .eq('org_id', orgId)

     // Aplicar filtros
     if (filters.search) {
       query = query.or(
         `email.ilike.%${filters.search}%,first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%`
       )
     }

     if (filters.status) {
       query = query.eq('status', filters.status)
     }

     if (filters.minScore !== undefined) {
       query = query.gte('score', filters.minScore)
     }

     if (filters.maxScore !== undefined) {
       query = query.lte('score', filters.maxScore)
     }

     // Ordenação
     query = query.order(sortBy, { ascending: sortOrder === 'asc' })

     // Paginação
     const from = (page - 1) * pageSize
     query = query.range(from, from + pageSize - 1)

     const { data, error, count } = await query

     if (error) throw error

     return {
       leads: data as Lead[],
       total: count || 0,
       page,
       pageSize,
       hasMore: count! > from + pageSize,
     }
   }

   export async function getLeadTags(orgId: string): Promise<LeadTag[]> {
     const supabase = createClient()

     const { data, error } = await supabase
       .from('lead_tags')
       .select()
       .eq('org_id', orgId)

     if (error) throw error
     return data as LeadTag[]
   }
   ```

2. Criar hook `useLeads`:
   ```typescript
   // src/hooks/useLeads.ts
   'use client'

   import { useEffect, useState, useCallback } from 'react'
   import { useOrganization } from './useOrganization'
   import { queryLeads, getLeadTags } from '@/lib/supabase/leads'
   import type { Lead, LeadTag, LeadStatus } from '@/lib/types'

   export interface LeadsFilter {
     status?: LeadStatus
     search?: string
     tags?: string[]
     minScore?: number
     maxScore?: number
   }

   export interface LeadsResult {
     leads: Lead[]
     total: number
     page: number
     pageSize: number
     hasMore: boolean
   }

   export function useLeads() {
     const { organization } = useOrganization()
     const [leads, setLeads] = useState<Lead[]>([])
     const [tags, setTags] = useState<LeadTag[]>([])
     const [loading, setLoading] = useState(false)
     const [page, setPage] = useState(1)
     const [pageSize] = useState(20)
     const [filters, setFilters] = useState<LeadsFilter>({})
     const [total, setTotal] = useState(0)

     useEffect(() => {
       if (!organization) return

       const fetchTags = async () => {
         try {
           const data = await getLeadTags(organization.id)
           setTags(data)
         } catch (error) {
           console.error('Erro ao buscar tags:', error)
         }
       }

       fetchTags()
     }, [organization?.id])

     const fetchLeads = useCallback(async () => {
       if (!organization) return

       setLoading(true)
       try {
         const result = await queryLeads(organization.id, filters, {
           page,
           pageSize,
         })
         setLeads(result.leads)
         setTotal(result.total)
       } catch (error) {
         console.error('Erro ao buscar leads:', error)
       } finally {
         setLoading(false)
       }
     }, [organization?.id, filters, page, pageSize])

     useEffect(() => {
       setPage(1) // Reset para page 1 quando filtros mudam
     }, [filters])

     useEffect(() => {
       fetchLeads()
     }, [fetchLeads])

     return {
       leads,
       tags,
       loading,
       page,
       setPage,
       pageSize,
       total,
       filters,
       setFilters,
       refetch: fetchLeads,
     }
   }
   ```

3. Criar componente de filtros:
   ```typescript
   // src/components/leads/LeadsFilters.tsx
   'use client'

   import { Input } from '@/components/ui/input'
   import { Button } from '@/components/ui/button'
   import {
     Select,
     SelectContent,
     SelectItem,
     SelectTrigger,
     SelectValue,
   } from '@/components/ui/select'
   import { Trash2 } from 'lucide-react'
   import type { LeadStatus } from '@/lib/types'

   interface LeadsFiltersProps {
     filters: {
       status?: LeadStatus
       search?: string
       minScore?: number
       maxScore?: number
     }
     onFilterChange: (filters: any) => void
   }

   export function LeadsFilters({ filters, onFilterChange }: LeadsFiltersProps) {
     const handleSearchChange = (search: string) => {
       onFilterChange({ ...filters, search: search || undefined })
     }

     const handleStatusChange = (status: string) => {
       onFilterChange({ ...filters, status: status === 'all' ? undefined : status })
     }

     const handleReset = () => {
       onFilterChange({})
     }

     return (
       <div className="space-y-4 mb-6">
         <div className="flex gap-4 items-end">
           <div className="flex-1">
             <label className="block text-sm font-medium mb-2">Buscar</label>
             <Input
               placeholder="Email, nome..."
               value={filters.search || ''}
               onChange={(e) => handleSearchChange(e.target.value)}
             />
           </div>

           <div className="w-40">
             <label className="block text-sm font-medium mb-2">Status</label>
             <Select value={filters.status || 'all'} onValueChange={handleStatusChange}>
               <SelectTrigger>
                 <SelectValue />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="all">Todos</SelectItem>
                 <SelectItem value="active">Ativo</SelectItem>
                 <SelectItem value="unsubscribed">Desinscritos</SelectItem>
                 <SelectItem value="bounced">Bounce</SelectItem>
                 <SelectItem value="complained">Reclamação</SelectItem>
               </SelectContent>
             </Select>
           </div>

           <Button
             variant="outline"
             size="sm"
             onClick={handleReset}
             className="gap-2"
           >
             <Trash2 size={16} />
             Limpar
           </Button>
         </div>
       </div>
     )
   }
   ```

4. Criar componente LeadsTable:
   ```typescript
   // src/components/leads/LeadsTable.tsx
   'use client'

   import { useState } from 'react'
   import { formatDistanceToNow } from 'date-fns'
   import { ptBR } from 'date-fns/locale'
   import { Button } from '@/components/ui/button'
   import { ChevronLeft, ChevronRight } from 'lucide-react'
   import type { Lead } from '@/lib/types'

   interface LeadsTableProps {
     leads: Lead[]
     loading: boolean
     total: number
     page: number
     pageSize: number
     onPageChange: (page: number) => void
   }

   export function LeadsTable({
     leads,
     loading,
     total,
     page,
     pageSize,
     onPageChange,
   }: LeadsTableProps) {
     if (loading) return <div className="text-center py-8">Carregando...</div>

     if (leads.length === 0) {
       return <div className="text-center py-8 text-slate-500">Nenhum lead encontrado.</div>
     }

     const totalPages = Math.ceil(total / pageSize)

     return (
       <div className="space-y-4">
         <table className="w-full text-sm">
           <thead>
             <tr className="border-b bg-slate-50">
               <th className="text-left py-3 px-4 font-medium">Email</th>
               <th className="text-left py-3 px-4 font-medium">Nome</th>
               <th className="text-left py-3 px-4 font-medium">Empresa</th>
               <th className="text-center py-3 px-4 font-medium">Score</th>
               <th className="text-left py-3 px-4 font-medium">Status</th>
               <th className="text-left py-3 px-4 font-medium">Criado</th>
             </tr>
           </thead>
           <tbody>
             {leads.map(lead => (
               <tr key={lead.id} className="border-b hover:bg-slate-50">
                 <td className="py-3 px-4">{lead.email}</td>
                 <td className="py-3 px-4">
                   {lead.first_name || lead.last_name ? (
                     `${lead.first_name || ''} ${lead.last_name || ''}`
                   ) : (
                     <span className="text-slate-400">-</span>
                   )}
                 </td>
                 <td className="py-3 px-4">{lead.company || '-'}</td>
                 <td className="py-3 px-4 text-center">
                   <span className="inline-block bg-blue-100 text-blue-700 px-2 py-1 rounded">
                     {lead.score}
                   </span>
                 </td>
                 <td className="py-3 px-4">
                   <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                     lead.status === 'active'
                       ? 'bg-green-100 text-green-700'
                       : 'bg-red-100 text-red-700'
                   }`}>
                     {lead.status === 'active' ? 'Ativo' : lead.status}
                   </span>
                 </td>
                 <td className="py-3 px-4 text-slate-500">
                   {formatDistanceToNow(new Date(lead.created_at), {
                     locale: ptBR,
                     addSuffix: true,
                   })}
                 </td>
               </tr>
             ))}
           </tbody>
         </table>

         {/* Pagination */}
         <div className="flex items-center justify-between pt-4">
           <div className="text-sm text-slate-600">
             Mostrando {(page - 1) * pageSize + 1} a{' '}
             {Math.min(page * pageSize, total)} de {total} leads
           </div>

           <div className="flex gap-2">
             <Button
               variant="outline"
               size="sm"
               onClick={() => onPageChange(page - 1)}
               disabled={page === 1}
             >
               <ChevronLeft size={16} />
             </Button>
             <span className="px-4 py-2 text-sm">
               {page} / {totalPages}
             </span>
             <Button
               variant="outline"
               size="sm"
               onClick={() => onPageChange(page + 1)}
               disabled={page >= totalPages}
             >
               <ChevronRight size={16} />
             </Button>
           </div>
         </div>
       </div>
     )
   }
   ```

5. Criar página de Leads:
   ```typescript
   // src/app/(dashboard)/leads/page.tsx
   'use client'

   import { useLeads } from '@/hooks/useLeads'
   import { LeadsFilters } from '@/components/leads/LeadsFilters'
   import { LeadsTable } from '@/components/leads/LeadsTable'
   import { Button } from '@/components/ui/button'
   import { Plus } from 'lucide-react'
   import Link from 'next/link'

   export default function LeadsPage() {
     const { leads, loading, page, setPage, pageSize, total, filters, setFilters } = useLeads()

     return (
       <div className="space-y-8">
         <div className="flex items-center justify-between">
           <h1 className="text-3xl font-bold">Leads</h1>
           <Link href="/dashboard/leads/new">
             <Button className="gap-2">
               <Plus size={20} />
               Novo Lead
             </Button>
           </Link>
         </div>

         <LeadsFilters filters={filters} onFilterChange={setFilters} />

         <div className="bg-white rounded-lg shadow p-6">
           <LeadsTable
             leads={leads}
             loading={loading}
             total={total}
             page={page}
             pageSize={pageSize}
             onPageChange={setPage}
           />
         </div>
       </div>
     )
   }
   ```

**Critério de aceite:**
- [ ] Leads são listados em tabela com paginação
- [ ] Filtro de busca funciona
- [ ] Filtro de status funciona
- [ ] Paginação funciona corretamente
- [ ] Dados são recarregados quando filtros mudam
- [ ] Layout é responsivo

---

### Sprint 2.2: Lead Detail Page

**Arquivos envolvidos:**
- `src/app/(dashboard)/leads/[id]/page.tsx` (novo)
- `src/components/leads/LeadDetail.tsx` (novo)
- `src/components/leads/LeadInfoCard.tsx` (novo)
- `src/components/leads/LeadTagsManager.tsx` (novo)

**Dependências:** Sprint 2.1 completo

**Componentes reaproveitados:** Card components de shadcn/ui

**Contrato de dados:** Tipos já definidos

**Lógica principal:**

1. Criar `LeadDetail` page:
   ```typescript
   // src/app/(dashboard)/leads/[id]/page.tsx
   'use client'

   import { useEffect, useState } from 'react'
   import { useParams, useRouter } from 'next/navigation'
   import { createClient } from '@/lib/supabase/client'
   import { LeadInfoCard } from '@/components/leads/LeadInfoCard'
   import { LeadTagsManager } from '@/components/leads/LeadTagsManager'
   import { Button } from '@/components/ui/button'
   import { ArrowLeft } from 'lucide-react'
   import type { Lead } from '@/lib/types'

   export default function LeadDetailPage() {
     const params = useParams()
     const router = useRouter()
     const [lead, setLead] = useState<Lead | null>(null)
     const [loading, setLoading] = useState(true)
     const supabase = createClient()

     useEffect(() => {
       const fetchLead = async () => {
         const { data, error } = await supabase
           .from('leads')
           .select()
           .eq('id', params.id)
           .single()

         if (error) {
           console.error('Erro:', error)
         } else {
           setLead(data as Lead)
         }
         setLoading(false)
       }

       fetchLead()
     }, [params.id])

     if (loading) return <div>Carregando...</div>
     if (!lead) return <div>Lead não encontrado</div>

     return (
       <div className="space-y-6">
         <Button
           variant="outline"
           onClick={() => router.back()}
           className="gap-2"
         >
           <ArrowLeft size={16} />
           Voltar
         </Button>

         <h1 className="text-3xl font-bold">
           {lead.first_name || lead.last_name
             ? `${lead.first_name} ${lead.last_name}`
             : lead.email}
         </h1>

         <div className="grid grid-cols-2 gap-6">
           <LeadInfoCard lead={lead} onUpdate={setLead} />
           <LeadTagsManager lead={lead} onUpdate={setLead} />
         </div>
       </div>
     )
   }
   ```

2. Criar `LeadInfoCard`:
   ```typescript
   // src/components/leads/LeadInfoCard.tsx
   'use client'

   import { Badge } from '@/components/ui/badge'
   import type { Lead } from '@/lib/types'

   interface LeadInfoCardProps {
     lead: Lead
     onUpdate: (lead: Lead) => void
   }

   export function LeadInfoCard({ lead }: LeadInfoCardProps) {
     const getStatusColor = (status: string) => {
       switch (status) {
         case 'active': return 'bg-green-100 text-green-800'
         case 'unsubscribed': return 'bg-red-100 text-red-800'
         case 'bounced': return 'bg-yellow-100 text-yellow-800'
         case 'complained': return 'bg-red-100 text-red-800'
         default: return 'bg-gray-100 text-gray-800'
       }
     }

     const getStatusLabel = (status: string) => {
       switch (status) {
         case 'active': return 'Ativo'
         case 'unsubscribed': return 'Desinscritos'
         case 'bounced': return 'Bounce'
         case 'complained': return 'Reclamação'
         default: return status
       }
     }

     return (
       <div className="bg-white rounded-lg shadow p-6 space-y-6">
         <div>
           <h2 className="text-lg font-semibold mb-4">Informações</h2>
           <div className="space-y-3">
             <div>
               <label className="block text-sm text-slate-600">Email</label>
               <p className="font-medium">{lead.email}</p>
             </div>
             <div className="grid grid-cols-2 gap-4">
               <div>
                 <label className="block text-sm text-slate-600">Nome</label>
                 <p className="font-medium">{lead.first_name || '-'}</p>
               </div>
               <div>
                 <label className="block text-sm text-slate-600">Sobrenome</label>
                 <p className="font-medium">{lead.last_name || '-'}</p>
               </div>
             </div>
             <div>
               <label className="block text-sm text-slate-600">Empresa</label>
               <p className="font-medium">{lead.company || '-'}</p>
             </div>
             <div>
               <label className="block text-sm text-slate-600">Cargo</label>
               <p className="font-medium">{lead.position || '-'}</p>
             </div>
             <div>
               <label className="block text-sm text-slate-600">Telefone</label>
               <p className="font-medium">{lead.phone || '-'}</p>
             </div>
           </div>
         </div>

         <div className="border-t pt-6">
           <h3 className="font-semibold mb-3">Score</h3>
           <div className="flex items-center gap-4">
             <div className="flex-1 bg-slate-200 rounded-full h-2">
               <div
                 className="bg-blue-600 h-2 rounded-full"
                 style={{ width: `${lead.score}%` }}
               />
             </div>
             <span className="text-lg font-bold">{lead.score}</span>
           </div>
         </div>

         <div className="border-t pt-6">
           <h3 className="font-semibold mb-3">Status</h3>
           <Badge className={getStatusColor(lead.status)}>
             {getStatusLabel(lead.status)}
           </Badge>
         </div>
       </div>
     )
   }
   ```

3. Criar `LeadTagsManager`:
   ```typescript
   // src/components/leads/LeadTagsManager.tsx
   'use client'

   import { useEffect, useState } from 'react'
   import { createClient } from '@/lib/supabase/client'
   import { Button } from '@/components/ui/button'
   import { X, Plus } from 'lucide-react'
   import type { Lead, LeadTag } from '@/lib/types'

   interface LeadTagsManagerProps {
     lead: Lead
     onUpdate: (lead: Lead) => void
   }

   export function LeadTagsManager({ lead, onUpdate }: LeadTagsManagerProps) {
     const [allTags, setAllTags] = useState<LeadTag[]>([])
     const [selectedTags, setSelectedTags] = useState<LeadTag[]>([])
     const [loading, setLoading] = useState(true)
     const supabase = createClient()

     useEffect(() => {
       const fetchTags = async () => {
         // Buscar todas as tags
         const { data: tags } = await supabase
           .from('lead_tags')
           .select()

         // Buscar tags atribuídas a este lead
         const { data: assignments } = await supabase
           .from('lead_tag_assignments')
           .select('tag:lead_tags(*)')
           .eq('lead_id', lead.id)

         setAllTags(tags || [])
         setSelectedTags((assignments || []).map(a => a.tag))
         setLoading(false)
       }

       fetchTags()
     }, [lead.id])

     const handleAddTag = async (tag: LeadTag) => {
       if (selectedTags.find(t => t.id === tag.id)) return

       const { error } = await supabase
         .from('lead_tag_assignments')
         .insert({ lead_id: lead.id, tag_id: tag.id })

       if (!error) {
         setSelectedTags([...selectedTags, tag])
       }
     }

     const handleRemoveTag = async (tagId: string) => {
       const { error } = await supabase
         .from('lead_tag_assignments')
         .delete()
         .eq('lead_id', lead.id)
         .eq('tag_id', tagId)

       if (!error) {
         setSelectedTags(selectedTags.filter(t => t.id !== tagId))
       }
     }

     const availableTags = allTags.filter(t => !selectedTags.find(st => st.id === t.id))

     return (
       <div className="bg-white rounded-lg shadow p-6 space-y-4">
         <h2 className="text-lg font-semibold">Tags</h2>

         {loading ? (
           <div>Carregando...</div>
         ) : (
           <>
             {selectedTags.length > 0 && (
               <div className="flex flex-wrap gap-2">
                 {selectedTags.map(tag => (
                   <div
                     key={tag.id}
                     className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-white text-sm"
                     style={{ backgroundColor: tag.color }}
                   >
                     {tag.name}
                     <button
                       onClick={() => handleRemoveTag(tag.id)}
                       className="hover:opacity-80"
                     >
                       <X size={16} />
                     </button>
                   </div>
                 ))}
               </div>
             )}

             {availableTags.length > 0 && (
               <div className="space-y-2">
                 <p className="text-sm text-slate-600">Adicionar tag:</p>
                 <div className="flex flex-wrap gap-2">
                   {availableTags.map(tag => (
                     <Button
                       key={tag.id}
                       variant="outline"
                       size="sm"
                       onClick={() => handleAddTag(tag)}
                       className="gap-2"
                     >
                       <Plus size={16} />
                       {tag.name}
                     </Button>
                   ))}
                 </div>
               </div>
             )}
           </>
         )}
       </div>
     )
   }
   ```

**Critério de aceite:**
- [ ] Página de detalhe carrega corretamente
- [ ] Informações do lead são exibidas
- [ ] Score é visualizado em barra de progresso
- [ ] Status é exibido com badge colorida
- [ ] Tags podem ser adicionadas e removidas
- [ ] Todas as operações funcionam corretamente

---

### Sprint 2.3: Lead Creation (Manual Form)

**Arquivos envolvidos:**
- `src/app/(dashboard)/leads/new/page.tsx` (novo)
- `src/components/leads/CreateLeadForm.tsx` (novo)
- `src/lib/supabase/leads.ts` (nova função)

**Dependências:** Sprint 2.2 completo

**Componentes reaproveitados:** Form components

**Contrato de dados:** Tipos já definidos

**Lógica principal:**

1. Adicionar função `createLead` em `leads.ts`:
   ```typescript
   export async function createLead(
     orgId: string,
     data: CreateLeadPayload
   ): Promise<Lead> {
     const supabase = createClient()

     const { data: lead, error } = await supabase
       .from('leads')
       .insert({
         org_id: orgId,
         email: data.email,
         first_name: data.first_name,
         last_name: data.last_name,
         phone: data.phone,
         company: data.company,
         position: data.position,
         score: data.score || 0,
         custom_fields: data.custom_fields || {},
         source: 'manual',
         external_id: data.external_id,
       })
       .select()
       .single()

     if (error) throw error

     // Adicionar tags se fornecidas
     if (data.tags && data.tags.length > 0) {
       const tagRecords = await supabase
         .from('lead_tags')
         .select()
         .eq('org_id', orgId)
         .in('name', data.tags)

       for (const tag of tagRecords.data || []) {
         await supabase
           .from('lead_tag_assignments')
           .insert({ lead_id: lead.id, tag_id: tag.id })
       }
     }

     return lead as Lead
   }
   ```

2. Criar `CreateLeadForm`:
   ```typescript
   // src/components/leads/CreateLeadForm.tsx
   'use client'

   import { useState } from 'react'
   import { useRouter } from 'next/navigation'
   import { useOrganization } from '@/hooks/useOrganization'
   import { useForm } from 'react-hook-form'
   import { zodResolver } from '@hookform/resolvers/zod'
   import { z } from 'zod'
   import { Button } from '@/components/ui/button'
   import { Input } from '@/components/ui/input'
   import { createLead } from '@/lib/supabase/leads'

   const formSchema = z.object({
     email: z.string().email('Email inválido'),
     first_name: z.string().optional(),
     last_name: z.string().optional(),
     phone: z.string().optional(),
     company: z.string().optional(),
     position: z.string().optional(),
     score: z.coerce.number().min(0).max(100).optional(),
   })

   type FormData = z.infer<typeof formSchema>

   export function CreateLeadForm() {
     const router = useRouter()
     const { organization } = useOrganization()
     const [loading, setLoading] = useState(false)
     const [error, setError] = useState<string | null>(null)
     const form = useForm<FormData>({
       resolver: zodResolver(formSchema),
     })

     const onSubmit = async (data: FormData) => {
       if (!organization) return

       setLoading(true)
       setError(null)
       try {
         await createLead(organization.id, data)
         router.push('/dashboard/leads')
       } catch (err) {
         setError('Erro ao criar lead')
       } finally {
         setLoading(false)
       }
     }

     return (
       <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
         <div>
           <label className="block text-sm font-medium mb-2">Email *</label>
           <Input {...form.register('email')} type="email" required />
           {form.formState.errors.email && (
             <p className="text-red-500 text-sm mt-1">{form.formState.errors.email.message}</p>
           )}
         </div>

         <div className="grid grid-cols-2 gap-4">
           <div>
             <label className="block text-sm font-medium mb-2">Nome</label>
             <Input {...form.register('first_name')} />
           </div>
           <div>
             <label className="block text-sm font-medium mb-2">Sobrenome</label>
             <Input {...form.register('last_name')} />
           </div>
         </div>

         <div className="grid grid-cols-2 gap-4">
           <div>
             <label className="block text-sm font-medium mb-2">Empresa</label>
             <Input {...form.register('company')} />
           </div>
           <div>
             <label className="block text-sm font-medium mb-2">Cargo</label>
             <Input {...form.register('position')} />
           </div>
         </div>

         <div className="grid grid-cols-2 gap-4">
           <div>
             <label className="block text-sm font-medium mb-2">Telefone</label>
             <Input {...form.register('phone')} type="tel" />
           </div>
           <div>
             <label className="block text-sm font-medium mb-2">Score (0-100)</label>
             <Input {...form.register('score')} type="number" min="0" max="100" />
           </div>
         </div>

         {error && (
           <div className="p-4 bg-red-100 text-red-800 rounded-lg">{error}</div>
         )}

         <div className="flex gap-4">
           <Button type="submit" disabled={loading}>
             {loading ? 'Criando...' : 'Criar Lead'}
           </Button>
           <Button
             type="button"
             variant="outline"
             onClick={() => router.back()}
           >
             Cancelar
           </Button>
         </div>
       </form>
     )
   }
   ```

3. Criar página `/new`:
   ```typescript
   // src/app/(dashboard)/leads/new/page.tsx
   'use client'

   import { CreateLeadForm } from '@/components/leads/CreateLeadForm'

   export default function NewLeadPage() {
     return (
       <div className="space-y-6">
         <h1 className="text-3xl font-bold">Criar Novo Lead</h1>
         <div className="bg-white rounded-lg shadow p-8">
           <CreateLeadForm />
         </div>
       </div>
     )
   }
   ```

**Critério de aceite:**
- [ ] Formulário carrega corretamente
- [ ] Validação de email funciona
- [ ] Lead é criado no banco de dados
- [ ] Redirect para leads page após criação
- [ ] Mensagens de erro aparecem
- [ ] Todos os campos são opcionais (exceto email)

---

### Sprint 2.4: CSV Import Wizard

**Arquivos envolvidos:**
- `src/app/(dashboard)/leads/import/page.tsx` (novo)
- `src/components/leads/CsvImportWizard.tsx` (novo)
- `src/components/leads/CsvUploadStep.tsx` (novo)
- `src/components/leads/CsvMapColumnsStep.tsx` (novo)
- `src/components/leads/CsvPreviewStep.tsx` (novo)
- `src/lib/csv.ts` (novo)
- `src/lib/supabase/leads.ts` (nova função)

**Dependências:** Sprint 2.3 completo

**Componentes reaproveitados:** Form components

**Contrato de dados:**
```typescript
// src/lib/csv.ts
export interface CsvRow {
  [key: string]: any
}

export interface CsvColumnMapping {
  csvColumn: string // nome da coluna no arquivo
  dbField: string // campo no banco (email, first_name, etc)
}

export interface CsvImportData {
  file: File | null
  rows: CsvRow[]
  columnMapping: CsvColumnMapping[]
  mappedData: CreateLeadPayload[]
}
```

**Lógica principal:**

1. Criar helper de CSV:
   ```typescript
   // src/lib/csv.ts
   export async function parseCsvFile(file: File): Promise<CsvRow[]> {
     return new Promise((resolve, reject) => {
       const reader = new FileReader()

       reader.onload = (e) => {
         try {
           const text = e.target?.result as string
           const lines = text.trim().split('\n')

           if (lines.length < 1) {
             reject(new Error('Arquivo CSV vazio'))
             return
           }

           // Parse header
           const header = lines[0].split(',').map(h => h.trim())

           // Parse rows
           const rows = lines.slice(1).map(line => {
             const values = line.split(',').map(v => v.trim())
             const row: CsvRow = {}
             header.forEach((key, index) => {
               row[key] = values[index] || ''
             })
             return row
           })

           resolve(rows)
         } catch (error) {
           reject(error)
         }
       }

       reader.onerror = () => reject(new Error('Erro ao ler arquivo'))
       reader.readAsText(file)
     })
   }

   export function mapCsvRows(
     rows: CsvRow[],
     columnMapping: CsvColumnMapping[]
   ): CreateLeadPayload[] {
     return rows.map(row => {
       const mapped: CreateLeadPayload = {
         email: '',
       }

       columnMapping.forEach(({ csvColumn, dbField }) => {
         const value = row[csvColumn]
         if (value && dbField === 'email') {
           mapped.email = value
         } else if (value && dbField === 'first_name') {
           mapped.first_name = value
         } else if (value && dbField === 'last_name') {
           mapped.last_name = value
         } else if (value && dbField === 'phone') {
           mapped.phone = value
         } else if (value && dbField === 'company') {
           mapped.company = value
         } else if (value && dbField === 'position') {
           mapped.position = value
         } else if (value && dbField === 'score') {
           mapped.score = parseInt(value, 10)
         }
       })

       return mapped
     })
   }
   ```

2. Adicionar função bulk import:
   ```typescript
   // em src/lib/supabase/leads.ts
   export async function bulkImportLeads(
     orgId: string,
     leads: CreateLeadPayload[]
   ): Promise<{ success: number; failed: number; errors: string[] }> {
     const supabase = createClient()
     let success = 0
     let failed = 0
     const errors: string[] = []

     for (const leadData of leads) {
       try {
         await createLead(orgId, leadData)
         success++
       } catch (error) {
         failed++
         errors.push(`${leadData.email}: ${error}`)
       }
     }

     return { success, failed, errors }
   }
   ```

3. Criar wizard component:
   ```typescript
   // src/components/leads/CsvImportWizard.tsx
   'use client'

   import { useState } from 'react'
   import { CsvUploadStep } from './CsvUploadStep'
   import { CsvMapColumnsStep } from './CsvMapColumnsStep'
   import { CsvPreviewStep } from './CsvPreviewStep'
   import { Button } from '@/components/ui/button'
   import type { CsvRow, CsvColumnMapping } from '@/lib/csv'

   type Step = 'upload' | 'mapping' | 'preview' | 'complete'

   export function CsvImportWizard() {
     const [step, setStep] = useState<Step>('upload')
     const [file, setFile] = useState<File | null>(null)
     const [rows, setRows] = useState<CsvRow[]>([])
     const [columnMapping, setColumnMapping] = useState<CsvColumnMapping[]>([])
     const [imported, setImported] = useState(false)

     return (
       <div className="space-y-6">
         <div className="flex gap-2">
           {['upload', 'mapping', 'preview'].map((s) => (
             <div
               key={s}
               className={`flex-1 h-1 rounded-full ${
                 ['upload', 'mapping', 'preview'].indexOf(s) < ['upload', 'mapping', 'preview'].indexOf(step)
                   ? 'bg-green-500'
                   : s === step
                   ? 'bg-blue-500'
                   : 'bg-gray-300'
               }`}
             />
           ))}
         </div>

         <div className="bg-white rounded-lg shadow p-8">
           {step === 'upload' && (
             <CsvUploadStep
               onNext={(f, r) => {
                 setFile(f)
                 setRows(r)
                 setStep('mapping')
               }}
             />
           )}

           {step === 'mapping' && (
             <CsvMapColumnsStep
               rows={rows}
               onNext={(mapping) => {
                 setColumnMapping(mapping)
                 setStep('preview')
               }}
               onBack={() => setStep('upload')}
             />
           )}

           {step === 'preview' && (
             <CsvPreviewStep
               rows={rows}
               columnMapping={columnMapping}
               onComplete={() => setStep('complete')}
               onBack={() => setStep('mapping')}
             />
           )}

           {step === 'complete' && (
             <div className="text-center space-y-4">
               <h2 className="text-2xl font-semibold text-green-600">Importação Concluída!</h2>
               <p>Seus leads foram importados com sucesso.</p>
               <Button onClick={() => window.location.href = '/dashboard/leads'}>
                 Ver Todos os Leads
               </Button>
             </div>
           )}
         </div>
       </div>
     )
   }
   ```

4. Criar steps do wizard...

**Critério de aceite:**
- [ ] Upload de arquivo funciona
- [ ] Arquivo é parseado corretamente
- [ ] Mapeamento de colunas funciona
- [ ] Preview mostra dados mapeados
- [ ] Bulk import cria leads no banco
- [ ] Mensagens de sucesso/erro aparecem

Continuaremos na próxima parte com **Sprint 2.5-2.7** e **Sprints 3-6**...

---

## Variáveis de Ambiente Phase 1

```bash
# .env.local

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# MailerSend
MAILERSEND_API_KEY=mlsn_...

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Auth
NEXT_PUBLIC_AUTH_CALLBACK_URL=http://localhost:3000/auth/callback
```

---

## Setup MailerSend

1. Criar conta em mailersend.com
2. Gerar API Key (Settings → API Keys)
3. Configurar domínio de envio (Domain Settings)
4. Configurar webhooks (Settings → Webhooks):
   - Events: `email.sent`, `email.delivered`, `email.opened`, `email.clicked`, `email.bounced`, `email.complained`
   - URL: `https://seu-dominio.com/api/webhooks/mailersend`

---

## Setup Supabase

1. Criar projeto em supabase.com
2. Copiar `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Executar migrations (via SQL Editor):
   - `001_core_tables.sql`
   - `006_api_keys.sql`
   - `007_invitations_table.sql`
4. Configurar Auth:
   - Email/Password: Habilitado
   - Magic Link: Habilitado
   - Email templates: Customizar se necessário
5. Configurar políticas de RLS (já incluídas nas migrations)

---

## Estratégia de Testing Phase 1

### Unit Tests
- `lib/csv.ts` - parseCsvFile, mapCsvRows
- `lib/supabase/leads.ts` - createLead, queryLeads, bulkImportLeads

### Integration Tests
- Auth flow (login, signup, magic link)
- Leads CRUD (create, read, update, delete)
- CSV import flow
- Organization management

### E2E Tests (Cypress/Playwright)
- Complete user flow: signup → create org → import leads → send campaign

### Manual Testing Checklist
- [ ] Signup e login funcionam
- [ ] Dashboard carrega corretamente
- [ ] Organization crud funciona
- [ ] Leads podem ser criados, listados, filtrados
- [ ] CSV import completo funciona
- [ ] Segmentos podem ser criados (manuais)
- [ ] Templates podem ser criados/editados
- [ ] Campanhas podem ser criadas e agendadas
- [ ] Email é enviado corretamente via MailerSend
- [ ] Webhooks de MailerSend atualizam stats

---

## Notas Importantes

1. **RLS é crítico:** Todas as operações devem passar por RLS para garantir isolamento de dados por organização
2. **API Keys:** Usar SHA-256 hash, nunca armazenar raw key
3. **Paginação:** Implementar cursor-based pagination para escalabilidade
4. **Validação:** Sempre validar dados no servidor (nunca confiar em dados do cliente)
5. **Transações:** Para operações que envolvem múltiplas tabelas, usar transações SQL
6. **Performance:** Usar índices nas colunas frequently queried (org_id, status, created_at)
7. **Segurança:** Middleware deve verificar autenticação em todas as rotas /dashboard
8. **Logs:** Registrar todas as ações de importação para auditoria

---

## Estrutura de Diretórios Esperada Após Phase 1

```
/plataforma-email
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   └── magic-link/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── leads/
│   │   │   │   ├── page.tsx (lista)
│   │   │   │   ├── [id]/page.tsx (detalhe)
│   │   │   │   ├── new/page.tsx (criar)
│   │   │   │   └── import/page.tsx (CSV)
│   │   │   ├── segments/page.tsx
│   │   │   ├── templates/page.tsx
│   │   │   ├── campaigns/page.tsx
│   │   │   └── settings/page.tsx
│   │   ├── api/
│   │   │   ├── webhooks/
│   │   │   │   ├── leads/route.ts
│   │   │   │   ├── events/route.ts
│   │   │   │   └── mailersend/route.ts
│   │   │   └── auth/
│   │   ├── middleware.ts
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/ (shadcn/ui components)
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── leads/
│   │   ├── segments/
│   │   ├── templates/
│   │   ├── campaigns/
│   │   └── settings/
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useOrganization.ts
│   │   └── useLeads.ts
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts
│   │   │   ├── server.ts
│   │   │   ├── middleware.ts
│   │   │   ├── organizations.ts
│   │   │   ├── leads.ts
│   │   │   ├── invitations.ts
│   │   │   └── database.types.ts
│   │   ├── mailersend/
│   │   │   └── client.ts
│   │   ├── types.ts
│   │   ├── constants.ts
│   │   ├── utils.ts
│   │   └── csv.ts
│   └── styles/
├── supabase/
│   ├── migrations/
│   │   ├── 001_core_tables.sql
│   │   ├── 006_api_keys.sql
│   │   └── 007_invitations_table.sql
│   └── edge-functions/
│       └── handle-mailersend-webhook/
├── public/
├── .env.local
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## Próximas Fases (Fora de Scope Phase 1)

- **Phase 2:** Automações, rules de resegmentação
- **Phase 3:** Webhooks customizados, integrações externas
- **Phase 4:** A/B testing, analytics avançado
- **Phase 5:** Mobile app, offline support

---

**Documento criado em:** 2026-03-05
**Versão:** 1.0
**Status:** Pronto para Implementação
**Próximo:** Executar Sprint 1.1 (Project Scaffold)
