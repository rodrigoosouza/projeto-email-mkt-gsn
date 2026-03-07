# API e Webhooks — Documentação Completa

## Índice

1. [API Pública (x-api-key)](#1-api-pública-x-api-key)
   - Webhook de Leads
   - Webhook de Eventos
2. [Webhooks Recebidos (Entrada)](#2-webhooks-recebidos-entrada)
   - MailerSend
   - WhatsApp Cloud API
   - Meta Lead Ads
3. [Supabase Edge Functions](#3-supabase-edge-functions)
   - handle-mailersend-webhook
   - handle-whatsapp-webhook
   - send-campaign
   - calculate-scoring
4. [Next.js API Routes (Auth Supabase)](#4-nextjs-api-routes-auth-supabase)
   - Campanhas
   - Leads
   - Templates
   - Analytics
   - Webhooks de Teste
5. [Supabase Client API (RLS + Frontend)](#5-supabase-client-api-rls--frontend)
   - Leads
   - Campanhas
   - Templates
   - Segmentos
   - Automações
   - Organizações
   - Usuários
   - API Keys
   - Webhook Subscriptions
6. [Webhooks Enviados (Saída)](#6-webhooks-enviados-saída)

---

## 1. API Pública (x-api-key)

Endpoints públicos para integração com sistemas externos. Autenticação via chave de API por organização.

### POST /api/webhooks/leads

Receber leads de formulários, landing pages, CRMs, LPs, ou sistemas externos.

**Method:** `POST`
**Auth:** `x-api-key` header
**Rate Limit:** 1000 req/min por chave

**Headers:**
```http
x-api-key: sk_org_abc123xyz789
Content-Type: application/json
```

**Request Body:**
```typescript
interface CreateLeadWebhookPayload {
  email: string;                          // obrigatório, único por org
  name?: string;
  phone?: string;
  company?: string;
  source: string;                         // ex: "landing_page", "form_hubspot", "api_zapier"
  tags?: string[];                        // tags para organizar leads
  custom_fields?: Record<string, string | number | boolean>;  // campos customizados
  metadata?: {
    ip_address?: string;
    user_agent?: string;
    referer?: string;
  };
}
```

**Example Request:**
```bash
curl -X POST https://api.plataforma-email.com/api/webhooks/leads \
  -H "x-api-key: sk_org_abc123xyz789" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "contato@empresa.com",
    "name": "João Silva",
    "phone": "+5511999999999",
    "company": "Empresa X",
    "source": "landing_page_produto_y",
    "tags": ["interessado", "produto-y", "hot"],
    "custom_fields": {
      "cargo": "Diretor",
      "segmento": "SaaS",
      "budget": 50000
    },
    "metadata": {
      "ip_address": "192.168.1.1",
      "referer": "https://google.com"
    }
  }'
```

**Response (201) — Novo Lead:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "contato@empresa.com",
    "name": "João Silva",
    "created": true,
    "created_at": "2026-03-05T10:30:00Z"
  }
}
```

**Response (200) — Lead Existente (Atualizado):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "contato@empresa.com",
    "created": false,
    "updated_at": "2026-03-05T10:35:00Z",
    "message": "Lead atualizado com sucesso"
  }
}
```

**Error Responses:**

```json
{
  "success": false,
  "error": {
    "code": "INVALID_API_KEY",
    "message": "API key inválida ou expirada"
  }
}
```

```json
{
  "success": false,
  "error": {
    "code": "INVALID_EMAIL",
    "message": "Email inválido"
  }
}
```

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Limite de requisições excedido. Tente novamente em 60s"
  }
}
```

**Rate Limiting:**
- 1000 requisições / minuto por chave de API
- 10000 requisições / hora por chave de API
- Response header: `X-RateLimit-Remaining`, `X-RateLimit-Reset`

**Notes:**
- Email é único por organização; se enviar um email existente, o lead é atualizado (merge)
- Tags e custom_fields são mesclados, não sobrescritos
- Eventos `lead.created` e `lead.updated` são acionados automaticamente

---

### POST /api/webhooks/events

Rastrear eventos customizados de leads (downloads, cliques, preenchimento de formulários, etc.).

**Method:** `POST`
**Auth:** `x-api-key` header
**Rate Limit:** 5000 req/min por chave

**Headers:**
```http
x-api-key: sk_org_abc123xyz789
Content-Type: application/json
```

**Request Body:**
```typescript
interface CreateEventWebhookPayload {
  email: string;                              // obrigatório
  event_name: string;                         // ex: "downloaded_ebook", "page_viewed", "form_submitted"
  event_type?: 'engagement' | 'conversion' | 'custom';  // padrão: 'custom'
  properties?: Record<string, string | number | boolean>;  // dados do evento
  timestamp?: string;                         // ISO 8601, padrão: agora
}
```

**Example Request:**
```bash
curl -X POST https://api.plataforma-email.com/api/webhooks/events \
  -H "x-api-key: sk_org_abc123xyz789" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "contato@empresa.com",
    "event_name": "downloaded_ebook",
    "event_type": "conversion",
    "properties": {
      "ebook_name": "Guia de Marketing Digital",
      "ebook_id": "pdf_001",
      "page_url": "https://exemplo.com/ebook",
      "download_type": "direct"
    },
    "timestamp": "2026-03-05T10:30:00Z"
  }'
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "event_uuid",
    "event_name": "downloaded_ebook",
    "email": "contato@empresa.com",
    "created_at": "2026-03-05T10:30:00Z"
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "LEAD_NOT_FOUND",
    "message": "Lead com esse email não encontrado"
  }
}
```

**Rate Limiting:**
- 5000 requisições / minuto por chave
- 50000 requisições / hora por chave

**Notes:**
- Evento cria entrada em `lead_events` table
- Aciona `calculate-scoring` Edge Function (recalcula score do lead)
- Dispara webhook saída `event.created` se configurado

---

## 2. Webhooks Recebidos (Entrada)

### POST /api/webhooks/mailersend

Webhook recebido do MailerSend para eventos de email (enviado, entregue, aberto, clicado, bounced, complaint, unsubscribed).

**Method:** `POST`
**Auth:** Validação de Signature (HMAC SHA-256)
**Origem:** MailerSend Cloud

**Headers Esperados:**
```http
Content-Type: application/json
Signature: t=timestamp,signature=hash_hmac_sha256
```

**MailerSend Signature Validation:**
```typescript
// Usar secret da integração MailerSend (guardado em environment)
const signature = req.headers['signature'];
const body = req.rawBody; // raw body, não parseado

