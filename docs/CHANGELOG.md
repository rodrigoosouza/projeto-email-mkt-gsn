# Changelog

Registro de todas as implementacoes do projeto, organizado por sprint.

---

## Fix Email Sending + Credenciais Completas (2026-03-07)

### Infraestrutura Completa
- Todas as 19 migrations verificadas e aplicadas no Supabase
- Supabase Auth: email/password habilitado, usuario admin confirmado
- Icones PWA criados: icon-192x192.png + icon-512x512.png
- Dominio default MailerSend: `rodriguinhodomarketing.com.br` (verificado)

### Fix Envio de Email (MailerSend)
- **Bug:** Fallback de remetente era `noreply@example.com` e `noreply@plataforma-email.com` — dominios nao verificados no MailerSend, causando rejeicao silenciosa
- **Fix:** Fallback alterado para dominio trial verificado (`test-z0vklo6vz81l7qrx.mlsender.net`)
- Nova env var `MAILERSEND_DEFAULT_DOMAIN` para configurar dominio padrao
- Validacao pre-envio: bloqueia campanha se email de remetente invalido
- Dominios verificados na conta: `rodriguinhodomarketing.com.br` + `test-z0vklo6vz81l7qrx.mlsender.net`
- Teste direto via API: HTTP 202 (sucesso)

### Credenciais Configuradas
- Supabase Service Role Key: configurada (JWT com role service_role)
- MailerSend API Key: configurada + dominio verificado
- n8n: API Key + Base URL (`https://n8n.rodriguinhodomarketing.com.br`)
- Vercel: Access Token + Team ID (`team_PYHCery8NslIHlAPOah68Sgz`)
- OpenRouter: ja configurado anteriormente

---

## Fix LP Truncada + Deploy Vercel + Credenciais (2026-03-07)

### Fix Landing Page Truncada
- **Bug:** `max_tokens: 16000` nao era suficiente para LPs completas — HTML cortado na 3a secao
- **Fix:** Sistema de continuacao automatica quando `finish_reason === 'length'`:
  - Detecta truncamento e envia pedido de continuacao ao modelo
  - Ate 3 continuacoes automaticas (16K tokens cada)
  - Fecha tags HTML se necessario (`</body>`, `</html>`)
  - Log detalhado de cada continuacao para debug

### Deploy Vercel Funcional
- **Bug:** Env var com nome errado: codigo usava `VERCEL_TOKEN`, .env.local tinha `VERCEL_ACCESS_TOKEN`
- **Fix:** Alinhado para `VERCEL_ACCESS_TOKEN` em route.ts e deploy.ts
- Melhorado tratamento de erro do deploy (mostra mensagem real da API)
- Alinhado nomes dos campos de retorno (`vercelUrl`, `deploymentId`)

### Credenciais Configuradas
- MailerSend API Key: configurada
- n8n API Key: configurada
- Supabase Service Role Key: pendente (usuario enviou anon key por engano)

---

## Fix LP Builder Mensagens + Preview Formulario (2026-03-07)

### Fix Landing Page Builder — Mensagens Consecutivas
- **Bug:** Quando a copy da estrategia de marketing era carregada, duas mensagens `assistant` consecutivas eram adicionadas (boas-vindas + selecao de tema), violando o requisito do OpenRouter/Anthropic de alternancia user/assistant.
- **Fix:** Merge automatico de mensagens consecutivas do mesmo role antes de enviar para a API
- Tema visual (escuro/claro) agora e incluido como prefixo na primeira mensagem do usuario
- Conteudo multimodal (imagens) passado diretamente ao OpenRouter sem stringify

### Preview Visual do Formulario
- **Bug:** Pagina de detalhe do formulario (`forms/[id]`) mostrava apenas info tecnica (embed code, lista de campos no sidebar), sem preview visual
- **Fix:** Adicionado card "Preview do Formulario" com renderizacao visual de cada campo:
  - Inputs de texto, email, telefone com placeholders
  - Selects com opcoes renderizadas
  - Textareas com altura minima
  - Indicador de campos obrigatorios (*)
  - Botao "Enviar" estilizado
  - Badge de tracking se habilitado (26 campos ocultos)

---

## Fix LP Builder + Tracking Journey API + Campos Ocultos Completos (2026-03-06)

### Campos Padrao do Formulario Pre-preenchidos
- Formulario agora inicia com 6 campos padrao (antes: so email):
  - Nome completo (text, obrigatorio)
  - Email (email, obrigatorio)
  - WhatsApp (phone, obrigatorio)
  - Empresa (text, obrigatorio)
  - Cargo (text, opcional)
  - Faturamento mensal (select: 5 faixas, opcional)
- Usuario pode remover qualquer campo ou adicionar novos
- Alinhado com o formulario padrao da documentacao de tracking (`context/references/tracking-integration.md`)

### Criar Segmento Inline no Formulario
- Botao "Criar novo segmento" abaixo do select de segmentos
- Campo de texto inline com botoes Criar/Cancelar
- Cria segmento estatico direto na tela do formulario (sem sair da pagina)
- Seleciona automaticamente o segmento recem-criado
- Suporte a Enter para criar rapidamente

### Fix Landing Page Builder — Erro ao Gerar LP
- **Bug:** API route (`/api/lp-builder/chat/route.ts`) verificava `ANTHROPIC_API_KEY` (vazia no .env.local) mas o codigo usa `OPENROUTER_API_KEY` (configurada). Resultado: erro 500 silencioso.
- **Fix:** Trocada verificacao para `OPENROUTER_API_KEY`
- Melhorado tratamento de erro no frontend (`landing-pages/new/page.tsx`):
  - Agora mostra a mensagem real do erro (antes: mensagem generica)
  - Loga detalhes no console
- Melhorado tratamento de erro no `sendMessage` (`lib/lp-builder/claude.ts`):
  - Captura body do erro do OpenRouter para diagnostico

### Fix Lead Tracking Journey — RLS nas Tabelas Legadas
- **Bug:** `useTrackingJourney` usava `createClient()` do browser que, com user autenticado, envia JWT com role `authenticated`. Tabelas legadas (events, conversions, lead_journey) possivelmente bloqueiam esse role via RLS. Resultado: 0 rows retornadas.
- **Fix:** Criada API route server-side `/api/tracking/journey` que:
  - Verifica autenticacao do user (auth check via server client)
  - Usa client separado com anon key (sem sessao) para consultar tabelas legadas
  - Consulta `lead_journey` e `events` em todas as orgs (Templum, Orbit, Evolutto)
  - Retorna `{ lead, events }` para o frontend
- Reescrito `src/hooks/tracking/useTrackingJourney.ts`:
  - Antes: query direto Supabase client-side (bloqueado por RLS)
  - Agora: fetch para `/api/tracking/journey` (server-side, bypassa RLS)
  - Aceita parametro `orgSlug` opcional para filtrar por org
- Atualizado `lead-tracking-journey.tsx` e `tracking/leads/[email]/page.tsx` para nova assinatura

### Campos Ocultos do Formulario — Alinhamento Completo com GTM
- Antes: 19 campos ocultos. Agora: **26 campos ocultos** (+7 novos)
- Novos campos adicionados no form-builder.tsx:
  - `twclid` (Twitter/X click ID) — grupo Click IDs
  - `fbc` (Facebook browser cookie) — grupo Cookies
  - `fbp` (Facebook pixel cookie) — grupo Cookies
  - `ttp` (TikTok pixel cookie) — grupo Cookies
  - `first_visit` (timestamp primeiro acesso) — grupo Sessao
  - `ref` (parametro de referencia) — grupo Sessao
  - `user_agent` (navegador do usuario) — grupo Sessao
- Script de tracking embarcado reescrito para alinhar 100% com GTM:
  - Domain dinamico (auto-detect `.dominio.com` da URL)
  - SameSite=Lax (compativel Safari iOS) em vez de SameSite=None
  - Session key `apex_session_id` (igual GTM)
  - Referrer map completo: 23 dominios (search, social, AI: chatgpt, gemini, claude, poe)
  - Geracao de cookie `_fbc` a partir do `fbclid`
  - Captura `ref` param da URL
  - DataLayer completo: first-touch (ft_*) + last-touch + extras
  - Scroll depth tracking (25%, 50%, 75%, 90%) com time_on_page
  - Heartbeat time on page (30s, max 20 = 10min)
  - `time_on_page_at_submit` no payload do form
  - `custom_page_view` event com hostname e referrer

