# Integrações de Dados — Documentação

> Documentação completa das integrações de dados: Meta Ads, Pipedrive CRM e Tracking GTM.

---

## 1. Meta Ads

### Conexão
- **API:** Meta Graph API v22.0
- **Autenticação:** Long-lived user token (60 dias)
- **App:** App Orbit (ID: 749222631460522)
- **Conta principal:** `act_866448806166587` (Orbit Gestão)
- **Configuração:** Tabela `meta_ad_accounts` (org_id, ad_account_id, access_token)

### Tabelas Supabase

| Tabela | Dados | Unique Key |
|--------|-------|-----------|
| `meta_ad_accounts` | Contas de anúncio conectadas | org_id, ad_account_id |
| `meta_campaign_insights` | Métricas diárias por campanha | org_id, campaign_id, date |
| `meta_adset_insights` | Métricas diárias por conjunto/público | org_id, adset_id, date |
| `meta_ad_insights` | Métricas diárias por anúncio/criativo | org_id, ad_id, date |
| `meta_adsets` | Metadata dos conjuntos (nome, targeting) | org_id, adset_id |
| `meta_ads` | Metadata dos anúncios (nome, thumbnail, headline) | org_id, ad_id |
| `meta_sync_logs` | Log de sincronizações | - |

### Sync

| Endpoint | Método | Função |
|----------|--------|--------|
| `POST /api/meta-ads/sync` | Manual (dashboard) | Sync org específica, período e níveis |
| `GET /api/meta-ads/sync` | Cron (Vercel) | Sync todas as contas ativas |

**Parâmetros POST:**
```json
{
  "orgId": "uuid",
  "adAccountId": "act_xxx (opcional)",
  "daysBack": 30,
  "syncLevels": ["campaigns", "adsets", "ads", "structure"]
}
```

**Cron:** Vercel cron job, `0 6 * * *` (6h UTC / 3h Brasília), diário.

**Auth:** `Authorization: Bearer <CRON_SECRET>` ou `x-cron-secret` header.

### Extração de leads
Os leads vêm do campo `actions` da API Meta. O extrator (`extractLeads`) procura:
- `lead`
- `onsite_web_lead`
- `onsite_conversion.lead_grouped`
- `offsite_conversion.fb_pixel_lead`

### Thumbnails
Criativos de vídeo: thumbnail buscada via `GET /{creative_id}?fields=thumbnail_url` da Graph API.

---

## 2. Pipedrive CRM

### Conexão
- **API:** Pipedrive REST API v1
- **Autenticação:** API token pessoal
- **Empresa:** templumconsultoria.pipedrive.com
- **Pipeline Orbit:** ID 35 (9 etapas)
- **Filtro:** ID 69711 (funil Orbit)
- **Configuração:** Tabela `pipedrive_connections` (org_id, api_token, filter_id, pipeline_id)

### Tabelas Supabase

| Tabela | Dados | Unique Key |
|--------|-------|-----------|
| `pipedrive_connections` | Conexões por org | org_id |
| `pipedrive_deals` | Deals com UTMs e dados do contato | org_id, deal_id |
| `pipedrive_stages` | Etapas do funil | org_id, stage_id |
| `pipedrive_sync_logs` | Log de sincronizações | - |

### Campos UTM nos deals
Mapeados via hash fields do Pipedrive:

| Campo | Hash key |
|-------|----------|
| utm_source | `92f5fbfb2cfdcbe4d46a72b5acf06ca15f29ac14` ou `06754c74...` |
| utm_medium | `15bdeb9558dc89ed77d92cbfa0d04a4ee26d4d1f` ou `a335961b...` |
| utm_campaign | `6b578f95362c28ee95473982525671ff43435b38` ou `6bc82d18...` |
| utm_content | `921482eae8dae5a8b2c830100038a17801df8b45` ou `ba178b26...` |
| utm_term | `5c22fd65ac5f7dbfbef6c07347fde9154bcdc385` ou `3ba67d79...` |
| fbclid | `143f49947826ce1d1b3e995baa842e96de518e74` |

### Pipeline Orbit (9 etapas)

| Ordem | Etapa |
|-------|-------|
| 1 | Lead Novo |
| 2 | Tentativa de contato |
| 3 | Qualificado (SQL) |
| 4 | Reunião Agendada |
| 5 | Não Entrou na Reunião |
| 6 | Participou Reunião Grupo |
| 7 | Testando/Pré Análise |
| 8 | Proposta |
| 9 | Negociações Iniciadas |

### Sync

| Endpoint | Método | Função |
|----------|--------|--------|
| `POST /api/pipedrive/sync` | Manual | Sync deals + stages |
| `GET /api/pipedrive/sync` | Cron | Sync todas as conexões ativas |