// Formato: "t=1234567890,signature=abc123..."
const [timeStr, sigStr] = signature.split(',');
const timestamp = parseInt(timeStr.split('=')[1]);
const sentSignature = sigStr.split('=')[1];

// Validar timestamp (não aceitar eventos com >5 min de diferença)
if (Date.now() - timestamp * 1000 > 5 * 60 * 1000) {
  throw new Error('Webhook timestamp expirado');
}

// Validar HMAC
const message = `${timestamp}.${body}`;
const computed = crypto
  .createHmac('sha256', MAILERSEND_WEBHOOK_SECRET)
  .update(message)
  .digest('hex');

if (computed !== sentSignature) {
  throw new Error('Signature inválida');
}
```

**Request Body Examples:**

```json
{
  "data": {
    "id": "msg_123",
    "email": "recipient@example.com",
    "from": "noreply@plataforma-email.com",
    "subject": "Bem-vindo!",
    "status": "sent",
    "sent_at": "2026-03-05T10:30:00Z",
    "tags": ["campaign_001", "onboarding"]
  },
  "type": "email.sent"
}
```

```json
{
  "data": {
    "id": "msg_123",
    "email": "recipient@example.com",
    "status": "delivered",
    "delivered_at": "2026-03-05T10:30:05Z"
  },
  "type": "email.delivered"
}
```

```json
{
  "data": {
    "id": "msg_123",
    "email": "recipient@example.com",
    "status": "opened",
    "opened_at": "2026-03-05T10:35:00Z",
    "user_agent": "Mozilla/5.0..."
  },
  "type": "email.opened"
}
```

```json
{
  "data": {
    "id": "msg_123",
    "email": "recipient@example.com",
    "status": "clicked",
    "clicked_at": "2026-03-05T10:36:00Z",
    "link_url": "https://exemplo.com/promo",
    "link_text": "Ver Oferta"
  },
  "type": "email.clicked"
}
```

```json
{
  "data": {
    "id": "msg_123",
    "email": "recipient@example.com",
    "status": "bounced",
    "bounced_at": "2026-03-05T10:31:00Z",
    "bounce_type": "hard",
    "bounce_reason": "Mailbox does not exist"
  },
  "type": "email.bounced"
}
```

```json
{
  "data": {
    "id": "msg_123",
    "email": "recipient@example.com",
    "status": "spam_complaint",
    "complained_at": "2026-03-05T10:37:00Z"
  },
  "type": "email.complaint"
}
```

```json
{
  "data": {
    "id": "msg_123",
    "email": "recipient@example.com",
    "status": "unsubscribed",
    "unsubscribed_at": "2026-03-05T10:38:00Z",
    "unsubscribe_type": "manual"
  },
  "type": "email.unsubscribed"
}
```

**Edge Function to Call:**
```
POST /functions/v1/handle-mailersend-webhook
```

**Processing Inside Edge Function:**
1. Validar signature
2. Parsear evento
3. Encontrar `email_send` correspondente via MailerSend `msg_id`
4. Atualizar `email_sends` com novo status
5. Criar entrada em `lead_events` (para scoring)
6. Chamar `calculate-scoring` para recalcular score do lead
7. Disparar webhook saída `email.{status}` se configurado
8. Retornar 200 OK

**Response (200):**
```json
{
  "success": true,
  "message": "Evento processado"
}
```

**Response (400):**
```json
{
  "success": false,
  "error": "Signature inválida"
}
```

---

### POST /api/webhooks/whatsapp

Webhook recebido do WhatsApp Cloud API para mensagens inbound e status updates.

**Method:** `POST`
**Auth:** Validação de Signature (`X-Hub-Signature-256`)
**Origem:** WhatsApp Cloud API

**Headers Esperados:**
```http
Content-Type: application/json
X-Hub-Signature-256: sha256=abc123...
X-Hub-Delivery: message_id
```

**WhatsApp Signature Validation:**
```typescript
const signature = req.headers['x-hub-signature-256']; // "sha256=hash"
const body = req.rawBody;

const [algo, hash] = signature.split('=');
const computed = crypto
  .createHmac('sha256', WHATSAPP_WEBHOOK_SECRET)
  .update(body)
  .digest('hex');

if (computed !== hash) {
  throw new Error('Signature inválida');
}
```

**Request Body Examples:**

**Inbound Message:**
```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "123456",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "5511999999999",
              "phone_number_id": "102xxx"
            },
            "messages": [
              {
                "from": "551188888888",
                "id": "wamid_xxx",
                "timestamp": "1234567890",
                "type": "text",
                "text": {
                  "body": "Olá, gostaria de informações"
                }
              }
            ]
          }
        }
      ]
    }
  ]
}
```

**Status Update (Message Sent/Delivered/Read):**
```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "123456",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "5511999999999",
              "phone_number_id": "102xxx"
            },
            "statuses": [
              {
                "id": "wamid_xxx",
                "status": "delivered",
                "timestamp": "1234567890",
                "recipient_id": "551188888888"
              }
            ]
          }
        }
      ]
    }
  ]
}
```

**Edge Function to Call:**
```
POST /functions/v1/handle-whatsapp-webhook
```

**Processing Inside Edge Function:**
1. Validar signature
2. Para mensagens inbound:
   - Encontrar lead por phone number
   - Criar entrada em `whatsapp_messages` (inbound)
   - Criar entrada em `lead_events` (tipo: "whatsapp_message")
   - Chamar `calculate-scoring`
   - Disparar webhook saída `whatsapp.message_received`
3. Para status updates:
   - Encontrar `whatsapp_message` (outbound) correspondente
   - Atualizar status (sent, delivered, read, failed)
   - Disparar webhook saída `whatsapp.status_update`
4. Retornar 200 OK

**Response (200):**
```json
{
  "success": true,
  "message": "Webhook processado"
}
```

---

### POST /api/webhooks/meta-leads

Webhook recebido do Meta Lead Ads quando alguém preenche um Lead Ad.

**Method:** `POST`
**Auth:** Token de verificação + Signature
**Origem:** Meta (Facebook/Instagram)

**Headers Esperados:**
```http
Content-Type: application/json
```

**Meta Lead Ads Signature Validation:**
```typescript
const signature = req.headers['x-hub-signature-256'];
const body = req.rawBody;

