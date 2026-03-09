# Integrações Externas

## Índice
1. [MailerSend](#mailersend)
2. [WhatsApp Cloud API](#whatsapp-cloud-api)
3. [Google Analytics API](#google-analytics-api)
4. [Meta Ads API](#meta-ads-api)
5. [Google Ads API](#google-ads-api)
6. [n8n](#n8n)
7. [GTM → Supabase (existente)](#gtm--supabase-existente)

---

## MailerSend

**Propósito:** Backend de envio de email (transacional + bulk).
**Docs:** https://developers.mailersend.com/

### Recursos Utilizados

| Recurso | Endpoint | Uso |
|---------|----------|-----|
| Send email | `POST /v1/email` | Envio individual (automação) |
| Bulk email | `POST /v1/bulk-email` | Envio de campanhas |
| Templates | `GET /v1/templates` | Listar templates do MailerSend |
| Recipients | `GET /v1/recipients` | Status dos destinatários |
| Domains | `GET /v1/domains` | Gerenciar domínios de envio |
| Webhooks | Configurar no painel | Eventos de email |
| Email verification | `POST /v1/email-verification` | Verificar emails antes de enviar |

### Webhooks do MailerSend → Supabase

Configurar webhooks no MailerSend apontando para Edge Function do Supabase.

| Evento | Ação na plataforma |
|--------|-------------------|
| `activity.sent` | Atualizar email_sends.status = 'sent' |
| `activity.delivered` | status = 'delivered' |
| `activity.opened` | status = 'opened', preencher opened_at |
| `activity.clicked` | status = 'clicked', preencher clicked_at, registrar lead_event |
| `activity.soft_bounced` | Retry automático |
| `activity.hard_bounced` | status = 'bounced', marcar lead como bounced |
| `activity.spam_complaint` | status = 'complained', marcar lead como complained, unsub |
| `activity.unsubscribed` | Marcar lead como unsubscribed |

### Multi-tenant no MailerSend

Cada organização tem seu próprio domínio de envio e API key.
Armazenar `mailersend_api_key` na tabela `organizations` (encrypted via Supabase Vault).
Na hora de enviar, usar a API key da org correspondente.

---

## WhatsApp Cloud API

**Propósito:** Envio de mensagens, fluxos conversacionais estilo ManyChat.
**Docs:** https://developers.facebook.com/docs/whatsapp/cloud-api

### Setup Necessário
1. Meta Business Account verificado
2. WhatsApp Business Account
3. Número de telefone dedicado por organização (ou compartilhado)
4. Templates de mensagem aprovados pela Meta

### Recursos Utilizados

| Recurso | Uso |
|---------|-----|
| Send message | Envio individual |
| Send template | Envio com template aprovado |
| Mark as read | Marcar como lida |
| Media upload | Enviar imagens/docs |
| Webhooks | Receber mensagens e status |

### Custo por Conversa (referência)

| Tipo | Custo aprox. (BR) |
|------|-------------------|
| Marketing | ~R$0,50/conversa |
| Utility | ~R$0,15/conversa |
| Service | Grátis (1000/mês) |

---

## Google Analytics API

**Propósito:** Puxar dados de analytics para o dashboard.
**API:** Google Analytics Data API (GA4)
**Docs:** https://developers.google.com/analytics/devguides/reporting/data/v1

### Dados a Puxar
- Sessions, users, pageviews por período
- Top páginas
- Fontes de tráfego
- Conversões/eventos
- Métricas de engajamento

### Autenticação
Service Account com permissão de leitura na propriedade GA4.
Uma service account por organização ou uma com acesso a múltiplas propriedades.

---

## Meta Ads API

**Propósito:** Dados de performance de anúncios Meta (Facebook + Instagram).
**Docs:** https://developers.facebook.com/docs/marketing-apis

### Dados a Puxar
- Spend, impressions, clicks, CTR, CPC, CPM
- Conversões (leads, purchases)
- Breakdown por campanha, adset, ad
- Dados de Lead Ads (formulários nativos)

### Autenticação
System User token com permissão `ads_read` na conta de anúncios.

---

## Google Ads API

**Propósito:** Dados de performance de anúncios Google.
**Docs:** https://developers.google.com/google-ads/api

### Dados a Puxar
- Spend, clicks, impressions, conversions
- Breakdown por campanha
- Search terms (keywords)

---

## n8n

**Propósito:** Engine de automação de marketing.
**Instância:** Self-hosted

### Integração com a Plataforma

A plataforma dispara workflows via webhook e armazena o `workflow_id` na tabela `automations`.

| Cenário | Mecanismo |
|---------|-----------|
| Plataforma → n8n | Webhook trigger no n8n |
| n8n → Plataforma | API/webhook de volta pro Supabase |
| Agendamento | Cron trigger no n8n |

### Workflows Padrão a Criar

1. **Novo lead → Welcome email** (via MailerSend)
2. **Lead scoring update** (recalcular ao receber evento)
3. **Tag adicionada → Disparar sequência de emails**
4. **Bounce/complaint → Atualizar status do lead**
5. **Sync dados de analytics** (cron diário)
6. **Sync dados de Meta Ads** (cron diário)

---

## Google Gemini API (Nano Banana + Veo 3)

**Propósito:** Geração automática de imagens e vídeos para anúncios.
**Docs:** https://ai.google.dev/gemini-api/docs/image-generation | https://ai.google.dev/gemini-api/docs/video
**Auth:** `GOOGLE_GEMINI_API_KEY` (obter em Google AI Studio)

### Nano Banana 2 (Imagens)

| Modelo | ID | Uso |
|--------|-----|-----|
| Nano Banana 2 | `gemini-3.1-flash-image` | Geração rápida, custo menor |
| Nano Banana Pro | `gemini-3-pro-image-preview` | Melhor qualidade |

- Resoluções: 512px até 4K
- Suporte a texto em imagens (múltiplos idiomas)
- Consistência de personagens (até 5 pessoas)
- Custo: ~$0.08/imagem (1K)

### Veo 3.1 (Vídeos)

| Modelo | ID | Uso |
|--------|-----|-----|
| Veo 3.1 (GA) | `veo-3.1-generate-001` | Produção |
| Veo 3.1 (Preview) | `veo-3.1-generate-preview` | Testes |

- Vídeos de até 8s em 720p/1080p/4K
- Suporte a imagem de referência (asset)
- Áudio nativo gerado automaticamente
- Geração assíncrona (polling ~2-5 min)
- Custo: ~$0.75/segundo (~$6 por vídeo de 8s)
- Formato: 9:16 (vertical) para anúncios

### Alternativa: fal.ai

| Modelo | ID fal.ai | Custo |
|--------|-----------|-------|
| Nano Banana 2 | `fal-ai/nano-banana-2` | $0.08/img |
| Nano Banana Pro | `fal-ai/nano-banana-pro` | Maior |

Auth: `FAL_KEY` env var. API mais simples, retorna URL direta da imagem.

### Integração na Plataforma

Pipeline automatizado no módulo de Vídeos:
1. Cena aprovada → dispara geração de imagem (Nano Banana)
2. Imagem pronta → dispara geração de vídeo (Veo 3.1) com imagem como referência
3. Assets salvos no Supabase Storage, URLs em `image_urls` e `video_urls` da cena

Documentação completa: `.skills/plataforma-email/references/video-module.md`

---

## GTM → Supabase (Existente)

Já existe um fluxo configurado enviando eventos do GTM para o Supabase.
Empresas com dados: **Templum**, **Evolutto**, **Orbit**.

### Ação necessária
1. Mapear schema dos dados existentes
2. Criar migration para normalizar na tabela `lead_events`
3. Criar identificação de leads anônimos → conhecidos (quando preencherem form)
