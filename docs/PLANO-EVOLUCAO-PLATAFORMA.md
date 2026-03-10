# Plano de Evolucao — Plataforma de Marketing Automatizado

> Plano definitivo consolidado com TUDO discutido.
> Atualizado em: 2026-03-09
> Docs relacionados: VISAO-PRODUTO.md, METODO-HYESSER-ORGANICO.md, FLUXO-WHATSAPP-EVENTOS.md

---

## STATUS: Bugs Corrigidos Nesta Sessao

| # | Bug | Status |
|---|-----|--------|
| 1 | Chatbot — modelos IA invalidos para OpenRouter | ✅ CORRIGIDO |
| 2 | Segmentos — nome duplicado + operador not_equals | ✅ CORRIGIDO |
| 3 | Templates — save no editor visual Unlayer | ✅ CORRIGIDO |
| 4 | Forms embed — URL base errada | ✅ CORRIGIDO |
| 5 | Exportacao Publicos — "all" como UUID | ✅ CORRIGIDO |
| 6 | Bio Links — URLs /bio/ corrigidas para /b/ | ✅ CORRIGIDO |

---

## AGUARDANDO DO USUARIO (COBRAR!)

- [ ] **Estrutura de webinar** — fluxo/template de webinar que usa
- [ ] **Estrutura de copy** — modulo de copywriting
- [ ] **Ideias de criativos estaticos** — criacao de imagens para ads

---

## PLANO DE EXECUCAO (12 Fases)

---

### FASE 1 — Limpeza & Fundacao (1 dia)
> Remover o que nao precisa + garantir base solida

- [ ] **1.1** Remover tab White Label do Settings
- [ ] **1.2** Remover tab Idioma do Settings
- [ ] **1.3** Verificar `NEXT_PUBLIC_APP_URL` na Vercel
- [ ] **1.4** Testar todos os 6 fixes deployados
- [ ] **1.5** Rodar pente fino geral nos modulos restantes

**Arquivos:** `src/app/(dashboard)/settings/page.tsx`, componentes White Label e Idioma

---

### FASE 2 — Contexto por Organizacao (2-3 dias)
> Cada org e um universo. Tudo alimentado pelo briefing.

- [ ] **2.1** Garantir que `marketing_profiles` (briefing/ICP/persona) e carregado em todos os modulos
- [ ] **2.2** Criar helper `getOrgContext(orgId)` — retorna briefing + ICP + persona + tom de voz
- [ ] **2.3** Chatbot: system prompt alimentado automaticamente pelo briefing da org
- [ ] **2.4** LP Builder: contexto da org pre-carregado na IA
- [ ] **2.5** Tracking: filtrar dados por org_id (dashboards separados)
- [ ] **2.6** Tracking: jornada do lead mostra TODAS paginas visitadas (cross-org)

**Tabelas:** Ajustar queries de tracking para filtrar por org, manter jornada cross-org
**Referencia:** O briefing ja existe em `marketing_profiles`. Precisamos plugar nos modulos.

---

### FASE 3 — Onboarding Automatico (3-4 dias)
> Cliente preenche briefing → IA gera TUDO

- [ ] **3.1** Fluxo: Criar Org → Redireciona para Briefing (obrigatorio)
- [ ] **3.2** Ao finalizar briefing, IA gera automaticamente:
  - [ ] Estrategia de marketing completa (ja existe)
  - [ ] Landing Page principal (LP Builder com contexto)
  - [ ] 3 templates de email (boas-vindas, nutricao, conversao)
  - [ ] Sequencia de emails sugerida
  - [ ] Mensagens WhatsApp sugeridas
- [ ] **3.3** Tela de "Setup Completo" mostrando tudo que foi gerado
- [ ] **3.4** Checklist pos-setup: o que falta configurar (dominio, integrações, etc.)

**Dependencia:** Fase 2 (contexto por org precisa existir)

---

### FASE 4 — Dashboard Completo + Plano de Acao IA (2-3 dias)
> Visao 360 de tudo + IA sugere acoes

- [ ] **4.1** Redesign dashboard com KPIs de todos os modulos:
  - Leads (total, novos, por fonte)
  - Email (enviados, abertos, clicados, bounced)
  - Campanhas (ativas, performance)
  - Landing Pages (visitas, conversoes, taxa)
  - Formularios (submissions, taxa)
  - Redes Sociais (posts, engajamento)
  - Videos (projetos em andamento)
- [ ] **4.2** Linha do tempo de atividades recentes
- [ ] **4.3** Graficos de tendencia (periodo selecionavel)
- [ ] **4.4** **Plano de Acao IA:** Analisa dados e sugere acoes
  - "Taxa de abertura caiu 15% — testar novo subject line"
  - "LP com bounce rate alto — revisar headline"
  - "Lead scoring medio subiu — ativar campanha conversao"