const computed = crypto
  .createHmac('sha256', META_APP_SECRET)
  .update(body)
  .digest('hex');

if (`sha256=${computed}` !== signature) {
  throw new Error('Signature inválida');
}
```

**Request Body Example:**
```json
{
  "object": "page",
  "entry": [
    {
      "id": "page_id",
      "time": 1234567890,
      "messaging": [
        {
          "sender": {
            "id": "user_id"
          },
          "recipient": {
            "id": "page_id"
          },
          "timestamp": 1234567890,
          "message": {
            "mid": "msg_id",
            "text": "User's message"
          }
        }
      ],
      "leadgen": [
        {
          "id": "lead_id",
          "created_time": 1234567890,
          "field_data": [
            {
              "name": "email",
              "value": "contato@empresa.com"
            },
            {
              "name": "full_name",
              "value": "João Silva"
            },
            {
              "name": "phone_number",
              "value": "+5511999999999"
            },
            {
              "name": "company_name",
              "value": "Empresa X"
            },
            {
              "name": "job_title",
              "value": "Diretor de Marketing"
            }
          ]
        }
      ]
    }
  ]
}
```

**Processing via n8n (ou Edge Function):**

Normalmente, este webhook é recebido por um webhook no n8n que:
1. Extrai dados do `field_data`
2. Mapeia para formato de lead (email, name, phone, company, etc.)
3. Chama `POST /api/webhooks/leads` com source: `meta_lead_ads`
4. Atualiza plataforma via API

**Response (200):**
```json
{
  "success": true
}
```

---

## 3. Supabase Edge Functions

### handle-mailersend-webhook

Processa eventos do MailerSend (sent, delivered, opened, clicked, bounced, complaint, unsubscribed).

**Path:** `/functions/v1/handle-mailersend-webhook`
**Method:** `POST`
**Auth:** Signature validation

**Implementation Notes:**
```typescript
// Validar signature (vide seção MailerSend acima)
// 1. Parse event
// 2. Find email_send by mailersend_msg_id
// 3. Update email_sends table
// 4. Create lead_event entry
// 5. Call calculate-scoring function
// 6. Dispatch outbound webhook if configured
// 7. Return { success: true }

const event = req.body;

// Mapear status MailerSend para plataforma
const statusMap = {
  'sent': 'sent',
  'delivered': 'delivered',
  'opened': 'opened',
  'clicked': 'clicked',
  'hard_bounced': 'bounced_hard',
  'soft_bounced': 'bounced_soft',
  'spam_complaint': 'complained',
  'unsubscribed': 'unsubscribed'
};

// Update email_sends
const { data: emailSend } = await supabase
  .from('email_sends')
  .update({
    status: statusMap[event.data.status],
    last_event_at: event.data[`${event.type.split('.')[1]}_at`]
  })
  .eq('mailersend_msg_id', event.data.id)
  .select()
  .single();

// Create lead_event
await supabase
  .from('lead_events')
  .insert({
    lead_id: emailSend.lead_id,
    event_type: `email_${statusMap[event.data.status]}`,
    properties: event.data
  });

// Trigger scoring recalc
await supabase.functions.invoke('calculate-scoring', {
  body: { lead_id: emailSend.lead_id }
});
```

---

### handle-whatsapp-webhook

Processa mensagens e status updates do WhatsApp Cloud API.

**Path:** `/functions/v1/handle-whatsapp-webhook`
**Method:** `POST`
**Auth:** Signature validation

**Implementation Notes:**
```typescript
// 1. Validate signature
// 2. Parse webhook data
// 3. For inbound messages:
//    - Find or create lead by phone
//    - Create whatsapp_messages entry (direction: 'inbound')
//    - Create lead_event (type: 'whatsapp_message_received')
//    - Trigger calculate-scoring
// 4. For status updates:
//    - Find outbound whatsapp_message
//    - Update status
//    - Create lead_event (type: 'whatsapp_message_status')
// 5. Dispatch outbound webhook if configured
```

---

### send-campaign

Processa fila de envio de campanhas (bulk email via MailerSend).

**Path:** `/functions/v1/send-campaign`
**Method:** `POST`
**Auth:** Supabase service role (internal only)

**Triggered By:**
- Manual trigger via `POST /api/campaigns/[id]/send`
- Scheduled trigger via cron (daily, weekly, etc.)

**Input:**
```typescript
interface SendCampaignPayload {
  campaign_id: string;
  segment_id?: string;  // se null, envia para todos leads elegíveis
}
```

**Processing:**
```typescript
// 1. Fetch campaign + template
// 2. Fetch segment leads (ou todos leads ativo da org)
// 3. Para cada lead:
//    - Personalizar template (substituir {{name}}, {{email}}, etc)
//    - Send via MailerSend API
//    - Create email_sends entry
//    - Create lead_event (type: 'campaign_sent')
// 4. Update campaign.status = 'sent'
// 5. Update campaign.sent_at, sent_count
// 6. Dispatch outbound webhook 'campaign.completed'
// 7. Return { success: true, sent_count: X }
```

**Rate Limiting / Batching:**
- MailerSend: ~500 req/s per account
- Enviar em batches de 100 emails, aguardar 1s entre batches
- Suportar pause/resume via campaign.paused flag

---

### calculate-scoring

Recalcula lead scoring baseado em eventos recentes.

**Path:** `/functions/v1/calculate-scoring`
**Method:** `POST`
**Auth:** Supabase service role (internal only)

**Input:**
```typescript
interface CalculateScoringPayload {
  lead_id: string;
}
```

**Scoring Logic:**
```typescript
// Points system:
// Email opened: +5
// Email clicked: +10
// Downloaded content: +8
// Form submitted: +15
// Page visited: +1
// WhatsApp message: +3
// Event: custom_event: +variable (from automation config)

