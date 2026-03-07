# Estrutura de Arquivos - Plataforma Email

## Visão Geral

**Tipo de Projeto**: Next.js 14+ (App Router)
**Stack**: TypeScript, Supabase, Tailwind CSS, shadcn/ui, React Hook Form, Zod, TanStack Table, Zustand, Recharts, Unlayer
**Padrão de Autenticação**: Supabase Auth (OAuth + Email/Senha)
**Banco de Dados**: PostgreSQL (Supabase)
**Realtime**: Supabase Realtime Subscriptions
**Storage**: Supabase Storage (avatares, templates, anexos)
**Functions**: Supabase Edge Functions (webhooks, cálculos, automações)

---

## Estrutura Raiz

### Arquivos de Configuração

```
plataforma-email/
├── .env.local.example
│   └── Exemplo de variáveis de ambiente (nunca commitar secrets reais)
│
├── .eslintrc.json
│   └── Configuração ESLint (regras de linting, parsing TypeScript)
│
├── .gitignore
│   └── Exclusões Git (.env.local, node_modules, .next, builds locais)
│
├── next.config.ts
│   └── Configurações Next.js: rewrites, redirects, otimizações de imagem,
│       variáveis de ambiente, headers de segurança, CORS
│
├── package.json
│   └── Dependências do projeto (deps, devDeps, scripts, engines)
│
├── package-lock.json
│   └── Lock file de versões exatas (nunca editar manualmente)
│
├── postcss.config.js
│   └── Configuração PostCSS para Tailwind CSS (entrada/saída)
│
├── tailwind.config.ts
│   └── Temas, cores, tipografia, plugins (extends shadcn defaults)
│
├── tsconfig.json
│   └── Configuração TypeScript: target (ES2020), JSX (preserve), paths, strict
│
├── middleware.ts
│   └── Middleware de autenticação Supabase
│       - Redireciona usuários não autenticados para /login
│       - Valida JWT em cookies
│       - Garante acesso apenas a rotas dashboard/ autenticadas
```

---

## Variáveis de Ambiente (.env.local)

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...

# MailerSend
MAILERSEND_API_KEY=xxxxx
NEXT_PUBLIC_MAILERSEND_PUBLIC_API_KEY=xxxxx

# Claude AI (para gerador de emails)
ANTHROPIC_API_KEY=sk-xxx

# Whatsapp (Phase 2)
WHATSAPP_BUSINESS_ACCOUNT_ID=xxxxx
WHATSAPP_BUSINESS_PHONE_NUMBER_ID=xxxxx
WHATSAPP_ACCESS_TOKEN=xxxxx

# Redis/Cache (Optional, Phase 2)
REDIS_URL=redis://xxxxx:6379

# URLs Públicas
NEXT_PUBLIC_APP_URL=https://plataforma-email.com
NEXT_PUBLIC_API_DOMAIN=api.plataforma-email.com