### Arquivos Modificados
- `src/app/api/lp-builder/chat/route.ts` — fix env check
- `src/app/api/tracking/journey/route.ts` — NOVO, API route server-side
- `src/lib/lp-builder/claude.ts` — melhor tratamento de erro OpenRouter
- `src/app/(dashboard)/landing-pages/new/page.tsx` — melhor erro no chat
- `src/hooks/tracking/useTrackingJourney.ts` — reescrito para usar API
- `src/components/leads/lead-tracking-journey.tsx` — passa orgSlug ao hook
- `src/app/(dashboard)/tracking/leads/[email]/page.tsx` — nova assinatura hook
- `src/components/forms/form-builder.tsx` — 26 campos ocultos + script completo

---

## Tracking Journey + Formularios com UTM + Tema Escuro + Integrações UX (2026-03-06)

### Lead Tracking Journey
- Criado componente `src/components/leads/lead-tracking-journey.tsx`
  - Exibe jornada completa do lead: sessoes, pageviews, formularios, score
  - Atribuicao First Touch / Last Touch com badges de canal
  - Metricas: max scroll, tempo medio, primeiro contato, dias ate venda
  - Info de deal (titulo, status, valor) quando existente
  - Paginas visitadas (lista com badges)
  - Timeline de sessoes expandivel por sessao (agrupado por session_id)
  - Usa `useTrackingJourney` hook que consulta tabelas legadas (lead_journey, events)
  - Filtra por email e org slug (multi-org: Templum, Orbit, Evolutto)
- Integrado na pagina `leads/[id]/page.tsx` (abaixo de LeadTimeline)
  - Passa `lead.email` e `currentOrg?.slug`

### Formularios com Campos Ocultos de Tracking
- Reescrito `src/components/forms/form-builder.tsx` com suporte completo a tracking
  - Secao "Campos Ocultos de Tracking" com toggle on/off (ativo por padrao)
  - 19 campos ocultos: 5 UTMs + 10 Click IDs + 4 sessao
  - Campos UTMs: utm_source, utm_medium, utm_campaign, utm_content, utm_term
  - Click IDs: gclid, fbclid, gbraid, wbraid, ttclid, gad_campaignid, gad_source, msclkid, li_fat_id, sck
  - Sessao: session_id, landing_page, origin_page, session_attributes_encoded
  - Campos de configuracao: Cookie Domain e Webhook URL
  - Botao "Codigo HTML" gera embed completo com script de tracking
  - Script gerado inclui: captura UTMs/click IDs, cookies, referrer mapping, session ID, dataLayer push, form submit handler
  - Info box explicando funcionalidade dos campos ocultos
  - Lista expansivel mostrando todos os campos incluidos
- Corrigido bug `SelectItem value=""` (Radix Select nao permite valor vazio)
  - form-builder.tsx: segment select usa value="none"
  - whatsapp/broadcasts/page.tsx: usa value="all"
  - audience-exports/page.tsx: usa value="all"

### Tema Escuro (Dark Mode)
- Instalado `next-themes` para suporte a temas
- Criado `src/components/shared/theme-provider.tsx` (wrapper NextThemesProvider)
- Adicionado ThemeProvider no root layout (`src/app/layout.tsx`)
  - `attribute="class"`, `defaultTheme="system"`, `enableSystem`, `disableTransitionOnChange`
  - `suppressHydrationWarning` no `<html>`
- Dark mode CSS ja existia em globals.css (variaveis .dark)
- Tailwind config ja tinha `darkMode: ['class']`
- Criado `src/components/settings/appearance-settings.tsx`
  - 3 opcoes: Claro (Sun), Escuro (Moon), Sistema (Monitor)
  - Cards selecionaveis com icone, label e descricao
  - Preview visual ao vivo (simula layout da plataforma)
  - Adicionado como aba "Aparencia" em Settings (entre Integracoes e White Label)

### Integracoes — UX Melhorada
- Reescrito `src/components/settings/integrations-manager.tsx`
  - Adicionado secao expansivel "Como configurar?" em cada integracao
  - Passos numerados com instrucoes claras para obter as chaves
  - Links diretos para paineis/consoles de cada servico:
    - MailerSend: app.mailersend.com/api-tokens
    - WhatsApp: business.facebook.com
    - Twilio: console.twilio.com
    - GA4: analytics.google.com
    - GTM: tagmanager.google.com
    - Google Ads: ads.google.com
    - Meta Ads: business.facebook.com
    - OpenRouter: openrouter.ai/keys
    - n8n: docs.n8n.io/api
    - Vercel: vercel.com/account/tokens
  - Help text em cada campo explicando onde encontrar o valor
  - Botao eye/toggle para mostrar/ocultar campos de senha
  - Descricao por categoria de integracoes

### Email Template Builder — Layout Corrigido
- Reescrito `src/components/templates/template-form.tsx` — elimina scroll-dentro-de-scroll
  - Step 1 (info): formulario normal com Card
  - Step 2 (visual): layout full-screen (`-m-6`, `calc(100vh - 64px)`)
    - Top bar com Voltar, nome do template, toggle Visual/HTML
    - Unlayer preenche 100% do espaco restante (sem scroll interno)
  - Step 2 (HTML): layout normal com Card colapsavel do step 1
- Reescrito `src/components/templates/unlayer-editor.tsx`
  - Usa `flex flex-col h-full` + `flex-1 min-h-0` para preencher container pai
  - Toolbar e editor flexiveis, sem altura fixa

---

## Enriquecimento da Estrategia + Brand API (2026-03-06)

### API: Generate Brand Identity
- Criada rota `/api/marketing/generate-brand/route.ts`
- Gera arquetipo, cores, tom de voz, personalidade, promessa e taglines via OpenRouter
- Usa contexto de briefing, persona e ICP para gerar identidade coerente
- Auto-save no componente `brand-identity-form.tsx`

### Strategy Viewer — Reescrita Completa
- Portado visual completo do grow-automaton com todas as secoes detalhadas
- **Persona**: Dores primarias/secundarias, desejos, medos, gatilhos, buscas, influenciadores, prova necessaria
- **ICP**: Influenciadores, gatilhos de compra, barreiras, sinais de prontidao, concorrentes
- **Horarios**: Justificativas por faixa horaria com visual border-left
- **Palavras-chave**: Estrategia de correspondencia, regras, insights de intencao
- **Anuncios**: Copy-to-clipboard com contador de caracteres (30/90), toggle para preview Google Ads
- **Pagina CRO**: Toggle entre componentes e preview visual completo da landing page
- **Campanhas**: Cards expansiveis com cores por tipo, configuracoes, segmentacoes, metricas, budget

### Novos Componentes
- `src/components/marketing/google-ads-preview.tsx` — Simulacao realista do Google Ads
  - Toggle Desktop/Mobile, navegacao de titulos/descricoes, shuffle, estatisticas de combinacoes
- `src/components/marketing/cro-page-preview.tsx` — Preview visual completo de landing page
  - Hero com headline/CTA, secao "por que agora", beneficios, como funciona, FAQ, prova social, video, CTA final

---

## Perfil de Marketing + Business Plan (2026-03-06)

**Origem:** Portado do projeto `grow-automaton` com adaptacoes para multi-tenant SaaS.

### Correcoes Criticas
- **RLS infinite recursion** — Policies de `organization_members` e `organizations` tinham
  subqueries auto-referenciando a mesma tabela, causando loop infinito no PostgreSQL.
  Criadas funcoes `SECURITY DEFINER`: `get_user_org_ids()` e `is_org_admin()`.
  Migration: `018_fix_rls_recursion.sql`
- **Organizacoes nao carregavam** — Hook `use-organization` nao escutava `onAuthStateChange`,
  e `switchOrganization` tinha stale closure. Corrigido com `useRef` e listener de auth.

### Migration 019: Marketing Profiles
- Tabela `org_marketing_profiles` — 1 por org, JSONB para cada secao:
  - `briefing` (36 perguntas, 12 secoes)
  - `persona` (17 campos — quemE, idade, cargo, dores, desejos, gatilhos, etc.)
  - `icp` (15 campos — tipoEmpresa, segmento, ticket, barreiras, sinais, etc.)
  - `strategy` (horarios, palavrasChave, anuncios, paginaCRO, campanhas)
  - `business_plan` (params financeiros + resultados calculados)
  - `brand_identity` (cores, tom de voz, valores)
- Tabela `industry_benchmarks` — 10 segmentos pre-carregados (consultoria, SaaS, educacao,
  ecommerce, saude, industria, servicos, imobiliario, financeiro, agro)
