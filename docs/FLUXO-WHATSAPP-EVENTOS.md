# Fluxo de WhatsApp para Eventos — Padrao ManyChat (Substituicao)

> Fonte: Padrao_ManyChat_Templum_Orbit.docx
> Base para o modulo de Automacoes WhatsApp (substituir ManyChat)

---

## Resumo

Fluxo padronizado de levantada de mao para campanhas de webinar/eventos.
4 fases, 11 mensagens, sistema de tags para controlar todo o funil.
Objetivo: replicar e MELHORAR o ManyChat dentro da plataforma.

---

## Principios Fundamentais

1. **Botoes, nao links soltos** — Toda interacao via botoes. Garante tracking + segmentacao por tags.
2. **Tags controlam tudo** — Cada acao gera uma tag. Condicoes leem tags para decidir proximo passo.
3. **Mensagens curtas** — Max 5-6 linhas. E WhatsApp, nao email.
4. **Sempre abrir com nome** — "Ola, {{first_name}}!" em toda mensagem.
5. **Respeitar quem nao quer** — Tag de remocao, nunca mais envia.
6. **Smart Delay com horario fixo** — Delays usam data/hora especifica (nao intervalo relativo).

---

## As 4 Fases

| Fase | Periodo | Objetivo | Msgs |
|------|---------|----------|------|
| 1. Levantada de Mao | D-2 | Captar interesse + confirmar inscricao | 1 broadcast + 2 ramificacoes |
| 2. Follow-ups (24h) | D-2 (mesmo dia) | Converter quem nao confirmou | 3 msgs (3h/3h/3h) |
| 3. Lembretes | D-1 e D-0 | Garantir presenca ao vivo | 4-5 msgs |
| 4. Pos-Live | D-0 (apos evento) | Captar lead quente + webhook comercial | 1 msg + webhook |

---

## Sistema de Tags

### Padrao de Nomenclatura
```
[acao]_[tipo_evento]_[marca]
```

### Tabela de Tags

| Tag | Momento | Significado |
|-----|---------|-------------|
| `interesse_webinar_orbit` | Clicou "Participar" no broadcast | Interesse inicial |
| `vai_participar_webinar_orbit` | Clicou no link da LP | Confirmou participacao |
| `sem_interesse_webinar_orbit` | Clicou "Nao quero" | Recusou (mas viu msg reversao) |
| `realmente_nao_quer_webinar_orbit` | Clicou "Nao quero, me tira" | NUNCA mais envia |
| `quer_falar_com_especialista` | Pos-live | Lead quente — prioridade comercial |

### Logica das Condicoes
- Tag `vai_participar` presente? → SIM = nao envia follow-up (ja confirmou)
- Tag `interesse` presente e SEM `vai_participar`? → Envia follow-up de conversao
- Tag `realmente_nao_quer`? → NUNCA mais envia

---

## Cronograma Completo (11 Mensagens)

| Data | Hora | Msg | Publico | Objetivo |
|------|------|-----|---------|----------|
| D-2 | 12:00 | MSG 1 — Levantada de mao | Base inteira | Broadcast inicial |
| D-2 | 15:00 | MSG 2 — Follow-up 1 | Sem tag vai_participar | Converter |
| D-2 | 18:00 | MSG 3 — Follow-up 2 | Sem tag vai_participar | Dado/estatistica |
| D-2 | 21:00 | MSG 4 — Ultima do dia | Sem tag vai_participar | Urgencia |
| D-1 | 09:00 | MSG 5 — Lembrete vespera | vai_participar OU interesse | Lembrar |
| D-1 | 12:00 | MSG 6 — Ultima chance | interesse SEM vai_participar | Converter |
| D-0 | 09:00 | MSG 7 — Lembrete manha | vai_participar | Lembrar |
| D-0 | 09:02 | MSG 8 — Ultima chance dia | Sem nenhuma tag | Ultima tentativa |
| D-0 | 12:00 | MSG 9 — Comeca em 1h | vai_participar + interesse | Link acesso |
| D-0 | 12:58 | MSG 10 — Ao vivo | Confirmados | Link acesso |
| D-0 | 14:40 | MSG 11 — Pos-live | Confirmados | Lead quente + webhook |