# Modo Debug
DEBUG=false
NEXT_PUBLIC_DEBUG_MODE=false
```

---

## Supabase Configuration

### `supabase/config.toml`
Configurações do projeto Supabase local (ou remoto via CLI). Define:
- Conexão PostgreSQL
- Auth providers (Google, GitHub, Discord, etc)
- Row Level Security (RLS) policies
- Storage buckets
- Functions configuration

### `supabase/migrations/`
Arquivos de migração SQL (versionados) aplicados na sequência:

#### `001_core_tables.sql`
Tabelas base:
- `users` (estendida de `auth.users` com profile)
- `organizations` (conta/workspace do usuário)
- `organization_members` (team, roles: admin/member)
- `organization_invitations` (convites pendentes)

RLS policies:
- Usuários veem apenas suas orgs
- Admins gerenciam membros

#### `002_email_tables.sql`
Tabelas de email:
- `email_accounts` (configurações SMTP/SendGrid/MailerSend)
- `email_domains` (domínios verificados para sending)
- `email_templates` (templates de email, armazenados em JSON + HTML)
- `email_campaigns` (campanha com metadados, status, agendamento)
- `campaign_sends` (log de envios individuais)
- `email_events` (aberturas, cliques, bounces - webhooks)

#### `003_events_tracking.sql`
Tabelas de rastreamento:
- `lead_events` (timeline: email sent, opened, clicked, etc)
- `lead_scoring_history` (histórico de pontuações)
- `engagement_metrics` (agregações: opens_count, clicks_count, etc)

#### `004_automation_tables.sql` (Phase 3)
Tabelas de automação:
- `automations` (workflows: trigger, actions, conditions)
- `automation_actions` (ações: send email, add tag, webhook)
- `automation_executions` (histórico de execuções)
- `automation_schedules` (agendamentos)

#### `005_whatsapp_tables.sql` (Phase 2)
Tabelas WhatsApp:
- `whatsapp_messages` (mensagens enviadas/recebidas)
- `whatsapp_campaigns` (campanhas WhatsApp)
- `whatsapp_templates` (templates aprovados Meta)

#### `006_api_webhooks.sql`
Tabelas de webhooks:
- `api_keys` (chaves da API para acesso externo)
- `webhooks` (configuração de webhooks outbound)
- `webhook_events` (fila de eventos a enviar)
- `webhook_logs` (histórico de tentativas)

#### `007_legacy_views.sql`
Views e funções SQL para queries complexas:
- `lead_summary_view` (leads + últimas métricas)
- `campaign_stats_view` (estatísticas consolidadas)
- `segment_members_view` (leads em segments com condições)

### `supabase/functions/`
Supabase Edge Functions (TypeScript, rodando em V8, com acesso ao banco):

#### `handle-mailersend-webhook/index.ts`
Webhook do MailerSend → Supabase
Recebe eventos: `email.sent`, `email.opened`, `email.clicked`, `email.bounced`
Valida signature HMAC do MailerSend
Insere em `email_events` e atualiza `engagement_metrics`

#### `handle-whatsapp-webhook/index.ts`
Webhook do WhatsApp → Supabase
Recebe: mensagens recebidas, confirmações de entrega, status
Insere em `whatsapp_messages`
Retorna 200 OK para confirmar (evita re-envios)

#### `send-campaign/index.ts`
Função chamada por agendamento ou API
Busca leads do segmento/público
Prepara HTML via template + personalization ({{name}}, {{custom_field}})
Chama MailerSend API em batch
Cria registros em `campaign_sends`
Registra erros e bounces

#### `calculate-scoring/index.ts`
Função cron (nightly ou sob demanda)
Calcula lead scores baseado em:
- Engagement (opens, cliques, respostas)
- Comportamento (página visitada, tempo no site)
- Dados (email verificado, dados de perfil completos)
- Recência (últimas interações)
Atualiza `leads.lead_score` e insere em `lead_scoring_history`

---

## Estrutura src/app

### `src/app/layout.tsx` (Root Layout)
- Importa providers: Supabase client, Zustand store, Toast provider, TanStack Query
- Define fontes (Geist, custom Google Fonts)
- Metadata global (título, descrição, favicon)
- HTML lang="pt-BR"
- Classes globais Tailwind

### `src/app/middleware.ts`
- Valida sessão Supabase em toda requisição
- Redireciona não autenticados para /login
- Preserva `next-auth` session no header (para uso em RSCs)
- Retorna 401 para /api/* sem autenticação

### `src/app/(auth)/layout.tsx`
Layout centrado para páginas de autenticação:
- Sem sidebar
- Card centrado (max-width: 400px)
- Background com gradiente sutil
- Link para trocar entre login/register

#### `login/page.tsx`
Formulário de login:
- Email + senha via Supabase.auth.signInWithPassword()
- Checkbox "Lembrar-me" (sessionStorage 30 dias)
- Link "Esqueci a senha"
- Buttons OAuth: Google, GitHub, Discord
- Validação com React Hook Form + Zod
- Toast de sucesso/erro

#### `register/page.tsx`
Formulário de registro:
- Email, senha, nome completo
- Checkbox de aceitar T&C
- Chama Supabase.auth.signUp()
- Email de confirmação automático (Supabase)
- Redireciona para /login com mensagem de verificação

#### `forgot-password/page.tsx`
Fluxo de reset de senha:
- Input email
- Supabase envia link de reset
- Link leva para `/reset-password?code=xxx`
- Novo formulário de senha
- Validação de força de senha (zod minLength, regex maiús/numb/especial)

#### `callback/route.ts` (OAuth Callback)
Route handler que:
- Captura `code` e `state` do OAuth provider
- Troca code por session via `Supabase.auth.exchangeCodeForSession()`
- Redireciona para `/` (dashboard)
- Trata erros (invalid code, etc)

---

## Estrutura src/app/(dashboard)

### `(dashboard)/layout.tsx`
Layout principal do dashboard:
- Sidebar + Header + Main content
- Provider de organização (contexto)
- Breadcrumb
- Suspense boundaries para carregamentos assíncronos

#### Componentes filhos:
- `<Sidebar />` — navegação lateral
- `<Header />` — breadcrumb, search, user menu
- `<OrgSelector />` — dropdown de switching de organização (se múltiplas)
- `children` — conteúdo da página

### `page.tsx` (Dashboard Home)
Dashboard principal com:
- **KPI Cards**: emails enviados (mês), taxa abertura, leads qualificados, conversão
- **Charts**:
  - Emails enviados vs abertos (linha, 30 últimos dias)
  - Top campaigns (barra)
  - Lead scoring distribution (histograma)
- **Recent Activity**: últimas campanha, leads adicionados, eventos
- **Quick Actions**: nova campanha, novo lead, novo segmento
- Data via `useEmailKpis()`, `useCampaigns()`, `useLeads()`
- Filtro por data range (últimos 7/30/90 dias)

---

## Módulo Leads

### `leads/page.tsx`
Página principal de leads:
- **Tabela**:
  - Colunas: Nome, Email, Score, Temperatura (quente/morna/fria), Status, Tags, Última interação
  - Ordenação e paginação via TanStack Table
  - Seleção múltipla (checkboxes)
  - Ações: visualizar, editar, deletar, atribuir tags, mover segmento
- **Filtros** (filterBar):
  - Score (slider)
  - Temperatura (select multi)
  - Status (select multi: novo, engajado, inativo)
  - Tags (multi-select autocomplete)
  - Data de criação (range picker)
  - Search por nome/email
- **Paginação**: 20, 50, 100 por página
- **Bulk actions**: atribuir tag, atualizar status, exportar CSV, deletar
- Loading skeleton enquanto busca

### `[id]/page.tsx` (Lead Detail)
Perfil completo do lead:
- **Card de info**: nome, email, telefone, empresa, localização, avatar
- **Timeline de interações**:
  - Email sent → opened → clicked
  - Página visitada
  - Form preenchido
  - Status change
  - Ordenado por data descendente, com ícones por tipo
- **Scoring breakdown**:
  - Score total e histórico (mini gráfico)
  - Componentes de score (engagement 40%, comportamento 30%, dados 20%, recência 10%)
- **Tags**: adicionar/remover tags
- **Segmentos**: quais segments inclui
- **Ações**: enviar email manual, atribuir, deletar, adicionar nota
- Data via `useLead(id)`, `useLeadTimeline(id)`, `useLeadScoring(id)`

### `[id]/loading.tsx`
Skeleton de carregamento do detalhe de lead (shimmer effect)

### `import/page.tsx`
Wizard de importação CSV:
- **Passo 1**: Upload arquivo CSV (drag & drop)
- **Passo 2**: Mapeamento de colunas (CSV col → database field)
  - Email (obrigatório)
  - Nome, Telefone, Empresa, Localização (opcionais)
  - Custom fields (permite criar novos campos)
- **Passo 3**: Preview dos primeiros 10 registros
- **Passo 4**: Confirmação + segmento destino + dedupção (por email)
- **Passo 5**: Resultado (X leads importados, Y duplicados, Z erros)
- Validação:
  - Email válido e único por organização
  - Campos obrigatórios preenchidos
  - Tamanho máximo arquivo (10MB)
  - Limite de leads por plan

---

## Módulo Campaigns

### `campaigns/page.tsx`
Lista de campanhas:
- **Tabela**:
  - Colunas: Nome, Status (rascunho/agendada/enviando/enviada), Recipientes, Taxa abertura, Taxa clique, Data envio, Ações
  - Filtros: status, data range
  - Busca por nome
- **Card de estatísticas**:
  - Total enviados
  - Taxa abertura média
  - Taxa clique média
  - Conversões
- **Paginação e bulk actions**: duplicar, deletar, exportar relatório

### `new/page.tsx` (Create Campaign Wizard)
Wizard com 4 passos:

**Passo 1: Informações Básicas**
- Nome da campanha
- Descrição (opcional)
- Campanha de teste (checkbox)
- From name e from email (seleção de email account verificada)
- Reply-to email

**Passo 2: Público**
- Seleção: segmento, lista estática, todos leads
- Preview: X recipients
- Exclusões: leads bounced, unsubscribed, recentes retorno

**Passo 3: Conteúdo (Email Editor)**
- Seleção de template (biblioteca) ou blank
- Unlayer editor integrado (drag & drop, componentes, preview)
- Personalization: {{first_name}}, {{company}}, {{custom_field}}
- Preview responsiva (desktop/mobile)
- A/B test setup (opcional):
  - Subject line variation
  - Content variation (2 templates)
  - Winner criteria (open rate, click rate)

**Passo 4: Agendamento**
- Envio imediato vs agendado
- Data/hora se agendado
- Timezone seleção
- Janela de envio (distribuir ao longo de horas/dias)
- Salvar como rascunho ou agendar

### `[id]/page.tsx` (Campaign Detail / Stats)
Dashboard da campanha enviada:
- **Header**: nome, status, data envio, recipientes
- **KPIs**: enviados, entregues, abertos, cliques, conversões, unsubscribes, bounces
- **Charts**:
  - Performance ao longo do tempo (linha: opens, clicks por hora/dia)
  - Opens vs clicks (barra)
  - Traffic por link (top 10 links com cliques)
  - Device breakdown (desktop/mobile/tablet)
- **List de recipients**:
  - Nome, email, status (sent/opened/clicked/bounced), tipo abertura/clique (timestamp)
- **Ações**: duplicar, visualizar template, exportar relatório
- Data via `useCampaign(id)`, `useCampaignStats(id)`, `useCampaignEvents(id)`

### `[id]/edit/page.tsx`
Edição de campanha (apenas rascunhos):
- Mesmos passos do wizard
- Salvar alterações
- Botão "Agendar para envio"

---

## Módulo Templates

### `templates/page.tsx`
Galeria de templates:
- **Tabs**: Meus templates | Biblioteca (pré-built)
- **Grid** de templates com:
  - Thumbnail (preview imagem ou Unlayer render)
  - Nome, categoria (promotional, newsletter, transactional)
  - Data criação
  - Ações: editar, duplicar, deletar, visualizar, usar em campanha
- **Filtros**: categoria, data range
- **Search** por nome

### `new/page.tsx`
Criar novo template:
- Seleção: blank, a partir de template pré-built
- Abre editor (Unlayer)
- Salvar com nome
- Redireciona para `[id]/edit`

### `[id]/edit/page.tsx`
Editor de template:
- **Unlayer integration** (iframe, editor completo)
- **Toolbar**: salvar, preview, desfazer/refazer, delete
- **Sidebar**:
  - Blocos (texto, imagem, botão, spacer, divider)
  - Variáveis de personalization disponíveis
  - CSS customizado (opcional, avançado)
- **Função salvar**: atualiza `email_templates.html_content` e `email_templates.design_json` (JSON do Unlayer)
- **Preview responsiva**: desktop, mobile inline
- **Eventos**:
  - Auto-save a cada 30s
  - Ctrl+S para salvar manual
  - Aviso ao sair com mudanças não salvas

### `ai/page.tsx` (AI Email Generator)
Interface estilo ChatGPT para gerar emails:
- **Chat sidebar**: histórico de gerações
- **Main area**:
  - Prompt input (placeholder: "Descreva o email que quer...")
  - Contexto enviado ao Claude:
    ```
    Gerar email marketing em português.
    Público: {{audience}}
    Objetivo: {{goal}}
    Marca: {{brand_tone}}
    Include: personalization {{first_name}}, CTA, imagens
    Return: HTML ready para Unlayer
    ```
  - Stream response (typing effect)
  - Botões: "Usar este template", "Regenerar", "Copiar HTML"
- **Resposta**:
  - HTML preview no Unlayer inline
  - Código fonte (modal)
  - Opção copiar/baixar
- Integração Claude API via `/lib/claude/email-generator.ts`

---

## Módulo Segments (Públicos Alvo)

### `segments/page.tsx`
Lista de segmentos:
- **Tabela**:
  - Nome, descrição, count de leads, regras (resumo: "email contains @company.com + score > 50")
  - Data criação, última modificação
  - Ações: visualizar, editar, duplicar, deletar
- **Paginação e busca**
- **Card estatístico**: total segmentos, leads em segmentos

### `[id]/page.tsx`
Detalhe do segmento:
- **Informações**: nome, descrição, regras em linguagem natural
- **Members list**: leads correspondentes (paginada, filtrável)
- **Rule visualization**: visual builder (readonly)
- **Ações**: editar, duplicar, enviar campanha para este segmento, exportar

### `new/page.tsx`
Criar novo segmento:
- Abre rule builder (componente `<RuleBuilder />`)
- Salva ao clicar "Criar segmento"

### Rule Builder Component (`rule-builder.tsx`)
Editor visual de regras com lógica AND/OR:
- **Condicional**: email, nome, score, temperatura, tags, custom fields
- **Operadores**:
  - Strings: contains, equals, starts with, ends with
  - Números: equals, >, <, >=, <=
  - Datas: after, before, is exact
  - Arrays (tags): includes any, includes all
- **Blocos de regras**:
  ```
  IF (email contains "@company.com")
  AND (score >= 50)
  OR (temperature = "hot")
  THEN add to segment
  ```
- **Preview**: X leads match these conditions
- **Save**: gera query SQL-like armazenada em `segments.rules_json`

---

## Módulo Automations (Phase 3)

### `automations/page.tsx`
Lista de workflows de automação:
- **Tabela**: nome, trigger, ações, status (ativo/pausado), execuções, data criação
- **Filtros**: status, tipo de trigger
- **Ações**: editar, duplicar, pausar/ativar, deletar, ver execuções

### `new/page.tsx`
Wizard para criar automação:

**Passo 1: Trigger**
- Opções:
  - Lead importado
  - Lead adicionado a segmento
  - Email aberto (com N segundos de delay)
  - Link clicado
  - Formulário preenchido
  - Data/hora (agendado)
  - Webhook recebido
- Configurações específicas (ex: qual email, qual segmento, etc)

**Passo 2: Condições** (opcionais)
- Rule builder similar a segments
- Ex: "se score < 50, não executar"

**Passo 3: Ações** (em sequência)
- Multi-select de ações:
  - Enviar email (template selection)
  - Adicionar tag
  - Mover para segmento
  - Atualizar campo customizado
  - Chamar webhook (POST ao URL externo)
  - Enviar WhatsApp (Phase 2)
  - Adicionar nota interna
  - Delay (0-24h entre ações)

**Passo 4: Revisão + Ativar**

### `[id]/page.tsx`
Detalhe da automação:
- Visualização das configurações
- Histórico de execuções (tabela)
- Ações: editar, clonar, pausar, deletar, testar (trigger manual para 1 lead)

---

## Módulo Analytics (Phase 2)

### `analytics/page.tsx` (Overview)
Dashboard consolidado com KPIs de todos os canais:
- **Período**: seletor (últimos 7/30/90 dias, custom range)
- **Cards de KPI**:
  - Leads qualificados (total, MoM change)
  - Email opens (%, trending)
  - Conversão (%, trending)
  - ROI estimado
- **Charts principais**:
  - Leads ao longo do tempo (área, segmentado por fonte)
  - Email performance (opens vs clicks vs conversão)
  - Leads by channel attribution (pizza)
- **Comparação período anterior** (YoY, MoM)

### `email/page.tsx`
Analytics específico de email:
- **Métricas**: sent, delivered, opened, bounced, unsubscribed, complained
- **Charts**:
  - Performance funnel (sent → opened → clicked → converted)
  - Opens ao longo do tempo
  - Clicks ao longo do tempo
  - Taxa abertura por dispositivo
  - Taxa abertura por cliente email (Gmail, Outlook, etc)
  - Unsubscribe reasons (motivos)
- **Tabelas**:
  - Emails com melhor performance
  - Links mais clicados
  - Dispositivos

### `leads/page.tsx`
Analytics de leads:
- **Distribuição por status**: novo, engajado, inativo, convertido
- **Score distribution** (histograma)
- **Leads por temperatura** (hot/warm/cold)
- **Fonte de origem** (importação, API, formulário)
- **Tempo de conversão** (dias da primeira interação até compra)
- **Retenção** (cohort analysis)

### `channels/page.tsx`
Atribuição multicanal (Phase 2):
- **Modelos de atribuição**: first-click, last-click, linear, time decay
- **Contribuição por canal**: email, landing page, direto, etc
- **Customer journey** (Sankey diagram)
- **ROI por canal** (investment vs revenue)

---

## Módulo Settings

### `settings/page.tsx` (General)
Configurações gerais:
- Preferências: timezone, idioma, tema (light/dark)
- Notificações: email de eventos, resumos diários
- Privacidade: dados de rastreamento

### `organization/page.tsx`
Configurações da organização:
- Nome, logo, website
- Timezone padrão
- Plano/billing
- Opções de armazenamento (leads limit, email sends limit)
- Exclusão de organização (destructive action)

### `domains/page.tsx`
Gerenciamento de domínios de envio:
- **Tabela** de domínios: domínio, status (pendente/verificado), registros DNS
- **Adicionar domínio**:
  - Input do domínio
  - Gera registros DNS necessários (SPF, DKIM, DMARC)
  - Exibe instruções de verificação
  - Check periodicamente até verificado
- **Ações**: verificar agora, remover
- **Validação**: apenas admin pode adicionar

### `api-keys/page.tsx`
Gerenciamento de API keys:
- **Tabela**: nome, chave parcial (xxx-xxxxx), data criação, último acesso, escopo
- **Criar nova chave**:
  - Nome descritivo
  - Seleção de escopos: leads:read, leads:write, campaigns:read, campaigns:write, etc
  - Gera chave de 32 caracteres
  - Exibe 1x apenas (avisar para copiar)
- **Ações**: regenerar, deletar, copiar
- **Auditoria**: log de acessos da chave

### `webhooks/page.tsx`
Webhooks outbound (envio):
- **Tabela**: URL, eventos, status (ativo/inativo), tentativas de entrega
- **Criar webhook**:
  - URL destino
  - Multi-select de eventos:
    - lead.created
    - lead.updated
    - campaign.sent
    - email.opened
    - email.clicked
    - etc
  - Signature HMAC (secret key gerada)
  - Retry policy (exponencial backoff)
- **Ações**: testar (envia webhook fake), editar, deletar, ver logs
- **Logs**: histórico de tentativas, payloads, respostas

### `team/page.tsx`
Gerenciamento de membros:
- **Tabela**: nome, email, role (admin/member), data adicionado, status
- **Convitar membro**:
  - Email
  - Role selection
  - Envia email de convite com link de aceitação
- **Ações**: alterar role, remover (soft delete)
- **Convites pendentes**: lista, opção reenviar, cancelar

### `integrations/page.tsx` (Phase 2)
Integrações externas:
- **Conectados**: Shopify, Stripe, WooCommerce, Zapier, HubSpot, Salesforce
- **Para cada integração**:
  - Status (conectado/desconectado)
  - Data de conexão
  - Botão desconectar/reconectar
  - Opções de sync (automático vs manual)
- **Setup wizard** para novas integrações

---

## Componentes (src/components)

### `ui/` — Base Components (shadcn/ui + custom)

```
button.tsx                 — Componente Button (variants: default, ghost, outline)
input.tsx                  — Input com label, error, icon support
select.tsx                 — Select/Dropdown com search
dialog.tsx                 — Modal com Portal, overlay
dropdown-menu.tsx          — Context menu com Arrow
toast.tsx                  — Notificações toast (Sonner integration)
badge.tsx                  — Badge com variants (solid, outline, subtle)
card.tsx                   — Card container com className override
tabs.tsx                   — Tabs com border indicator
checkbox.tsx               — Checkbox controlado
radio.tsx                  — Radio button group
label.tsx                  — Label associada (acessibilidade)
textarea.tsx               — Textarea com line counter
slider.tsx                 — Slider range input
popover.tsx                — Popover com Floating UI
tooltip.tsx                — Tooltip com delay
kpi-card.tsx               — Card de KPI (Tracking origin) com value, label, change%, icon
data-table.tsx             — Tabela com TanStack Table (sorting, filtering, selection)
filter-bar.tsx             — Barra de filtros (Tracking origin)
date-range-picker.tsx      — Seletor de data range com calendário (Tracking origin)
status-badge.tsx           — Badge colorido para status (Tracking origin, estendido)
channel-badge.tsx          — Badge para canal (email, whatsapp, sms)
temperature-badge.tsx      — Badge para temperatura lead (hot/warm/cold)
score-bar.tsx              — Barra visual de score lead (0-100)
skeleton.tsx               — Shimmer skeleton loading (Tracking origin)
empty-state.tsx            — Ilustração + mensagem quando sem dados
pagination.tsx             — Componente paginação (prev, next, page select)
search-input.tsx           — Input com ícone search + debounce
loading-spinner.tsx        — Spinner (SVG ou Radix)
```

### `layout/` — Layout Components

```
sidebar.tsx                — Navbar lateral (From Tracking, adapted)
                           - Logo, menu items com icons, collapse toggle
                           - Nav items dinâmicos baseado em role
                           - Org selector dropdown
                           - User profile + settings link