**Referencia:** RD Station, HubSpot

---

### FASE 5 — Flow Builder WhatsApp (4-5 dias)
> Substituir ManyChat por completo

- [ ] **5.1** Editor visual drag-and-drop de fluxos
  - Blocos: Mensagem, Condicao, Smart Delay, Acao, Webhook
  - Conexoes visuais (edges) entre blocos
  - Preview de mensagem
- [ ] **5.2** Sistema de Tags por lead
  - CRUD de tags
  - Auto-tag por acao (clique botao, abriu msg)
  - Filtros por tag nos segmentos
  - Padrao nomenclatura: `[acao]_[tipo_evento]_[marca]`
- [ ] **5.3** Smart Delay com data/hora especifica
  - Wait Until (data/hora fixa com fuso)
  - Wait For (intervalo relativo)
- [ ] **5.4** Condicoes com ramificacao
  - Verificar tags (tem/nao tem)
  - Verificar campo do lead
  - Logica AND/OR
  - Caminho Verde (match) / Vermelho (no match)
- [ ] **5.5** Templates de fluxo pre-montados:
  - Webinar/Evento (4 fases, 11 msgs — doc Hyesser)
  - Boas-vindas
  - Nutricao por scoring
  - Pos-compra
- [ ] **5.6** Analytics de fluxo
  - Taxa entrega por msg
  - CTR botoes
  - Funil conversao por fase
  - Quem parou em qual etapa
- [ ] **5.7** Integracao webhook n8n para acoes externas

**Tabelas novas:** `automation_flows`, `automation_executions`, `lead_tags`
**Referencia:** docs/FLUXO-WHATSAPP-EVENTOS.md (padrao ManyChat completo)

---

### FASE 6 — Calendario de Conteudo + Metodo Hyesser (3-4 dias)
> Criacao de conteudo organico com IA seguindo os 4 pilares

- [ ] **6.1** Pagina de Calendario visual (mensal/semanal)
- [ ] **6.2** IA gera 30 dias de conteudo baseado em:
  - Briefing/ICP da org
  - Metodo Hyesser (4 pilares: Crescimento 44%, Conexao 22%, Quebra Objecoes 22%, Autoridade 12%)
- [ ] **6.3** Para cada post, IA gera:
  - Pilar + tipo + formato (reels, carrossel, post, stories)
  - Legenda/copy completa com hashtags e CTA
  - Prompt de imagem (para Nano Banana)
  - Horario sugerido
- [ ] **6.4** Geracao de criativos com IA
  - Imagens estaticas (Nano Banana via OpenRouter)
  - Carrosseis (sequencia de imagens)
  - Videos curtos (quando Veo disponivel)
- [ ] **6.5** Fluxo: Aprovar → Agendar → Postar automaticamente (n8n)
- [ ] **6.6** Analytics por post (engajamento, alcance)

**Tabela nova:** `content_calendar`
**Referencia:** docs/METODO-HYESSER-ORGANICO.md

---

### FASE 7 — Landing Pages: Deploy Independente (2-3 dias)
> Cada LP como projeto separado + subdominios futuros

- [ ] **7.1** Deploy cada LP como projeto separado na Vercel (API Deployments)
- [ ] **7.2** GTM auto-configurado na LP (Meta Pixel, Google Ads, GA4)
- [ ] **7.3** Chatbot da org integrado automaticamente nas LPs
- [ ] **7.4** Formulario da org embeddado na LP
- [ ] **7.5** Preparar infra para subdominios via Cloudflare API
  - `org.dominio.com.br/lp-nome`
  - DNS programatico
  - SSL automatico

**Dependencia:** Fase 2 (contexto org) + CLOUDFLARE_API_TOKEN

---

### FASE 8 — Integracoes UX (2 dias)
> Wizard guiado para cliente terceiro preencher

- [ ] **8.1** Redesign da pagina de integracoes
- [ ] **8.2** Card por servico com status (conectado/erro/nao configurado)
- [ ] **8.3** Wizard passo-a-passo com screenshots
- [ ] **8.4** Validacao de credenciais em tempo real (teste API key)
- [ ] **8.5** Servicos prioritarios:
  - MailerSend, Meta Ads, Google Ads, Google Analytics
  - Google Search Console, Cloudflare, Vercel, WhatsApp Business

---

### FASE 9 — SEO Avancado (3-5 dias)
> Nivel Semrush

