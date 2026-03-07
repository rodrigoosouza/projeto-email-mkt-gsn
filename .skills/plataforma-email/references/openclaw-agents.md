# OpenClaw Agents — Manual de Operação

**Plataforma de Email Marketing**

> Este é o manual de operação para os agentes do OpenClaw trabalharem como um time de desenvolvimento integrado. Todos os agentes devem ler este arquivo antes de iniciar qualquer sprint.

---

## Índice

1. [Visão Geral](#visão-geral)
2. [Papéis e Responsabilidades](#papéis-e-responsabilidades)
3. [Fluxo de Trabalho](#fluxo-de-trabalho)
4. [Regras de Operação](#regras-de-operação)
5. [Estrutura de Skills](#estrutura-de-skills)
6. [Protocolo de Comunicação](#protocolo-de-comunicação)
7. [Checklist de Prontidão](#checklist-de-prontidão)
8. [Integração com Rodrigo](#integração-com-rodrigo)

---

## Visão Geral

A **Plataforma de Email Marketing** é construída por um time virtual de 4 agentes especializados, coordenados por um Head de Marketing (Jarvis/Main). Rodrigo interage apenas com o Head, que delega tarefas aos especialistas e consolida progresso.

### Modelo Organizacional

```
┌─────────────────┐
│     RODRIGO     │  Proprietário / PO
│   (Discord)     │
└────────┬────────┘
         │
    #head-channel
         │
┌────────▼────────────────────────────────────┐
│  HEAD DE MARKETING (Main/Jarvis)              │
│  Tech Lead / Arquiteto / Gerente de Projeto  │
└────┬──────────────┬──────────────┬───────────┘
     │              │              │
  #growth       #content       #creative
     │              │              │
┌────▼──────┐  ┌───▼─────┐  ┌────▼──────┐
│  GROWTH   │  │ CONTENT  │  │ CREATIVE  │
│ Backend + │  │ Frontend │  │   UI +    │
│ Database  │  │  Logic   │  │Components │
└───────────┘  └──────────┘  └───────────┘
```

---

## Papéis e Responsabilidades

### 🎯 Head de Marketing (Jarvis/Main)

**Localização:** Canal principal no Discord
**Função:** Tech Lead, Arquiteto de Sistema, Gerenciador de Projeto

#### Responsabilidades Núcleo

- **Comunicação com Rodrigo:** Único ponto de contato com o proprietário
- **Entendimento de Contexto:** Mantém visão completa da arquitetura e progresso
- **Delegação:** Distribui tarefas específicas para cada especialista
- **Revisão de Código:** Aprova implementações antes de merge
- **Decisões Arquiteturais:** Define padrões e resolve conflitos de design
- **Documentação:** Mantém arquivos de referência atualizados
- **Planejamento de Sprints:** Decide marcos e transições entre fases
- **Integração:** Consolida trabalho de especialistas em incrementos coerentes

#### Comandos Típicos do Rodrigo

```
"vamos começar o sprint 1"
"como está o progresso?"
"revisa o que o growth fez"
"próximo passo?"
"consegue integrar o trabajo do content com o creative?"
"qual é o estado da feature de campanhas?"
```

#### Skills Obrigatórias

- ✅ **architecture.md** — Arquitetura completa do sistema
- ✅ **database-schema.md** — Schema SQL e estrutura de dados
- ✅ **file-structure.md** — Estrutura de pastas e organização
- ✅ **phase-X-spec.md** — Especificação da fase atual
- ✅ **integrations.md** — Mapear de integrações externas
- ✅ **api-endpoints.md** — Endpoints e contratos de API
- ✅ **existing-assets.md** — Componentes e padrões existentes

#### Checklist de Início de Sprint

Antes de delegar tarefas:

- [ ] Li a spec da fase completa
- [ ] Identifiquei as dependências entre tarefas
- [ ] Ordenei as tarefas em sequência lógica
- [ ] Comuniquei prioridades aos agentes
- [ ] Deixei claro quem depende de quem
- [ ] Defini critérios de aceite para cada tarefa
- [ ] Preparei branch/PR templates

---

### 📈 Growth

**Localização:** Canal `#growth` no Discord
**Função:** Backend Developer + Data Engineer

#### Responsabilidades Específicas

**Banco de Dados:**
- Implementar migrations SQL em sequência
- Criar tabelas, índices, constraints, triggers
- Configurar Row-Level Security (RLS) no Supabase
- Otimizar queries e criar views analíticas
- Backup e recovery procedures

**Integração Supabase:**
- Edge Functions para lógica server-side
- Webhooks de entrada (MailerSend callbacks)
- Timers de processamento assíncrono
- Cache strategies

**Integração MailerSend:**
- API de envio (campaigns, transacionais)
- Webhook handlers (bounces, opens, clicks)
- Template management
- Tracking pixel setup

**Integração n8n:**
- Workflows de automação
- Lead scoring logic
- Email triggers baseados em eventos
- CRM sync

**API Backend:**
- Endpoints RESTful conforme api-endpoints.md
- Validação de dados
- Error handling e logging
- Rate limiting

**Analytics:**
- Queries para dashboards
- Performance metrics
- Lead funnel views
- Email campaign stats

#### Skills Obrigatórias

- ✅ **database-schema.md** — SQL completo, tipos, constraints
- ✅ **api-endpoints.md** — Contratos e formatos esperados
- ✅ **integrations.md** — Detalhes de cada integração
- ✅ **phase-X-spec.md** — Tarefas de backend da fase
- ✅ Documentação Supabase
- ✅ Documentação MailerSend API
- ✅ Documentação n8n

#### Workflow Típico do Growth

```
Sprint Start → Head communica tarefas
    ↓
Ler database-schema.md seção do agente
    ↓
Implementar migrations em ordem
    ↓
Testar RLS policies localmente
    ↓
Setup integração MailerSend (webhooks)
    ↓
Criar Edge Functions para processamento
    ↓
Testar API endpoints com curl/Postman
    ↓
Report para Head com logs e status
    ↓
Aguardar revisão e feedback
    ↓
Merge em main quando aprovado
```

#### Critério de Aceite Growth

- [ ] Todas as migrations rodadas sem erro
- [ ] RLS policies testadas (acesso negado para dados de outras orgs)
- [ ] API endpoints retornam status correto (200/400/401/500)
- [ ] Webhooks de MailerSend testados com eventos reais
- [ ] n8n workflows executados com sucesso
- [ ] Queries executadas e retornam dados esperados
- [ ] Logs são claros e identificam problemas
- [ ] Nenhum hardcode de secrets (usar env vars)

---

### ✍️ Content

**Localização:** Canal `#content` no Discord
**Função:** Frontend Developer (Lógica + Pages)

#### Responsabilidades Específicas

**App Router Pages:**
- Criar pages do Next.js conforme spec
- Layouts aninhados com sidebar
- Organization selector
- Tab navigation

**Data Fetching:**
- Server Components com `fetch()` ou Supabase client
- Suspense boundaries
- Error boundaries
- Loading states

**Forms e Validação:**
- React Hook Form integration
- Zod schemas para validação
- Input types: text, email, select, checkbox, etc
- Error messages em português
- Submit handlers

**State Management:**
- Zustand stores para estado global
- Client-side filtering e sorting
- Paginação
- Form state persistence

**Campaign Wizard:**
- Multi-step form (basics → recipients → content → review → send)
- Progress indicator
- Save draft functionality
- Validation entre steps

**AI Email Generator:**
- Adaptar componente de chat do sistema LP
- Prompt engineering para gerar emails
- Preview em tempo real
- Regenerate com tweaks

**Template Preview:**
- Render de templates com dados de preview
- Responsive preview (desktop/mobile)
- Email client compatibility

**Import Wizard:**
- CSV upload
- Validação de colunas
- Mapping de campos
- Preview antes de import
- Bulk create leads

#### Skills Obrigatórias

- ✅ **file-structure.md** — Estrutura de pastas, routing
- ✅ **phase-X-spec.md** — Tasks e páginas da fase
- ✅ **existing-assets.md** — Hooks e padrões do projeto
- ✅ Next.js App Router docs
- ✅ React Hook Form docs
- ✅ Zod docs

#### Workflow Típico do Content

```
Sprint Start → Head designa páginas a implementar
    ↓
Ler phase-X-spec.md seção de frontend
    ↓
Revisar file-structure.md para entender routing
    ↓
Copiar hooks existentes de existing-assets.md
    ↓
Criar page.tsx com layout
    ↓
Implementar data fetching (server component)
    ↓
Adicionar forms com React Hook Form
    ↓
Integrar com Zod para validação
    ↓
Testar localmente (yarn dev)
    ↓
Report para Head com screenshots
    ↓
Code review e ajustes
    ↓
Merge quando aprovado
```

#### Critério de Aceite Content

- [ ] Página renderiza sem erros no navegador
- [ ] Forms validam corretamente (campos obrigatórios, formatos)
- [ ] Dados carregam e exibem corretamente
- [ ] Loading states aparecem enquanto busca dados
- [ ] Error states tratados (404, 500, etc)
- [ ] Validação de Zod bloqueia dados inválidos
- [ ] Mensagens de erro em português claro
- [ ] Responsive em mobile (verificado com DevTools)
- [ ] Navegação para páginas seguintes funciona

---

### 🎨 Creative

**Localização:** Canal `#creative` no Discord
**Função:** Frontend Developer (UI + Components)

#### Responsabilidades Específicas

**Componentes UI:**
- Copiar componentes base do tracking (KPICard, DataTable, FilterBar, etc)
- Criar componentes novos conforme design system
- Props bem definidas (TypeScript)
- Estados (normal, hover, active, disabled, loading)

**shadcn/ui Integration:**
- Instalar componentes conforme necessário
- Customizar com Tailwind
- Manter consistência visual

**Tailwind Styling:**
- CSS variables para design system (cores, spacing, fonts)
- Dark mode support
- Responsive design (mobile-first)
- Utility-first approach

**Email Editor:**
- Integrar Unlayer ou similar
- Drag-and-drop template builder
- Template library
- Preview

**Design System:**
- Paleta de cores do briefing LP
- Tipografia
- Spacing scale
- Componentes reutilizáveis

**Visual Polish:**
- Loading skeletons
- Empty states com ícones
- Animations e transitions
- Charts e visualizações (Recharts)
- Icons consistentes

#### Skills Obrigatórias

- ✅ **existing-assets.md** — Componentes do tracking para copiar
- ✅ **file-structure.md** — Pasta components/, organizações
- ✅ Design system do briefing LP (CSS variables, paletas)
- ✅ shadcn/ui docs
- ✅ Tailwind CSS docs
- ✅ Recharts docs

#### Workflow Típico do Creative

```
Sprint Start → Head designa componentes a implementar
    ↓
Ler existing-assets.md para identificar componentes base
    ↓
Copiar componentes do tracking (KPICard, DataTable, etc)
    ↓
Adaptar para novo contexto/props
    ↓
Revisar design system do briefing
    ↓
Implementar novos componentes em Tailwind
    ↓
Adicionar estados (hover, active, disabled, loading)
    ↓
Testar responsive com DevTools
    ↓
Integrar Unlayer se necessário
    ↓
Report para Head com screenshots/video
    ↓
Code review e ajustes
    ↓
Merge quando aprovado
```

#### Critério de Aceite Creative

- [ ] Componentes renderizam sem erros
- [ ] Props TypeScript bem definidas
- [ ] Suporta todos os estados (normal, hover, active, disabled, loading)
- [ ] Tailwind classes aplicadas corretamente
- [ ] Responsive em mobile, tablet, desktop
- [ ] Cores seguem design system (CSS variables)
- [ ] Tipografia consistente
- [ ] Ícones e imagens carregam corretamente
- [ ] Acessibilidade básica (alt text, labels)
- [ ] Performance aceitável (sem layout shift)

---

## Fluxo de Trabalho

### Fase 0: Preparação

Antes de iniciar qualquer sprint, o **Head** deve validar prontidão:

**Checklist Pre-Sprint:**

```
Infrastructure:
☐ Supabase project criado e acessível
☐ Variáveis de ambiente configuradas localmente
☐ Vercel project criado e vinculado a repo
☐ Git repo inicializado com main/develop branches
☐ Migrations testadas em branch de desenvolvimento

Integrações:
☐ MailerSend account criada
☐ Domínios de envio configurados e verified
☐ API keys armazenadas em .env.local (NUNCA em código)
☐ n8n acessível e configurável
☐ Webhooks de MailerSend apontam corretamente

Documentação:
☐ architecture.md completo
☐ database-schema.md com SQL
☐ phase-X-spec.md escrito e revisado
☐ existing-assets.md atualizado
☐ file-structure.md reflete repo atual

Skills dos Agentes:
☐ Growth tem acesso a database-schema.md
☐ Content tem acesso a file-structure.md
☐ Creative tem acesso a existing-assets.md
☐ Todos têm acesso a phase-X-spec.md e architecture.md
```

Se algum item falhar, o **Head** para e resolve antes de começar o sprint.

---

### Fase 1: Kickoff de Sprint

**Evento:** Sincronização com Rodrigo

**Passo 1 — Head com Rodrigo (30 min)**

```
Rodrigo: "vamos começar o sprint 1"

Head responde:
- Resumo do que será entregue
- Duração estimada (horas/dias)
- Dependências externas
- Riscos conhecidos
- Próximos passos
```

**Exemplo:**

> Sprint 1 começa com 3 frentes paralelas:
>
> **Growth:** Migrations SQL para orgs, users, leads, campaigns (4h)
>
> **Creative:** Components base (KPICard, DataTable, FilterBar) copiados do tracking (3h)
>
> **Content:** Dashboard layout com sidebar e org selector (2h)
>
> Dependência: Growth termina migrations → Creative integra com dados → Content monta interface
>
> Estimativa: 6-8 horas total de trabalho paralelo
>
> Começa em 1 hora?

---

### Fase 2: Execução Paralela

**Evento:** Delegação para especialistas

**Passo 2 — Head → Especialistas**

Head envia para cada canal:

**Para Growth (#growth):**

```
@Growth

Sprint 1 — Fase de Database

Tarefas (ordem de execução):
1. Rodar migration 001: criar tabela organizations
2. Rodar migration 006: criar tabela users com FK para org
3. Rodar migration 010: criar tabela leads
4. Configurar RLS: users vê dados só da sua org
5. Testar acesso com dois usuários

Reference: database-schema.md (seção "Growth")

Critério de aceite:
☐ Migrations sem erro no Supabase
☐ RLS policy bloqueia acesso cruzado (org1 user não vê org2 data)
☐ SQL queries retornam dados corretos
☐ Sem secrets em código

Tempo estimado: 4 horas
Aviso em 2h se atrasar
```

**Para Creative (#creative):**

```
@Creative

Sprint 1 — Fase de UI Base

Tarefas (ordem):
1. Copiar KPICard de tracking/components/KPICard.tsx
2. Copiar DataTable de tracking/components/DataTable.tsx
3. Copiar FilterBar de tracking/components/FilterBar.tsx
4. Adaptar props para novo contexto
5. Adicionar states (loading, empty, error)

Reference: existing-assets.md (seção "Creative")

Critério de aceite:
☐ Componentes copiam sem erros
☐ TypeScript props bem definidas
☐ Suportam loading state (skeleton)
☐ Responsive em mobile

Tempo estimado: 3 horas
Aviso em 1.5h se atrasar
```

**Para Content (#content):**

```
@Content

Sprint 1 — Fase de Layout

Tarefas (ordem):
1. Criar app/dashboard/layout.tsx com sidebar
2. Adicionar navigation links
3. Implementar org selector dropdown
4. Criar app/dashboard/page.tsx (overview)
5. Testar navegação entre pages

Reference: file-structure.md (seção "Content")

Critério de aceite:
☐ Sidebar renderiza corretamente
☐ Org selector funciona (dropdown)
☐ Links de navegação funcionam
☐ Responsive em mobile
☐ Sem console errors

Tempo estimado: 2 horas
Aviso em 1h se atrasar
```

---

### Fase 3: Integração Progressiva

**Evento:** Consolidação de trabalho

**Passo 3 — Especialistas reportam progresso**

Cada agente reporta no seu canal:

**Growth relata:**

```
@Head

✅ Sprint 1 — Database COMPLETO

Status: PRONTO
- 3 migrations rodadas em Supabase ✅
- RLS policies testadas (access control funciona) ✅
- SQL queries retornam dados corretos ✅
- Nenhum hardcode de secrets ✅

Pronto para: Content integrar com dados
```

**Creative relata:**

```
@Head

✅ Sprint 1 — UI Base COMPLETO

Status: PRONTO
- KPICard, DataTable, FilterBar copiados ✅
- Props TypeScript bem definidas ✅
- Loading states com skeleton ✅
- Responsive testado (mobile-first) ✅

Pronto para: Content integrar componentes
```

**Content relata:**

```
@Head

✅ Sprint 1 — Dashboard Layout COMPLETO

Status: PRONTO
- Dashboard layout com sidebar ✅
- Org selector dropdown funciona ✅
- Navegação entre pages funciona ✅
- Responsive em mobile ✅
- Nenhum console error ✅

Bloqueador: Aguardando dados do Growth para integrar
```

---

### Fase 4: Revisão e Merge

**Evento:** Code review + integração final

**Passo 4 — Head revisa**

Head valida cada entrega:

```
✅ Growth
  - database-schema.md atualizado? Sim
  - RLS policies corretas? Sim
  - Migrations seguem Conventional Commits? Sim
  Decisão: APROVADO ✅ MERGE

✅ Creative
  - Components TypeScript correto? Sim
  - Tailwind bem estruturado? Sim
  - Responsive testado? Sim
  Decisão: APROVADO ✅ MERGE

✅ Content
  - Pages integram dados do Growth? Sim
  - Componentes do Creative usados corretamente? Sim
  - Navegação completa? Sim
  Decisão: APROVADO ✅ MERGE
```

---

### Fase 5: Validação com Rodrigo

**Evento:** Entrega ao PO

**Passo 5 — Head com Rodrigo (15 min)**

```
Head mostra para Rodrigo:
- ✅ Sprint 1 completo (3 frentes paralelas)
- Demonstração: Dashboard renderiza com dados reais
- Performance: Carrega em 1.2s
- Acesso correto: Org selector funciona

Rodrigo responde:
"Ótimo! Vamos para o sprint 2?"

Head agenda próximo kickoff
```

---

## Regras de Operação

### Regra 1: Sempre Ler a SKILL.md

Antes de iniciar **qualquer tarefa**, o agente deve:

1. Ler este arquivo (`openclaw-agents.md`) — visão geral
2. Ler a seção relevante de responsibilities
3. Ler a `phase-X-spec.md` para saber exatamente o que fazer
4. Ler as references específicas da sua função

**Violação:** Agente implementa feature não na spec = retrabalho

---

### Regra 2: Verificar existing-assets.md

Antes de criar um **novo componente**, o agente (especialmente Creative) deve:

1. Verificar `existing-assets.md` para componentes existentes
2. Se existir similar no tracking, **copiar e adaptar**
3. Não reinventar a roda

**Exemplo:**

```
Creative: "preciso de um DataTable"

Passo 1: Verificar existing-assets.md
→ DataTable já existe em tracking/components/DataTable.tsx

Passo 2: Copiar arquivo
→ app/components/DataTable.tsx (com adaptações)

Passo 3: Testar
```

**Violação:** Criar novo componente que já existe = inconsistência visual

---

### Regra 3: Seguir phase-X-spec.md

Cada sprint tem uma especificação clara. **Implementar apenas o que está na spec.**

**Exemplo Sprint 1 Spec:**

```markdown
## Sprint 1 — Dashboard Base

### Frontend (Content + Creative)
- [ ] Dashboard layout com sidebar
- [ ] Org selector dropdown
- [ ] KPI cards (revenue, leads, campaigns)
- [ ] Recent campaigns table
- NO: Email editor, campaign builder, etc (isso é sprint 2)

### Backend (Growth)
- [ ] Database schema (orgs, users, leads, campaigns)
- [ ] RLS policies
- [ ] Dashboard data endpoint
- [ ] NO: MailerSend integration (isso é sprint 2)
```

**Violação:** Content implementa email editor (scope creep) = sprint atrasa

---

### Regra 4: Commits em Conventional Commits

Todos os commits devem seguir Conventional Commits **em português**:

```
feat(database): criar tabela organizations com RLS
fix(dashboard): corrigir sidebar responsive em mobile
refactor(components): simplificar KPICard props
docs(phase-1): atualizar spec com novos campos
ci(github): adicionar workflow de testes
```

**Formato:**

```
<tipo>(<escopo>): <descrição em português>

<corpo em português se necessário>

<footer>
```

**Tipos permitidos:**

- `feat` — Nova feature
- `fix` — Bug fix
- `refactor` — Refatoração (sem mudança de funcionalidade)
- `docs` — Documentação
- `style` — Formatação (não lógica)
- `test` — Testes
- `chore` — Build, deps, etc
- `ci` — CI/CD

**Exemplos válidos:**

```
feat(growth): integrar webhooks de MailerSend
fix(content): validação de email em form de leads
refactor(creative): extrair estilos para design system
docs(openclaw): atualizar agent responsibilities
```

**Violação:** Commit "wip" ou "fix bug" = histórico ilegível

---

### Regra 5: Código em Inglês, UI em Português, Docs em Português

**Código (inglês):**

```javascript
// ✅ Correto
const calculateLeadScore = (data) => {
  return data.engagement * 0.6 + data.conversion * 0.4;
};

// ❌ Errado
const calcularPontuacaoLead = (dados) => {
  return dados.engajamento * 0.6 + dados.conversao * 0.4;
};
```

**UI (português):**

```jsx
// ✅ Correto
<button>{t('comum.enviar')}</button>
<label>E-mail:</label>
<placeholder>Insira seu nome aqui</placeholder>

// ❌ Errado
<button>Send</button>
<label>Email:</label>
<placeholder>Insert your name here</placeholder>
```

**Docs (português):**

```markdown
# ✅ Correto
## Dashboard

O dashboard mostra KPIs em tempo real.

# ❌ Errado
## Dashboard

The dashboard shows real-time KPIs.
```

**Regra de Exceção:** Nomes de bibliotecas (React, Next.js, Supabase) mantêm original.

---

### Regra 6: Testar Antes de Reportar Pronto

Nenhuma tarefa é considerada "pronta" sem testes básicos:

**Para Growth:**

```sql
-- Testar RLS: user1 vê dados da org1, não da org2
SELECT * FROM leads WHERE org_id = 'org1'; -- ✅ sucesso
SELECT * FROM leads WHERE org_id = 'org2'; -- ❌ erro (RLS bloqueia)
```

**Para Creative:**

```
- [ ] Componente renderiza em browser (yarn dev)
- [ ] Props TypeScript sem erros
- [ ] Não aparecem console.error ou console.warn
- [ ] Responsive testado (DevTools: mobile 375px, tablet 768px, desktop 1024px)
- [ ] Acessibilidade: labels em inputs, alt em imagens
```

**Para Content:**

```
- [ ] Página carrega (yarn dev)
- [ ] Formulários validam corretamente
- [ ] Submissão não dá erro 500
- [ ] Estados (loading, error, success) funcionam
- [ ] Navegação para próxima página funciona
```

**Violação:** "Pronto" mas quebra em merge = retrabalho

---

### Regra 7: Cada Sprint tem Critérios de Aceite Claros

Cada tarefa delegada deve incluir:

```
Tarefa: [descrição]

Critério de Aceite:
☐ Item verificável 1
☐ Item verificável 2
☐ Item verificável 3

Tempo estimado: X horas
Status esperado: [timestamp]
```

**Exemplo:**

```
Tarefa: Implementar migration de organizations

Critério de Aceite:
☐ Table organizations criada com columns: id, name, subscription_plan
☐ Foreign key para users
☐ RLS policy: users veem só dados da sua org
☐ Sem erros ao rodar migration
☐ SQL documentado em database-schema.md

Tempo estimado: 1 hora
Status esperado: 14:30 BRT
```

---

## Estrutura de Skills

Cada agente trabalha com um subset da documentação. A estrutura no OpenClaw é:

```
~/.openclaw/workspace/skills/plataforma-email/
│
├── SKILL.md
│   └── Master file com overview, flow, glossary
│
└── references/
    ├── architecture.md
    │   ├─ Diagrama da arquitetura
    │   ├─ Stack tecnológico
    │   ├─ Fluxos de dados
    │   └─ Integrações
    │
    ├── database-schema.md
    │   ├─ Tabelas SQL
    │   ├─ Tipos e constraints
    │   ├─ Índices
    │   ├─ RLS policies
    │   └─ Migrations (001, 002, ...)
    │
    ├── api-endpoints.md
    │   ├─ POST /api/organizations
    │   ├─ GET /api/campaigns
    │   ├─ Formatos de requisição/resposta
    │   ├─ Status codes
    │   └─ Error handling
    │
    ├── integrations.md
    │   ├─ Supabase (RLS, Edge Functions)
    │   ├─ MailerSend (API, webhooks)
    │   ├─ n8n (workflows, triggers)
    │   ├─ Vercel (deployment, env vars)
    │   └─ Checklists de configuração
    │
    ├── file-structure.md
    │   ├─ Estrutura de pastas
    │   ├─ Convenção de nomes
    │   ├─ Roteamento (App Router)
    │   ├─ Padrões de exports
    │   └─ Imports (aliases, relativos)
    │
    ├── existing-assets.md
    │   ├─ Componentes reutilizáveis
    │   ├─ Hooks customizados
    │   ├─ Padrões de estado (Zustand)
    │   ├─ Utility functions
    │   └─ Estilos (CSS variables, Tailwind)
    │
    ├── phase-1-spec.md
    │   ├─ Features da Sprint 1
    │   ├─ Tarefas por agente
    │   ├─ Critério de aceite
    │   └─ Dependências
    │
    ├── phase-2-spec.md
    │   └─ (sprints futuras)
    │
    └── openclaw-agents.md
        └─ Este arquivo (manual de operação)
```

### Acesso Recomendado por Agente

**Head (lê tudo):**
```
- architecture.md (completo)
- database-schema.md (completo)
- api-endpoints.md (completo)
- file-structure.md (completo)
- existing-assets.md (completo)
- phase-X-spec.md (completo)
- openclaw-agents.md (completo)
- integrations.md (completo)
```

**Growth (lê subconjunto):**
```
- database-schema.md (seção "Growth")
- api-endpoints.md (seção "Growth" + endpoints)
- integrations.md (seções "Supabase" + "MailerSend" + "n8n")
- phase-X-spec.md (seção "Backend")
- architecture.md (seção "Data Flow")
```

**Content (lê subconjunto):**
```
- file-structure.md (completo)
- phase-X-spec.md (seção "Frontend/Content")
- existing-assets.md (seções "Hooks" + "Patterns")
- architecture.md (seção "Frontend")
```

**Creative (lê subconjunto):**
```
- existing-assets.md (seções "Components" + "Styling")
- file-structure.md (seção "components/")
- phase-X-spec.md (seção "UI")
- architecture.md (seção "Design System")
```

---

## Protocolo de Comunicação

### Discord Channels

**#head-channel**
- Proprietário Rodrigo fala com Head
- Head consolida e reporta status
- Decisões arquiteturais
- Sprint planning e reviews

**#growth**
- Tarefas de Growth delegadas aqui
- Growth reporta progresso
- Growth esclurece dúvidas sobre schema/API
- Code review de Growth

**#content**
- Tarefas de Content delegadas aqui
- Content reporta progresso
- Content esclurece dúvidas sobre UI/UX
- Code review de Content

**#creative**
- Tarefas de Creative delegadas aqui
- Creative reporta progresso
- Creative esclurece dúvidas sobre componentes
- Code review de Creative

### Formato de Relatório

Cada agente reporta progresso neste formato:

```
@Head

✅ [Tarefa] — Status

Completado:
- ✅ Subtarefa 1
- ✅ Subtarefa 2
- ⏳ Subtarefa 3 (80% — 15 min restante)

Bloqueadores:
- Nenhum OU
- Growth ainda não finalizou migration X
- Preciso da definição de Y do arquitecto

Próximo passo:
- Submeter PR para revisão
- Aguardar aprovação de Z
- Integrar com W

Tempo real vs estimado:
- Estimado: 4h
- Gasto: 2.5h
- Estimado final: 3h (adiantado ✅)
```

### Escalação

Se um agente encontra bloqueador:

```
@Head

BLOQUEADOR: Database schema do Growth não está pronto

Esperava: migration 001 finalizada até 15:00
Realidade: ainda em progresso

Impacto: Não consigo integrar dados no Content
Opções:
A) Aguardar Growth (atraso estimado: 1h)
B) Mockar dados temporariamente e integrar depois

Recomendação: A (simples de resolver)

Aguardando decisão...
```

Head responde em até 5 minutos com decisão.

---

## Checklist de Prontidão

Antes de começar a implementar **qualquer Sprint**, validar:

### Infraestrutura

- [ ] **Supabase Project**
  - [ ] Project criado em região correta (São Paulo)
  - [ ] Banco de dados vazio (backup made before reset if needed)
  - [ ] CLI configurada (`supabase login`, `supabase link`)
  - [ ] Growth tem credenciais (service role key)

- [ ] **Vercel Deployment**
  - [ ] Project criado e vinculado a repo
  - [ ] Preview deployments ativados
  - [ ] Production branch = main
  - [ ] Env vars sincronizadas

- [ ] **Git Repository**
  - [ ] Repo inicializado
  - [ ] Branches: main (produção), develop (staging), feature/* (trabalho)
  - [ ] .gitignore configurado (node_modules, .env.local, builds)
  - [ ] Commit templates aplicados (Conventional Commits)

### Integrações Externas

- [ ] **MailerSend Account**
  - [ ] Conta criada (Rodrigo@email)
  - [ ] Domínio de envio configurado e verified
  - [ ] SPF/DKIM/DMARC corretos
  - [ ] API keys em `.env.local` (nunca em código)
  - [ ] Webhook URL preparada (será criado em Growth)

- [ ] **n8n Setup**
  - [ ] n8n acessível (local ou cloud)
  - [ ] Credenciais de integração preparadas
  - [ ] Workflows templates criados (ou vazios, prontos para implementação)

- [ ] **Local Development**
  - [ ] Node.js 18+ instalado
  - [ ] `yarn` ou `npm` configurado
  - [ ] `.env.local` criado com variáveis iniciais
  - [ ] `yarn dev` roda sem erros
  - [ ] Supabase `supabase start` funciona

### Documentação

- [ ] **Arquivos de Referência Completados**
  - [ ] architecture.md escrito
  - [ ] database-schema.md com SQL
  - [ ] api-endpoints.md com endpoints esperados
  - [ ] file-structure.md reflete repo
  - [ ] existing-assets.md listando componentes/hooks/padrões
  - [ ] integrations.md com setup steps

- [ ] **Specs de Sprint**
  - [ ] phase-1-spec.md escrito em detalhe
  - [ ] Cada tarefa tem critério de aceite
  - [ ] Dependências mapeadas
  - [ ] Timelines realistas

- [ ] **Skills do OpenClaw**
  - [ ] Todos os 8 arquivos acima em `.skills/plataforma-email/references/`
  - [ ] Cada agente tem leitura aos arquivos relevantes
  - [ ] openclaw-agents.md (este arquivo) em sync

### Conhecimento do Time

- [ ] **Head**
  - [ ] Leu e entendeu architecture.md completo
  - [ ] Sabe como delegar em Growth, Content, Creative
  - [ ] Conhece critérios de aceite de cada agente
  - [ ] Entende fluxo de comunicação Discord

- [ ] **Growth**
  - [ ] Entende database-schema.md
  - [ ] Já trabalhou com Supabase RLS
  - [ ] Conhece MailerSend API
  - [ ] Consegue escrever SQL e Edge Functions

- [ ] **Content**
  - [ ] Domina Next.js App Router
  - [ ] Conhece React Hook Form + Zod
  - [ ] Entende file-structure.md
  - [ ] Já trabalhou com Zustand

- [ ] **Creative**
  - [ ] Domina Tailwind CSS
  - [ ] Conhece shadcn/ui
  - [ ] Entende design system
  - [ ] Já trabalhou com Recharts

### Testes

- [ ] **Local Testing**
  - [ ] `yarn dev` roda em localhost:3000
  - [ ] Supabase emulator funciona localmente
  - [ ] Poder fazer login (auth funciona)
  - [ ] Poder fazer query ao banco (RLS testado)

- [ ] **Branch Testing**
  - [ ] Feature branch pode ser criada sem conflitos
  - [ ] PR template funciona
  - [ ] CI checks passam (ESLint, TypeScript, etc)

### Go/No-Go Decision

Após validar todos items acima, Head com Rodrigo:

```
@Rodrigo

Pré-requisitos validados ✅

Sprint 1 está pronto para começar?
- Supabase project: OK
- Vercel project: OK
- MailerSend configurado: OK
- n8n acessível: OK
- Documentação: OK
- Time alinhado: OK

Estimativa: 6-8 horas
Começa quando?
```

Rodrigo confirma → Sprint inicia.

---

## Integração com Rodrigo

### Espectativa de Comunicação

Rodrigo trabalha com modelo de "marketing agency em Discord":
- Fala com Head
- Head resolve os detalhes técnicos
- Rodrigo não precisa entender código, apenas resultados

### Tipos de Mensagens do Rodrigo

**Kickoff (início de sprint):**
```
"vamos começar sprint 1"
"pronto para começar?"
"qual é o timing?"
```

**Status Check (durante sprint):**
```
"como está?"
"qual é o bloqueador?"
"quando estará pronto?"
```

**Code Review (fim de sprint):**
```
"como ficou?"
"consegue mostrar?"
"tá bom assim ou precisa ajustar?"
```

**Pivoting (mudança de requisitos):**
```
"na verdade, queria que..."
"mudei de ideia sobre..."
"preciso que priorize..."
```

### Responsabilidade do Head

**Para cada message do Rodrigo:**

1. **Entender o que realmente pede**
2. **Traduzir em tasks técnicas** para agentes
3. **Atualizar documentação** se requisito muda
4. **Comunicar impacto** (prazo, complexidade)
5. **Reportar resultado** para Rodrigo

**Exemplo:**

```
Rodrigo: "qual é o bloqueador?"

Head:
1. Checa status em #growth, #content, #creative
2. Growth: migration 003 atrasou por questão de RLS (resolvida)
3. Content: aguardando dados de Growth, continua pronto
4. Creative: completo

Head responde Rodrigo:
"Estava um atraso pequeno no Growth (RLS policy), mas já resolveu. Content e Creative já esperando dados. Estimativa revisada: 30 min restante. Status em 15h?"
```

### Escalação para Rodrigo

Somente Head escalona para Rodrigo, apenas em cenários críticos:

```
Possível escalação:
❌ "Feature X vai atrasar 1h"
✅ "Descobri um risco arquitetural que muda fase-1-spec e timeline"

Possível escalação:
❌ "Growth tem dúvida sobre SQL"
✅ "Growth descobriu que Supabase não suporta feature Y que estava prevista"

Possível escalação:
❌ "Creative quer mudar cor do botão"
✅ "Creative sugere mudança de design system que afeta UX"
```

Se escalação: Head explica problema, opções, recomendação. Rodrigo decide.

---

## Próximos Passos

Esta documentação é viva. Após cada sprint:

1. **Head atualiza** `openclaw-agents.md` com learnings
2. **Agentes sugerem** melhorias ao fluxo
3. **Documentação evolui** com o projeto

### Template para Lições Aprendidas (pós-sprint)

```markdown
## Sprint X — Lições Aprendidas

### O que funcionou bem ✅
- Comunicação em Discord foi clara
- Critérios de aceite evitaram retrabalho
- Integração paralela de Growth+Creative+Content acelerou

### O que poderíamos melhorar ⚠️
- Growth demorou mais com SQL complexo (aumentar estimativa)
- Creative esperou mais tempo por Design System (preparar antes)
- Faltou checklist de deploy para Vercel

### Ação para próximo sprint
- Ler SQL docs antes de estimativas (Growth)
- Preparar design system completo antes de kickoff (Creative)
- Adicionar deploy checklist (Head)
```

---

## Resumo Executivo

**TL;DR para cada agente:**

### Head
- Você é o Tech Lead
- Rodrigo fala com você
- Você delega, revisa, consolida
- Mantenha documentação e critérios de aceite claros

### Growth
- Você faz o banco de dados funcionar
- RLS, migrations, webhooks, analytics
- Leia database-schema.md completo
- Teste RLS policies antes de "pronto"

### Content
- Você faz as páginas funcionarem
- Pages, forms, data fetching, state
- Leia file-structure.md para saber onde colocar código
- Teste forms e navegação antes de "pronto"

### Creative
- Você faz tudo ficar bonito
- Components, styling, animations, email editor
- Leia existing-assets.md para não duplicar
- Teste responsive antes de "pronto"

---

**Versão:** 1.0
**Última atualização:** 2026-03-05
**Próxima revisão:** Pós-Sprint-1
