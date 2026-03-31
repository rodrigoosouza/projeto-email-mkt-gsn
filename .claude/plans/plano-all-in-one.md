# Plano: Plataforma All-in-One — Auto-Setup Completo

## Contexto

O usuario quer transformar a plataforma em um produto SaaS all-in-one onde:
- Cliente preenche briefing → tudo e criado automaticamente (GTM, GA4, site, blog, campanhas)
- Organizacoes hierarquicas (agencia → clientes → sub-clientes)
- CMS por org para blog/artigos com SEO
- Campanhas criadas direto na plataforma (sem ir no Meta/Google)
- Controle granular de acessos

## Estado Atual

- Organizacoes: FLAT (sem hierarquia, sem parent_id)
- Roles: admin, editor, viewer
- GTM/GA4: so leitura (1 property fixa)
- Blog/CMS: NAO EXISTE
- Campanhas: criacao basica Meta Ads (bloqueada — app em dev mode)
- Site builder: LP builder basico
- 27 campos ocultos de tracking: implementados no form

---

## FASE 1: Organizacoes Hierarquicas + Acessos (Fundacao)

**Prioridade: CRITICA — tudo depende disso**

### 1.1 Migration: Hierarquia de Orgs
```
ALTER TABLE organizations ADD COLUMN parent_org_id UUID REFERENCES organizations(id);
ALTER TABLE organizations ADD COLUMN org_type TEXT DEFAULT 'client';
  -- 'agency', 'client', 'sub_client'
ALTER TABLE organizations ADD COLUMN depth INTEGER DEFAULT 0;
  -- 0=raiz, 1=cliente de agencia, 2=sub-cliente
CREATE INDEX idx_org_parent ON organizations(parent_org_id);
```

### 1.2 Migration: Permissoes Granulares
```
CREATE TABLE org_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id),
  role TEXT NOT NULL, -- admin, editor, viewer, client_admin
  resource TEXT NOT NULL, -- 'leads', 'campaigns', 'analytics', 'blog', 'settings', 'billing'
  can_create BOOLEAN DEFAULT false,
  can_read BOOLEAN DEFAULT true,
  can_update BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false
);
```

### 1.3 RLS: Visibilidade Hierarquica
- Funcao `get_visible_org_ids()`: retorna org_ids que o user pode ver
  - Se admin de agencia: ve a agencia + todos os clientes + sub-clientes
  - Se admin de cliente: ve so o cliente + sub-clientes
  - Se viewer: ve so a org dele
- Atualizar TODAS as RLS policies para usar essa funcao

### 1.4 UI: Seletor de Org com Hierarquia
- Sidebar mostra arvore: Agencia > Cliente > Sub-cliente
- Trocar de contexto entre orgs
- Admin da agencia pode "entrar" na org do cliente

### Arquivos a modificar:
- `supabase/migrations/028_org_hierarchy.sql` (NOVO)
- `src/lib/types.ts` — adicionar parent_org_id, org_type, depth
- `src/hooks/use-organization.ts` — carregar arvore hierarquica
- `src/contexts/organization-context.tsx` — expor orgs filhas
- `src/components/layout/sidebar.tsx` — seletor hierarquico
- `src/lib/supabase/organizations.ts` — CRUD com hierarquia

---

## FASE 2: Auto-Setup GTM + GA4 por Organizacao

**Objetivo: Ao criar org, configurar GTM e GA4 automaticamente**

### 2.1 Google Tag Manager API
- POST `https://www.googleapis.com/tagmanager/v2/accounts/{accountId}/containers`
- Cria container GTM por org
- Configura tags padrao: GA4, Meta Pixel, Google Ads, form_submit_lead
- Configura variaveis DOM para os 27 campos ocultos
- Configura triggers: form_submit_lead, page_view, scroll

### 2.2 Google Analytics 4 Admin API
- POST `https://analyticsadmin.googleapis.com/v1beta/properties`
- Cria property GA4 por org
- Configura conversoes: generate_lead, form_submit, page_view
- Cria data stream (web)
- Retorna Measurement ID (G-XXXXXX)