- [ ] **9.1** Audit de paginas (meta tags, headings, alt, schema)
- [ ] **9.2** Rastreamento de palavras-chave (posicao Google)
- [ ] **9.3** Score de SEO por pagina (0-100)
- [ ] **9.4** Sugestoes de otimizacao por IA
- [ ] **9.5** Integracao Google Search Console (impressoes, cliques, CTR)
- [ ] **9.6** Analise de concorrentes (dominio vs dominio)
- [ ] **9.7** Core Web Vitals monitoring
- [ ] **9.8** Sitemap + robots.txt generator

**Referencia:** Semrush, Ahrefs

---

### FASE 10 — Mapa de Calor (3-4 dias)
> Tipo Clarity/Hotjar

- [ ] **10.1** Script JS leve para embeddar nas LPs
  - Captura: clicks, scroll depth, mouse movement, tempo por secao
- [ ] **10.2** Dashboard de heatmap (overlay visual sobre a LP)
- [ ] **10.3** Gravacao de sessoes (session replay)
- [ ] **10.4** Funil de conversao visual
- [ ] **10.5** Segmentacao por dispositivo (mobile vs desktop)
- [ ] **10.6** Integracao automatica nas LPs deployadas

**Tabelas novas:** `heatmap_events`, `heatmap_sessions`
**Referencia:** Microsoft Clarity, Hotjar

---

### FASE 11 — Reorganizacao Sidebar + UX (1-2 dias)
> Agrupar modulos em categorias logicas

```
Dashboard

Marketing
  ├ Estrategia
  ├ Calendario de Conteudo
  └ Copy (futuro)

Leads & Segmentos
  ├ Leads
  ├ Segmentos
  └ Formularios

Email Marketing
  ├ Campanhas
  ├ Templates
  └ Automacoes Email

Mensageria
  ├ WhatsApp (fluxos + broadcasts)
  ├ SMS
  └ Chatbot

Redes Sociais
  ├ Posts & Agendamento
  ├ Bio Links
  └ Analytics Social

Criativos
  ├ Videos (Ad Director)
  ├ Imagens (futuro)
  └ Carrosseis (futuro)

Web
  ├ Landing Pages
  ├ SEO
  └ Tracking & Heatmap

Exportacoes
  ├ Publicos (Meta/Google Ads)
  └ Relatorios

Configuracoes
  ├ Organizacao + Membros
  ├ Integracoes
  ├ Dominio + API Keys
  ├ Campos + Scoring
  └ Aparencia
```

---

### FASE 12 — Copy & Criativos Estaticos (AGUARDANDO)
> Depende de materiais do usuario

- [ ] **12.1** Modulo de Copy com IA (aguardando estrutura)
- [ ] **12.2** Criativos estaticos com IA (aguardando ideias)
- [ ] **12.3** Estrutura de webinar completa (aguardando template)

---

## RESUMO TIMELINE

| Fase | Nome | Dias | Dependencias |
|------|------|------|-------------|
| 1 | Limpeza & Fundacao | 1 | Nenhuma |
| 2 | Contexto por Org | 2-3 | — |
| 3 | Onboarding Automatico | 3-4 | Fase 2 |
| 4 | Dashboard + Plano IA | 2-3 | Fase 2 |
| 5 | Flow Builder WhatsApp | 4-5 | Fase 2 |
| 6 | Calendario Hyesser | 3-4 | Fase 2 |
| 7 | LP Deploy Independente | 2-3 | Fase 2 |
| 8 | Integracoes UX | 2 | — |
| 9 | SEO Avancado | 3-5 | — |
| 10 | Mapa de Calor | 3-4 | Fase 7 |
| 11 | Sidebar + UX | 1-2 | Apos maioria |
| 12 | Copy & Criativos | TBD | Materiais usuario |

**Paralelo possivel:** Fases 3+4+5+6+7 podem rodar em paralelo apos Fase 2
**Total estimado:** ~30-40 dias de desenvolvimento

---

## DOCUMENTACAO COMPLETA

| Documento | Conteudo |
|-----------|----------|
| `docs/VISAO-PRODUTO.md` | Visao macro, ferramentas substituidas, fluxo ideal, roadmap OpenClaw |
| `docs/METODO-HYESSER-ORGANICO.md` | 4 pilares, calendario, tipos conteudo, schema DB |
| `docs/FLUXO-WHATSAPP-EVENTOS.md` | 4 fases, 11 msgs, tags, smart delays, schema DB |
| `docs/PLANO-EVOLUCAO-PLATAFORMA.md` | Este documento — plano de execucao completo |
| `docs/VIDEO-MODULE-BEST-PRACTICES.md` | Modulo videos, bugs corrigidos, boas praticas |

---

*Plano definitivo. Atualizar conforme evolucao. Proximo passo: usuario confirma prioridade e comecamos pela Fase 1.*
