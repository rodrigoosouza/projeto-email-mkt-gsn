# Arquitetura Técnica

## Visão Geral

Plataforma SaaS multi-tenant de email marketing com arquitetura serverless-first.

```
Usuário → Vercel (Next.js) → Supabase (DB + Auth + Edge Functions)
                                  ↕               ↕
                              MailerSend       n8n (automações)
                                  ↕               ↕
                           Webhooks ←──────────────┘
                                  ↕
                        APIs externas (GA, Meta, WA)
```

## Stack Detalhada

### Frontend — Next.js 14+ (App Router)
- Server Components por padrão (performance)
- Client Components apenas onde necessário (interatividade)
- shadcn/ui como library de componentes (consistência visual)
- Tailwind CSS para estilos
- TanStack Table para tabelas de dados
- Recharts para gráficos do dashboard
- React Hook Form + Zod para formulários
- Unlayer React Email Editor para editor de email drag-and-drop
- next-themes para dark mode (claro/escuro/sistema)

### Backend — Supabase
- **PostgreSQL** com Row Level Security (RLS) para isolamento multi-tenant
- **Auth** para login (email/password + magic link)
- **Realtime** para atualizações em tempo real (contadores, notificações)
- **Storage** para assets (templates, images)
- **Edge Functions** (Deno) para webhooks e lógica pesada
- **Vault** para armazenar API keys encriptadas por organização

### Automações — n8n
- Self-hosted (controle total)
- Workflows ativados via webhook pela plataforma
- Comunicação bidirecional (plataforma ↔ n8n)

### Email — MailerSend
- Envio transacional (automações) e bulk (campanhas)
- Uma API key por organização
- Webhooks para rastrear status (delivered, opened, clicked, bounced)

### Deploy — Vercel
- CI/CD automático via Git
- Preview deploys para cada PR
- Edge network global

## Multi-tenancy

Estratégia: **schema compartilhado** com `organization_id` em todas as tabelas.

Cada request identifica a organização através do JWT do Supabase Auth que contém a `organization_id` do usuário logado. RLS filtra automaticamente.

Não existe schema separado por tenant — é mais simples de manter e escala bem para o número de clientes esperado (dezenas, não milhares).

## Fluxo de Dados Principal

### Entrada de Leads
```
Formulário externo → POST /api/webhooks/leads (com API key)
                         ↓
                   Edge Function valida key
                         ↓
                   Insert na tabela leads (ou upsert se existe)
                         ↓
                   Insert em lead_events (evento form_submit)
                         ↓
                   Trigger n8n (se automação configurada)
```

### Formulários com Tracking
```
Visitante acessa página → Script de tracking executa
                              ↓
                        Captura UTMs da URL, click IDs, referrer
                              ↓
                        Salva em cookies (first touch preservado)
                              ↓
                        Preenche hidden inputs do formulário
                              ↓
                        Visitante submete → payload JSON com todos os dados
                              ↓
                        Webhook (n8n/Supabase) recebe: dados do lead +
                        UTMs + click IDs + session_id + landing_page +
                        origin_page + session_attributes_encoded
```

### Lead Tracking Journey
```
Lead é visualizado → Componente chama API /api/tracking/journey?email=X
                         ↓
                   API route verifica auth (server client)
                         ↓
                   Cria client anon separado (bypassa RLS das tabelas legadas)
                         ↓
                   Consulta lead_journey (view agregada por org)
                         ↓
                   Consulta events (tabela de eventos por org)
                         ↓
                   Retorna JSON { lead, events }
                         ↓
                   Frontend exibe: KPIs, atribuição, métricas, sessões, timeline
```
**Nota:** Tabelas legadas (events, conversions, lead_journey) não têm org_id e podem bloquear user JWT autenticado via RLS. Por isso usamos client anon separado server-side.

### Envio de Campanha
```
Usuário cria campanha → Seleciona segmento → Agenda envio
                                                  ↓
                                          Edge Function processa
                                                  ↓
                                    Resolve leads do segmento
                                                  ↓
                                    Envia via MailerSend bulk API
                                                  ↓
                                    Registra em email_sends
                                                  ↓
                              Webhooks MailerSend → Atualiza status
```

### Lead Scoring
```
Evento chega (GTM, email, form) → Insert em lead_events
                                        ↓
                                  Trigger/Function calcula pontos
                                        ↓
                                  Atualiza leads.score
                                        ↓
                                  Se cruzou threshold → Trigger n8n
```

## Segurança

- RLS em todas as tabelas (isolamento por organização)
- API keys encriptadas no Supabase Vault
- Validação de assinatura em todos os webhooks recebidos
- Rate limiting nos endpoints públicos
- LGPD: consentimento registrado, endpoint de exclusão

## Escalabilidade

Para o volume atual (3 clientes, milhares de leads), a arquitetura é mais que suficiente. Pontos de atenção para escala futura:

- `lead_events` pode crescer rápido → particionamento por mês
- Dashboards pesados → materialized views atualizadas via cron
- Envio de campanhas grandes → fila com processamento em batches
- Busca em leads → considerar pg_trgm ou Supabase Full Text Search
