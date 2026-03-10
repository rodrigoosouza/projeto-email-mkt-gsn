# Visao do Produto — Plataforma de Marketing Automatizado

> Documento de visao macro. Tudo que a plataforma deve ser quando estiver pronta.
> Atualizado: 2026-03-09

---

## Missao

Automatizar 100% da operacao de marketing digital. O cliente cria a organizacao,
preenche o briefing, e a plataforma gera TODA a estrutura automaticamente.

**Objetivo final:** Levar para o OpenClaw para automacao total com agentes de IA.

---

## Ferramentas que Substituimos

| Ferramenta | Funcao | Nosso Modulo |
|-----------|--------|-------------|
| RD Station | CRM + Email + Automacao | Leads, Campanhas, Automacoes |
| Semrush/Ahrefs | SEO + Keywords | SEO Avancado |
| Hotjar/Clarity | Heatmap + Session Recording | Mapa de Calor |
| ManyChat | Fluxos WhatsApp | Automacoes WhatsApp |
| Unbounce/Instapage | Landing Pages | LP Builder com IA |
| mLabs/Hootsuite | Agendamento Social | Redes Sociais |
| Linktree | Bio Links | Bio Links |
| Canva (parcial) | Criativos | Videos + Imagens com IA |
| Varias planilhas | Calendario conteudo | Calendario de Conteudo |
| Google Tag Manager | Tracking | Tracking integrado |

---

## Fluxo Principal: Onboarding Automatico

### 1. Criar Organizacao
- Nome, dominio, segmento de atuacao
- Dados basicos da empresa

### 2. Preencher Briefing (ja existe como Marketing > Estrategia)
- 36 perguntas em 12 secoes
- ICP (Ideal Customer Profile)
- Personas
- Tom de voz
- Diferenciais
- Objetivos de marketing

### 3. IA Gera Automaticamente:

#### 3.1 Estrategia de Marketing
- Posicionamento
- Proposta de valor
- Canais prioritarios
- Mensagens-chave por persona
- **JA EXISTE** (modulo Marketing com OpenRouter)

#### 3.2 Landing Page Principal
- Design baseado na estrategia
- Copy alinhada ao ICP
- Formulario com campos relevantes
- GTM configurado automaticamente:
  - Pixel Meta Ads
  - Google Ads tag
  - Google Analytics 4
  - Eventos de conversao
- Tracking completo (26 campos ocultos, UTMs, click IDs)
- Deploy automatico (Vercel + subdominio Cloudflare)
- **PARCIALMENTE EXISTE** (LP Builder funciona, falta auto-generate)

#### 3.3 Sequencias de Email
- **Boas-vindas:** Dispara quando lead preenche formulario
  - Email 1: Agradecimento + entrega do material
  - Email 2: Apresentacao da empresa
  - Email 3: Case de sucesso
- **Nutricao por Cargo:** Conteudo personalizado
  - Diretores: ROI, estrategia, cases
  - Gerentes: Operacional, processos, ferramentas
  - Analistas: Tutoriais, dicas praticas
- **Nutricao por Lead Scoring:**
  - Score baixo: Conteudo educativo, awareness
  - Score medio: Cases, comparativos, social proof
  - Score alto: Demo, reuniao, proposta
- **PARCIALMENTE EXISTE** (templates + campanhas, falta automacao de sequencias)

#### 3.4 Estrutura de Webinar (quando aplicavel)
- Landing Page dedicada com countdown
- Sequencia de emails:
  - Convite
  - Lembrete 1 dia antes
  - Lembrete 1 hora antes
  - Replay disponivel
  - Follow-up pos-webinar
- Pagina de obrigado com links
- Tracking de presenca
- **AGUARDANDO:** Estrutura do usuario (vai enviar)

#### 3.5 Mensagens WhatsApp
- Alinhadas a estrategia
- Templates por etapa do funil:
  - Captacao (primeiro contato)
  - Qualificacao
  - Nutricao
  - Conversao
  - Pos-venda
- Fluxos automaticos (substituir ManyChat):
  - Boas-vindas
  - Resposta por palavra-chave
  - Qualificacao automatica
  - Agendamento
  - Lembrete
- **PARCIALMENTE EXISTE** (modulo WhatsApp, falta flow builder visual)