// Decay: -2 points per week (inativo)

// Calculate:
// 1. Fetch lead
// 2. Fetch recent events (últimas 90 dias)
// 3. Sum points
// 4. Apply decay
// 5. Update leads.score
// 6. If score > threshold, update status to 'hot' ou 'warm'
```

---

## 4. Next.js API Routes (Auth Supabase)

Rotas internas que requerem autenticação Supabase (JWT via Authorization: Bearer token).

### POST /api/campaigns/[id]/send

Trigger manual de envio de campanha.

**Method:** `POST`
**Path:** `/api/campaigns/[id]/send`
**Auth:** Supabase JWT (via Authorization header)

**Headers:**
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Request Body:**
```typescript
interface SendCampaignRequest {
  segment_id?: string;  // se omitido, envia para todos leads elegíveis
  schedule?: {
    send_at?: string;   // ISO 8601
    timezone?: string;  // ex: "America/Sao_Paulo"
  };
}
```

**Response (200):**
```json
{
  "success": true,
  "campaign_id": "camp_123",
  "status": "sending",
  "estimated_recipients": 500,
  "message": "Campanha iniciada. Você receberá notificação quando terminar."
}
```

**Error Response (403):**
```json
{
  "success": false,
  "error": "Usuário não tem permissão para enviar esta campanha"
}
```

**Notes:**
- Valida se user.organization_id == campaign.organization_id
- Chama Edge Function `send-campaign` async (retorna imediatamente)
- Emite evento `campaign.sending` via webhook

---

### POST /api/campaigns/[id]/schedule

Agendar envio de campanha para data/hora específica.

**Method:** `POST`
**Path:** `/api/campaigns/[id]/schedule`
**Auth:** Supabase JWT

**Request Body:**
```typescript
interface ScheduleCampaignRequest {
  send_at: string;      // ISO 8601 (ex: "2026-03-10T14:00:00Z")
  timezone: string;     // "America/Sao_Paulo", "UTC", etc.
  segment_id?: string;
  recurring?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    end_at?: string;    // ISO 8601, para campanhas recorrentes
  };
}
```

**Response (200):**
```json
{
  "success": true,
  "campaign_id": "camp_123",
  "scheduled_at": "2026-03-10T14:00:00Z",
  "cron_job_id": "cron_abc123"
}
```

**Implementation:**
- Update `campaigns.scheduled_at`
- Create cron job via n8n ou scheduler interno
- Cron job chama `POST /api/campaigns/[id]/send` na hora agendada

---

### POST /api/leads/import

Importar leads via CSV em bulk.

**Method:** `POST`
**Path:** `/api/leads/import`
**Auth:** Supabase JWT
**Content-Type:** `multipart/form-data`

**Request:**
```http
POST /api/leads/import HTTP/1.1
Authorization: Bearer token...
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary

------WebKitFormBoundary
Content-Disposition: form-data; name="file"; filename="leads.csv"
Content-Type: text/csv

email,name,phone,company,source
contato@empresa.com,João Silva,+5511999999999,Empresa X,csv_import
...

------WebKitFormBoundary
Content-Disposition: form-data; name="update_existing"

true
------WebKitFormBoundary
Content-Disposition: form-data; name="tags"