- RLS usando `get_user_org_ids()` e `is_org_admin()` (sem recursao)

### Tipos TypeScript (`src/lib/marketing/types.ts`)
- `BriefingAnswers` — 36 campos (9 obrigatorios + 27 opcionais)
- `Persona` — 17 campos com arrays (dores, desejos, gatilhos, buscas, etc.)
- `ICP` — 15 campos (empresa, mercado, ticket, barreiras, sinais)
- `FullStrategy` — Horarios, PalavrasChave, Anuncios, PaginaCRO, EstruturaCampanhas
- `BusinessPlan` — Params financeiros + ChannelConfig + BPCalculatedResults
- `BrandIdentity` — Cores, tom de voz, valores, estilo visual
- `MarketingProfile` — Entidade principal do banco

### Mapeamento de Perguntas (`src/lib/marketing/questions.ts`)
- 36 perguntas em 12 secoes com labels, icones, ordenacao
- Helpers: `getQuestionsBySection()`, `isBriefingComplete()`, `countAnswered()`

### Calculos Business Plan (`src/lib/marketing/calculations.ts`)
- `calculateBusinessPlan()` — Funil MQL → SQL → Venda
- Distribuicao mensal com sazonalidade (12 meses)
- Metricas: lucro, vendas, budget, CPL, custo por reuniao, CAC
- Formatadores: `formatCurrency()`, `formatPercent()`, `formatNumber()`

### API Route (`/api/marketing/generate-strategy`)
- POST com orgId + answers → gera persona + ICP + estrategia via OpenRouter
- Modelo: `anthropic/claude-sonnet-4-20250514`
- Prompt otimizado para JSON, com fallback para extrair de markdown
- Salva automaticamente no perfil da org

### Componentes
- `BriefingForm` — Formulario multi-step (12 secoes), salva rascunho, barra de progresso
- `StrategyViewer` — Visualiza persona/ICP/estrategia em tabs com badges e campos
- `BusinessPlanTab` — Parametros financeiros, KPIs, funil, tabela mensal, benchmarks
- `BrandIdentityForm` — Cores (color picker), tom de voz, valores, estilo visual

### Pagina e Navegacao
- Nova pagina `/marketing` com 4 abas: Diagnostico, Estrategia IA, Business Plan, Identidade
- Item "Marketing" adicionado no sidebar (2a posicao, apos Dashboard)
- Componente `Progress` (shadcn/ui) instalado

### Lib Supabase (`src/lib/marketing/profiles.ts`)
- `getMarketingProfile()` — Busca perfil da org (maybeSingle)
- `upsertMarketingProfile()` — Cria ou atualiza (onConflict: org_id)
- `saveBriefing()`, `saveStrategy()`, `saveBusinessPlan()`, `saveBrandIdentity()`
- `getIndustryBenchmarks()` — Lista benchmarks por segmento

### Arquivos Criados
```
src/lib/marketing/
  types.ts              — Todos os tipos (briefing, persona, ICP, strategy, BP, brand)
  questions.ts          — 36 perguntas mapeadas + helpers
  profiles.ts           — CRUD Supabase
  calculations.ts       — Calculos financeiros do BP
  index.ts              — Barrel export

src/components/marketing/
  briefing-form.tsx     — Form multi-step (12 secoes)
  strategy-viewer.tsx   — Visualizacao da estrategia gerada
  business-plan-tab.tsx — Business plan com calculos
  brand-identity-form.tsx — Identidade da marca

src/app/(dashboard)/marketing/page.tsx — Pagina principal
src/app/api/marketing/generate-strategy/route.ts — API de geracao IA

supabase/migrations/
  018_fix_rls_recursion.sql    — Fix RLS + helper functions
  019_marketing_profiles.sql   — Tabelas + seeds
```

---

## Sprint 1 — Foundation (Concluido)

**Data:** 2026-03-05

### Sprint 1.1: Project Scaffold
- Criacao do projeto Next.js 14.2 com App Router + TypeScript strict
- Configuracao Tailwind CSS + shadcn/ui (21 componentes)
- Estrutura de pastas: `src/app`, `src/components`, `src/lib`, `src/hooks`, `src/contexts`
- Tipos TypeScript centrais em `src/lib/types.ts` (enums, interfaces para todo Phase 1)
- Constantes e labels PT-BR em `src/lib/constants.ts`
- Utilidade `cn()` em `src/lib/utils.ts`

### Sprint 1.2: Migrations (Core Tables + API Keys)
- `supabase/migrations/001_core_tables.sql` — 12 tabelas com RLS:
  - organizations, users, organization_members
  - leads, lead_tags, lead_tag_assignments
  - segments, segment_memberships
  - email_templates, campaigns, campaign_stats, campaign_send_logs
- Indices em colunas frequentes (org_id, status, score, etc.)
- Triggers de `updated_at` automaticos
- Trigger `handle_new_user` para sincronizar auth.users → public.users
- `supabase/migrations/002_api_keys.sql` — Tabela api_keys + funcao validate_api_key

### Sprint 1.3: Supabase Auth Setup
- Clientes Supabase: `client.ts` (browser), `server.ts` (SSR), `admin.ts` (service role)
- Middleware de protecao de rotas (`src/lib/supabase/middleware.ts`)
- Paginas de auth: login (email/password + magic link), registro, magic-link
- Auth callback (`/auth/callback/route.ts`)
- Hook `use-auth.ts` com listener de auth state

### Sprint 1.4: Dashboard Layout + Organization Selector
- Layout dashboard com sidebar responsiva + header com breadcrumbs
- Sidebar com navegacao, seletor de organizacao, menu de usuario
- Context multi-tenant (`organization-context.tsx`)
- Hook `use-organization.ts` com persistencia localStorage e role checks
- Dashboard com KPI cards + empty states
- Paginas placeholder: campaigns, segments, templates, settings

**Arquivos criados:** ~45 arquivos

---

## Sprint 1.5 — Organization CRUD (Concluido)

**Data:** 2026-03-05

### Implementacoes
- **`src/lib/supabase/organizations.ts`** — Helpers: updateOrganization, getOrganization, getOrganizationMembers, updateMemberRole, removeMember
- **`src/components/settings/organization-form.tsx`** — Formulario de edicao com React Hook Form + Zod (nome, sender_email, sender_name, website)
- **`src/components/settings/members-list.tsx`** — Tabela de membros com badges de role, remocao com confirmacao AlertDialog
- **`src/components/settings/domain-verification.tsx`** — Placeholder de verificacao de dominio (SPF/DKIM/DMARC info)
- **`src/components/settings/api-keys-manager.tsx`** — Geracao de API keys com prefixo `sk_org_`, hash SHA-256, exibicao unica, copy + delete

---

## Sprint 1.6 — User Management / Invites (Concluido)

**Data:** 2026-03-05

### Implementacoes
- **`supabase/migrations/003_invitations.sql`** — Tabela invitations com RLS, expiracao 7 dias
- **`src/lib/supabase/invitations.ts`** — Helpers: inviteUser, getInvitations, cancelInvitation, acceptInvitation
- **`src/components/settings/invite-user-form.tsx`** — Formulario de convite (email + role) + lista de convites pendentes com cancelamento
- **`src/lib/types.ts`** — Adicionada interface Invitation
- **`src/app/(dashboard)/settings/page.tsx`** — Atualizada com componentes reais em todas as tabs

---

## Sprint 2 — Leads Module (Concluido)

**Data:** 2026-03-05

### Sprint 2.1: Leads List Page
- **`src/lib/supabase/leads.ts`** — CRUD completo: queryLeads (filtros, paginacao), getLead, createLead, updateLead, deleteLead, bulkCreateLeads, getLeadTags, createLeadTag, addTagToLead, removeTagFromLead
- **`src/hooks/use-leads.ts`** — Hook com debounced search, filtros por status, paginacao
- **`src/components/leads/leads-filters.tsx`** — Barra de filtros: busca debounced, select de status, limpar filtros
- **`src/components/leads/leads-table.tsx`** — DataTable com checkbox, nome, email, status (badge), score (barra visual), tags (badges coloridos), data relativa (date-fns ptBR), skeleton loading, empty state, paginacao

### Sprint 2.2: Lead Detail Page
- **`src/app/(dashboard)/leads/[id]/page.tsx`** — Pagina de detalhe com back button, layout 2 colunas, delete com confirmacao
- **`src/components/leads/lead-info-card.tsx`** — Card com campos em grid, status badge, score progress bar, modo de edicao inline
- **`src/components/leads/lead-tags-manager.tsx`** — Tags atribuidas com remocao, tags disponiveis para adicionar, criacao de novas tags com color picker