**Cron:** `0 7 * * *` (7h UTC / 4h Brasília), diário.

### Detalhe do deal
`GET /api/pipedrive/deal?dealId=X&orgId=Y` — busca deal + atividades + notas + participantes + arquivos + campos customizados formatados.

---

## 3. Tracking GTM

### Estrutura
Tabelas legadas separadas por organização (sem org_id, sem RLS):

| Org | Tabela events | Tabela conversions | Tabela lead_journey |
|-----|--------------|-------------------|-------------------|
| Templum | `events` | `conversions` | `lead_journey` |
| Orbit | `orbit_gestao_events` | `orbit_gestao_conversions` | `orbit_gestao_lead_journey` |
| Evolutto | `evolutto_events` | `evolutto_conversions` | `evolutto_lead_journey` |

### Mapeamento org → tabelas
`src/lib/tracking/organizations.ts` — `getTrackingOrgByOrgId(orgId)` mapeia UUID da org para as tabelas corretas.

### Eventos disponíveis

| Evento | Descrição | Campos relevantes |
|--------|-----------|-------------------|
| `page_view` | Visualização de página | page_path, utm_*, referrer, landing_page |
| `generate_lead` | Lead capturado | email, phone, utm_*, page_path, time_on_page |
| `scroll_depth` | Scroll na página | scroll_depth (25, 50, 75, 90) |
| `time_on_page_heartbeat` | Tempo na página | time_on_page (segundos) |

### Campos dos eventos

| Campo | Tipo | Descrição |
|-------|------|-----------|
| session_id | text | Identifica a sessão |
| client_id | text | Identifica o visitante |
| event_name | text | Tipo do evento |
| page_path | text | Caminho da página |
| utm_source, utm_medium, utm_campaign, utm_content, utm_term | text | UTMs |
| ft_utm_* | text | First-touch UTMs |
| fbclid, gclid | text | Click IDs |
| email, phone | text | Dados do lead (só no generate_lead) |
| geo_state, geo_city | text | Geolocalização |
| scroll_depth | text | 25, 50, 75, 90 |
| time_on_page | integer | Segundos |
| lead_score | integer | Score do lead |
| lead_temperature | text | frio, morno, quente |

### Jornada do lead
`GET /api/tracking/lead-journey?email=X&orgId=Y` — busca session_id do lead via generate_lead, depois puxa todos os eventos da sessão.

---

## 4. Cruzamento de Dados

### Ads → CRM (via UTMs)

| Campo UTM | No Meta Ads | No Pipedrive | Cruzamento |
|-----------|-------------|-------------|-----------|
| utm_term | Nome do criativo/anúncio | `pipedrive_deals.utm_term` | Qual criativo gera deals que vendem |
| utm_content | Nome do público/adset | `pipedrive_deals.utm_content` | Qual público avança no funil |
| utm_source | facebook, google, ig | `pipedrive_deals.utm_source` | Qual canal traz mais vendas |
| utm_campaign | Nome da campanha | `pipedrive_deals.utm_campaign` | Qual campanha converte melhor |

### GTM → CRM (via email/phone)
O tracking GTM captura email/phone no evento `generate_lead`. O Pipedrive tem `person_email` e `person_phone`. Match possível via session_id → email → deal.

### Leads Platform → Pipedrive
644 leads importados do Pipedrive para a tabela `leads` com campos enriquecidos:
- `custom_fields.criativo` = utm_term do deal
- `custom_fields.publico` = utm_content do deal
- `custom_fields.deal_status` = status no CRM
- `custom_fields.deal_stage` = etapa no funil

---

## 5. Cron Jobs (vercel.json)

```json
{
  "crons": [
    { "path": "/api/meta-ads/sync", "schedule": "0 6 * * *" },
    { "path": "/api/pipedrive/sync", "schedule": "0 7 * * *" }
  ]
}
```

Autenticação via `CRON_SECRET` env var (configurada na Vercel).

---

## 6. Dashboards

| Rota | Dados | Função |
|------|-------|--------|
| `/ads/dashboard` | Meta Ads | KPIs, gráfico diário, performance por campanha |
| `/pipedrive` | Pipedrive | KPIs, funil visual, origens (UTM), tabela de deals |
| `/pipedrive/[id]` | Pipedrive + GTM | Detalhe do deal + jornada GTM |
| `/growth` | Meta + Pipedrive + GTM | Funil Growth, criativos, públicos, CRM, cruzamentos |
| `/growth/chat` | Todos (via IA) | Chat com agente de Growth |
| `/tracking` | GTM | Sessões, fontes UTM, páginas, geografia |
| `/leads` | Leads + Pipedrive | Lista de leads com criativo, fonte, etapa CRM |
| `/leads/[id]` | Leads + GTM | Detalhe do lead + jornada GTM |
