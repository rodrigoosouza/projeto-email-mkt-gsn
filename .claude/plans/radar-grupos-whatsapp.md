# Plano: Radar de Grupos WhatsApp

## Contexto
Monitorar grupos do WhatsApp por palavras-chave para detectar oportunidades de abordagem.
NÃO mistura com leads — tabela separada (whatsapp_opportunities).
Microserviço Go (whatsmeow) + Next.js UI + Supabase.

## Arquitetura

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────┐
│   Next.js UI    │────▶│  Go Microservice  │────▶│  WhatsApp   │
│  (plataforma)   │◀────│   (whatsmeow)     │◀────│  (grupos)   │
└────────┬────────┘     └────────┬─────────┘     └─────────────┘
         │                       │
         ▼                       ▼
    ┌─────────────────────────────────┐
    │         Supabase                │
    │  whatsapp_connections           │
    │  whatsapp_monitored_groups      │
    │  whatsapp_keywords              │
    │  whatsapp_opportunities         │
    │  whatsapp_messages              │
    └─────────────────────────────────┘
```

## Fase 1: Database + APIs + UI (Next.js) — FAZER AGORA

### Migration 034: Radar de Grupos

```sql
-- Conexões WhatsApp por org
whatsapp_connections
  org_id, phone_number, session_data, status (connected/disconnected), connected_at

-- Grupos monitorados
whatsapp_monitored_groups
  org_id, group_jid, group_name, group_picture_url, participant_count
  is_active, added_at

-- Palavras-chave por org
whatsapp_keywords
  org_id, keyword, category, is_active, created_at

-- Oportunidades detectadas (NÃO É LEAD)
whatsapp_opportunities
  org_id, phone, name, push_name
  group_jid, group_name
  message_text, keyword_matched, keyword_category
  status (novo/abordado/respondeu/converteu/ignorado)
  notes, detected_at, last_approach_at
  converted_to_lead_id (FK leads, nullable)

-- Mensagens (histórico do chat)
whatsapp_messages
  org_id, group_jid, sender_phone, sender_name
  message_text, message_type (text/image/video/audio)
  is_from_me, timestamp
```

### APIs

```
POST /api/whatsapp-radar/connect     — Inicia conexão (gera QR)
GET  /api/whatsapp-radar/status      — Status da conexão
GET  /api/whatsapp-radar/groups      — Lista grupos disponíveis
POST /api/whatsapp-radar/groups      — Selecionar grupos pra monitorar
GET  /api/whatsapp-radar/keywords    — Listar palavras-chave
POST /api/whatsapp-radar/keywords    — Adicionar/remover keyword
GET  /api/whatsapp-radar/opportunities — Listar oportunidades
PUT  /api/whatsapp-radar/opportunities/[id] — Atualizar status
POST /api/whatsapp-radar/send        — Enviar mensagem
GET  /api/whatsapp-radar/messages    — Histórico de mensagens
GET  /api/whatsapp-radar/dashboard   — Stats (oportunidades por dia/keyword/grupo)
```

### UI Pages

```
/whatsapp/radar              — Dashboard principal
/whatsapp/radar/connect      — Conectar WhatsApp (QR Code)
/whatsapp/radar/groups       — Gerenciar grupos monitorados
/whatsapp/radar/keywords     — Gerenciar palavras-chave
/whatsapp/radar/opportunities — Lista de oportunidades
/whatsapp/radar/chat/[groupId] — Chat do grupo (ler + enviar)
```

### Sidebar
Adicionar "Radar de Grupos" no menu Mensageria com ícone Radar

## Fase 2: Go Microservice (whatsmeow) — DEPOIS

Projeto separado em Go que:
- Conecta no WhatsApp via whatsmeow
- Mantém sessão persistente
- Escuta mensagens dos grupos monitorados
- Compara com keywords configuradas
- Quando detecta match → salva oportunidade no Supabase
- Expõe API REST para Next.js controlar

## Verificação
- Testar: criar keywords, ver oportunidades detectadas
- Testar: chat (ler + enviar)
- Testar: dashboard com stats
- Testar: converter oportunidade em lead