---

## Templates de Mensagens

### FASE 1 — Levantada de Mao (D-2, 12:00)

**MSG 1 — Broadcast**
```
Ola, {{first_name}}!

Sua empresa funciona, mas depende demais de voce pra tudo rodar?

Em 15 anos, a Templum ja viu isso em centenas de empresas.

Dia [DATA] as [HORA], vamos mostrar ao vivo como estruturar gestao
e processos com apoio de IA. Sem burocracia.

Clique no botao para garantir sua vaga 👇
```
Botoes: ✅ Participar | ❌ Nao Quero

**MSG Confirmacao (apos Participar)**
```
Maravilha, {{first_name}}! 🎯

Clique no botao abaixo pra garantir sua vaga.
Esperamos voce na [DIA], dia [DATA] as [HORA]!
```
Botao: 🔗 Participar da Live → [LINK LP]

**MSG Reversao (apos Nao Quero)**
```
Entendido, {{first_name}}.

So pra voce saber o que vai rolar:
→ O erro n1 de quem quer ISO 9001
→ Como simplificar gestao sem burocracia
→ Demonstracao do ORBIT com IA
→ Material de diagnostico + acesso pra quem participar

E ao vivo, gratuito e dura menos de 2h.
Se mudar de ideia, e so clicar 👇
```
Botoes: ✅ Quero participar | 🚫 Nao quero!

### FASE 2 — Follow-ups (D-2, 15:00-21:00)

**MSG 2 — Follow-up 1 (15:00)** — Reforco com urgencia (vagas limitadas)
**MSG 3 — Follow-up 2 (18:00)** — Dado/estatistica + beneficio
**MSG 4 — Ultima do dia (21:00)** — Escassez + ultima mensagem

Todos seguem: Smart Delay → Condicao (tag check) → Mensagem com 2 botoes

### FASE 3 — Lembretes (D-1 e D-0)

**MSG 5 (D-1 09:00)** — Lembrete vespera para confirmados
**MSG 6 (D-1 12:00)** — Ultima chance para quem so demonstrou interesse
**MSG 7 (D-0 09:00)** — Lembrete manha para confirmados
**MSG 8 (D-0 09:02)** — Ultima tentativa para nao-engajados
**MSG 9 (D-0 12:00)** — Link de acesso 1h antes
**MSG 10 (D-0 12:58)** — "Estamos ao vivo!" com link

### FASE 4 — Pos-Live (D-0, 14:40)

**MSG 11 — Pos-live**
```
{{first_name}}, obrigado pela presenca! 🙏

Quer falar com um especialista da Templum? Clique abaixo 👇
```
Botao: 💬 Quero falar com especialista
Acao: Tag `quer_falar_com_especialista` → Webhook n8n → Distribui para comercial

---

## Estrutura de Blocos (Flow Builder Visual)

```
┌─ Trigger (Broadcast/Evento) ─┐
│                               │
└──→ Enviar Mensagem ──────────┘
      │                  │
   [Participar]     [Nao Quero]
      │                  │
   + Tag              + Tag
   interesse          sem_interesse
      │                  │
   MSG Confirm.       MSG Reversao
      │                  │         │
      │            [Quero sim]  [Nao!]
      │                  │         │
      │              Remove tag  + Tag
      │              + Tag       realmente_nao_quer
      │              vai_participar  │
      │                  │         FIM
      │                  │
      └──────┬───────────┘
             │
    ┌─ Smart Delay (15:00) ─┐
    │                       │
    └──→ Condicao ──────────┘
          │          │
       (Verde)    (Vermelho)
       Tem tag    Sem tag
          │          │
       Proximo    Follow-up
       delay      com botoes
          │          │
          └──────────┘
                │
       ┌─ Smart Delay (18:00) ─┐
       │                       │
       └──→ ... (repete) ──────┘
```

---

## Adaptacao por Tom (Multi-perfil)

