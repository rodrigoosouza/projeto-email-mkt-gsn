# Modelagem de Dados — Supabase (PostgreSQL)

## Índice
1. [Multi-tenancy](#multi-tenancy)
2. [Funções e Triggers](#funções-e-triggers)
3. [Migration 001: Tabelas Core](#migration-001-tabelas-core)
4. [Migration 002: Tabelas de Email](#migration-002-tabelas-de-email)
5. [Migration 003: Eventos e Scoring](#migration-003-eventos-e-scoring)
6. [Migration 004: Automação](#migration-004-automação)
7. [Migration 005: WhatsApp](#migration-005-whatsapp)
8. [Migration 006: Webhooks e API](#migration-006-webhooks-e-api)
9. [Migration 007: A/B Testing](#migration-007-ab-testing)
10. [Views de Compatibilidade](#views-de-compatibilidade)
11. [Estratégia de Índices](#estratégia-de-índices)
12. [Row Level Security (RLS)](#row-level-security)

---

## Multi-tenancy

**Estratégia:** Schema compartilhado com `organization_id` em todas as tabelas de negócio.

Cada empresa (Templum, Evolutto, Orbit, etc.) é uma `organization` separada.
O Row Level Security (RLS) do Supabase garante isolamento automático de dados.

Todas as queries da aplicação filtram automaticamente por:
```sql
WHERE organization_id = auth.user_metadata.organization_id
```

Benefícios:
- Uma única aplicação serve múltiplas organizações
- Backup/restore simplificado (um banco compartilhado)
- Escalabilidade: índices organizados por `(organization_id, ...)`
- Segurança: RLS impede vazamento de dados entre orgs

---

## Funções e Triggers

### Função: `update_updated_at()`

Atualiza automaticamente a coluna `updated_at` quando um registro é modificado.

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW() AT TIME ZONE 'UTC';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_updated_at() IS 'Função para atualizar automaticamente o timestamp de atualização';
```

### Função: `calculate_lead_temperature()`

Calcula o "temperature" (temperatura) do lead baseado no score.

```sql
CREATE OR REPLACE FUNCTION calculate_lead_temperature(score INTEGER)
RETURNS TEXT AS $$
BEGIN
  IF score >= 80 THEN
    RETURN 'muito_quente';
  ELSIF score >= 60 THEN
    RETURN 'quente';
  ELSIF score >= 30 THEN
    RETURN 'morno';
  ELSE
    RETURN 'frio';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_lead_temperature(INTEGER) IS 'Calcula a temperatura do lead baseado no score (frio/morno/quente/muito_quente)';
```

### Função: `get_organization_id_from_auth()`

Helper para RLS obter o organization_id do usuário autenticado.

```sql
CREATE OR REPLACE FUNCTION get_organization_id_from_auth()
RETURNS UUID AS $$
BEGIN
  RETURN (auth.jwt() ->> 'organization_id')::UUID;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_organization_id_from_auth() IS 'Obtém o organization_id do JWT do usuário autenticado';
```

---

## Migration 001: Tabelas Core

### Tabela: `organizations`

Empresas cadastradas na plataforma.

```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL COMMENT 'Nome da organização/empresa',
  slug TEXT NOT NULL UNIQUE COMMENT 'Slug único (ex: "templum", "evolutto")',
  domain TEXT COMMENT 'Domínio principal da empresa',
  sending_domain TEXT COMMENT 'Domínio configurado para envio de emails (SPF/DKIM)',
  mailersend_api_key TEXT COMMENT 'API key do MailerSend (criptografada no armazenamento)',
  logo_url TEXT COMMENT 'URL do logo da organização',
  settings JSONB DEFAULT '{}' COMMENT 'Configurações adicionais em JSON (timezones, preferências, etc)',
  created_at TIMESTAMPTZ DEFAULT NOW() AT TIME ZONE 'UTC' NOT NULL COMMENT 'Data de criação',
  updated_at TIMESTAMPTZ DEFAULT NOW() AT TIME ZONE 'UTC' NOT NULL COMMENT 'Data de última atualização'
);

COMMENT ON TABLE organizations IS 'Organizações/empresas da plataforma. Multi-tenancy de nível superior.';

CREATE TRIGGER organizations_updated_at
BEFORE UPDATE ON organizations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE INDEX organizations_slug_idx ON organizations (slug);
CREATE INDEX organizations_domain_idx ON organizations (domain);
```

### Tabela: `users`

Usuários operadores da plataforma (não são leads).

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY COMMENT 'ID do usuário (auth.users)',
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE COMMENT 'Organização a que pertence',
  email TEXT NOT NULL COMMENT 'Email do operador',
  name TEXT COMMENT 'Nome do operador',
  role TEXT DEFAULT 'viewer' CHECK (role IN ('admin', 'editor', 'viewer')) COMMENT 'Nível de acesso (admin/editor/viewer)',
  created_at TIMESTAMPTZ DEFAULT NOW() AT TIME ZONE 'UTC' NOT NULL COMMENT 'Data de criação',
  updated_at TIMESTAMPTZ DEFAULT NOW() AT TIME ZONE 'UTC' NOT NULL COMMENT 'Data de última atualização'
);

COMMENT ON TABLE users IS 'Usuários operadores (não leads). Cada usuário está vinculado a uma organização.';

CREATE UNIQUE INDEX users_organization_email_idx ON users (organization_id, email);
CREATE INDEX users_role_idx ON users (role);

CREATE TRIGGER users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();
```

### Tabela: `leads`

Contatos/leads de cada organização.

```sql
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE COMMENT 'Organização',
  email TEXT NOT NULL COMMENT 'Email do lead (deduplicado por org)',
  name TEXT COMMENT 'Nome do lead',
  phone TEXT COMMENT 'Número de telefone',
  company TEXT COMMENT 'Empresa do lead',
  job_title TEXT COMMENT 'Cargo/posição do lead',
  source TEXT COMMENT 'Origem do lead (form, import, api, webhook, whatsapp)',
  score INTEGER DEFAULT 0 COMMENT 'Pontuação do lead (lead scoring)',
  temperature TEXT DEFAULT 'frio' CHECK (temperature IN ('frio', 'morno', 'quente', 'muito_quente')) COMMENT 'Temperatura do lead derivada do score',
  stage TEXT COMMENT 'Estágio no funil (awareness, consideration, decision, etc)',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed', 'bounced', 'complained', 'archived')) COMMENT 'Status do lead',
  tags TEXT[] DEFAULT '{}' COMMENT 'Tags/etiquetas do lead (array de texto)',
  custom_fields JSONB DEFAULT '{}' COMMENT 'Campos personalizados em JSON (flexível por org)',
  utm_source TEXT COMMENT 'Fonte UTM (last-touch)',
  utm_medium TEXT COMMENT 'Meio UTM (last-touch)',
  utm_campaign TEXT COMMENT 'Campanha UTM (last-touch)',
  utm_content TEXT COMMENT 'Conteúdo UTM (last-touch)',
  utm_term TEXT COMMENT 'Termo UTM (last-touch)',
  ft_utm_source TEXT COMMENT 'Fonte UTM first-touch',
  ft_utm_medium TEXT COMMENT 'Meio UTM first-touch',
  ft_utm_campaign TEXT COMMENT 'Campanha UTM first-touch',
  first_touch_attribution_source TEXT COMMENT 'Atribuição first-touch (canal de origem)',
  last_touch_attribution_source TEXT COMMENT 'Atribuição last-touch (último canal antes de conversão)',
  first_seen_at TIMESTAMPTZ COMMENT 'Primeira vez que o lead foi visto',
  last_activity_at TIMESTAMPTZ COMMENT 'Última atividade registrada',
  created_at TIMESTAMPTZ DEFAULT NOW() AT TIME ZONE 'UTC' NOT NULL COMMENT 'Data de criação',
  updated_at TIMESTAMPTZ DEFAULT NOW() AT TIME ZONE 'UTC' NOT NULL COMMENT 'Data de última atualização'
);

COMMENT ON TABLE leads IS 'Contatos/leads. Tabela central multi-tenant. Deduplicação por email dentro de cada organização.';

CREATE UNIQUE INDEX leads_organization_email_idx ON leads (organization_id, email);
CREATE INDEX leads_organization_score_idx ON leads (organization_id, score DESC);
CREATE INDEX leads_organization_temperature_idx ON leads (organization_id, temperature);
CREATE INDEX leads_organization_status_idx ON leads (organization_id, status);
CREATE INDEX leads_tags_idx ON leads USING GIN (tags);
CREATE INDEX leads_custom_fields_idx ON leads USING GIN (custom_fields);
CREATE INDEX leads_created_at_idx ON leads (created_at DESC);
CREATE INDEX leads_last_activity_idx ON leads (last_activity_at DESC);

CREATE TRIGGER leads_updated_at
BEFORE UPDATE ON leads
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();
```

### Tabela: `segments`

Segmentos de leads (listas inteligentes, dinâmicas ou estáticas).

```sql
CREATE TABLE segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE COMMENT 'Organização',
  name TEXT NOT NULL COMMENT 'Nome do segmento',
  description TEXT COMMENT 'Descrição do segmento',
  type TEXT DEFAULT 'static' CHECK (type IN ('static', 'dynamic')) COMMENT 'Tipo: static (manual) ou dynamic (regras)',
  filters JSONB DEFAULT '{}' COMMENT 'Filtros/regras para segmentos dinâmicos (e.g., {and: [{field: "score", op: ">", value: 50}]})',
  lead_count INTEGER DEFAULT 0 COMMENT 'Cache da contagem de leads no segmento',
  last_synced_at TIMESTAMPTZ COMMENT 'Última sincronização de contagem (para dinâmicos)',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL COMMENT 'Usuário que criou',
  created_at TIMESTAMPTZ DEFAULT NOW() AT TIME ZONE 'UTC' NOT NULL COMMENT 'Data de criação',
  updated_at TIMESTAMPTZ DEFAULT NOW() AT TIME ZONE 'UTC' NOT NULL COMMENT 'Data de última atualização'
);

COMMENT ON TABLE segments IS 'Segmentos de leads para campanhas e automações. Pode ser estático (manual) ou dinâmico (baseado em filtros).';

CREATE INDEX segments_organization_type_idx ON segments (organization_id, type);
CREATE INDEX segments_filters_idx ON segments USING GIN (filters);

CREATE TRIGGER segments_updated_at
BEFORE UPDATE ON segments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();
```

### Tabela: `segment_leads`

Relação N:N para segmentos estáticos. Não usado para dinâmicos (use VIEW com filtros).

```sql
CREATE TABLE segment_leads (
  segment_id UUID NOT NULL REFERENCES segments(id) ON DELETE CASCADE COMMENT 'Segmento',
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE COMMENT 'Lead',
  added_at TIMESTAMPTZ DEFAULT NOW() AT TIME ZONE 'UTC' NOT NULL COMMENT 'Data em que o lead foi adicionado ao segmento',
  PRIMARY KEY (segment_id, lead_id)
);

COMMENT ON TABLE segment_leads IS 'Relação N:N entre segmentos estáticos e leads. Somente para type="static".';

CREATE INDEX segment_leads_lead_id_idx ON segment_leads (lead_id);
```

---

## Migration 002: Tabelas de Email

### Tabela: `email_templates`

Templates de email criados no editor visual (Unlayer, GrapeJS, etc).

```sql
CREATE TABLE email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE COMMENT 'Organização',
  name TEXT NOT NULL COMMENT 'Nome do template',
  subject TEXT NOT NULL COMMENT 'Assunto padrão do email',
  html_content TEXT COMMENT 'HTML renderizado do template',
  editor_json JSONB COMMENT 'JSON bruto do editor (para edição futura)',
  thumbnail_url TEXT COMMENT 'URL da miniatura/preview do template',
  category TEXT COMMENT 'Categoria (newsletter, promocional, transacional, etc)',
  preview_text TEXT COMMENT 'Texto de preview (mostrado em clientes de email)',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL COMMENT 'Usuário que criou',
  created_at TIMESTAMPTZ DEFAULT NOW() AT TIME ZONE 'UTC' NOT NULL COMMENT 'Data de criação',
  updated_at TIMESTAMPTZ DEFAULT NOW() AT TIME ZONE 'UTC' NOT NULL COMMENT 'Data de última atualização'
);

COMMENT ON TABLE email_templates IS 'Templates de email reutilizáveis. Armazenam HTML final e JSON do editor.';

CREATE INDEX email_templates_organization_idx ON email_templates (organization_id);
CREATE INDEX email_templates_category_idx ON email_templates (organization_id, category);

CREATE TRIGGER email_templates_updated_at
BEFORE UPDATE ON email_templates
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();
```

### Tabela: `email_campaigns`

Campanhas de envio em massa.

```sql
CREATE TABLE email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE COMMENT 'Organização',
  name TEXT NOT NULL COMMENT 'Nome da campanha',
  template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL COMMENT 'Template usado (se baseada em template)',
  subject TEXT NOT NULL COMMENT 'Assunto (pode sobrescrever template)',
  html_content TEXT COMMENT 'Conteúdo HTML final (cópia em tempo de envio)',
  from_name TEXT NOT NULL COMMENT 'Nome do remetente',
  from_email TEXT NOT NULL COMMENT 'Email do remetente',
  reply_to TEXT COMMENT 'Email para reply-to (se diferente de from_email)',
  segment_ids UUID[] DEFAULT '{}' COMMENT 'Array de segment_ids alvo',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'cancelled')) COMMENT 'Status da campanha',
  scheduled_at TIMESTAMPTZ COMMENT 'Data/hora agendada para envio',
  sent_at TIMESTAMPTZ COMMENT 'Data/hora real do envio',
  stats JSONB DEFAULT '{"sent": 0, "delivered": 0, "opened": 0, "clicked": 0, "bounced": 0, "complained": 0}' COMMENT 'Estatísticas agregadas (sent, delivered, opened, clicked, bounced, complained)',
  mailersend_bulk_id TEXT COMMENT 'ID do bulk send no MailerSend',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL COMMENT 'Usuário que criou',
  created_at TIMESTAMPTZ DEFAULT NOW() AT TIME ZONE 'UTC' NOT NULL COMMENT 'Data de criação',
  updated_at TIMESTAMPTZ DEFAULT NOW() AT TIME ZONE 'UTC' NOT NULL COMMENT 'Data de última atualização'
);

COMMENT ON TABLE email_campaigns IS 'Campanhas de email em massa. Podem ser agendadas ou enviadas imediatamente.';

CREATE INDEX email_campaigns_organization_status_idx ON email_campaigns (organization_id, status);
CREATE INDEX email_campaigns_scheduled_at_idx ON email_campaigns (scheduled_at);
CREATE INDEX email_campaigns_created_at_idx ON email_campaigns (created_at DESC);

CREATE TRIGGER email_campaigns_updated_at
BEFORE UPDATE ON email_campaigns
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();
```

### Tabela: `email_sends`

Registro individual de cada envio de email.

```sql
CREATE TABLE email_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE COMMENT 'Organização',
  campaign_id UUID REFERENCES email_campaigns(id) ON DELETE SET NULL COMMENT 'Campanha (null se automação)',
  automation_id UUID COMMENT 'Automação (null se campanha) - referência soft para não criar ciclo',
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE COMMENT 'Lead destinatário',
  mailersend_message_id TEXT UNIQUE COMMENT 'ID da mensagem no MailerSend',
  mailersend_bulk_id TEXT COMMENT 'ID do bulk associado (para rastreamento)',
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained', 'failed')) COMMENT 'Status do envio',
  sent_at TIMESTAMPTZ COMMENT 'Data/hora do envio',
  delivered_at TIMESTAMPTZ COMMENT 'Data/hora da entrega',
  opened_at TIMESTAMPTZ COMMENT 'Data/hora da primeira abertura',
  clicked_at TIMESTAMPTZ COMMENT 'Data/hora do primeiro clique',
  bounced_at TIMESTAMPTZ COMMENT 'Data/hora do bounce (se houver)',
  bounce_type TEXT COMMENT 'Tipo de bounce (hard, soft)',
  complained_at TIMESTAMPTZ COMMENT 'Data/hora da reclamação/spam (se houver)',
  failed_reason TEXT COMMENT 'Motivo da falha (se status=failed)',
  created_at TIMESTAMPTZ DEFAULT NOW() AT TIME ZONE 'UTC' NOT NULL COMMENT 'Data de criação',
  updated_at TIMESTAMPTZ DEFAULT NOW() AT TIME ZONE 'UTC' NOT NULL COMMENT 'Data de última atualização'
);

COMMENT ON TABLE email_sends IS 'Registro individual de envios. Rastreado para métricas de campaign e automações.';

CREATE INDEX email_sends_organization_campaign_idx ON email_sends (organization_id, campaign_id);
CREATE INDEX email_sends_organization_automation_idx ON email_sends (organization_id, automation_id);
CREATE INDEX email_sends_lead_id_idx ON email_sends (lead_id);
CREATE INDEX email_sends_status_idx ON email_sends (organization_id, status);
CREATE INDEX email_sends_mailersend_message_id_idx ON email_sends (mailersend_message_id);
CREATE INDEX email_sends_created_at_idx ON email_sends (created_at DESC);
CREATE INDEX email_sends_opened_at_idx ON email_sends (opened_at DESC);

CREATE TRIGGER email_sends_updated_at
BEFORE UPDATE ON email_sends
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();
```

---

## Migration 003: Eventos e Scoring

### Tabela: `lead_events`

Todos os eventos de um lead (GTM, email, plataforma, webhooks).

```sql
CREATE TABLE lead_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE COMMENT 'Organização',
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL COMMENT 'Lead (null se anônimo)',
  anonymous_id TEXT COMMENT 'ID anônimo (rastreamento pré-identificação)',
  event_type TEXT NOT NULL COMMENT 'Tipo: page_view, form_submit, email_open, email_click, whatsapp_message, conversão, etc',
  event_name TEXT COMMENT 'Nome específico do evento (ex: "form_contato_enviado")',
  properties JSONB DEFAULT '{}' COMMENT 'Dados do evento em JSON (flexível)',
  source TEXT COMMENT 'Origem: gtm, analytics, platform, mailersend, whatsapp, n8n, webhook',
  page_url TEXT COMMENT 'URL da página (se aplicável)',
  page_path TEXT COMMENT 'Path da URL',
  page_hostname TEXT COMMENT 'Hostname (ex: templum.com.br)',
  referrer TEXT COMMENT 'Referrer HTTP',
  utm_source TEXT COMMENT 'UTM source (last-touch)',
  utm_medium TEXT COMMENT 'UTM medium (last-touch)',
  utm_campaign TEXT COMMENT 'UTM campaign (last-touch)',
  utm_content TEXT COMMENT 'UTM content (last-touch)',
  utm_term TEXT COMMENT 'UTM term (last-touch)',
  ip_address INET COMMENT 'IP do cliente',
  user_agent TEXT COMMENT 'User-Agent do navegador',
  created_at TIMESTAMPTZ DEFAULT NOW() AT TIME ZONE 'UTC' NOT NULL COMMENT 'Timestamp do evento'
);

COMMENT ON TABLE lead_events IS 'Todos os eventos de leads. Pode crescer rapidamente. Considere particionamento por mês em produção.';

-- Índices críticos para queries de análise
CREATE INDEX lead_events_organization_lead_created_idx ON lead_events (organization_id, lead_id, created_at DESC);
CREATE INDEX lead_events_organization_event_type_idx ON lead_events (organization_id, event_type, created_at DESC);
CREATE INDEX lead_events_anonymous_id_idx ON lead_events (organization_id, anonymous_id);
CREATE INDEX lead_events_page_hostname_idx ON lead_events (organization_id, page_hostname);
CREATE INDEX lead_events_utm_source_idx ON lead_events (organization_id, utm_source);
CREATE INDEX lead_events_created_at_idx ON lead_events (created_at DESC);

-- Particionamento por data (comentado - ativar se tabela crescer muito)
-- PARTITION BY RANGE (created_at) (
--   PARTITION lead_events_202603 VALUES FROM ('2026-03-01') TO ('2026-04-01'),
--   PARTITION lead_events_202604 VALUES FROM ('2026-04-01') TO ('2026-05-01')
-- );
```

### Tabela: `scoring_rules`

Regras de pontuação para lead scoring.

```sql
CREATE TABLE scoring_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE COMMENT 'Organização',
  name TEXT NOT NULL COMMENT 'Nome descritivo da regra',
  description TEXT COMMENT 'Descrição da regra',
  event_type TEXT NOT NULL COMMENT 'Tipo de evento que dispara (page_view, email_click, form_submit, etc)',
  conditions JSONB DEFAULT '{}' COMMENT 'Condições adicionais em JSON (e.g., {field: "page_url", contains: "pricing"})',
  points INTEGER NOT NULL COMMENT 'Pontos a adicionar/subtrair (positivo ou negativo)',
  active BOOLEAN DEFAULT TRUE COMMENT 'Regra está ativa?',
  created_at TIMESTAMPTZ DEFAULT NOW() AT TIME ZONE 'UTC' NOT NULL COMMENT 'Data de criação',
  updated_at TIMESTAMPTZ DEFAULT NOW() AT TIME ZONE 'UTC' NOT NULL COMMENT 'Data de última atualização'
);

COMMENT ON TABLE scoring_rules IS 'Regras que definem quantos pontos um lead ganha por evento. Avaliadas em tempo real durante processamento de eventos.';

CREATE INDEX scoring_rules_organization_active_idx ON scoring_rules (organization_id, active);
CREATE INDEX scoring_rules_event_type_idx ON scoring_rules (organization_id, event_type);

CREATE TRIGGER scoring_rules_updated_at
BEFORE UPDATE ON scoring_rules
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();
```

---

## Migration 004: Automação

### Tabela: `automations`

Fluxos de automação (workflows) alimentados por n8n.

```sql
CREATE TABLE automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE COMMENT 'Organização',
  name TEXT NOT NULL COMMENT 'Nome da automação',
  description TEXT COMMENT 'Descrição do fluxo',
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('event', 'tag', 'schedule', 'webhook', 'email_action', 'whatsapp_action')) COMMENT 'Tipo de gatilho',
  trigger_config JSONB DEFAULT '{}' COMMENT 'Configuração do gatilho em JSON',
  n8n_workflow_id TEXT COMMENT 'ID do workflow no n8n (para execução)',
  status TEXT DEFAULT 'draft' CHECK (status IN ('active', 'paused', 'draft')) COMMENT 'Status da automação',
  stats JSONB DEFAULT '{"executions": 0, "successes": 0, "failures": 0}' COMMENT 'Estatísticas (execuções, sucessos, falhas)',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL COMMENT 'Usuário que criou',
  created_at TIMESTAMPTZ DEFAULT NOW() AT TIME ZONE 'UTC' NOT NULL COMMENT 'Data de criação',
  updated_at TIMESTAMPTZ DEFAULT NOW() AT TIME ZONE 'UTC' NOT NULL COMMENT 'Data de última atualização'
);

COMMENT ON TABLE automations IS 'Automações/workflows. Cada automação dispara um ou mais passos através do n8n.';

CREATE INDEX automations_organization_status_idx ON automations (organization_id, status);
CREATE INDEX automations_trigger_type_idx ON automations (organization_id, trigger_type);

CREATE TRIGGER automations_updated_at
BEFORE UPDATE ON automations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();
```

### Tabela: `automation_steps`

Passos individuais dentro de uma automação.

```sql
CREATE TABLE automation_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID NOT NULL REFERENCES automations(id) ON DELETE CASCADE COMMENT 'Automação pai',
  step_order INTEGER NOT NULL COMMENT 'Ordem de execução do passo',
  name TEXT NOT NULL COMMENT 'Nome do passo',
  action_type TEXT NOT NULL COMMENT 'Tipo de ação: send_email, add_tag, update_score, whatsapp_message, webhook, etc',
  action_config JSONB NOT NULL COMMENT 'Configuração da ação em JSON',
  conditions JSONB DEFAULT '{}' COMMENT 'Condições para executar este passo',
  delay_seconds INTEGER DEFAULT 0 COMMENT 'Atraso antes de executar (em segundos)',
  created_at TIMESTAMPTZ DEFAULT NOW() AT TIME ZONE 'UTC' NOT NULL COMMENT 'Data de criação'
);

COMMENT ON TABLE automation_steps IS 'Passos sequenciais dentro de uma automação. Executados em ordem com possíveis atrasos.';

CREATE INDEX automation_steps_automation_idx ON automation_steps (automation_id, step_order);
```

### Tabela: `automation_logs`

Log de execução das automações.

```sql
CREATE TABLE automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE COMMENT 'Organização',
  automation_id UUID NOT NULL REFERENCES automations(id) ON DELETE CASCADE COMMENT 'Automação executada',
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE COMMENT 'Lead que acionou',
  trigger_event_id UUID REFERENCES lead_events(id) ON DELETE SET NULL COMMENT 'Evento que gatilhou',
  execution_status TEXT DEFAULT 'pending' CHECK (execution_status IN ('pending', 'running', 'success', 'failed', 'skipped')) COMMENT 'Status da execução',
  error_message TEXT COMMENT 'Mensagem de erro (se falhou)',
  n8n_execution_id TEXT COMMENT 'ID da execução no n8n',
  executed_at TIMESTAMPTZ COMMENT 'Quando foi executada',
  completed_at TIMESTAMPTZ COMMENT 'Quando completou',
  created_at TIMESTAMPTZ DEFAULT NOW() AT TIME ZONE 'UTC' NOT NULL COMMENT 'Data de criação',
  updated_at TIMESTAMPTZ DEFAULT NOW() AT TIME ZONE 'UTC' NOT NULL COMMENT 'Data de última atualização'
);

COMMENT ON TABLE automation_logs IS 'Log de cada execução de automação. Crucial para debug e auditoria.';

CREATE INDEX automation_logs_automation_idx ON automation_logs (organization_id, automation_id);
CREATE INDEX automation_logs_lead_idx ON automation_logs (lead_id);
CREATE INDEX automation_logs_status_idx ON automation_logs (execution_status);
CREATE INDEX automation_logs_created_at_idx ON automation_logs (created_at DESC);

CREATE TRIGGER automation_logs_updated_at
BEFORE UPDATE ON automation_logs
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();
```

---

## Migration 005: WhatsApp

### Tabela: `whatsapp_contacts`

Contatos de WhatsApp vinculados a leads.

```sql
CREATE TABLE whatsapp_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE COMMENT 'Organização',
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE COMMENT 'Lead associado',
  phone_number TEXT NOT NULL COMMENT 'Número com DDI (e.g., +5511999999999)',
  wa_id TEXT UNIQUE COMMENT 'WhatsApp ID (identificador único na API Meta)',
  display_name TEXT COMMENT 'Nome para exibição no WhatsApp',
  opt_in BOOLEAN DEFAULT FALSE COMMENT 'Consentimento opt-in para mensagens',
  opt_in_at TIMESTAMPTZ COMMENT 'Data do consentimento',
  opt_out_at TIMESTAMPTZ COMMENT 'Data do opt-out (se houver)',
  tags TEXT[] DEFAULT '{}' COMMENT 'Tags do WhatsApp',
  last_message_at TIMESTAMPTZ COMMENT 'Última mensagem (entrada ou saída)',
  last_message_direction TEXT COMMENT 'Direção da última mensagem (inbound/outbound)',
  created_at TIMESTAMPTZ DEFAULT NOW() AT TIME ZONE 'UTC' NOT NULL COMMENT 'Data de criação',
  updated_at TIMESTAMPTZ DEFAULT NOW() AT TIME ZONE 'UTC' NOT NULL COMMENT 'Data de última atualização'
);

COMMENT ON TABLE whatsapp_contacts IS 'Contatos de WhatsApp vinculados a leads. Um lead pode ter múltiplos números.';

CREATE UNIQUE INDEX whatsapp_contacts_organization_phone_idx ON whatsapp_contacts (organization_id, phone_number);
CREATE INDEX whatsapp_contacts_lead_idx ON whatsapp_contacts (lead_id);
CREATE INDEX whatsapp_contacts_opt_in_idx ON whatsapp_contacts (organization_id, opt_in);

CREATE TRIGGER whatsapp_contacts_updated_at
BEFORE UPDATE ON whatsapp_contacts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();
```

### Tabela: `whatsapp_messages`

Histórico de mensagens de WhatsApp.

```sql
CREATE TABLE whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE COMMENT 'Organização',
  contact_id UUID NOT NULL REFERENCES whatsapp_contacts(id) ON DELETE CASCADE COMMENT 'Contato',
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')) COMMENT 'Direção (inbound/outbound)',
  message_type TEXT NOT NULL CHECK (message_type IN ('text', 'template', 'image', 'document', 'audio', 'video', 'interactive')) COMMENT 'Tipo de mensagem',
  content JSONB NOT NULL COMMENT 'Conteúdo da mensagem em JSON',
  wa_message_id TEXT UNIQUE COMMENT 'ID da mensagem na API Meta',
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed')) COMMENT 'Status de entrega',
  automation_step_id UUID REFERENCES automation_steps(id) ON DELETE SET NULL COMMENT 'Passo que disparou (se automático)',
  error_message TEXT COMMENT 'Mensagem de erro (se falhou)',
  created_at TIMESTAMPTZ DEFAULT NOW() AT TIME ZONE 'UTC' NOT NULL COMMENT 'Timestamp'
);

COMMENT ON TABLE whatsapp_messages IS 'Histórico bidirecional de mensagens. Conecta contatos a automações.';

CREATE INDEX whatsapp_messages_contact_idx ON whatsapp_messages (contact_id, created_at DESC);
CREATE INDEX whatsapp_messages_organization_idx ON whatsapp_messages (organization_id);
CREATE INDEX whatsapp_messages_status_idx ON whatsapp_messages (status);
CREATE INDEX whatsapp_messages_created_at_idx ON whatsapp_messages (created_at DESC);
```

---

## Migration 006: Webhooks e API

### Tabela: `api_keys`

API keys para integrações externas por organização.

```sql
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE COMMENT 'Organização',
  name TEXT NOT NULL COMMENT 'Nome descritivo da chave',
  key_hash TEXT NOT NULL UNIQUE COMMENT 'Hash SHA256 da chave (armazenado no DB, nunca a chave em texto)',
  prefix TEXT NOT NULL COMMENT 'Prefixo visível da chave (ex: "pk_live_abcd1234")',
  permissions TEXT[] DEFAULT '{}' COMMENT 'Permissões da chave (read, write, delete, etc)',
  last_used_at TIMESTAMPTZ COMMENT 'Última vez que foi usada',
  active BOOLEAN DEFAULT TRUE COMMENT 'Chave ativa?',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL COMMENT 'Usuário que criou',
  created_at TIMESTAMPTZ DEFAULT NOW() AT TIME ZONE 'UTC' NOT NULL COMMENT 'Data de criação',
  updated_at TIMESTAMPTZ DEFAULT NOW() AT TIME ZONE 'UTC' NOT NULL COMMENT 'Data de última atualização'
);

COMMENT ON TABLE api_keys IS 'Chaves de API para integração externa. Armazenar apenas hash, nunca em texto.';

CREATE INDEX api_keys_organization_idx ON api_keys (organization_id, active);
CREATE INDEX api_keys_key_hash_idx ON api_keys (key_hash);

CREATE TRIGGER api_keys_updated_at
BEFORE UPDATE ON api_keys
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();
```

### Tabela: `webhook_subscriptions`

Webhooks outbound para integração com sistemas externos.

```sql
CREATE TABLE webhook_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE COMMENT 'Organização',
  name TEXT NOT NULL COMMENT 'Nome da subscrição',
  url TEXT NOT NULL COMMENT 'URL do endpoint que receberá o webhook',
  event_types TEXT[] NOT NULL COMMENT 'Tipos de eventos que disparam (ex: ["lead.created", "email.opened"])',
  headers JSONB DEFAULT '{}' COMMENT 'Headers customizados a enviar',
  secret TEXT COMMENT 'Secret para validar assinatura HMAC',
  active BOOLEAN DEFAULT TRUE COMMENT 'Subscrição ativa?',
  retry_policy JSONB DEFAULT '{"max_retries": 3, "backoff_seconds": 60}' COMMENT 'Política de retentativa',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL COMMENT 'Usuário que criou',
  created_at TIMESTAMPTZ DEFAULT NOW() AT TIME ZONE 'UTC' NOT NULL COMMENT 'Data de criação',
  updated_at TIMESTAMPTZ DEFAULT NOW() AT TIME ZONE 'UTC' NOT NULL COMMENT 'Data de última atualização'
);

COMMENT ON TABLE webhook_subscriptions IS 'Webhooks outbound. Sistema dispara quando eventos ocorrem.';

CREATE INDEX webhook_subscriptions_organization_active_idx ON webhook_subscriptions (organization_id, active);
CREATE INDEX webhook_subscriptions_event_types_idx ON webhook_subscriptions USING GIN (event_types);

CREATE TRIGGER webhook_subscriptions_updated_at
BEFORE UPDATE ON webhook_subscriptions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();
```

### Tabela: `webhook_logs`

Log de tentativas de entrega de webhooks.

```sql
CREATE TABLE webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE COMMENT 'Organização',
  webhook_subscription_id UUID NOT NULL REFERENCES webhook_subscriptions(id) ON DELETE CASCADE COMMENT 'Subscrição',
  event_type TEXT NOT NULL COMMENT 'Tipo de evento disparado',
  payload JSONB NOT NULL COMMENT 'Payload enviado',
  http_status_code INTEGER COMMENT 'Código HTTP da resposta',
  response_body TEXT COMMENT 'Body da resposta',
  error_message TEXT COMMENT 'Mensagem de erro (se falhou)',
  attempt_number INTEGER DEFAULT 1 COMMENT 'Qual tentativa de retentativa',
  success BOOLEAN DEFAULT FALSE COMMENT 'Entrega bem-sucedida?',
  created_at TIMESTAMPTZ DEFAULT NOW() AT TIME ZONE 'UTC' NOT NULL COMMENT 'Data da tentativa'
);

COMMENT ON TABLE webhook_logs IS 'Log de cada tentativa de entrega de webhook. Essencial para debug de integrações.';

CREATE INDEX webhook_logs_subscription_idx ON webhook_logs (webhook_subscription_id);
CREATE INDEX webhook_logs_organization_idx ON webhook_logs (organization_id, created_at DESC);
CREATE INDEX webhook_logs_success_idx ON webhook_logs (success);
CREATE INDEX webhook_logs_created_at_idx ON webhook_logs (created_at DESC);
```

---

## Migration 007: A/B Testing

### Tabela: `email_ab_tests`

Testes A/B de variantes de email (subject, conteúdo, etc).

```sql
CREATE TABLE email_ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE COMMENT 'Organização',
  campaign_id UUID NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE COMMENT 'Campanha associada',
  variant_a_name TEXT NOT NULL COMMENT 'Nome da variante A (ex: "Original")',
  variant_a_subject TEXT COMMENT 'Assunto da variante A (null = usar original)',
  variant_a_html_content TEXT COMMENT 'HTML da variante A (null = usar original)',
  variant_b_name TEXT NOT NULL COMMENT 'Nome da variante B (ex: "Com CTA vermelho")',
  variant_b_subject TEXT NOT NULL COMMENT 'Assunto da variante B',
  variant_b_html_content TEXT NOT NULL COMMENT 'HTML da variante B',
  control_variant TEXT DEFAULT 'a' CHECK (control_variant IN ('a', 'b')) COMMENT 'Qual é o controle (para baseline)',
  split_percentage INTEGER DEFAULT 50 CHECK (split_percentage > 0 AND split_percentage < 100) COMMENT 'Percentual de leads para variante B',
  metric_to_test TEXT DEFAULT 'open_rate' COMMENT 'Métrica a testar (open_rate, click_rate, conversion_rate)',
  significance_level DECIMAL DEFAULT 0.05 COMMENT 'Nível de significância estatística',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'completed', 'cancelled')) COMMENT 'Status do teste',
  started_at TIMESTAMPTZ COMMENT 'Data/hora de início',
  completed_at TIMESTAMPTZ COMMENT 'Data/hora de conclusão',
  winning_variant TEXT COMMENT 'Variante vencedora (a ou b)',
  winner_confidence DECIMAL COMMENT 'Confiança estatística do vencedor (0-1)',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL COMMENT 'Usuário que criou',
  created_at TIMESTAMPTZ DEFAULT NOW() AT TIME ZONE 'UTC' NOT NULL COMMENT 'Data de criação',
  updated_at TIMESTAMPTZ DEFAULT NOW() AT TIME ZONE 'UTC' NOT NULL COMMENT 'Data de última atualização'
);

COMMENT ON TABLE email_ab_tests IS 'A/B testing para campanhas de email. Permite testar diferentes variantes e medir impacto.';

CREATE INDEX email_ab_tests_campaign_idx ON email_ab_tests (campaign_id);
CREATE INDEX email_ab_tests_organization_status_idx ON email_ab_tests (organization_id, status);

CREATE TRIGGER email_ab_tests_updated_at
BEFORE UPDATE ON email_ab_tests
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();
```

---

## Views de Compatibilidade

### View: `unified_lead_events`

Unifica eventos legados (tabelas GTM por empresa) com novos eventos da plataforma.

```sql
CREATE VIEW unified_lead_events AS
SELECT
  id,
  'templum'::TEXT AS organization_slug,
  (SELECT id FROM organizations WHERE slug = 'templum' LIMIT 1)::UUID AS organization_id,
  email::UUID AS lead_id,
  event_name,
  created_at,
  page_url,
  utm_source,
  utm_medium,
  utm_campaign,
  lead_temperature,
  lead_score
FROM events
WHERE email IS NOT NULL

UNION ALL

SELECT
  id,
  'orbit'::TEXT AS organization_slug,
  (SELECT id FROM organizations WHERE slug = 'orbit' LIMIT 1)::UUID AS organization_id,
  email::UUID AS lead_id,
  event_name,
  created_at,
  page_url,
  utm_source,
  utm_medium,
  utm_campaign,
  lead_temperature,
  lead_score
FROM orbit_gestao_events
WHERE email IS NOT NULL

UNION ALL

SELECT
  id,
  organizations.slug,
  lead_events.organization_id,
  lead_events.lead_id,
  lead_events.event_type::TEXT,
  lead_events.created_at,
  lead_events.page_url,
  lead_events.utm_source,
  lead_events.utm_medium,
  lead_events.utm_campaign,
  leads.temperature,
  leads.score
FROM lead_events
JOIN organizations ON lead_events.organization_id = organizations.id
JOIN leads ON lead_events.lead_id = leads.id;

COMMENT ON VIEW unified_lead_events IS 'View compatível que unifica eventos legados (GTM) com novos da plataforma. Para analytics unificado.';
```

### View: `unified_conversions`

Unifica conversões legadas com novos dados.

```sql
CREATE VIEW unified_conversions AS
SELECT
  id,
  'templum'::TEXT AS organization_slug,
  (SELECT id FROM organizations WHERE slug = 'templum' LIMIT 1)::UUID AS organization_id,
  email::UUID AS lead_id,
  deal_id,
  deal_title,
  deal_status,
  deal_value,
  created_at,
  deal_won_at,
  utm_source,
  utm_medium,
  utm_campaign,
  lead_temperature,
  lead_score
FROM conversions

UNION ALL

SELECT
  id,
  'orbit'::TEXT AS organization_slug,
  (SELECT id FROM organizations WHERE slug = 'orbit' LIMIT 1)::UUID AS organization_id,
  email::UUID AS lead_id,
  deal_id,
  deal_title,
  deal_status,
  deal_value,
  created_at,
  deal_won_at,
  utm_source,
  utm_medium,
  utm_campaign,
  lead_temperature,
  lead_score
FROM orbit_gestao_conversions;

COMMENT ON VIEW unified_conversions IS 'View compatível que unifica conversões legadas (Pipedrive) com novos dados de campanha.';
```

### View: `lead_journey`

Jornada consolidada do lead (eventos + conversões + métricas).

```sql
CREATE VIEW lead_journey AS
SELECT
  l.id,
  l.organization_id,
  o.slug AS organization_slug,
  l.email,
  l.name,
  l.phone,
  l.company,
  l.job_title,
  l.score,
  l.temperature,
  l.stage,
  l.status,
  l.source,
  l.created_at,
  l.last_activity_at,
  -- Eventos
  COUNT(DISTINCT CASE WHEN le.event_type = 'page_view' THEN le.id END) AS total_pageviews,
  COUNT(DISTINCT CASE WHEN le.event_type = 'page_view' THEN le.page_url END) AS unique_pages_visited,
  COUNT(DISTINCT CASE WHEN le.event_type = 'form_submit' THEN le.id END) AS total_form_submissions,
  MAX(CASE WHEN le.event_type = 'page_view' THEN (le.properties->>'scroll_depth')::INT END) AS max_scroll_depth,
  COUNT(DISTINCT le.session_id) AS total_sessions,
  -- Email
  COUNT(DISTINCT CASE WHEN es.status = 'opened' THEN es.id END) AS email_opens,
  COUNT(DISTINCT CASE WHEN es.status = 'clicked' THEN es.id END) AS email_clicks,
  COUNT(DISTINCT CASE WHEN es.status = 'bounced' THEN es.id END) AS email_bounces,
  -- Timestamps
  MIN(le.created_at) AS first_event_at,
  MAX(le.created_at) AS last_event_at,
  -- Atribuição
  l.first_touch_attribution_source,
  l.last_touch_attribution_source,
  l.utm_source,
  l.utm_medium,
  l.utm_campaign
FROM leads l
JOIN organizations o ON l.organization_id = o.id
LEFT JOIN lead_events le ON l.id = le.lead_id
LEFT JOIN email_sends es ON l.id = es.lead_id
GROUP BY
  l.id, l.organization_id, o.slug, l.email, l.name, l.phone, l.company,
  l.job_title, l.score, l.temperature, l.stage, l.status, l.source,
  l.created_at, l.last_activity_at, l.first_touch_attribution_source,
  l.last_touch_attribution_source, l.utm_source, l.utm_medium, l.utm_campaign;

COMMENT ON VIEW lead_journey IS 'Visão 360° da jornada de cada lead com agregações de eventos, emails e métricas comportamentais.';
```

---

## Estratégia de Índices

### Índices de Deduplicação
```sql
-- Previne duplicação
CREATE UNIQUE INDEX leads_organization_email_idx ON leads (organization_id, email);
CREATE UNIQUE INDEX users_organization_email_idx ON users (organization_id, email);
CREATE UNIQUE INDEX whatsapp_contacts_organization_phone_idx ON whatsapp_contacts (organization_id, phone_number);
```

### Índices de Busca/Filtro
```sql
-- Suportam WHERE clauses eficientes
CREATE INDEX leads_organization_score_idx ON leads (organization_id, score DESC);
CREATE INDEX leads_organization_temperature_idx ON leads (organization_id, temperature);
CREATE INDEX leads_organization_status_idx ON leads (organization_id, status);
CREATE INDEX email_campaigns_organization_status_idx ON email_campaigns (organization_id, status);
CREATE INDEX email_sends_organization_campaign_idx ON email_sends (organization_id, campaign_id);
```

### Índices para Ordenação
```sql
-- Para queries que precisam de ORDER BY
CREATE INDEX leads_created_at_idx ON leads (created_at DESC);
CREATE INDEX leads_last_activity_idx ON leads (last_activity_at DESC);
CREATE INDEX email_campaigns_created_at_idx ON email_campaigns (created_at DESC);
CREATE INDEX email_sends_created_at_idx ON email_sends (created_at DESC);
CREATE INDEX lead_events_created_at_idx ON lead_events (created_at DESC);
```

### Índices JSONB
```sql
-- Para buscas em campos JSON
CREATE INDEX leads_custom_fields_idx ON leads USING GIN (custom_fields);
CREATE INDEX segments_filters_idx ON segments USING GIN (filters);
CREATE INDEX email_campaigns_stats_idx ON email_campaigns USING GIN (stats);
```

### Índices para Array
```sql
-- Para array operations
CREATE INDEX leads_tags_idx ON leads USING GIN (tags);
CREATE INDEX webhook_subscriptions_event_types_idx ON webhook_subscriptions USING GIN (event_types);
```

### Índices Compostos de Alta Prioridade
```sql
-- Timeline de um lead (muito usado)
CREATE INDEX lead_events_organization_lead_created_idx ON lead_events (organization_id, lead_id, created_at DESC);

-- Filtering por tipo de evento
CREATE INDEX lead_events_organization_event_type_idx ON lead_events (organization_id, event_type, created_at DESC);

-- Campanhas agendadas a enviar
CREATE INDEX email_campaigns_scheduled_at_idx ON email_campaigns (scheduled_at) WHERE status = 'scheduled';
```

---

## Row Level Security (RLS)

Todas as tabelas com `organization_id` têm RLS habilitado para garantir isolamento de dados.

### Policy Padrão: Acesso ao próprio organization_id

```sql
-- Função helper para obter organization_id do JWT
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS UUID AS $$
BEGIN
  RETURN auth.jwt() ->> 'organization_id'::TEXT;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### RLS para `organizations`

```sql
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizations: Users can only see their own org"
ON organizations
FOR SELECT
USING (
  id = get_user_organization_id()
);

CREATE POLICY "Organizations: Only org admins can update"
ON organizations
FOR UPDATE
USING (
  id = get_user_organization_id() AND
  EXISTS (
    SELECT 1 FROM users
    WHERE users.organization_id = organizations.id
      AND users.id = auth.uid()
      AND users.role = 'admin'
  )
);
```

### RLS para `users`

```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users: Can view own user and org members"
ON users
FOR SELECT
USING (
  organization_id = get_user_organization_id()
);

CREATE POLICY "Users: Admins can update/delete users"
ON users
FOR UPDATE
USING (
  organization_id = get_user_organization_id() AND
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.organization_id = users.organization_id
      AND u.id = auth.uid()
      AND u.role = 'admin'
  )
);
```

### RLS para `leads`

```sql
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leads: Users can only access own org leads"
ON leads
FOR ALL
USING (organization_id = get_user_organization_id());
```

### RLS para `segments`

```sql
ALTER TABLE segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Segments: Users can only access own org segments"
ON segments
FOR ALL
USING (organization_id = get_user_organization_id());
```

### RLS para `segment_leads`

```sql
ALTER TABLE segment_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Segment_leads: Users can only access own org segments"
ON segment_leads
FOR ALL
USING (
  segment_id IN (
    SELECT id FROM segments WHERE organization_id = get_user_organization_id()
  )
);
```

### RLS para `email_templates`

```sql
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Email_templates: Users can only access own org templates"
ON email_templates
FOR ALL
USING (organization_id = get_user_organization_id());
```

### RLS para `email_campaigns`

```sql
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Email_campaigns: Users can only access own org campaigns"
ON email_campaigns
FOR ALL
USING (organization_id = get_user_organization_id());
```

### RLS para `email_sends`

```sql
ALTER TABLE email_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Email_sends: Users can only access own org sends"
ON email_sends
FOR ALL
USING (organization_id = get_user_organization_id());
```

### RLS para `lead_events`

```sql
ALTER TABLE lead_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lead_events: Users can only access own org events"
ON lead_events
FOR ALL
USING (organization_id = get_user_organization_id());
```

### RLS para `scoring_rules`

```sql
ALTER TABLE scoring_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Scoring_rules: Users can only access own org rules"
ON scoring_rules
FOR ALL
USING (organization_id = get_user_organization_id());
```

### RLS para `automations`

```sql
ALTER TABLE automations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Automations: Users can only access own org automations"
ON automations
FOR ALL
USING (organization_id = get_user_organization_id());
```

### RLS para `automation_steps`

```sql
ALTER TABLE automation_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Automation_steps: Users can only access own org steps"
ON automation_steps
FOR ALL
USING (
  automation_id IN (
    SELECT id FROM automations WHERE organization_id = get_user_organization_id()
  )
);
```

### RLS para `automation_logs`

```sql
ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Automation_logs: Users can only access own org logs"
ON automation_logs
FOR ALL
USING (organization_id = get_user_organization_id());
```

### RLS para `whatsapp_contacts`

```sql
ALTER TABLE whatsapp_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Whatsapp_contacts: Users can only access own org contacts"
ON whatsapp_contacts
FOR ALL
USING (organization_id = get_user_organization_id());
```

### RLS para `whatsapp_messages`

```sql
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Whatsapp_messages: Users can only access own org messages"
ON whatsapp_messages
FOR ALL
USING (organization_id = get_user_organization_id());
```

### RLS para `api_keys`

```sql
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Api_keys: Admins can only access own org keys"
ON api_keys
FOR ALL
USING (
  organization_id = get_user_organization_id() AND
  EXISTS (
    SELECT 1 FROM users
    WHERE users.organization_id = api_keys.organization_id
      AND users.id = auth.uid()
      AND users.role = 'admin'
  )
);
```

### RLS para `webhook_subscriptions`

```sql
ALTER TABLE webhook_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Webhook_subscriptions: Admins can only access own org subscriptions"
ON webhook_subscriptions
FOR ALL
USING (
  organization_id = get_user_organization_id() AND
  EXISTS (
    SELECT 1 FROM users
    WHERE users.organization_id = webhook_subscriptions.organization_id
      AND users.id = auth.uid()
      AND users.role IN ('admin', 'editor')
  )
);
```

### RLS para `webhook_logs`

```sql
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Webhook_logs: Users can only access own org logs"
ON webhook_logs
FOR SELECT
USING (organization_id = get_user_organization_id());
```

### RLS para `email_ab_tests`

```sql
ALTER TABLE email_ab_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Email_ab_tests: Users can only access own org tests"
ON email_ab_tests
FOR ALL
USING (organization_id = get_user_organization_id());
```

---

## Notas Importantes

### Performance em Produção

1. **Particionamento de lead_events:** Conforme a tabela cresce, ativar particionamento por mês/trimestre
2. **Índices de Bloom:** Para queries com muitas colunas, considerar índices de Bloom em Postgres 14+
3. **Vacuuming:** Configurar autovacuum agressivo para tabelas de alto volume
4. **Connection pooling:** Usar Supabase connection pooling ou PgBouncer

### Segurança

1. **API Keys:** Nunca armazenar em texto. Usar hash bcrypt + salting
2. **Webhook Secrets:** Validar HMAC-SHA256 em cada entrega
3. **RLS:** Sempre ativado. Testar policies com usuários diferentes
4. **Encryption:** Considerar encryption de colunas sensíveis (mailersend_api_key, email)

### Monitoramento

- Alertas para tamanho de lead_events
- Alertas para falhas de webhook_logs
- Dashboard de automations (execução, sucesso, taxa de erro)
- Auditoria de api_keys (last_used_at para detectar chaves não utilizadas)

### Integração com n8n

- `automations.n8n_workflow_id` dispara workflows
- `automation_logs.n8n_execution_id` mapeia execuções
- Webhooks inbound do n8n: captura dados em `lead_events`

### Migração de Dados Legados

- Manter tabelas `events`, `orbit_gestao_events`, `conversions`, `orbit_gestao_conversions` funcionando
- Views de compatibilidade (`unified_lead_events`, etc) combinam legado + novo
- Fase 2: migrar dados históricos para `lead_events` com `organization_id` mapeado