imported,bulk
------WebKitFormBoundary--
```

**CSV Format:**
```
email,name,phone,company,source,tags,custom_field_1
contato@empresa.com,João Silva,+5511999999999,Empresa X,csv,imported,value1
...
```

**Response (202 Accepted):**
```json
{
  "success": true,
  "import_id": "imp_123",
  "status": "processing",
  "estimated_leads": 1500,
  "message": "Importação iniciada. Você receberá email quando terminar."
}
```

**Implementation:**
- Validar CSV (headers, formato)
- Armazenar em blob storage temporário
- Chamar Edge Function `process-csv-import` async
- Retornar import_id para tracking
- Edge Function processa em batches, cria leads, emails notification ao final

**Error Response (400):**
```json
{
  "success": false,
  "error": "CSV inválido: coluna 'email' obrigatória"
}
```

---

### POST /api/templates/ai-generate

Gerar template de email via Claude AI.

**Method:** `POST`
**Path:** `/api/templates/ai-generate`
**Auth:** Supabase JWT

**Request Body:**
```typescript
interface GenerateTemplateRequest {
  subject?: string;
  prompt: string;          // ex: "Criar email de bem-vindo para SaaS"
  tone?: 'formal' | 'casual' | 'friendly';  // padrão: 'friendly'
  language?: 'pt' | 'en';  // padrão: 'pt'
  include_cta?: boolean;   // padrão: true
  variables?: string[];    // ex: ['{{name}}', '{{company}}', '{{offer}}']
}
```

**Example Request:**
```bash
curl -X POST https://api.plataforma-email.com/api/templates/ai-generate \
  -H "Authorization: Bearer token..." \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Email de bem-vindo para startup de IA",
    "tone": "friendly",
    "include_cta": true,
    "variables": ["{{name}}", "{{company}}", "{{trial_days}}"]
  }'
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "html": "<html><body>...",
    "plain_text": "...",
    "subject": "Bem-vindo ao nosso produto!",
    "preview": "Olá {{name}}, temos uma oferta especial para {{company}}...",
    "variables_found": ["name", "company", "trial_days"]
  }
}
```

**Implementation:**
- Chamar Anthropic Claude API (claude-opus-4-6 ou claude-haiku)
- Gerar HTML + plaintext
- Retornar template (não salvar automaticamente, deixar usuário revisar)

---

### GET /api/analytics/overview

Buscar KPIs e métricas do dashboard.

**Method:** `GET`
**Path:** `/api/analytics/overview`
**Auth:** Supabase JWT
**Query Params:**
```
?date_from=2026-02-05&date_to=2026-03-05&timezone=America/Sao_Paulo
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "overview": {
      "total_leads": 5420,
      "active_leads": 3200,
      "new_leads_this_month": 1200,
      "hot_leads": 150,
      "avg_score": 45.3
    },
    "email_metrics": {
      "total_sent": 12500,
      "delivered": 12100,
      "opened": 5040,
      "clicked": 1260,
      "bounced": 150,
      "complained": 25,
      "unsubscribed": 85,
      "open_rate": 41.5,
      "click_rate": 10.1,
      "bounce_rate": 1.2
    },
    "campaigns": {
      "total": 12,
      "active": 3,
      "scheduled": 2,
      "completed": 7
    },
    "whatsapp": {
      "messages_sent": 450,
      "messages_received": 320,
      "avg_response_time_minutes": 45
    },
    "top_pages": [
      {
        "page_title": "Pricing",
        "visits": 450,
        "unique_visitors": 380
      }
    ],
    "conversion_funnel": {
      "page_visited": 5000,
      "form_submitted": 1200,
      "email_opened": 500,
      "email_clicked": 150,
      "demo_requested": 50,
      "conversion_rate": 1.0
    }
  }
}
```

**Implementation:**
- Agregação via Supabase SQL (ou PostgREST)
- Cache 5 min
- Filtrar por organization_id + date range

---

### POST /api/webhooks/test

Testar webhook de saída (enviar evento de teste).

**Method:** `POST`
**Path:** `/api/webhooks/test`
**Auth:** Supabase JWT

**Request Body:**
```typescript
interface TestWebhookRequest {
  webhook_subscription_id: string;  // ID do webhook configurado
  event_type: string;                // ex: "lead.created"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Webhook de teste enviado",
  "response_status": 200,
  "response_time_ms": 234
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "Webhook subscription não encontrada"
}
```

---

## 5. Supabase Client API (RLS + Frontend)

O frontend usa Supabase JavaScript Client para operações CRUD. Row-Level Security garante que cada usuário acessa apenas dados de sua organização.

### Leads

**List Leads:**
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Listar leads ativos, com filtros
const { data: leads, error } = await supabase
  .from('leads')
  .select(`
    id,
    email,
    name,
    phone,
    company,
    score,
    status,
    tags,
    created_at,
    last_activity_at
  `)
  .eq('organization_id', orgId)
  .eq('status', 'active')
  .contains('tags', ['interessado'])  // leads com tag 'interessado'
  .gte('score', 30)  // score >= 30
  .order('score', { ascending: false })
  .range(0, 49);  // paginação: primeiros 50
```

**Get Single Lead:**
```typescript
const { data: lead, error } = await supabase
  .from('leads')
  .select(`
    *,
    lead_events(
      id,
      event_type,
      properties,
      created_at
    ),
    email_sends(
      id,
      campaign_id,
      status,
      sent_at,
      opened_at,
      clicked_at
    )
  `)
  .eq('id', leadId)
  .eq('organization_id', orgId)
  .single();
```

**Create Lead:**
```typescript
const { data: lead, error } = await supabase
  .from('leads')
  .insert({
    organization_id: orgId,
    email: 'novo@empresa.com',
    name: 'Novo Lead',
    phone: '+5511999999999',
    company: 'Empresa Y',
    source: 'api',
    tags: ['novo', 'hot'],
    custom_fields: {
      cargo: 'Gerente',
      budget: 100000
    }
  })
  .select()
  .single();
```

**Update Lead:**
```typescript
const { data: lead, error } = await supabase
  .from('leads')
  .update({
    name: 'Nome Atualizado',
    score: 55,
    status: 'hot',
    tags: ['hot', 'sales-ready']
  })
  .eq('id', leadId)
  .eq('organization_id', orgId)
  .select()
  .single();
```

**Delete Lead:**
```typescript
const { error } = await supabase
  .from('leads')
  .delete()
  .eq('id', leadId)
  .eq('organization_id', orgId);
```

**Bulk Tag Leads:**
```typescript
const { error } = await supabase
  .from('leads')
  .update({
    tags: supabase.rpc('append_tags', {
      new_tags: ['webinar-2026']
    })
  })
  .in('id', [leadId1, leadId2, leadId3])
  .eq('organization_id', orgId);
```

**Search Leads (Full-Text):**
```typescript
const { data: results, error } = await supabase
  .from('leads')
  .select('id, email, name, score')
  .eq('organization_id', orgId)
  .textSearch('name_email_fts', 'joão silva')  // requer FTS column
  .limit(20);
```

---

### Campaigns

**List Campaigns:**
```typescript
const { data: campaigns, error } = await supabase
  .from('campaigns')
  .select(`
    id,
    name,
    subject,
    status,
    template_id,
    segment_id,
    sent_at,
    sent_count,
    opened_count,
    clicked_count,
    created_at
  `)
  .eq('organization_id', orgId)
  .order('created_at', { ascending: false })
  .limit(50);
```

**Get Campaign with Details:**
```typescript
const { data: campaign, error } = await supabase
  .from('campaigns')
  .select(`
    *,
    template:templates(*),
    segment:segments(*),
    email_sends(
      count
    ),
    campaign_analytics(
      metric,
      value
    )
  `)
  .eq('id', campaignId)
  .eq('organization_id', orgId)
  .single();
```

**Create Campaign:**
```typescript
const { data: campaign, error } = await supabase
  .from('campaigns')
  .insert({
    organization_id: orgId,
    name: 'Campanha Q1 2026',
    subject: 'Oferta especial para você',
    template_id: templateId,
    segment_id: segmentId,  // null = todos leads
    status: 'draft'
  })
  .select()
  .single();
```

**Update Campaign:**
```typescript
const { data: campaign, error } = await supabase
  .from('campaigns')
  .update({
    name: 'Novo Nome',
    subject: 'Novo Subject'
  })
  .eq('id', campaignId)
  .eq('organization_id', orgId)
  .select()
  .single();
```