header.tsx                 — Header superior (From Tracking)
                           - Breadcrumb navegável
                           - Search bar global
                           - User menu (profile, settings, logout)
                           - Notificações bell icon
                           - Toggle dark mode

org-selector.tsx           — Dropdown de seleção de organização (From Tracking)
                           - Lista orgs do usuário
                           - "Create new org" option
                           - Ícone com cor por org

user-menu.tsx              — Menu dropdown usuário
                           - Avatar com iniciais
                           - "Profile settings"
                           - "API keys"
                           - "Logout"
                           - Powered by logo
```

### `leads/` — Lead Components

```
lead-table.tsx             — Tabela de leads com TanStack Table
                           - Colunas: nome, email, score, temp, status, tags, last event
                           - Seleção múltipla com checkbox header
                           - Sorting e filtering
                           - Ações inline: ver, editar, deletar

lead-detail-card.tsx       — Card de info do lead
                           - Avatar, nome, email, empresa
                           - Status badge, score bar
                           - Botões: enviar email, atribuir, editar

lead-timeline.tsx          — Timeline de eventos (From Tracking journey)
                           - Email sent → opened → clicked
                           - Data, ícone, descrição
                           - Tooltip com detalhes (timestamp, user-agent se disponível)
                           - Ordenado descendente

