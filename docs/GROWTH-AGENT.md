# Agente de Growth — Documentação Técnica

> Agente de IA especialista em Growth Marketing para análise completa de Meta Ads + CRM Pipedrive + Tracking GTM.

---

## Visão Geral

O Agente de Growth é um copiloto conversacional que analisa TODOS os dados de marketing e vendas em tempo real. Ele cruza informações de 3 fontes:

1. **Meta Ads** — criativos, públicos, campanhas, CPL, conv. rate
2. **CRM Pipedrive** — deals, funil, atividades, notas, motivos de perda
3. **Tracking GTM** — sessões, páginas, fontes UTM, geografia

O diferencial é o **cruzamento**: ele identifica qual criativo gera leads que VENDEM (não só leads baratos), qual público avança no funil, e onde estão os gargalos.

---

## Arquitetura

```
[Chat UI] → POST /api/growth/chat
              ↓
         [Data Aggregator] → Consulta Supabase (7 tabelas + API Pipedrive)
              ↓
         [System Prompt + Data Context]
              ↓
         [OpenRouter / Claude Sonnet]
              ↓
         [Resposta em Markdown]
```

### Componentes

| Arquivo | Função |
|---------|--------|
| `src/lib/growth/data-aggregator.ts` | Agrega dados de Meta Ads, Pipedrive e GTM em um snapshot |
| `src/lib/growth/system-prompt.ts` | System prompt do agente + função que formata dados como contexto |
| `src/app/api/growth/chat/route.ts` | API endpoint do chat (POST) |
| `src/app/(dashboard)/growth/chat/page.tsx` | Interface do chat |

### Tabelas consultadas

| Tabela | Dados |
|--------|-------|
| `meta_campaign_insights` | KPIs diários por campanha |
| `meta_ad_insights` | KPIs diários por anúncio (criativo) |
| `meta_adset_insights` | KPIs diários por conjunto (público) |
| `meta_ads` | Metadata dos criativos (nome, imagem) |
| `meta_adsets` | Metadata dos públicos (nome, targeting) |
| `pipedrive_deals` | Deals com UTMs, status, etapa, valores |
| `pipedrive_stages` | Etapas do funil CRM |
| `pipedrive_connections` | API token para buscar atividades/notas |
| `orbit_gestao_events` | Eventos GTM (page_view, generate_lead, scroll_depth) |

### API Pipedrive (chamadas live)

O aggregator faz 2 chamadas à API do Pipedrive em tempo real:
- `GET /recents?items=activity` — atividades recentes (calls, meetings, tasks)
- `GET /recents?items=note` — notas recentes dos deals

---

## System Prompt

O prompt tem 3 camadas:

### Camada 1: Identidade
- Copiloto de Growth do Orbit
- Conhece o produto (12 agentes de IA, B2B/B2B2B, funil de vendas)
- Tom direto, confiante, pragmático

### Camada 2: Como analisa
- Meta Ads: criativos armadilha vs criativos ouro
- CRM: gargalos do funil, motivos de perda, atividades do time
- Tracking: fontes que convertem, páginas, geografia
- **Cruzamento**: a análise mais poderosa — conecta ads → leads → deals → vendas

### Camada 3: Dados reais (dinâmicos)
Injetados a cada chamada com dados frescos do período selecionado:
- KPIs agregados de Meta Ads
- Top 15 criativos com leads, CPL, conv. rate
- Top 15 públicos com tipo (RMK/LAL/INT)
- Funil CRM com deals por etapa
- Criativos e públicos cruzados com CRM (utm_term/utm_content)
- Atividades e notas recentes
- Fontes de tráfego, páginas, estados

### Restrições narrativas
- Nunca inventar dados
- Nunca dizer que consultoria não escala
- Nunca mencionar Evolutto
- Nunca dizer que IA substitui consultores

---

## Dados disponíveis (Orbit Gestão — Março 2026)

### Meta Ads
- 63 registros de campaign insights
- 607 registros de ad insights (criativos)
- 247 registros de adset insights (públicos)
- 162 ads com metadata (nome, thumbnail)
- 44 adsets com metadata

### CRM Pipedrive
- 743 deals (413 abertos, 316 perdidos, 14 ganhos)
- 9 etapas do funil Orbit (Lead Novo → Negociações Iniciadas)
- 530 deals com UTM source
- 489 deals com utm_term (nome do criativo)
- 524 deals com utm_content (nome do público)

### Tracking GTM
- 10.619 sessões, 7.600 visitantes
- 12.571 page views, 688 leads
- 32 páginas únicas, 16 fontes UTM
- Eventos: page_view, generate_lead, scroll_depth, time_on_page_heartbeat

---

## Exemplos de perguntas

### Análise geral
- "Analise meus dados dos últimos 30 dias"
- "Me dá um diagnóstico completo do funil"

### Criativos
- "Qual criativo está convertendo mais em vendas?"
- "Por que o criativo X tem CPL baixo mas não vende?"
- "Quais criativos devo pausar?"

### Públicos
- "Remarketing ou Lookalike — qual devo escalar?"
- "Qual público gera leads que avançam no funil?"

### CRM
- "Onde está o gargalo do funil de vendas?"
- "Por que estamos perdendo tantos deals?"
- "O time comercial está fazendo follow-up?"

### Cruzamento
- "Quais criativos geram leads que viram venda vs leads que não avançam?"
- "Qual o ROAS real por criativo?"
- "Qual estado devo concentrar budget?"

### Ações
- "Me dá 5 ações para essa semana"
- "O que eu faço primeiro: escalar ou otimizar?"

---

## Fluxo de uso

1. Usuário acessa `/growth/chat`
2. Seleciona período (7d, 30d, mês, custom)
3. Digita pergunta
4. API agrega dados do período → envia ao Claude com system prompt
5. Claude analisa e responde com insights + ações
6. Usuário faz follow-up (conversa mantém contexto)

---

## Manutenção

### Adicionar novo dado ao agente
1. Editar `src/lib/growth/data-aggregator.ts` — adicionar query
2. Editar `src/lib/growth/system-prompt.ts` — adicionar ao `buildDataContext()`
3. O agente automaticamente usa o novo dado nas análises

### Melhorar o prompt
Editar `GROWTH_SYSTEM_PROMPT` em `src/lib/growth/system-prompt.ts`

### Trocar modelo de IA
Configurar em `src/lib/ai-client.ts` — suporta Anthropic, OpenAI, OpenRouter