| Elemento | Institucional (Empresa) | Pessoal (CEO/Fundador) |
|----------|------------------------|----------------------|
| Abertura | "Em 15 anos, a [Empresa]..." | "Aqui e o [Nome], CEO da..." |
| Autoridade | Institucional | Pessoal (fundador) |
| Produto | "Nossa plataforma" | "A plataforma que eu criei" |
| Pos-live | "Um especialista" | "Meu time" |
| Tom | Consultivo profissional | De dono pra dono |

---

## Implementacao na Plataforma

### O que precisamos construir:

1. **Flow Builder Visual** — Editor drag-and-drop tipo ManyChat
   - Blocos: Mensagem, Condicao, Delay, Acao, Webhook
   - Conexoes visuais entre blocos
   - Preview da mensagem

2. **Sistema de Tags** — Gerenciamento de tags por lead
   - CRUD de tags
   - Auto-tag por acao (clique em botao, abriu msg, etc.)
   - Filtros por tag em segmentos

3. **Smart Delay** — Agendamento com data/hora especifica
   - Wait Until (data/hora fixa)
   - Wait For (intervalo relativo)
   - Fuso horario configuravel

4. **Condicoes** — Logica de ramificacao
   - Verificar tags (tem/nao tem)
   - Verificar campo do lead
   - Logica AND/OR
   - Caminhos Verde (match) / Vermelho (no match)

5. **Templates de Fluxo** — Fluxos pre-montados
   - Webinar/Evento (este documento)
   - Boas-vindas
   - Nutricao
   - Carrinho abandonado
   - Pos-compra

6. **Analytics de Fluxo**
   - Taxa de entrega por mensagem
   - CTR dos botoes (benchmark: 1-3% broadcast)
   - Funil de conversao por fase
   - Quem parou em qual etapa
   - Tags aplicadas (dashboard)

7. **Webhook/Integracao**
   - Disparo para n8n ao clicar botao
   - Envio de dados do lead para CRM/comercial
   - Notificacao para time de vendas

### Tabelas do banco (proposta):

```sql
-- Fluxos de automacao
CREATE TABLE automation_flows (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES organizations(id),
  name text NOT NULL,
  description text,
  channel text NOT NULL CHECK (channel IN ('whatsapp', 'email', 'sms')),
  trigger_type text NOT NULL, -- 'broadcast', 'tag_added', 'form_submitted', 'event', 'manual'
  trigger_config jsonb DEFAULT '{}',
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'archived')),
  flow_data jsonb NOT NULL DEFAULT '{}', -- nodes + edges do flow builder
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Execucoes do fluxo (cada lead que entra)
CREATE TABLE automation_executions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES organizations(id),
  flow_id uuid NOT NULL REFERENCES automation_flows(id),
  lead_id uuid NOT NULL REFERENCES leads(id),
  current_node_id text, -- node atual no fluxo
  status text DEFAULT 'running' CHECK (status IN ('running', 'completed', 'paused', 'failed', 'cancelled')),
  tags_applied text[] DEFAULT '{}',
  history jsonb DEFAULT '[]', -- log de cada passo
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  next_action_at timestamptz -- proximo smart delay
);

-- Tags do lead
CREATE TABLE lead_tags (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES organizations(id),
  lead_id uuid NOT NULL REFERENCES leads(id),
  tag text NOT NULL,
  source text, -- 'manual', 'automation', 'flow:xxx'
  created_at timestamptz DEFAULT now(),
  UNIQUE(org_id, lead_id, tag)
);
```

### Checklist de Lancamento (replicar na plataforma):
- [ ] Datas e horarios dos delays corretos?
- [ ] Link da LP funcionando com UTMs?
- [ ] Link do Zoom/Meet correto?
- [ ] Tags seguem padrao de nomenclatura?
- [ ] Webhook n8n ativo e testado?
- [ ] Broadcast filtrado (excluir tags de remocao)?
- [ ] Teste feito com perfil proprio?

---

*Baseado no Padrao ManyChat Templum/Orbit. Documentado para substituicao do ManyChat por modulo interno da plataforma.*