lead-scoring-card.tsx      — Breakdown visual de score
                           - Score total (grande)
                           - Componentes em barra: engagement, behavior, data, recency
                           - Percentual de cada
                           - Histórico mini-gráfico (7 últimos dias)

lead-tags.tsx              — Gerenciamento de tags inline
                           - Multi-select autocomplete
                           - Badges editáveis
                           - Add/remove com validação

import-wizard.tsx          — Wizard de importação (ref acima)
lead-filters.tsx           — Panel de filtros (score, temp, status, tags, date range)
```

### `campaigns/` — Campaign Components

```
campaign-table.tsx         — Tabela de campanhas
campaign-wizard.tsx        — Wizard de 4 passos (ref acima)
campaign-stats.tsx         — KPI cards de estatísticas de campanha
send-preview.tsx           — Preview de email antes de envio
                           - Responsivo (desktop/mobile toggle)
                           - Personalização preview ({{name}} substituído)
                           - Full width container com scroll

ab-test-setup.tsx          — Configurador de A/B test
                           - Seleção variant A e B
                           - Criteria (open rate, click rate, conversion)
                           - Tamanho amostra (% recipients)
                           - Winner selection (manual or auto após X days)
```

### `templates/` — Template Components

```
template-gallery.tsx       — Grid de templates com thumbnails
email-editor.tsx           — Wrapper do Unlayer editor
                           - Integração iframe
                           - State management (design JSON)
                           - Callbacks onSave, onExport