### Sprint 2.3: Lead Creation (Manual Form)
- **`src/app/(dashboard)/leads/new/page.tsx`** — Pagina de criacao
- **`src/components/leads/lead-form.tsx`** — Formulario reutilizavel com react-hook-form + zod (email obrigatorio, first_name, last_name, phone, company, position, score 0-100)

### Sprint 2.4: CSV Import Wizard
- **`src/lib/csv.ts`** — Parser CSV com auto-detect delimitador (virgula/ponto-e-virgula), campos quoted, mapCsvRows para mapeamento
- **`src/app/(dashboard)/leads/import/page.tsx`** — Pagina do wizard
- **`src/components/leads/csv-import-wizard.tsx`** — Wizard 4 etapas: Upload (drag-and-drop + file input) → Mapeamento (auto-map colunas comuns, email obrigatorio) → Preview (primeiras 5 linhas) → Resultado (created/skipped/errors + link para leads)

**Arquivos criados no Sprint 2:** ~13 arquivos

---

## Sprint 3 — Segments Module (Concluido)

**Data:** 2026-03-05

### Sprint 3.1: Data Layer + Listagem
- **`src/lib/supabase/segments.ts`** — CRUD completo: querySegments, getSegment, createSegment, updateSegment, deleteSegment, getSegmentLeads, addLeadsToSegment, removeLeadFromSegment, evaluateSegmentRules (constroi query dinamica por regras), recalculateSegmentCount
- **`src/hooks/use-segments.ts`** — Hook com filtros (search, type), paginacao, debounce
- **`src/components/segments/segments-table.tsx`** — DataTable com nome, descricao (truncada), tipo (badge estatico/dinamico), lead count, data relativa, skeleton, empty state, paginacao
- **`src/app/(dashboard)/segments/page.tsx`** — Atualizada com listagem real + botao "Novo Segmento"
- **`src/lib/constants.ts`** — Adicionados SEGMENT_TYPE_LABELS, SEGMENT_TYPE_COLORS, SEGMENT_RULE_FIELDS, OPERATOR_LABELS

### Sprint 3.2: Criacao de Segmentos
- **`src/app/(dashboard)/segments/new/page.tsx`** — Pagina de criacao
- **`src/components/segments/segment-form.tsx`** — Formulario com react-hook-form + zod, seletor de tipo (estatico/dinamico com cards toggle), integra RuleBuilder para dinamico, botao "Calcular leads" para preview

### Sprint 3.3: Rule Builder
- **`src/components/segments/rule-builder.tsx`** — Editor visual de regras: field select, operator select (filtrado por tipo de campo), value input (oculto para is_empty/is_not_empty), conectores "E" (AND), adicionar/remover regras

### Sprint 3.4: Detalhe do Segmento
- **`src/app/(dashboard)/segments/[id]/page.tsx`** — Header com nome + badge tipo, descricao, regras em formato legivel (dinamico), tabela de leads do segmento, dialogo "Adicionar Leads" com busca (estatico), botao recalcular (dinamico), editar, excluir com AlertDialog

**Arquivos criados no Sprint 3:** ~7 arquivos

---

## Sprint 4 — Email Templates (Concluido)

**Data:** 2026-03-05

### Sprint 4.1: Data Layer + Listagem
- **`src/lib/supabase/templates.ts`** — CRUD: queryTemplates, getTemplate, createTemplate, updateTemplate, deleteTemplate, duplicateTemplate
- **`src/hooks/use-templates.ts`** — Hook com filtros (search, category), paginacao, debounce
- **`src/components/templates/templates-table.tsx`** — DataTable com nome, assunto (truncado), categoria (badge colorido), data relativa, skeleton, empty state, paginacao
- **`src/components/templates/templates-filters.tsx`** — Barra de filtros: busca por nome/assunto, select de categoria, limpar filtros
- **`src/app/(dashboard)/templates/page.tsx`** — Atualizada com listagem real + filtros + botao "Novo Template"
- **`src/lib/constants.ts`** — Adicionados TEMPLATE_CATEGORY_LABELS, TEMPLATE_CATEGORY_COLORS

### Sprint 4.2: Criacao de Templates
- **`src/app/(dashboard)/templates/new/page.tsx`** — Pagina de criacao
- **`src/components/templates/template-form.tsx`** — Formulario 2 colunas: campos (nome, descricao, categoria, assunto com hint de variaveis, preview text) + editor HTML (textarea monospace) com toggle Code/Preview (iframe sandboxed), template HTML padrao com variaveis

### Sprint 4.3: Detalhe do Template
- **`src/app/(dashboard)/templates/[id]/page.tsx`** — Tabs Informacoes/Conteudo, preview HTML em iframe, acoes: editar (inline com TemplateForm), duplicar, excluir com AlertDialog, enviar teste (placeholder)

**Arquivos criados no Sprint 4:** ~7 arquivos

---

## Sprint 5 — Campaigns + MailerSend (Concluido)

**Data:** 2026-03-05

### Sprint 5.1: Data Layer + Listagem
- **`src/lib/supabase/campaigns.ts`** — CRUD: queryCampaigns (com joins template/segment names), getCampaign, createCampaign, updateCampaign, deleteCampaign, getCampaignStats, getCampaignSendLogs, scheduleCampaign, pauseCampaign
- **`src/hooks/use-campaigns.ts`** — Hook com filtros (search, status), paginacao, debounce
- **`src/components/campaigns/campaigns-table.tsx`** — DataTable com nome, template, segmento, status (badge), leads, data. Skeleton, empty state, paginacao
- **`src/components/campaigns/campaigns-filters.tsx`** — Barra de filtros: busca, select de status (6 opcoes), limpar filtros
- **`src/app/(dashboard)/campaigns/page.tsx`** — Atualizada com listagem real + filtros + botao "Nova Campanha"

### Sprint 5.2: Criacao de Campanhas
- **`src/app/(dashboard)/campaigns/new/page.tsx`** — Pagina de criacao
- **`src/components/campaigns/campaign-form.tsx`** — Formulario com react-hook-form + zod: nome, select de template (carregado da org), select de segmento (com lead count), agendamento opcional (datetime-local)

### Sprint 5.3: Detalhe da Campanha
- **`src/app/(dashboard)/campaigns/[id]/page.tsx`** — Pagina completa com:
  - Header com nome + status badge + acoes contextuais
  - Cards info: template, segmento + lead count, agendamento
  - Cards de stats (para campanhas enviadas): enviados, entregues, abertos, clicados, bounces, reclamacoes (usando KpiCard)
  - Tabela de send logs: email, status, datas de envio/entrega/abertura
  - Acoes por status: Agendar (dialog datetime), Enviar Agora, Pausar, Retomar, Excluir

### Sprint 5.4: MailerSend Integration
- **`src/lib/mailersend/client.ts`** — Cliente REST API: sendEmail (individual), sendBulkEmail (batch), autenticacao via Bearer token
- **`src/app/api/campaigns/[id]/send/route.ts`** — API route POST: autentica usuario, busca campanha + template + leads do segmento, cria send logs, atualiza stats e status

**Arquivos criados no Sprint 5:** ~8 arquivos

---

## Resumo Geral

| Sprint | Descricao | Status | Arquivos |
|--------|-----------|--------|----------|
| 1.1 | Project Scaffold | Concluido | ~15 |
| 1.2 | Migrations | Concluido | 2 |
| 1.3 | Supabase Auth | Concluido | ~8 |
| 1.4 | Dashboard Layout | Concluido | ~20 |
| 1.5 | Organization CRUD | Concluido | 5 |
| 1.6 | User Management | Concluido | 4 |
| 2.1 | Leads List | Concluido | 5 |
| 2.2 | Lead Detail | Concluido | 3 |
| 2.3 | Lead Creation | Concluido | 2 |
| 2.4 | CSV Import | Concluido | 3 |
| 3.1-3.4 | Segments Module | Concluido | 7 |
| 4.1-4.3 | Email Templates | Concluido | 7 |
| 5.1-5.4 | Campaigns + MailerSend | Concluido | 8 |
| 6.1-6.3 | Dashboard + Webhooks | Concluido | 6 |
| 7.1-7.2 | Org Selector + Campos Personalizados | Concluido | 8 |
| 8.1-8.2 | Editor Unlayer + Lead Timeline | Concluido | 8 |
| 9 | Lead Scoring Automatico | Concluido | 7 |
| 10 | Integracoes GA4 + Meta Ads | Concluido | 10 |
| 11 | Automacoes + n8n | Concluido | 12 |

