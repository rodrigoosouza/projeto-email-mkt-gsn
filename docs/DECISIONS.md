# Registro de Decisões (ADR)

Registro cronológico de todas as decisões técnicas e de produto do projeto.
Formato: Architecture Decision Records (ADR) simplificado.

---

## ADR-001: MailerSend como backend de envio de email
**Data:** 2026-03-04
**Status:** Aprovada

**Contexto:** Precisamos de um serviço para enviar emails transacionais (automações) e em massa (campanhas). Alternativas consideradas: Amazon SES, SendGrid, Postmark, Resend.

**Decisão:** MailerSend.

**Motivos:**
- Suporta tanto email transacional quanto bulk (maioria dos concorrentes foca em um ou outro)
- API bem documentada e simples de integrar
- Webhooks nativos para todos os eventos (bounce, open, click, complaint)
- Suporte a múltiplos domínios de envio (essencial para multi-tenant)
- Verificação de email embutida
- Pricing competitivo
- Email analytics nativos que complementam nosso tracking

**Consequências:**
- Custo por email maior que Amazon SES puro
- Dependência de terceiro para entrega (mas isso é padrão)
- Necessidade de aquecer domínios de cada cliente

---

## ADR-002: Supabase como banco e backend
**Data:** 2026-03-04
**Status:** Aprovada

**Contexto:** Precisa de banco relacional, autenticação, storage e realtime. Já temos dados de GTM fluindo para um projeto Supabase.

**Decisão:** Supabase (PostgreSQL + Auth + Realtime + Storage + Edge Functions).

**Motivos:**
- Dados de GTM de Templum, Evolutto e Orbit já estão no Supabase
- Auth integrado (sem precisar de Auth0/Clerk separado)
- RLS nativo para multi-tenancy
- Realtime para dashboards ao vivo
- Edge Functions para webhooks
- Vault para encriptar API keys
- Ecossistema TypeScript-first

**Consequências:**
- Vendor lock-in moderado (PostgreSQL é portável, mas features Supabase-specific não)
- Custo escala com uso (mas previsível)

---

## ADR-003: n8n como engine de automação
**Data:** 2026-03-04
**Status:** Aprovada

**Contexto:** Automações de marketing (sequências de email, triggers baseados em eventos, integrações) precisam de um engine visual.

**Decisão:** n8n self-hosted.

**Motivos:**
- Já utilizado pela equipe (curva de aprendizado zero)
- Visual e intuitivo
- Self-hosted (controle total, sem custo por execução)
- Conectores prontos para centenas de serviços
- Webhook triggers e API disponíveis

**Consequências:**
- Infraestrutura para manter (VPS/container)
- Interface visual do n8n pode não ser exposta ao cliente final (criar interface simplificada na plataforma)

---

## ADR-004: Next.js 14+ com App Router
**Data:** 2026-03-04
**Status:** Aprovada

**Contexto:** Precisa de framework frontend robusto para SaaS com muitas páginas, formulários e dashboards.

**Decisão:** Next.js com App Router, deploy na Vercel.

**Motivos:**
- Server Components para performance
- App Router com layouts aninhados (ideal para dashboard multi-módulo)
- Ecossistema maduro
- Deploy simplificado na Vercel
- Bom suporte a ISR/SSR para páginas dinâmicas

---

## ADR-005: Unlayer/GrapeJS para editor de email
**Data:** 2026-03-04
**Status:** Aprovada

**Contexto:** Usuários precisam criar emails visualmente bonitos sem escrever código. Construir um editor drag-and-drop do zero é extremamente complexo.

**Decisão:** Usar Unlayer React Email Editor (ou GrapeJS como alternativa).

**Motivos:**
- Construir editor drag-and-drop do zero levaria meses
- Unlayer tem React component pronto
- Exporta HTML responsivo e JSON (para reedição)
- Templates customizáveis
- Merge tags para personalização

**Investigar:**
- Licenciamento e custo do Unlayer
- GrapeJS como alternativa open-source

---