ai-generator.tsx           — Chat interface para gerar emails (From sistema de LP)
                           - Input prompt, stream response
                           - Loading indicator
                           - Insert to editor button

template-preview.tsx       — Iframe preview de template (From sistema de LP)
                           - Renderiza HTML em iframe sandboxed
                           - Auto-refresh quando HTML muda
```

### `segments/` — Segment Components

```
segment-table.tsx          — Tabela de segmentos
rule-builder.tsx           — Visual rule editor (detalhado acima)
                           - Drag & drop (opcional, v2)
                           - AND/OR lógica
                           - Preview de leads

segment-members.tsx        — Lista paginada de leads em segmento
```

### `analytics/` — Analytics Components (Phase 2)

```
email-metrics-chart.tsx    — Linha: opens, clicks, bounces
leads-over-time.tsx        — Área: leads adicionados (com segmentação opcional)
channel-breakdown.tsx      — Pizza: distribuição por canal
funnel-chart.tsx           — Funil: sent → opened → clicked → converted
attribution-cards.tsx      — Cards de ROI por canal
campaign-timeline.tsx      — Timeline horizontal de campanhas
```

### `shared/` — Shared Components

```
confirm-dialog.tsx         — Diálogo de confirmação (delete, etc)
pagination.tsx             — Componente paginação genérico
search-input.tsx           — Input search com debounce
loading-spinner.tsx        — Spinner genérico
```

---

## Hooks (src/hooks)

```
use-organization.tsx       — Retorna org atual + lista orgs (From Tracking, adapted)
                           - useContext(OrgContext) → org object
                           - Cache via Zustand