### Migrations Aplicadas
1. `001_core_tables.sql` — 12 tabelas + RLS + triggers
2. `002_api_keys.sql` — API keys + validate_api_key function
3. `003_invitations.sql` — Invitations + RLS
4. `004_org_insert_policy_and_custom_fields.sql` — INSERT policy organizations + custom_field_definitions
5. `005_lead_events.sql` — Lead events timeline
6. `006_lead_scoring_rules.sql` — Regras de scoring por org
7. `007_integrations.sql` — Integrations + analytics_data
8. `008_automations.sql` — Automations + automation_logs

---

## Sprint 6 — Dashboard + Webhooks (Concluido)

**Data:** 2026-03-05

### Sprint 6.1: Dashboard com Dados Reais
- **`src/lib/supabase/dashboard.ts`** — Helper que busca KPIs em paralelo: total leads, total campanhas, stats agregados (sent, delivered, opened, clicked), open/click rates, 5 campanhas recentes, 5 leads recentes
- **`src/hooks/use-dashboard.ts`** — Hook useDashboard com loading state e refetch
- **`src/app/(dashboard)/page.tsx`** — Reescrito com dados reais: 4 KPI cards (leads, emails, abertura %, clique %), mini tabela campanhas recentes (clicavel), mini tabela leads recentes (clicavel), skeleton loading

### Sprint 6.2: MailerSend Webhooks
- **`src/app/api/webhooks/mailersend/route.ts`** — Handler POST para eventos MailerSend: mapeia activity.sent/delivered/opened/clicked/bounced/spam_complaint, atualiza campaign_send_logs (status + timestamps), incrementa campaign_stats, marca leads como bounced/complained. Verificacao opcional de signature.

### Sprint 6.3: Lead Intake + Events API
- **`src/app/api/webhooks/leads/route.ts`** — API publica para entrada de leads: autenticacao via x-api-key (SHA-256 hash), upsert de lead, criacao/atribuicao de tags automatica
- **`src/app/api/webhooks/events/route.ts`** — Webhook generico para integracoes externas (n8n, Zapier): autenticacao via API key, acknowledge de eventos

**Arquivos criados no Sprint 6:** ~6 arquivos

---

## PHASE 1 COMPLETA

**Total de arquivos criados:** ~85+
**Total de sprints:** 6 (subdivididos em 16 sub-sprints)
**Todas as paginas testadas e retornando 200 OK**
**TypeScript compila sem erros**

---

## Gaps Resolvidos (Pos-Sprint 6)

**Data:** 2026-03-05

### Envio Real via MailerSend
- **`src/app/api/campaigns/[id]/send/route.ts`** — Reescrito com envio real: busca sender_email/sender_name da org, envia em batches de 10 com delay, personaliza variaveis, salva messageId, fallback gracioso sem API key, suporte a segmentos dinamicos
- **`src/lib/template-utils.ts`** — Novo: replaceTemplateVariables (substitui `{{var}}`), buildLeadVariables (mapeia campos do lead)
- **`src/lib/supabase/segments.ts`** — Exportado applyRulesToQuery para reuso

### Enviar Teste de Template
- **`src/app/(dashboard)/templates/[id]/page.tsx`** — Dialog com input de email, chamada async para API
- **`src/app/api/templates/send-test/route.ts`** — Novo: autentica, busca org sender, envia via MailerSend (ou simula em dev)

### Verificacao de Dominio
- **`src/components/settings/domain-verification.tsx`** — Input para salvar dominio, tabela DNS (SPF/DKIM/DMARC/Return-Path) com botoes de copia

### Componentes shadcn/ui Instalados (21)
button, input, label, card, badge, separator, avatar, dropdown-menu, dialog, select, checkbox, toast, toaster, use-toast, tooltip, tabs, scroll-area, popover, table, textarea, skeleton, alert-dialog

---

## Sprint 7 — Org Selector + Campos Personalizados (Concluido)

**Data:** 2026-03-05

### Sprint 7.1: Criacao de Organizacoes
- **`supabase/migrations/004_org_insert_policy_and_custom_fields.sql`** — Policy INSERT na tabela organizations (auth.uid() = created_by) + tabela custom_field_definitions com RLS
- **`src/lib/supabase/organizations.ts`** — Adicionado `createOrganization(name, userId)`: gera slug unico, insere org, adiciona criador como admin
- **`src/components/layout/sidebar.tsx`** — Reescrito: seletor de org agora mostra todas as orgs do usuario, opcao "Criar Organizacao" com icone Plus, Dialog de criacao (nome + confirmar), empty state "Nenhuma organizacao", refetch e switch automatico apos criacao

### Sprint 7.2: Campos Personalizados para Leads
- **`src/lib/types.ts`** — Adicionada interface `CustomFieldDefinition` (8 tipos: text, number, date, select, boolean, url, email, phone)
- **`src/lib/supabase/custom-fields.ts`** — CRUD: getCustomFieldDefinitions, createCustomFieldDefinition (auto sort_order), updateCustomFieldDefinition, deleteCustomFieldDefinition
- **`src/components/settings/custom-fields-manager.tsx`** — Novo componente: tabela de campos definidos (label, nome/chave, tipo badge, obrigatorio), dialog de criacao (label auto-gera nome sem acentos, tipo, opcoes para select, checkbox obrigatorio), delete com AlertDialog
- **`src/app/(dashboard)/settings/page.tsx`** — Nova tab "Campos Personalizados" com CustomFieldsManager
- **`src/components/leads/lead-info-card.tsx`** — Atualizado: busca custom field definitions, exibe valores dos campos personalizados no modo leitura, inputs dinamicos por tipo no modo edicao (text, number, date, select, boolean/checkbox, url, email, phone), salva custom_fields no updateLead
- **`src/components/leads/lead-form.tsx`** — Atualizado: busca custom field definitions, renderiza inputs personalizados apos campos padrao, inclui custom_fields no createLead

**Arquivos criados no Sprint 7:** 3 novos + 5 modificados

### Detalhes da tabela custom_field_definitions
```
id, org_id, name (chave), label (visivel), field_type, options (jsonb), required, sort_order, created_at, updated_at
unique(org_id, name), RLS por org, trigger updated_at
```

### Tipos de campo suportados
| Tipo | Input | Descricao |
|------|-------|-----------|
| text | Input text | Texto livre |
| number | Input number | Valor numerico |
| date | Input date | Data |
| select | Select dropdown | Opcoes pre-definidas |
| boolean | Checkbox | Sim/Nao |
| url | Input url | Link |
| email | Input email | Endereco de email |
| phone | Input tel | Telefone |

---

## Sprint 8 — Editor Unlayer + Lead Timeline (Concluido)

**Data:** 2026-03-06

### Sprint 8.1: Editor Drag-and-Drop (Unlayer)
- **`react-email-editor`** + **`@types/react-email-editor`** — Pacotes instalados
- **`src/components/templates/unlayer-editor.tsx`** — Novo componente: wrapper do Unlayer com dynamic import (ssr: false), ref para exportHtml/loadDesign, merge tags PT-BR ({{first_name}}, {{last_name}}, {{full_name}}, {{email}}, {{company}}, {{position}}), tema modern_light, botao "Salvar Template"
- **`src/components/templates/template-form.tsx`** — Atualizado: toggle "Editor Visual" (Unlayer) vs "Editor HTML" (textarea). Se template tem unlayer_json, abre no visual. Salva html_content + unlayer_json simultaneamente

### Sprint 8.2: Lead Timeline (Eventos)
- **`supabase/migrations/005_lead_events.sql`** — Tabela lead_events (17 tipos de evento: created, updated, tag_added, tag_removed, email_sent/delivered/opened/clicked/bounced/complained, segment_added/removed, score_changed, status_changed, campaign_added, note, custom) com RLS e indices
- **`src/lib/types.ts`** — Adicionados LeadEventType e LeadEvent
- **`src/lib/supabase/lead-events.ts`** — CRUD: getLeadEvents (paginado), createLeadEvent, addNote
- **`src/components/leads/lead-timeline.tsx`** — Novo componente: timeline visual com icones coloridos por tipo, agrupamento por data (Hoje/Ontem/data), linha vertical conectora, input "Adicionar nota", paginacao "Carregar mais"
- **`src/app/(dashboard)/leads/[id]/page.tsx`** — Adicionado LeadTimeline na pagina de detalhe
- **`src/lib/supabase/leads.ts`** — Event logging automatico: createLead → 'created', addTagToLead → 'tag_added', removeTagFromLead → 'tag_removed' (fire-and-forget)
- **`src/app/api/webhooks/mailersend/route.ts`** — Event logging: email_sent/delivered/opened/clicked/bounced/complained registrados como lead_events

