# Mapa de Integração entre Projetos

Como os projetos do Rodrigo se conectam e alimentam a plataforma de email.

## Visão Geral

```
┌──────────────────────────────────────────────────────────┐
│                    SUPABASE (compartilhado)                │
│              tnpzoklepkvktbqouctf.supabase.co              │
│                                                            │
│  ┌─────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │ events      │  │ email_campaigns  │  │ leads        │  │
│  │ conversions │  │ email_sends      │  │ segments     │  │
│  │ lead_journey│  │ email_templates  │  │ automations  │  │
│  │ (LEGADO)    │  │ (NOVO)           │  │ (NOVO)       │  │
│  └──────┬──────┘  └────────┬─────────┘  └──────┬───────┘  │
│         │                  │                    │          │
│         └──────────────────┼────────────────────┘          │
│                            │                               │
│                   ┌────────┴────────┐                      │
│                   │ Views Unificadas│                      │
│                   │ (compatibilidade)│                      │
│                   └─────────────────┘                      │
└──────────────────────────────────────────────────────────┘
         │                  │                    │
    ┌────┴────┐     ┌──────┴──────┐     ┌──────┴──────┐
    │Tracking │     │ Plataforma  │     │   n8n       │
    │Dashboard│     │  de Email   │     │(automações) │
    │(leitura)│     │  (leitura   │     │(leitura +   │
    │         │     │  + escrita) │     │ escrita)    │
    └─────────┘     └─────────────┘     └─────────────┘
```

## Fluxo de Dados

### 1. Captura (GTM → Supabase)
```
Website → GTM → Tag Supabase → events / orbit_gestao_events
```
- **Responsável:** GTM setup existente
- **Dados:** 70+ campos por evento (UTMs, geo, device, comportamento)
- **Frequência:** Real-time

### 2. Conversões (Pipedrive → n8n → Supabase)
```
Pipedrive deal update → n8n webhook → conversions / orbit_gestao_conversions
```
- **Responsável:** n8n workflow existente
- **Dados:** deal_id, valor, status, pessoa, atribuição
- **Frequência:** Event-driven (webhook)

### 3. Email Marketing (Plataforma → MailerSend → Supabase)
```
Plataforma cria campanha → MailerSend API (envio) → Webhook → email_sends (tracking)
```
- **Responsável:** Plataforma de email (novo)
- **Dados:** template, destinatários, open/click/bounce/unsubscribe
- **Frequência:** Batch (campanhas) + real-time (webhooks)

### 4. Analytics Unificado
```
events (GTM) + email_sends + conversions → Views → Dashboard da plataforma
```
- **Fase 2:** Unificar dados de tracking + email + conversões num dashboard único

## Projetos de LP Analisados

| Projeto | O que é | Impacto na Plataforma |
|---------|---------|----------------------|
| sistema de LP | Next.js 15 + Claude AI + Vercel deploy. Chat gera HTML, preview, deploy automático | Fase 1: Chat IA p/ emails. Fase 5: LP builder inteiro |
| briefing LP foda | Skill com design system (702 linhas), tracking (691 linhas), animações, regras de geração | Fase 2: tracking integration. Fase 5: design system + animações |

### Fluxo LP → Plataforma de Email
```
LP gerada (sistema de LP) → Deploy Vercel → Lead preenche form →
Webhook POST (formato briefing LP) → Plataforma recebe lead →
Pipeline de email marketing
```

**O payload de lead das LPs é o contrato da API /webhooks/leads da plataforma.**

## OpenClaw (Orquestrador AI)