use-date-filter.ts         — State de filtro de data (From Tracking)
                           - startDate, endDate, preset (7d, 30d, 90d, custom)
                           - setters com validação

use-filters.ts             — State de filtros genéricos (From Tracking)
                           - filters object
                           - updateFilter(key, value)
                           - clearAll()

use-leads.ts               — Fetch + cache de leads
                           - useSuspenseQuery ou useQuery
                           - Parâmetros: org_id, filter, search, pagination
                           - Realtime updates via Supabase Realtime

use-campaigns.ts           — Fetch + cache de campanhas
use-segments.ts            — Fetch + cache de segmentos
use-templates.ts           — Fetch + cache de templates
use-email-kpis.ts          — Fetch KPIs agregados de email
use-lead-timeline.ts       — Fetch timeline de eventos do lead
use-supabase.ts            — Singleton Supabase client (browser)
                           - Lazy initialization
                           - Auth state management

use-realtime.ts            — Hook para Supabase Realtime subscriptions
                           - useEffect cleanup
                           - Auto-reconnect
```

---

## Lib (src/lib)

### `supabase/`

```
client.ts                  — Singleton Supabase client (browser)
                           - createClient(url, key)
                           - Lazy loaded, cached

server.ts                  — Supabase client para Server Components/RSC
                           - createClient() com cookies do request
                           - Usado em layouts/pages server-side

middleware.ts              — Helper para validar auth em middleware
                           - verifyAuth(request) → User | null

admin.ts                   — Service role client (API routes, webhooks)
                           - RLS bypassed
                           - Usado em /api routes apenas
                           - NUNCA expor chave públicamente
```

### `mailersend/`

```
client.ts                  — Wrapper SDK do MailerSend
                           - Inicializa com API key
                           - Métodos: send(), sendBulk(), getAnalytics()

send-email.ts              — Função para enviar email único
                           - Parâmetros: to, subject, template_id ou html, vars
                           - Retorna { messageId, status }