---

## Sprint 9 — Lead Scoring Automatico (Concluido)

**Data:** 2026-03-06

### Implementacoes
- **`supabase/migrations/006_lead_scoring_rules.sql`** — Tabela lead_scoring_rules (12 tipos de condicao) com RLS e trigger updated_at
- **`src/lib/types.ts`** — Adicionados ScoringConditionType e LeadScoringRule
- **`src/lib/constants.ts`** — Adicionado SCORING_CONDITION_LABELS (12 labels PT-BR)
- **`src/lib/supabase/lead-scoring.ts`** — CRUD: getScoringRules, createScoringRule, updateScoringRule, deleteScoringRule. Engine: applyScoring (client), applyScoringAdmin (server). Match de regras ativas, clamp score 0-100, log score_changed em lead_events
- **`src/components/settings/scoring-rules-manager.tsx`** — Novo componente Settings: tabela de regras (nome, condicao, pontos com icone trend, ativo/inativo toggle, delete), dialog "Nova Regra" (nome, descricao, condicao select, valor condicional, pontos)
- **`src/app/(dashboard)/settings/page.tsx`** — Nova tab "Lead Scoring"
- **`src/app/api/webhooks/mailersend/route.ts`** — Integrado applyScoringAdmin: aplica regras de scoring apos cada evento de email

### Tipos de condicao suportados
| Condicao | Label PT-BR |
|----------|-------------|
| email_opened | Email aberto |
| email_clicked | Link clicado no email |
| email_bounced | Email bounce |
| email_complained | Reclamacao de spam |
| tag_added | Tag adicionada |
| tag_removed | Tag removida |
| field_equals | Campo igual a |
| field_contains | Campo contem |
| field_not_empty | Campo preenchido |
| page_visited | Pagina visitada |
| form_submitted | Formulario enviado |
| days_since_last_activity | Dias sem atividade |

---

## Sprint 10 — Integracoes GA4 + Meta Ads (Concluido)

**Data:** 2026-03-06

### Implementacoes
- **`supabase/migrations/007_integrations.sql`** — Tabelas integrations + analytics_data com RLS, indices, trigger updated_at
- **`src/lib/types.ts`** — Adicionados IntegrationProvider, Integration, AnalyticsMetricType, AnalyticsData
- **`src/lib/analytics/ga4-client.ts`** — Cliente GA4 Data API v1: refreshAccessToken (OAuth), runGA4Report, getPageViews, getTopPages, getTrafficSources, getOverview
- **`src/lib/analytics/meta-ads-client.ts`** — Cliente Meta Marketing API v19.0: getInsights, getCampaigns, getAccountOverview, getCampaignInsights, getLeadAds
- **`src/lib/supabase/integrations.ts`** — CRUD: getIntegrations, getIntegration, upsertIntegration, deleteIntegration, getAnalyticsData, saveAnalyticsData
- **`src/app/api/analytics/sync/route.ts`** — API route POST: autentica, busca integracoes ativas, faz fetch de GA4 e/ou Meta, salva em analytics_data, atualiza last_sync_at
- **`src/components/settings/integrations-manager.tsx`** — Novo componente: cards por provider (GA4, Meta Ads) com config forms, badge conectado/desconectado, botao "Sincronizar", last sync time
- **`src/app/(dashboard)/analytics/page.tsx`** — Nova pagina: period selector (7/30/90 dias), KPIs GA4 (page views, sessoes, usuarios, bounce rate), KPIs Meta (spend, impressoes, cliques, CTR), botao sync, empty state com link para settings
- **`src/components/layout/sidebar.tsx`** — Adicionado "Analytics" na navegacao (icone BarChart3)
- **`src/app/(dashboard)/settings/page.tsx`** — Nova tab "Integracoes"

---

## Sprint 11 — Automacoes + n8n (Concluido)

**Data:** 2026-03-06

### Implementacoes
- **`supabase/migrations/008_automations.sql`** — Tabelas automations + automation_logs com RLS, indices, trigger updated_at
- **`src/lib/types.ts`** — Adicionados AutomationTriggerType, AutomationActionType, AutomationAction, Automation, AutomationLog
- **`src/lib/constants.ts`** — Adicionados AUTOMATION_TRIGGER_LABELS, AUTOMATION_ACTION_LABELS
- **`src/lib/n8n/client.ts`** — Cliente n8n REST API: getWorkflows, getWorkflow, activateWorkflow, deactivateWorkflow, executeWorkflow, triggerWebhook, getExecutions. Usa N8N_BASE_URL + N8N_API_KEY
- **`src/lib/supabase/automations.ts`** — CRUD: getAutomations, getAutomation, createAutomation, updateAutomation, deleteAutomation, toggleAutomation, getAutomationLogs, logAutomationExecution
- **`src/lib/automation-engine.ts`** — Engine de execucao: executeAutomation, processAutomationTrigger, shouldTrigger. 9 tipos de acao built-in + integracao n8n webhook
- **`src/app/api/automations/trigger/route.ts`** — API route POST para disparar automacoes
- **`src/app/(dashboard)/automations/page.tsx`** — Listagem: tabela com nome, gatilho, acoes, execucoes, status ativa/inativa, toggle, delete com AlertDialog
- **`src/app/(dashboard)/automations/new/page.tsx`** — Pagina de criacao
- **`src/components/automations/automation-form.tsx`** — Formulario: nome, descricao, trigger type (select com config dinamica), actions builder (adicionar/remover acoes com config por tipo)
- **`src/app/(dashboard)/automations/[id]/page.tsx`** — Detalhe: info cards, lista de acoes, logs de execucao, ativar/desativar, excluir
- **`src/components/layout/sidebar.tsx`** — Adicionado "Automacoes" na navegacao (icone Zap)

### Gatilhos (9 tipos)
lead_created, tag_added, tag_removed, score_threshold, email_opened, email_clicked, status_changed, custom_event, scheduled

### Acoes built-in (9 tipos)
send_email, add_tag, remove_tag, update_field, webhook, notify, add_to_segment, remove_from_segment, update_score

---

## Sprint 12 — WhatsApp Cloud API (Concluido)

**Data:** 2026-03-06

### Implementacoes
- **`supabase/migrations/009_whatsapp.sql`** — 4 tabelas: whatsapp_templates, whatsapp_conversations, whatsapp_messages, whatsapp_broadcasts com RLS e indices
- **`src/lib/whatsapp/client.ts`** — Cliente WhatsApp Cloud API (Meta Graph v19.0): sendTextMessage, sendTemplateMessage, sendInteractiveMessage, sendMediaMessage, markAsRead, getMessageTemplates, createMessageTemplate
- **`src/lib/supabase/whatsapp.ts`** — CRUD: getConversations, getConversation, getMessages, sendMessage, receiveMessage, getWhatsAppTemplates, createWhatsAppTemplate, getBroadcasts, createBroadcast
- **`src/app/api/webhooks/whatsapp/route.ts`** — GET (Meta webhook verify) + POST (incoming messages + status updates)
- **`src/app/api/whatsapp/send/route.ts`** — API route autenticada para envio de mensagens
- **`src/app/(dashboard)/whatsapp/page.tsx`** — Inbox: layout split com lista de conversas (busca, unread badges) + chat view (bolhas verde/cinza, status icons, input de mensagem)
- **`src/app/(dashboard)/whatsapp/templates/page.tsx`** — Templates WA: listagem + status badges (draft/pending/approved/rejected) + dialog de criacao
- **`src/app/(dashboard)/whatsapp/broadcasts/page.tsx`** — Broadcasts: listagem com stats + dialog de criacao (template + segmento)
- **`src/components/settings/integrations-manager.tsx`** — Adicionado card WhatsApp Business (phone_number_id, access_token, business_account_id, verify_token)
- **`src/components/layout/sidebar.tsx`** — Adicionado "WhatsApp" (icone MessageCircle)

---

## Sprint 13 — SMS + Formularios Embeddable (Concluido)

**Data:** 2026-03-06