**Clone Campaign:**
```typescript
// Buscar original
const { data: original } = await supabase
  .from('campaigns')
  .select('*')
  .eq('id', campaignId)
  .single();

// Criar cópia
const { data: cloned } = await supabase
  .from('campaigns')
  .insert({
    ...original,
    id: undefined,  // gera novo UUID
    name: `${original.name} (Cópia)`,
    status: 'draft',
    sent_at: null,
    sent_count: 0
  })
  .select()
  .single();
```

**Delete Campaign:**
```typescript
const { error } = await supabase
  .from('campaigns')
  .delete()
  .eq('id', campaignId)
  .eq('organization_id', orgId);
```

---

### Templates

**List Templates:**
```typescript
const { data: templates, error } = await supabase
  .from('templates')
  .select('id, name, subject, preview, created_at')
  .eq('organization_id', orgId)
  .order('created_at', { ascending: false });
```

**Get Template:**
```typescript
const { data: template, error } = await supabase
  .from('templates')
  .select('*')
  .eq('id', templateId)
  .eq('organization_id', orgId)
  .single();
```

**Create Template:**
```typescript
const { data: template, error } = await supabase
  .from('templates')
  .insert({
    organization_id: orgId,
    name: 'Bem-vindo',
    subject: 'Bem-vindo ao {{company}}!',
    html_content: '<html><body>{{greeting}} {{name}}</body></html>',
    plain_text_content: 'Bem-vindo {{name}}',
    variables: ['name', 'company', 'greeting'],
    preview: 'Bem-vindo ao ...'
  })
  .select()
  .single();
```

**Update Template:**
```typescript
const { data: template, error } = await supabase
  .from('templates')
  .update({
    html_content: '<html>...</html>',
    plain_text_content: '...'
  })
  .eq('id', templateId)
  .eq('organization_id', orgId)
  .select()
  .single();
```

**Delete Template:**
```typescript
const { error } = await supabase
  .from('templates')
  .delete()
  .eq('id', templateId)
  .eq('organization_id', orgId);
```

---

### Segments

**List Segments:**
```typescript
const { data: segments, error } = await supabase
  .from('segments')
  .select('id, name, description, lead_count, created_at')
  .eq('organization_id', orgId);
```

**Get Segment with Members:**
```typescript
const { data: segment, error } = await supabase
  .from('segments')
  .select(`
    *,
    segment_members(
      id,
      lead_id
    )
  `)
  .eq('id', segmentId)
  .eq('organization_id', orgId)
  .single();
```

**Create Segment:**
```typescript
const { data: segment, error } = await supabase
  .from('segments')
  .insert({
    organization_id: orgId,
    name: 'Hot Leads Q1',
    description: 'Leads com score >= 50',
    criteria: {
      score: { gte: 50 },
      status: 'active'
    }
  })
  .select()
  .single();
```

**Recalculate Segment Members:**
```typescript
// Call Edge Function para recalcular leads no segment
const { data, error } = await supabase.functions.invoke('recalculate-segment', {
  body: {
    segment_id: segmentId,
    organization_id: orgId
  }
});
```

**Delete Segment:**
```typescript
const { error } = await supabase
  .from('segments')
  .delete()
  .eq('id', segmentId)
  .eq('organization_id', orgId);
```

---

### Automations

**List Automations:**
```typescript
const { data: automations, error } = await supabase
  .from('automations')
  .select(`
    id,
    name,
    trigger_type,
    enabled,
    created_at,
    automation_steps(count)
  `)
  .eq('organization_id', orgId);
```

**Get Automation:**
```typescript
const { data: automation, error } = await supabase
  .from('automations')
  .select(`
    *,
    automation_steps(
      id,
      step_order,
      action_type,
      config
    )
  `)
  .eq('id', automationId)
  .eq('organization_id', orgId)
  .single();
```

**Create Automation:**
```typescript
const { data: automation, error } = await supabase
  .from('automations')
  .insert({
    organization_id: orgId,
    name: 'Automação de Bem-vindo',
    trigger_type: 'lead_created',  // lead_created, email_opened, etc.
    enabled: true
  })
  .select()
  .single();
```

**Add Automation Step:**
```typescript
const { data: step, error } = await supabase
  .from('automation_steps')
  .insert({
    automation_id: automationId,
    step_order: 1,
    action_type: 'send_email',
    config: {
      template_id: templateId,
      delay_minutes: 0
    }
  })
  .select()
  .single();
```

**Toggle Automation:**
```typescript
const { data: automation, error } = await supabase
  .from('automations')
  .update({ enabled: !automation.enabled })
  .eq('id', automationId)
  .eq('organization_id', orgId)
  .select()
  .single();
```

**Delete Automation:**
```typescript
const { error } = await supabase
  .from('automations')
  .delete()
  .eq('id', automationId)
  .eq('organization_id', orgId);
```

---

### Organizations

**Get Organization Settings:**
```typescript
const { data: org, error } = await supabase
  .from('organizations')
  .select('*')
  .eq('id', orgId)
  .single();
```

**Update Organization Settings:**
```typescript
const { data: org, error } = await supabase
  .from('organizations')
  .update({
    name: 'Novo Nome Empresa',
    settings: {
      timezone: 'America/Sao_Paulo',
      language: 'pt',
      from_email: 'noreply@empresa.com',
      from_name: 'Empresa'
    }
  })
  .eq('id', orgId)
  .select()
  .single();
```

---

### Users

**List Organization Users:**
```typescript
const { data: users, error } = await supabase
  .from('users')
  .select('id, email, name, role, created_at')
  .eq('organization_id', orgId);
```

**Invite User:**
```typescript
// Usa função RPC customizada ou trigger automatizado
const { data, error } = await supabase.functions.invoke('invite-user', {
  body: {
    email: 'novo@empresa.com',
    role: 'member',  // 'admin', 'member', 'viewer'
    organization_id: orgId
  }
});
```