send-campaign.ts           — Bulk send para campanha
                           - Busca leads do segmento
                           - Prepara array de recipients
                           - Chama MailerSend batch API
                           - Lida com rate limits

verify-webhook.ts          — Verifica HMAC signature de webhook
                           - Compara hash recebido com calculado
                           - Retorna body se válido, lança erro se inválido
```

### `claude/`

```
client.ts                  — Wrapper Anthropic API (From sistema de LP)
                           - Inicializa com API key
                           - Método: createMessage() ou chat() com stream

email-generator.ts         — Prompts para geração de emails
                           - generateEmail(audience, goal, brand_tone) → Promise<html>
                           - Stream de resposta

templates.ts               — System prompts pré-definidos
                           - SYSTEM_PROMPT_EMAIL_GENERATION
                           - SYSTEM_PROMPT_SUBJECT_LINE_GENERATION
```

### `utils.ts`
Funções utilitárias (From Tracking):
```ts
formatDate(date) → "12 de março"
formatDateTime(date) → "12 de março às 14:30"
formatCurrency(value) → "R$ 1.234,56"
formatPercent(value) → "45,2%"
cn(...classes) → classNames merger (clsx)
generateId() → uuid v4
slugify(text) → kebab-case
parseCSV(content) → { headers, rows }
```

### `constants.ts`
Constantes da aplicação:
```ts
// Navegação
NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutGrid, href: "/" },
  { label: "Leads", icon: Users, href: "/leads" },
  { label: "Campanhas", icon: Send, href: "/campaigns" },
  // ...
]

// Status de campanha
CAMPAIGN_STATUS = {
  DRAFT: "draft",
  SCHEDULED: "scheduled",
  SENDING: "sending",
  SENT: "sent",
}

// Cores por status
STATUS_COLORS = {
  draft: "bg-gray-100",
  sent: "bg-green-100",
  bounced: "bg-red-100",
  // ...
}

// Limites por plan
PLAN_LIMITS = {
  starter: { leads: 5000, emails_per_month: 50000 },
  pro: { leads: 50000, emails_per_month: 500000 },
  // ...
}
```

### `validations.ts`
Esquemas Zod para validação de forms:
```ts
loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

createCampaignSchema = z.object({
  name: z.string().min(3),
  from_email: z.string().email(),
  recipients_count: z.number().min(1),
  // ...
})

createSegmentSchema = z.object({
  name: z.string().min(2),
  rules: z.array(ruleSchema),
})
```

---

## Types (src/types)

```
database.ts                — Types gerados via supabase gen types
                           - Espelha schema do Supabase
                           - Atualizado após cada migração
                           - Uso: type Lead = Database["public"]["Tables"]["leads"]["Row"]

leads.ts                   — Tipos customizados para leads
                           - LeadWithMetrics = Lead + engagement_metrics
                           - LeadTimeline = { event_type, timestamp, ... }

campaigns.ts               — Tipos de campanhas
                           - CampaignStats = { sent, opened, clicked, ... }
                           - CampaignWithStats = Campaign + CampaignStats

templates.ts               — Tipos de templates
                           - EmailTemplate = { design_json, html_content, ... }

analytics.ts               — Tipos de analytics
                           - KPIData = { date, opens, clicks, ... }
                           - ChannelAttribution = { channel, revenue, ... }
```

---

## Stores (src/stores) — Zustand

```
organization-store.ts      — Estado global de organização
                           - currentOrganization: Organization
                           - organizations: Organization[]
                           - setCurrentOrganization(org)
                           - setOrganizations(orgs)
                           - Persisted em localStorage

ui-store.ts                — Estado de UI transiente
                           - sidebarOpen: boolean
                           - setSidebarOpen(open)
                           - modals: { createSegment: boolean, ... }
                           - setModal(modal, open)
                           - theme: "light" | "dark"
                           - setTheme(theme)
```

---

## package.json - Dependências Completas

### Core Framework
```json
{
  "next": "^14.2.0",
  "react": "^18.3.0",
  "react-dom": "^18.3.0",
  "typescript": "^5.3.0"
}
```

### Database & Auth
```json
{
  "@supabase/supabase-js": "^2.38.0",
  "@supabase/auth-helpers-nextjs": "^0.8.0",
  "realtime-js": "^2.0.0"
}
```

### UI & Styling
```json
{
  "tailwindcss": "^3.3.0",
  "postcss": "^8.4.0",
  "@tailwindcss/typography": "^0.5.10",
  "class-variance-authority": "^0.7.0",
  "clsx": "^2.0.0"
}
```

### shadcn/ui Components
```json
{
  "radix-ui": "^1.0.0",
  "@radix-ui/react-dialog": "^1.1.0",
  "@radix-ui/react-dropdown-menu": "^2.0.0",
  "@radix-ui/react-select": "^2.0.0",
  "@radix-ui/react-tabs": "^1.0.0",
  "@radix-ui/react-popover": "^1.0.0",
  "@radix-ui/react-tooltip": "^1.0.0",
  "@radix-ui/react-checkbox": "^1.0.0",
  "@radix-ui/react-radio-group": "^1.1.0"
}
```

### Forms & Validation
```json
{
  "react-hook-form": "^7.48.0",
  "zod": "^3.22.0",
  "@hookform/resolvers": "^3.3.0"
}
```

### Tables & Data
```json
{
  "@tanstack/react-table": "^8.13.0",
  "@tanstack/react-query": "^5.28.0"
}
```

### Charts & Visualization
```json
{
  "recharts": "^2.10.0"
}
```

### Email Editor
```json
{
  "react-email-editor": "^1.7.8"
}
```

### State Management
```json
{
  "zustand": "^4.4.0"
}
```

### Notifications & Modals
```json
{
  "sonner": "^1.2.0"
}
```

### Date & Time
```json
{
  "date-fns": "^2.30.0",
  "react-day-picker": "^8.9.0"
}
```

### API & HTTP
```json
{
  "axios": "^1.6.0",
  "ky": "^1.1.0"
}
```

### Utilities
```json
{
  "lodash-es": "^4.17.21",
  "uuid": "^9.0.0",
  "papaparse": "^5.4.1"
}
```

### Development
```json
{
  "@types/react": "^18.2.0",
  "@types/react-dom": "^18.2.0",
  "@types/node": "^20.0.0",
  "eslint": "^8.52.0",
  "eslint-config-next": "^14.2.0",
  "prettier": "^3.0.0"
}
```

---

## Environment Variables Detalhadas

```env
# === SUPABASE ===
# URL da instância Supabase (obtém no console)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co