#### 3.6 Dashboard com Plano de Acao
- Overview de TUDO que acontece na empresa
- KPIs por canal (email, WhatsApp, social, LP, ads)
- Graficos de tendencia
- **Plano de acao automatico:** IA analisa dados e sugere acoes
  - "Taxa de abertura caiu 15% — sugestao: testar novo subject line"
  - "LP com bounce rate alto — sugestao: revisar headline"
  - "Lead scoring medio subiu — hora de ativar campanha de conversao"
- **PRECISA CRIAR**

#### 3.7 Mapa de Calor
- Heatmap de cliques nas LPs
- Scroll depth
- Session recording
- Analise por dispositivo
- **PRECISA CRIAR**

---

## Tipos de Operacao Automatica

### Tipo A: Captacao de Leads (Padrao)
```
Briefing → LP + Form + GTM → Email boas-vindas → Nutricao por cargo/score → Conversao
```

### Tipo B: Webinar
```
Briefing → LP Webinar + Countdown → Emails (convite, lembretes, replay) → Follow-up → Conversao
```

### Tipo C: E-commerce / Produto
```
Briefing → LP Produto → Carrinho abandonado → Upsell/Cross-sell → Pos-compra
```

### Tipo D: Conteudo / Inbound
```
Briefing → Calendario conteudo → Posts social → Bio link → LP material rico → Nutricao
```

---

## Modulos Completos (Target)

### Core
1. **Auth** — Login, registro, org switcher
2. **Dashboard** — Overview completo + plano de acao IA
3. **Organizacao** — Briefing, ICP, Personas, Brand Identity

### Captacao
4. **Landing Pages** — Builder IA + deploy + GTM auto
5. **Formularios** — Embed + tracking + 26 campos ocultos
6. **SEO** — Audit, keywords, backlinks, Search Console
7. **Redes Sociais** — Agendamento, criacao IA, calendario

### Relacionamento
8. **Leads** — CRM com scoring, tags, jornada
9. **Segmentos** — Estaticos e dinamicos
10. **Campanhas Email** — Templates, envio, analytics
11. **Automacoes** — Sequencias, triggers, workflows visuais
12. **WhatsApp** — Templates, broadcasts, fluxos (ManyChat killer)
13. **Chatbot** — IA + regras + contexto da org

### Criativos
14. **Videos** — Ad Director (Nano Banana + Veo)
15. **Imagens** — Criativos estaticos IA (futuro)
16. **Copy** — Copywriting IA (futuro)
17. **Calendario Conteudo** — Planejamento + criacao + agendamento

### Analytics
18. **Tracking** — GTM integrado, eventos, atribuicao
19. **Mapa de Calor** — Heatmap, scroll, session recording
20. **Exportacao Publicos** — Meta Ads, Google Ads audiences
21. **Relatorios** — Por campanha, por canal, por periodo

### Web
22. **Bio Links** — Paginas de bio customizaveis

### Config
23. **Integracoes** — Wizard guiado para credenciais
24. **Settings** — Org, membros, API keys, dominio, campos, scoring, aparencia

---

## Arquitetura Multi-tenant

Cada organizacao e um universo independente:
- Briefing/Estrategia propria
- Leads separados por org_id (RLS)
- Chatbot com contexto da org
- Tracking filtrado por org (jornada do lead cross-org)
- Subdominios proprios (Cloudflare)
- Integrações proprias (API keys, tokens)
- Dashboard proprio

---

## Roadmap para OpenClaw

### Pre-requisito: Plataforma Redonda
1. Todos os modulos funcionando sem bugs
2. Documentacao completa de APIs e fluxos
3. Testes automatizados (pelo menos happy paths)
4. Onboarding automatico funcionando end-to-end

### Integracao OpenClaw
1. Agente de Marketing: analisa dados + sugere acoes
2. Agente de Conteudo: cria posts + emails + copies
3. Agente de Otimizacao: A/B tests, ajustes de LP, subject lines
4. Agente de Atendimento: chatbot evolui com aprendizado
5. Agente de Relatorios: gera reports + insights automaticos

---

## Itens Aguardando do Usuario

- [ ] Estrutura de webinar (template/fluxo)
- [ ] Estrutura de copy
- [ ] Ideias de criativos estaticos
- [ ] Arquivo de ideias para calendario de conteudo
- [ ] Prioridade de execucao das fases

---

*Este documento define o norte do produto. Cada modulo sera detalhado em docs separados conforme implementado.*