**Update User Role:**
```typescript
const { data: user, error } = await supabase
  .from('users')
  .update({
    role: 'admin'
  })
  .eq('id', userId)
  .eq('organization_id', orgId)
  .select()
  .single();
```

**Remove User from Organization:**
```typescript
const { error } = await supabase
  .from('users')
  .delete()
  .eq('id', userId)
  .eq('organization_id', orgId);
```

---

### API Keys

**List API Keys:**
```typescript
const { data: keys, error } = await supabase
  .from('api_keys')
  .select('id, name, prefix, last_used_at, created_at')  // NUNCA retornar full key
  .eq('organization_id', orgId);
```

**Create API Key:**
```typescript
const { data: key, error } = await supabase.functions.invoke('create-api-key', {
  body: {
    name: 'Integração Zapier',
    organization_id: orgId
  }
});

// Response contém full key (mostrar apenas uma vez)
// {
//   "id": "key_123",
//   "name": "Integração Zapier",
//   "key": "sk_org_abc123xyz789",  // NUNCA retornar novamente
//   "prefix": "sk_org_abc123..."
// }
```

**Revoke API Key:**
```typescript
const { error } = await supabase
  .from('api_keys')
  .update({ revoked_at: new Date().toISOString() })
  .eq('id', keyId)
  .eq('organization_id', orgId);
```

---

### Webhook Subscriptions

**List Webhook Subscriptions:**
```typescript
const { data: webhooks, error } = await supabase
  .from('webhook_subscriptions')
  .select('id, url, event_types, active, created_at')
  .eq('organization_id', orgId);
```

**Create Webhook Subscription:**
```typescript
const { data: webhook, error } = await supabase
  .from('webhook_subscriptions')
  .insert({
    organization_id: orgId,
    url: 'https://seu-sistema.com/webhooks/email-events',
    event_types: ['lead.created', 'email.sent', 'email.opened'],
    active: true
  })
  .select()
  .single();
```

**Update Webhook Subscription:**
```typescript
const { data: webhook, error } = await supabase
  .from('webhook_subscriptions')
  .update({
    event_types: ['lead.created', 'email.sent', 'email.opened', 'email.clicked'],
    active: true
  })
  .eq('id', webhookId)
  .eq('organization_id', orgId)
  .select()
  .single();
```

**Delete Webhook Subscription:**
```typescript
const { error } = await supabase
  .from('webhook_subscriptions')
  .delete()
  .eq('id', webhookId)
  .eq('organization_id', orgId);
```

---

## 6. Webhooks Enviados (Saída)

Quando eventos ocorrem, a plataforma pode notificar sistemas externos via webhooks configurados na organização.

### Configuração

Cada organização pode registrar múltiplos webhooks via `POST /api/webhooks` e configurar quais eventos disparam notificações.

**Tabela `webhook_subscriptions`:**
```sql
CREATE TABLE webhook_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  url TEXT NOT NULL,
  event_types TEXT[] NOT NULL,  -- ['lead.created', 'email.opened', ...]
  secret TEXT NOT NULL,  -- para assinar payloads
  active BOOLEAN DEFAULT true,
  retry_count INT DEFAULT 3,
  last_triggered_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(organization_id, url)
);
```

### Assinatura de Webhooks (Outbound)

Cada payload outbound é assinado via HMAC-SHA256:

```typescript
// No servidor ao disparar webhook:
import crypto from 'crypto';

const secret = webhook.secret;
const payload = JSON.stringify(body);
const timestamp = Math.floor(Date.now() / 1000);
const message = `${timestamp}.${payload}`;

const signature = crypto
  .createHmac('sha256', secret)
  .update(message)
  .digest('hex');

const headers = {
  'Content-Type': 'application/json',
  'X-Signature': `t=${timestamp},signature=${signature}`,
  'X-Webhook-ID': `whk_${crypto.randomBytes(12).toString('hex')}`
};

// POST para webhook.url com headers
```

**Validação no receptor (seu sistema):**

```typescript
const signature = req.headers['x-signature'];  // "t=timestamp,signature=hash"
const secret = process.env.WEBHOOK_SECRET;
const body = req.rawBody;

const [timeStr, sigStr] = signature.split(',');
const timestamp = parseInt(timeStr.split('=')[1]);
const sentSignature = sigStr.split('=')[1];

// Validar timestamp
if (Date.now() - timestamp * 1000 > 5 * 60 * 1000) {
  throw new Error('Webhook expirado');
}

// Validar HMAC
const message = `${timestamp}.${body}`;
const computed = crypto
  .createHmac('sha256', secret)
  .update(message)
  .digest('hex');

if (computed !== sentSignature) {
  throw new Error('Signature inválida');
}
```

### Eventos Disparados

#### lead.created

Disparado quando um novo lead é criado (via API ou formulário).

**Payload:**
```json
{
  "event_id": "evt_abc123",
  "event_type": "lead.created",
  "timestamp": "2026-03-05T10:30:00Z",
  "organization_id": "org_123",
  "data": {
    "id": "lead_123",
    "email": "contato@empresa.com",
    "name": "João Silva",
    "phone": "+5511999999999",
    "company": "Empresa X",
    "source": "landing_page",
    "tags": ["interessado"],
    "score": 0,
    "status": "new",
    "created_at": "2026-03-05T10:30:00Z"
  }
}
```

**Retry Logic:**
- 3 tentativas com backoff exponencial (3s, 9s, 27s)
- Timeout: 30s
- Aceita respostas 2xx como sucesso
- Retorna { "success": true } é recomendado

---

#### lead.updated

Disparado quando um lead é atualizado.

**Payload:**
```json
{
  "event_id": "evt_def456",
  "event_type": "lead.updated",
  "timestamp": "2026-03-05T10:35:00Z",
  "organization_id": "org_123",
  "data": {
    "id": "lead_123",
    "previous": {
      "score": 0,
      "status": "new",
      "tags": ["interessado"]
    },
    "current": {
      "score": 35,
      "status": "warm",
      "tags": ["interessado", "hot"]
    }
  }
}
```

---

#### lead.tag_added

Disparado quando uma tag é adicionada a um lead.