```
┌──────────────────────────────────────────────────────┐
│               VPS Hostinger (187.77.227.3)            │
│                                                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐    │
│  │ OpenClaw │  │   QMD    │  │   Docker         │    │
│  │ Gateway  │  │ Semantic │  │  Sandbox (per    │    │
│  │ :18789   │  │ :8181    │  │   session)       │    │
│  └────┬─────┘  └────┬─────┘  └────────┬─────────┘    │
│       │              │                  │              │
│       └──────────────┼──────────────────┘              │
│                      │                                 │
│  Agents: main (Jarvis) | intel | hunter | ops          │
│  Skills: head-mkt | growth | ads | social | seo | etc  │
│  Plugins: memory-core | discord                        │
│  MCPs: máquina-mkt (ClickUp)                          │
└──────────────────────────────────────────────────────┘
         │                    │                │
    ┌────┴────┐        ┌─────┴─────┐    ┌─────┴──────┐
    │ClickUp  │        │  Discord  │    │ APIs AI    │
    │(tarefas │        │  (Genie   │    │ Claude,    │
    │ mkt)    │        │   bot)    │    │ GPT, Gemini│
    └─────────┘        └───────────┘    └────────────┘
```

### Fluxo OpenClaw → Plataforma de Email
```
OpenClaw (intel agent) → monitora trends/competitors
  → gera ideias de campanha → ClickUp (pipeline marketing)
  → operador humano aprova → Plataforma de Email dispara campanha
```

### Reaproveitamento na Plataforma
| Pattern | Origem | Fase |
|---------|--------|------|
| Multi-agent orchestration | 4 agentes com skills especializados | Fase 3 (automações inteligentes) |
| Memory pipeline | Conversa → fatos → indexação → consolidação | Fase 2+ (lead intelligence) |
| MCP tools | máquina-mkt (7 tools de alto nível) | Fase 1+ (ferramentas de domínio) |
| Offline conversion pipeline | Pipedrive → n8n → Google/Meta APIs | Fase 2 (attribution) |
| Channel integration | Discord/WA/Telegram com session isolation | Fase 4 (WhatsApp) |
| Skills pattern | Markdown SKILL.md como módulo de conhecimento | Fase 3 (automações editáveis) |

## Projetos Mencionados mas Não Analisados

| Projeto | Descrição | Impacto na Plataforma |
|---------|-----------|----------------------|
| Growth Analytics | Google Ads + Meta Ads + Pipedrive | Fase 2 — analytics de ads |
| Video System | Sistema de vídeo (Veo3) | Baixo — feature futura |

## Dependências entre Fases

```
Fase 1 (Leads + Email)
  │
  ├── Fase 2 (Analytics) ← depende de dados de email existindo
  │     │
  │     └── Fase 3 (Automações) ← depende de analytics para triggers
  │           │
  │           └── Fase 4 (WhatsApp/SMS) ← usa engine de automação
  │
  └── Fase 5 (Converter) ← pode rodar em paralelo com Fase 2+
```

## Pontos de Integração Críticos

### Supabase ↔ MailerSend
- **Envio:** Edge Function `send-campaign` → MailerSend Bulk API
- **Tracking:** MailerSend webhook → Edge Function `handle-mailersend-webhook` → email_sends
- **Domínios:** Um sending_domain por organization (stored na tabela organizations)

### Supabase ↔ n8n
- **Trigger:** Supabase DB webhook (insert em lead_events) → n8n webhook
- **Action:** n8n → Supabase REST API (update lead, add tag, create send)
- **Config:** n8n workflow_id salvo na tabela automations

### Supabase ↔ GTM (existente)
- **Não mexer.** Fluxo existente continua funcionando.
- **Na Fase 2:** Criar views que combinam dados do GTM com dados de email

### Tracking Dashboard ↔ Plataforma
- **Independentes.** Compartilham Supabase mas não se importam componentes.
- **Componentes copiados** (não importados) para evolução independente.

### Sistema de LP ↔ Plataforma
- **Fase 1:** Padrão de chat com IA adaptado para geração de email templates
- **Fase 5:** LP builder migrado/integrado como módulo Converter da plataforma
- **Leads:** LPs geradas enviam leads via webhook → plataforma recebe no POST /api/webhooks/leads
- **Brands:** Contextos de marca (templum.md, evolutto.md, orbit.md) devem ser unificados com a config de organizations da plataforma

### Briefing LP ↔ Plataforma
- **Tracking code:** Script de tracking das LPs gera os mesmos eventos que o GTM → Supabase
- **Payload de lead:** Formato do webhook das LPs = contrato da API de entrada de leads
- **Design system:** CSS variables e componentes reutilizáveis na Fase 5