### 2.3 Migration: Config por Org
```
CREATE TABLE org_tracking_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) UNIQUE,
  gtm_container_id TEXT, -- GTM-XXXXXXX
  gtm_account_id TEXT,
  ga4_property_id TEXT, -- 520595508
  ga4_measurement_id TEXT, -- G-XXXXXXXXX
  ga4_data_stream_id TEXT,
  meta_pixel_id TEXT,
  google_ads_conversion_id TEXT,
  tracking_script TEXT, -- script completo para injetar nas paginas
  auto_created BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 2.4 API: /api/tracking/auto-setup
- Recebe org_id
- Cria GTM container + GA4 property
- Configura tudo automatico
- Salva IDs no org_tracking_config
- Gera script de tracking para injetar nas LPs/site/blog

### Arquivos:
- `supabase/migrations/029_org_tracking_config.sql` (NOVO)
- `src/lib/analytics/gtm-admin.ts` (NOVO)
- `src/lib/analytics/ga4-admin.ts` (NOVO)
- `src/app/api/tracking/auto-setup/route.ts` (NOVO)

---

## FASE 3: CMS/Blog por Organizacao

**Objetivo: Cada org tem seu blog com CMS completo**

### 3.1 Migration: Tabelas de Blog
```
CREATE TABLE blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id),
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  content TEXT, -- markdown ou HTML
  excerpt TEXT,
  featured_image TEXT,
  author_id UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'draft', -- draft, review, scheduled, published
  published_at TIMESTAMPTZ,
  scheduled_at TIMESTAMPTZ,
  -- SEO
  seo_title TEXT,
  seo_description TEXT,
  seo_keywords TEXT[],
  canonical_url TEXT,
  og_image TEXT,
  -- Categorias
  category TEXT,
  tags TEXT[],
  -- Metricas
  views_count INTEGER DEFAULT 0,
  reading_time_min INTEGER,
  -- IA
  ai_generated BOOLEAN DEFAULT false,
  ai_prompt TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, slug)
);

CREATE TABLE blog_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  UNIQUE(org_id, slug)
);