**Payload:**
```json
{
  "event_id": "evt_ghi789",
  "event_type": "lead.tag_added",
  "timestamp": "2026-03-05T10:40:00Z",
  "organization_id": "org_123",
  "data": {
    "lead_id": "lead_123",
    "email": "contato@empresa.com",
    "tag": "hot",
    "all_tags": ["interessado", "hot"]
  }
}
```

---

#### email.sent

Disparado quando um email é enviado.

**Payload:**
```json
{
  "event_id": "evt_jkl012",
  "event_type": "email.sent",
  "timestamp": "2026-03-05T10:45:00Z",
  "organization_id": "org_123",
  "data": {
    "email_send_id": "esend_123",
    "campaign_id": "camp_456",
    "lead": {
      "id": "lead_123",
      "email": "contato@empresa.com",
      "name": "João Silva"
    },
    "subject": "Bem-vindo!",
    "sent_at": "2026-03-05T10:45:00Z",
    "mailersend_msg_id": "msg_abc123"
  }
}
```

---

#### email.opened

Disparado quando um email é aberto (detectado via pixel).

**Payload:**
```json
{
  "event_id": "evt_mno345",
  "event_type": "email.opened",
  "timestamp": "2026-03-05T11:00:00Z",
  "organization_id": "org_123",
  "data": {
    "email_send_id": "esend_123",
    "campaign_id": "camp_456",
    "lead": {
      "id": "lead_123",
      "email": "contato@empresa.com"
    },
    "opened_at": "2026-03-05T11:00:00Z",
    "user_agent": "Mozilla/5.0...",
    "ip_address": "192.168.1.1"
  }
}
```

---

#### email.clicked

Disparado quando um link no email é clicado.

**Payload:**
```json
{
  "event_id": "evt_pqr678",
  "event_type": "email.clicked",
  "timestamp": "2026-03-05T11:05:00Z",
  "organization_id": "org_123",
  "data": {
    "email_send_id": "esend_123",
    "campaign_id": "camp_456",
    "lead": {
      "id": "lead_123",
      "email": "contato@empresa.com"
    },
    "link_url": "https://exemplo.com/promo",
    "link_text": "Ver Oferta Especial",
    "clicked_at": "2026-03-05T11:05:00Z"
  }
}
```

---

#### email.bounced

Disparado quando um email não é entregue.

**Payload:**
```json
{
  "event_id": "evt_stu901",
  "event_type": "email.bounced",
  "timestamp": "2026-03-05T10:50:00Z",
  "organization_id": "org_123",
  "data": {
    "email_send_id": "esend_123",
    "campaign_id": "camp_456",
    "lead": {
      "id": "lead_123",
      "email": "contato@empresa.com"
    },
    "bounce_type": "hard",
    "bounce_reason": "Mailbox does not exist",
    "bounced_at": "2026-03-05T10:50:00Z"
  }
}
```

---

#### email.complained

Disparado quando um email é marcado como spam.

**Payload:**
```json
{
  "event_id": "evt_vwx234",
  "event_type": "email.complained",
  "timestamp": "2026-03-05T10:55:00Z",
  "organization_id": "org_123",
  "data": {
    "email_send_id": "esend_123",
    "campaign_id": "camp_456",
    "lead": {
      "id": "lead_123",
      "email": "contato@empresa.com"
    },
    "complained_at": "2026-03-05T10:55:00Z"
  }
}
```

---

#### campaign.completed

Disparado quando uma campanha termina o envio.

**Payload:**
```json
{
  "event_id": "evt_yz1234",
  "event_type": "campaign.completed",
  "timestamp": "2026-03-05T12:00:00Z",
  "organization_id": "org_123",
  "data": {
    "campaign_id": "camp_456",
    "campaign_name": "Q1 2026 - Oferta Especial",
    "status": "completed",
    "sent_count": 5000,
    "delivered_count": 4950,
    "opened_count": 2000,
    "clicked_count": 500,
    "bounce_rate": 1.0,
    "open_rate": 40.4,
    "click_rate": 10.1,
    "completed_at": "2026-03-05T12:00:00Z"
  }
}
```

---

#### form.submitted

Disparado quando um formulário integrado é preenchido.

**Payload:**
```json
{
  "event_id": "evt_abc567",
  "event_type": "form.submitted",
  "timestamp": "2026-03-05T10:20:00Z",
  "organization_id": "org_123",
  "data": {
    "form_id": "form_789",
    "form_name": "Formulário de Interesse",
    "lead": {
      "id": "lead_123",
      "email": "contato@empresa.com",
      "name": "João Silva"
    },
    "fields": {
      "email": "contato@empresa.com",
      "name": "João Silva",
      "company": "Empresa X",
      "message": "Gostaria de saber mais"
    },
    "submitted_at": "2026-03-05T10:20:00Z"
  }
}
```

---

## Resumo Geral

| Categoria | Tipo | Auth | Descrição |
|-----------|------|------|-----------|
| **API Pública** | Webhook (entrada) | x-api-key | Receber leads, eventos |
| **Webhooks Recebidos** | Webhook (entrada) | Signature | MailerSend, WhatsApp, Meta |
| **Edge Functions** | Backend | Internal | Processa webhooks, envia campanhas |
| **Next.js Routes** | API (internal) | JWT | Campanhas, imports, templates |
| **Supabase Client** | SDK (frontend) | RLS | CRUD leads, campaigns, etc. |
| **Webhooks Saídos** | Webhook (saída) | Signature | Notifica sistemas externos |

---

## Notas Finais

1. **Rate Limiting:** Implementar circuit breaker para APIs externas (MailerSend, WhatsApp)
2. **Idempotência:** Usar `idempotency_key` nos payloads para evitar duplicatas
3. **Versionamento:** Adicionar versão de API nos headers (`X-API-Version: v1`)
4. **Logging:** Logar todas as requisições (entrada/saída) com correlation_id
5. **Monitoramento:** Alertar sobre falhas de webhook, timeouts, rate limits
6. **Cache:** Cache 5-30min em queries de analytics e relatórios