# Chave anon do Supabase (segura usar no browser, RLS garante segurança)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Chave service role do Supabase (NUNCA expor publicamente, apenas server-side)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# === MAILERSEND ===
# Chave API do MailerSend (para enviar emails via função edge)
MAILERSEND_API_KEY=your-api-key-xxx

# Chave pública MailerSend (para operações read-only no browser)
NEXT_PUBLIC_MAILERSEND_PUBLIC_API_KEY=your-public-key-xxx

# Webhook secret do MailerSend (validar assinatura HMAC em handle-mailersend-webhook)
MAILERSEND_WEBHOOK_SECRET=your-webhook-secret-xxx

# === CLAUDE AI ===
# Chave API Anthropic (para gerador de emails via /lib/claude/client.ts)
ANTHROPIC_API_KEY=sk-ant-xxx

# === WHATSAPP (Phase 2) ===
WHATSAPP_BUSINESS_ACCOUNT_ID=1234567890
WHATSAPP_BUSINESS_PHONE_NUMBER_ID=1234567890
WHATSAPP_ACCESS_TOKEN=EAA...
WHATSAPP_WEBHOOK_SECRET=your-webhook-secret-xxx

# === REDIS (Phase 2, opcional) ===
REDIS_URL=redis://localhost:6379

# === URLs PÚBLICAS ===
# URL raiz da aplicação (usado em redirects, email links, etc)
NEXT_PUBLIC_APP_URL=https://plataforma-email.com

# Domínio da API (para chamadas CORS)
NEXT_PUBLIC_API_DOMAIN=api.plataforma-email.com

# === DEBUG ===
DEBUG=false
NEXT_PUBLIC_DEBUG_MODE=false

# === FEATURE FLAGS ===
NEXT_PUBLIC_ENABLE_WHATSAPP=false
NEXT_PUBLIC_ENABLE_AUTOMATIONS=false
NEXT_PUBLIC_ENABLE_ANALYTICS_V2=false
```

---

## Configurações Importantes

### `tailwind.config.ts`
Estende shadcn defaults com:
- Cores customizadas (brand colors)
- Tipografia (font-family, sizes)
- Breakpoints (responsive)
- Plugins: @tailwindcss/typography para emails

### `next.config.ts`
Configurações:
- Image optimization (Supabase Storage)
- CORS headers para webhooks
- Rewrites para API routes
- Redirects para auth flow

### `postcss.config.js`
Processa CSS:
- tailwindcss (utility-first)
- autoprefixer (vendor prefixes)

### `tsconfig.json`
- target: ES2020
- jsx: preserve (para Next.js)
- baseUrl: "."
- paths: { "@/*": "src/*" }
- strict: true

---

## Fluxo de Autenticação

1. Usuário em `/login` → `signInWithPassword()` Supabase
2. Supabase retorna session + JWT em httpOnly cookie
3. Middleware valida JWT em toda requisição
4. RSCs acessam `useUser()` via server client
5. Na logout, JWT removido do cookie
6. OAuth: redirect → callback route → `exchangeCodeForSession()` → redirect `/`

---

## Fluxo de Dados - Campanha

1. User cria campanha no wizard (4 passos)
2. Salva em `campaigns` table (status = "draft")
3. Template editado no Unlayer (design_json + html_content)
4. Usuário agenda para envio → Supabase Function `send-campaign/`
5. Função busca leads do público selecionado
6. MailerSend API envia emails em batch
7. Registra em `campaign_sends` e `email_events` (status = "sent")
8. MailerSend webhook → Supabase → atualiza eventos (opened, clicked, bounced)
9. Dashboard mostra stats em tempo real via Realtime subscriptions

---

## Scaffold Completo

Com esta documentação, um AI agent pode:
1. Criar estrutura de pastas
2. Gerar types via `supabase gen types`
3. Aplicar migrações SQL via CLI Supabase
4. Scaffoldar pages/components do Next.js 14
5. Configurar Zustand stores
6. Configurar React Hook Form + Zod schemas
7. Integrar TanStack Table/Query
8. Conectar Supabase Auth + Realtime
9. Implementar MailerSend webhook
10. Deploy no Vercel (com env vars) ou self-hosted

Todos os caminhos de imports usam `@/` para referência relativa à `src/`.

---

**Última atualização**: 2026-03-05