CREATE TABLE blog_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) UNIQUE,
  blog_title TEXT,
  blog_description TEXT,
  custom_domain TEXT,
  theme TEXT DEFAULT 'default',
  colors JSONB, -- primary, secondary, accent
  logo_url TEXT,
  analytics_snippet TEXT, -- GTM/GA4 code
  social_links JSONB,
  cta_config JSONB -- pop-up, sidebar, inline CTAs
);
```

### 3.2 Paginas CMS
- `/blog` — listagem de posts (por org)
- `/blog/new` — editor de post (rich text + markdown + IA)
- `/blog/[slug]/edit` — editar post
- `/blog/settings` — config do blog

### 3.3 Editor de Post
- Rich text editor (TipTap ou similar)
- Campo "Gerar com IA" — usa OpenRouter para gerar artigo completo
- "Gerar imagem destaque" — usa Gemini para gerar imagem
- SEO score em tempo real (titulo, descricao, keywords, legibilidade)
- Preview antes de publicar

### 3.4 Blog Publico
- Rota: `/b/[orgSlug]` — blog publico renderizado
- `/b/[orgSlug]/[postSlug]` — artigo individual
- SSR para SEO
- Injecta GTM/GA4 da org automaticamente
- Schema.org markup para artigos

### Arquivos:
- `supabase/migrations/030_blog_cms.sql` (NOVO)
- `src/app/(dashboard)/blog/page.tsx` (NOVO)
- `src/app/(dashboard)/blog/new/page.tsx` (NOVO)
- `src/app/(dashboard)/blog/[slug]/edit/page.tsx` (NOVO)
- `src/app/(dashboard)/blog/settings/page.tsx` (NOVO)
- `src/app/b/[orgSlug]/page.tsx` (NOVO — blog publico)
- `src/app/b/[orgSlug]/[postSlug]/page.tsx` (NOVO — artigo publico)
- `src/components/blog/post-editor.tsx` (NOVO)
- `src/components/blog/seo-score.tsx` (NOVO)

---

## FASE 4: Site Builder Automatico

**Objetivo: Gerar site completo baseado no briefing da org**

### 4.1 Migration: Estrutura do Site
```
CREATE TABLE org_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id),
  domain TEXT,
  template TEXT DEFAULT 'business', -- business, saas, ecommerce, portfolio
  pages JSONB, -- array de paginas com estrutura
  global_styles JSONB, -- cores, fontes, logo
  navigation JSONB, -- menu
  footer JSONB,
  seo_global JSONB, -- titulo padrao, descricao, og_image
  gtm_id TEXT, -- GTM container da org
  status TEXT DEFAULT 'draft', -- draft, building, published
  published_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE site_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES org_sites(id),
  org_id UUID,
  slug TEXT NOT NULL, -- 'home', 'about', 'services', 'contact', 'blog'
  title TEXT,
  sections JSONB, -- array de blocos (hero, features, testimonials, cta, etc)
  seo JSONB,
  sort_order INTEGER DEFAULT 0,
  UNIQUE(site_id, slug)
);
```

### 4.2 API: /api/sites/auto-generate
- Recebe: org_id, briefing (persona, ICP, cores, logo)
- IA gera estrutura do site completa
- Paginas: Home, Sobre, Servicos, Cases, Blog, Contato
- Deploy automatico via Vercel API
- Injeta GTM + GA4 + Pixel + campos ocultos

### Arquivos:
- `supabase/migrations/031_org_sites.sql` (NOVO)
- `src/app/api/sites/auto-generate/route.ts` (NOVO)
- `src/app/(dashboard)/site/page.tsx` (NOVO)
- `src/lib/site-builder/templates/` (NOVO — templates de pagina)

---

## FASE 5: Campanhas Meta Ads + Google Ads (Criacao Completa)

**Objetivo: Criar e gerenciar campanhas sem sair da plataforma**

### 5.1 Resolver bloqueio Meta App
- Verificar empresa no Meta Business Manager
- OU criar System User Token
- Sem isso, criacao de ads nao funciona

### 5.2 Google Ads API
- Integrar Google Ads API para criacao de campanhas
- Service account ou OAuth2
- Criar campanhas Search, Display, Video

### 5.3 UI Completa de Campanhas
- Wizard: Objetivo → Publico → Criativo → Orcamento → Review → Publicar
- Preview do anuncio antes de publicar
- Duplicar campanhas entre plataformas
- A/B test automatico

### Arquivos:
- `src/app/(dashboard)/campaigns/create/page.tsx` (NOVO — wizard)
- `src/lib/analytics/google-ads-client.ts` (NOVO)
- `src/app/api/google-ads/campaigns/route.ts` (NOVO)

---

## FASE 6: Auto-Setup Completo (Orquestracao)

**Objetivo: Um clique → tudo criado**

### Fluxo:
```
1. Usuario cria org com briefing
2. Auto-setup dispara:
   ├── Cria GTM container + configura tags
   ├── Cria GA4 property + conversoes
   ├── Gera site completo (5-6 paginas)
   ├── Configura blog com categorias
   ├── Cria formularios com campos ocultos
   ├── Gera 5 templates de email (nurture)
   ├── Cria automacao (form → email → tag)
   ├── Gera 6 campanhas ads (3 Meta + 3 Google)
   ├── Gera ~30 posts calendario (Metodo Hyesser)
   └── Deploy site + blog na Vercel
3. Cliente recebe tudo pronto, so precisa aprovar
```

---

## Ordem de Execucao Recomendada

| Fase | Descricao | Dependencia | Estimativa |
|------|-----------|-------------|------------|
| **1** | Orgs hierarquicas + acessos | Nenhuma | Fundacao |
| **2** | GTM + GA4 auto-setup | Fase 1 | APIs Google |
| **3** | CMS/Blog por org | Fase 1 | Editor + SSR |
| **4** | Site builder automatico | Fases 1,2,3 | Templates + Deploy |
| **5** | Campanhas completas | Fase 1 + Meta/Google access | APIs Ads |
| **6** | Orquestracao auto-setup | Todas | Integracao final |

## Pre-requisitos Externos

1. **Google Cloud Project** com APIs habilitadas:
   - Tag Manager API
   - Analytics Admin API
   - Google Ads API
2. **Meta Business Verification** (para sair do dev mode)
3. **Documentacoes do usuario** (templates de site, estrategias, diretrizes)

## Verificacao

- Fase 1: Criar org filha, verificar RLS, trocar contexto
- Fase 2: Auto-criar GTM/GA4, verificar no Google
- Fase 3: Criar post, publicar, verificar SEO
- Fase 4: Gerar site, verificar deploy
- Fase 5: Criar campanha Meta, verificar no Ads Manager
- Fase 6: Rodar auto-setup completo, verificar tudo criado