### Sprint 13.1: SMS (Twilio)
- **`supabase/migrations/010_sms_and_forms.sql`** — Tabelas sms_messages + sms_broadcasts + lead_forms + form_submissions com RLS
- **`src/lib/sms/twilio-client.ts`** — Cliente Twilio: sendSms (com fallback dev console.log), getMessageStatus
- **`src/lib/supabase/sms.ts`** — CRUD: getSmsMessages, sendSmsMessage, getSmsBroadcasts, createSmsBroadcast
- **`src/app/api/sms/send/route.ts`** — API route autenticada para envio individual
- **`src/app/api/sms/webhook/route.ts`** — Twilio status callback
- **`src/app/(dashboard)/sms/page.tsx`** — Pagina SMS: KPI cards, enviar SMS (dialog), criar broadcast (nome + body + segmento), tabela mensagens + broadcasts

### Sprint 13.2: Formularios Embeddable
- **`src/lib/supabase/forms.ts`** — CRUD: getForms, getForm, createForm, updateForm, deleteForm, toggleForm, getFormSubmissions, submitForm
- **`src/app/api/forms/[id]/submit/route.ts`** — API publica com CORS: valida campos, upsert lead, adiciona tags + segmento, log evento, incrementa submission count
- **`src/app/api/forms/[id]/embed.js/route.ts`** — Gera script JS embeddable que renderiza formulario no site externo. Suporta 4 tipos: inline, popup (com delay), slide-in, floating button
- **`src/app/(dashboard)/forms/page.tsx`** — Listagem: nome, tipo badge, submissions, active toggle, dialog com embed code
- **`src/app/(dashboard)/forms/new/page.tsx`** — Pagina de criacao
- **`src/components/forms/form-builder.tsx`** — Builder completo: nome, tipo selector, fields builder (add/remove, tipo, label, required, placeholder, opcoes), settings por tipo (popup delay/trigger, button text/color, slide title), tags, segmentos, success message, redirect URL
- **`src/app/(dashboard)/forms/[id]/page.tsx`** — Detalhe: embed code, tabela submissions, info sidebar, delete
- **`src/components/ui/switch.tsx`** — Componente shadcn Switch (novo)

### Embed code gerado
```html
<!-- Inline -->
<div id="plataforma-form-{id}"></div>
<script src="https://seudominio.com/api/forms/{id}/embed.js"></script>

<!-- Popup/Slide-in/Floating: apenas o script -->
<script src="https://seudominio.com/api/forms/{id}/embed.js"></script>
```

---

## Sprint 14 — Chatbot Integrado (Concluido)

**Data:** 2026-03-06

### Implementacoes
- **`supabase/migrations/011_chatbot.sql`** — 4 tabelas (chatbot_configs, chatbot_rules, chatbot_conversations, chatbot_messages) com RLS, indices, triggers updated_at
- **`src/lib/supabase/chatbot.ts`** — CRUD completo: configs, rules, conversations, messages, matchRule (pattern matching case-insensitive)
- **`src/lib/chatbot/ai-client.ts`** — Cliente Anthropic API (Claude) com dev fallback. Suporta system prompt customizado, historico de conversa, modelo configuravel
- **`src/app/api/chatbot/[id]/chat/route.ts`** — API publica com CORS: recebe mensagem, tenta match de regra, fallback para IA se habilitado, salva mensagens, retorna resposta
- **`src/app/api/chatbot/[id]/embed.js/route.ts`** — Gera widget JS embeddable: botao flutuante, janela de chat 380x500, cores configuraveis, visitor_id persistido em localStorage
- **`src/app/(dashboard)/chatbot/page.tsx`** — Listagem de chatbots com status, AI badge, acoes
- **`src/app/(dashboard)/chatbot/new/page.tsx`** — Criacao: nome, welcome message, AI toggle, modelo, system prompt, cor, posicao
- **`src/app/(dashboard)/chatbot/[id]/page.tsx`** — Detalhe com 4 tabs: Configuracao, Regras (CRUD), Conversas, Embed (snippet + preview)

### Embed code
```html
<script src="https://seudominio.com/api/chatbot/{id}/embed.js"></script>
```

---

## Sprint 15 — Exportacao de Publicos + SEO Analyzer (Concluido)

**Data:** 2026-03-06

### Sprint 15.1: Exportacao de Publicos
- **`supabase/migrations/012_audience_exports.sql`** — Tabela audience_exports com RLS
- **`src/lib/supabase/audience-exports.ts`** — CRUD com join de segmentos
- **`src/lib/audience/meta-audience-client.ts`** — Meta Custom Audiences API: create, add users (SHA256 hash), remove users. Dev fallback
- **`src/lib/audience/google-audience-client.ts`** — Google Ads Customer Match: create, sync. Dev fallback
- **`src/app/api/audience-exports/[id]/sync/route.ts`** — API autenticada: busca leads do segmento, envia para plataforma (Meta/Google), atualiza status
- **`src/app/(dashboard)/audience-exports/page.tsx`** — Listagem com badges plataforma/status, dialog de criacao (nome, plataforma, segmento), botao sincronizar

### Sprint 15.2: SEO Analyzer
- **`supabase/migrations/013_seo_analyzer.sql`** — Tabela seo_analyses com RLS
- **`src/lib/supabase/seo.ts`** — CRUD para analises
- **`src/lib/seo/analyzer.ts`** — Engine de analise: title, meta description, H1, images alt, canonical, viewport, HTTPS, Open Graph, performance. Score 0-100
- **`src/app/api/seo/analyze/route.ts`** — API autenticada: cria analise, executa, salva resultado
- **`src/app/(dashboard)/seo/page.tsx`** — Dashboard: input URL + analisar, score colorido, KPIs (erros/avisos/info), issues por categoria, recomendacoes, metricas performance, historico

---

## Sprint 16 — Redes Sociais + Link da Bio (Concluido)

**Data:** 2026-03-06

### Sprint 16.1: Social Media Scheduling
- **`supabase/migrations/014_social_media.sql`** — 2 tabelas (social_accounts, social_posts) com RLS
- **`src/lib/supabase/social.ts`** — CRUD para contas e posts com join
- **`src/lib/social/publisher.ts`** — Publisher com suporte Facebook Graph API + dev fallback para demais plataformas
- **`src/app/(dashboard)/social/page.tsx`** — Dashboard com 3 tabs: Posts (tabela), Contas (cards grid), Calendario (grade mensal)
- **`src/app/(dashboard)/social/new/page.tsx`** — Criar post: conta, conteudo com contador, midia, hashtags como badges, agendar/publicar

### Sprint 16.2: Link da Bio
- **`supabase/migrations/015_bio_links.sql`** — 2 tabelas (bio_pages, bio_links) com RLS
- **`src/lib/supabase/bio-links.ts`** — CRUD completo: pages, links, reorder, tracking (click + view)
- **`src/app/(dashboard)/bio/page.tsx`** — Grid de cards com titulo, slug, views, links, active
- **`src/app/(dashboard)/bio/new/page.tsx`** — Criar: titulo, slug auto, cores, button style
- **`src/app/(dashboard)/bio/[id]/page.tsx`** — Detalhe split: gerenciador de links (UTMs, reorder) + preview mobile
- **`src/app/b/[slug]/page.tsx`** — Pagina publica: server component, tracking de views
- **`src/app/b/[slug]/bio-page-client.tsx`** — Client render: links com UTMs, click tracking
- **`src/app/api/bio/track/route.ts`** — API publica para tracking de cliques

---

## Sprint 17 — Multi-idioma + White Label + PWA (Concluido)

**Data:** 2026-03-06

### Sprint 17.1: Multi-idioma (i18n)
- **`src/lib/i18n/translations.ts`** — Sistema de traducoes: 3 locales (pt-BR, en, es), ~60 chaves por idioma, funcao `t()`, `getAvailableLocales()`
- **`src/contexts/locale-context.tsx`** — Provider com persistencia localStorage, hook `useLocale()`
- **`src/components/settings/language-selector.tsx`** — Seletor de idioma na aba Settings

### Sprint 17.2: White Label
- **`supabase/migrations/016_white_label.sql`** — Tabela white_label_configs (UNIQUE org_id) com RLS
- **`src/lib/supabase/white-label.ts`** — getWhiteLabelConfig, upsertWhiteLabelConfig
- **`src/components/settings/white-label-manager.tsx`** — Formulario completo: app name, logo, favicon, cores (3 pickers com preview), dominio customizado, CSS customizado, hide branding toggle, email footer

### Sprint 17.3: PWA (App Mobile)
- **`public/manifest.json`** — Web app manifest (standalone, icons, theme color)
- **`public/sw.js`** — Service worker: cache network-first, offline fallback
- **`src/components/shared/pwa-register.tsx`** — Registro do service worker
- **`src/components/shared/pwa-install-prompt.tsx`** — Prompt de instalacao (dismiss persistido)
- **`src/app/layout.tsx`** — Atualizado: meta tags PWA, LocaleProvider, PwaRegister, PwaInstallPrompt