## ADR-006: Multi-tenancy com schema compartilhado
**Data:** 2026-03-04
**Status:** Aprovada

**Contexto:** Precisamos isolar dados de múltiplas organizações. Opções: schema por tenant, database por tenant, ou schema compartilhado com RLS.

**Decisão:** Schema compartilhado com `organization_id` em todas as tabelas + RLS do Supabase.

**Motivos:**
- Simples de implementar e manter
- RLS do Supabase é robusto e testado
- Para o volume esperado (dezenas de orgs, não milhares), não justifica complexidade extra
- Queries cross-org possíveis quando necessário (admin)
- Migrations únicas (não precisa replicar por tenant)

---

## ADR-007: Reaproveitar Componentes do Tracking Dashboard
**Data:** 2026-03-05
**Status:** Aprovada

**Contexto:** O tracking-dashboard já tem 29 componentes UI + 11 hooks + utilities completas construídos em Next.js 14 + Supabase + Recharts + Tailwind. Reconstruir seria desperdício.

**Decisão:** Copiar componentes do tracking para a plataforma de email, adaptando conforme necessário. Não importar como dependência — cópia com evolução independente.

**Motivos:**
- 29 componentes testados em produção (KPICard, DataTable, FilterBar, charts, journey, badges)
- Mesmo stack tecnológico (Next.js 14 + Supabase + Recharts + Tailwind + Lucide)
- Fase 2 (Analytics) fica ~70% pronta de graça
- Consistência visual entre projetos

**Consequências:**
- Componentes podem divergir com o tempo (ok — cada projeto evolui)
- Inventário completo em `.skills/plataforma-email/references/existing-assets.md`
- Claude Code deve consultar existing-assets.md antes de criar componente novo

---

## ADR-008: RLS em vez de Table-per-Company
**Data:** 2026-03-05
**Status:** Aprovada

**Contexto:** O tracking usa tabelas separadas por empresa (events, orbit_gestao_events). Funciona mas não escala bem para SaaS com muitas orgs.

**Decisão:** A plataforma nova usa schema compartilhado com `organization_id` em todas as tabelas + RLS do Supabase para isolamento. Views de compatibilidade mantêm acesso aos dados legados.

**Motivos:**
- Escalável para N organizações sem criar tabelas
- RLS nativo do Supabase — segurança no banco
- Queries mais simples (sem queryMultiOrg helper)
- Padrão SaaS da indústria

**Consequências:**
- Dados legados do tracking continuam em tabelas separadas (não migrar)
- Views unificadas (unified_lead_events, etc.) fazem a ponte
- useOrganization hook precisa ser adaptado (query Supabase em vez de config estática)

---

## ADR-009: Compartilhar Supabase Project
**Data:** 2026-03-05
**Status:** Aprovada

**Contexto:** Já existe um Supabase project (tnpzoklepkvktbqouctf) com dados de tracking fluindo para Templum e Orbit. Criar projeto separado significaria duplicar dados ou criar sync.

**Decisão:** Usar o mesmo Supabase project. Novas tabelas (leads, email_campaigns, etc.) são adicionadas ao lado das existentes (events, conversions).

**Motivos:**
- Dados de leads já existem no events/conversions
- Evita sync entre projetos Supabase
- Joins diretos entre tracking e email (Fase 2 Analytics)
- Um único ponto de verdade para todos os dados

**Consequências:**
- Cuidado com migrations — não quebrar tracking existente
- Usar Supabase Branching para staging
- Naming convention: tabelas novas com prefixo semântico (email_, wa_, etc.)

---

## Template para novas decisões

```markdown
## ADR-XXX: [Título da decisão]
**Data:** YYYY-MM-DD
**Status:** Proposta | Aprovada | Substituída por ADR-XXX

**Contexto:** [Qual problema estamos resolvendo?]

**Decisão:** [O que decidimos]

**Motivos:**
- [Razão 1]
- [Razão 2]

**Consequências:**
- [Impacto 1]
- [Impacto 2]
```