### Tabs adicionadas em Settings
- "White Label" — Configuracao white-label por org
- "Idioma" — Seletor de idioma (pt-BR, en, es)

---

## Sprint 18 — Integracao Tracking Dashboard GTM (Concluido)

**Data:** 2026-03-06

### Implementacoes
- **`src/lib/tracking/types.ts`** — Tipos portados: TrackingEvent (~50 campos), Conversion (~40 campos), LeadJourney (agregado), KPIData, Temperature, DateRange
- **`src/lib/tracking/constants.ts`** — TEMPERATURE_COLORS/BG/LABELS, CHANNEL_COLORS, CHART_COLORS, event groups (PAGE_VIEW, ENGAGEMENT, FORM, LEAD)
- **`src/lib/tracking/organizations.ts`** — TRACKING_ORGANIZATIONS: Templum (events/conversions/lead_journey), Orbit (orbit_gestao_*), Evolutto (evolutto_*)
- **`src/lib/tracking/query-helpers.ts`** — queryMultiOrg (query paralelo multi-org + merge), countMultiOrg
- **`src/lib/tracking/utils.ts`** — Formatters: date, currency, number, percent, getDateRange, generateCSV
- **`src/lib/tracking/index.ts`** — Barrel export

### Hooks (8 hooks de data fetching)
- **`src/hooks/tracking/useTrackingKPIs.ts`** — 9 KPIs: visitantes, sessoes, leads, conversoes, taxa, receita, score medio, leads quentes, distribuicao temperatura
- **`src/hooks/tracking/useTrackingCharts.ts`** — Leads over time, channel breakdown, temperature, funnel
- **`src/hooks/tracking/useTrackingExtra.ts`** — Devices, geo, top pages, top referrers, top sites, avg time
- **`src/hooks/tracking/useTrackingLeads.ts`** — Leads paginados com filtros (temperature, status, channel, search)
- **`src/hooks/tracking/useTrackingJourney.ts`** — Lead journey individual (lead + 500 eventos)
- **`src/hooks/tracking/useTrackingFunnel.ts`** — Funil 4 etapas (visitantes → leads → oportunidades → vendas)
- **`src/hooks/tracking/useTrackingCampaigns.ts`** — Performance por UTM (source+medium+campaign)
- **`src/hooks/tracking/useTrackingConversions.ts`** — Conversoes paginadas com filtros

### Componentes (16 componentes)
- **`src/components/tracking/tracking-kpi-card.tsx`** — Card de KPI com trend indicator
- **`src/components/tracking/leads-over-time-chart.tsx`** — AreaChart Recharts com gradiente
- **`src/components/tracking/channel-breakdown-chart.tsx`** — BarChart leads vs conversoes
- **`src/components/tracking/temperature-chart.tsx`** — PieChart donut temperatura
- **`src/components/tracking/funnel-chart.tsx`** — Funil visual customizado
- **`src/components/tracking/device-chart.tsx`** — PieChart dispositivos
- **`src/components/tracking/geo-chart.tsx`** — BarChart horizontal estados
- **`src/components/tracking/top-list.tsx`** — Lista horizontal reutilizavel
- **`src/components/tracking/campaign-timeline-chart.tsx`** — BarChart timeline campanhas
- **`src/components/tracking/tracking-badges.tsx`** — TemperatureBadge, StatusBadge, ChannelBadge
- **`src/components/tracking/score-bar.tsx`** — Barra de score visual
- **`src/components/tracking/tracking-filter-bar.tsx`** — Filtros com search + selects
- **`src/components/tracking/tracking-data-table.tsx`** — Tabela ordenavel com paginacao
- **`src/components/tracking/session-timeline.tsx`** — Timeline de sessoes colapsavel
- **`src/components/tracking/attribution-cards.tsx`** — Cards atribuicao (last/first touch)
- **`src/components/tracking/behavior-metrics.tsx`** — Grid 2x4 metricas comportamentais

### Paginas (5 paginas)
- **`src/app/(dashboard)/tracking/page.tsx`** — Dashboard tracking: org selector, date range, 6 KPIs, 6 charts, 3 top lists
- **`src/app/(dashboard)/tracking/leads/page.tsx`** — Leads tracking: tabela com badges, filtros, paginacao, CSV export
- **`src/app/(dashboard)/tracking/leads/[email]/page.tsx`** — Lead journey: info cards, atribuicao, metricas, timeline sessoes
- **`src/app/(dashboard)/tracking/campaigns/page.tsx`** — Campanhas: timeline chart, tabela UTM performance
- **`src/app/(dashboard)/tracking/conversions/page.tsx`** — Conversoes: funil + tabela com filtros, CSV export

### Dados do tracking-dashboard portados
- Usa as MESMAS tabelas Supabase existentes (events, conversions, lead_journey + prefixadas orbit_gestao_, evolutto_)
- ~50 campos por evento (UTMs, click IDs, geo, behavior, scoring, temperature)
- ~40 campos por conversao (deal, person, attribution, platform sends)
- Query multi-org paralelo com merge de resultados

---

## Sprint 19 — Integracao LP Builder (Concluido)

**Data:** 2026-03-06

### Implementacoes
- **`supabase/migrations/017_landing_pages.sql`** — Tabela landing_pages (name, brand, theme, status, html_content, deploy_url, etc.) com RLS
- **`src/lib/lp-builder/types.ts`** — Tipos: Brand, ChatPhase, Message, AppState, BrandConfig, ContentBlock, UploadedImage
- **`src/lib/lp-builder/session.ts`** — Gerador de session ID
- **`src/lib/lp-builder/brands.ts`** — Config 3 marcas (Templum/Evolutto/Orbit) + loaders de contexto (brand guide, ICP, design system, tracking, rules, animations)
- **`src/lib/lp-builder/claude.ts`** — Integracao Anthropic SDK: buildSystemPrompt (monta prompt dinamico com brand+context), sendMessage (multimodal), extractHtmlFromResponse (4 estrategias), injectLogo, injectImages
- **`src/lib/lp-builder/deploy.ts`** — Deploy Vercel API v13: cria projeto single-file, notifica admin
- **`src/lib/supabase/landing-pages.ts`** — CRUD: getLandingPages, getLandingPage, createLandingPage, updateLandingPage, deleteLandingPage, publishLandingPage

### Context files (10 arquivos copiados do LP builder original)
- **`context/prompts/system-prompt.md`** — Prompt do Claude com 3 fases (receber copy → gerar → ajustar)
- **`context/references/design-system.md`** — CSS patterns, paletas, tipografia, componentes
- **`context/references/tracking-integration.md`** — Script tracking completo (UTMs, click IDs, cookies, dataLayer)
- **`context/references/generation-rules.md`** — Regras de geracao HTML (estrutura, form fields, animations)
- **`context/references/animations.md`** — Catalogo de animacoes CSS
- **`context/brands/`** — Guides de marca: templum, evolutto, orbit (+ ICPs)
- **`public/logos/`** — Logos das 3 marcas (JPEG)

### API Routes
- **`src/app/api/lp-builder/chat/route.ts`** — Chat com Claude: auth check, multimodal (text+images), build system prompt, extract HTML, inject logo+images
- **`src/app/api/lp-builder/deploy/route.ts`** — Deploy no Vercel: auth check, deploy single-file HTML

### Paginas (3 paginas)
- **`src/app/(dashboard)/landing-pages/page.tsx`** — Grid de LPs: cards com brand/status badges, deploy URL, metricas, acoes
- **`src/app/(dashboard)/landing-pages/new/page.tsx`** — Builder completo: chat panel (brand selector, theme selector, message history, image upload, input) + preview panel (iframe sandbox, desktop/mobile toggle, aprovar/ajustar). State via useReducer
- **`src/app/(dashboard)/landing-pages/[id]/page.tsx`** — Detalhe: tabs Preview/Configuracao/Analytics, republicar, excluir

### Fluxo de criacao de LP
1. Selecionar marca (Templum/Evolutto/Orbit)
2. Selecionar tema (Escuro/Claro)
3. Enviar copy + imagens no chat
4. Claude gera HTML completo single-file
5. Preview em iframe (desktop/mobile)
6. Pedir ajustes ou aprovar
7. Deploy automatico no Vercel
8. LP salva no Supabase com URL de producao
