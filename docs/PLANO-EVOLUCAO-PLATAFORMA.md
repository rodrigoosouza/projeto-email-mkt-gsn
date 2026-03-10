# Plano de Evolucao — Plataforma de Email Marketing

> Documento consolidado com todos os bugs, melhorias e novas features.
> Atualizado em: 2026-03-09

---

## 1. BUGS CRITICOS (Corrigir Primeiro)

### 1.1 Bio Links — Pagina nao encontrada ❌
- **Problema:** Ao criar um bio link, mostra "pagina nao encontrada"
- **Causa provavel:** Rota publica para visualizar bio links inexistente ou quebrada
- **Impacto:** Feature completamente inutilizavel
- **Prioridade:** ALTA

### 1.2 Segmentos — Nome duplicado (CORRIGIDO ✅)
- Constraint `unique(org_id, name)` causava erro generico
- Fix: mensagem clara + operador `not_equals` adicionado

### 1.3 Templates — Save no editor visual (CORRIGIDO ✅)
- Unlayer ref nao exportava HTML ao clicar salvar
- Fix: fallback no ref do editor

### 1.4 Forms embed — URL errada (CORRIGIDO ✅)
- Embed usava `window.location.origin` em vez de `NEXT_PUBLIC_APP_URL`
- Fix: usar env var

### 1.5 Exportacao de Publicos — UUID invalido (CORRIGIDO ✅)
- "Todos os leads" enviava string "all" para campo UUID
- Fix: converter para null

### 1.6 Chatbot — Modelos IA invalidos (CORRIGIDO ✅)
- Nomes de modelos nao seguiam formato OpenRouter
- Fix: mapeamento de nomes legados

---

## 2. FEATURES PARA REMOVER

### 2.1 White Label
- **Acao:** Remover tab de Settings e toda a logica associada
- **Motivo:** Nao necessario neste momento

### 2.2 Idioma
- **Acao:** Remover tab de Settings
- **Motivo:** Plataforma sera em portugues por padrao

---

## 3. MELHORIAS EM FEATURES EXISTENTES

### 3.1 Dashboard — Visao Completa da Empresa
- **Problema atual:** Muito basico, poucos dados
- **Objetivo:** Dashboard centralizado que mostra TUDO da empresa
- **Deve incluir:**
  - KPIs principais: leads totais, novos leads (periodo), taxa conversao
  - Emails: enviados, abertos, clicados, bounced
  - Campanhas ativas e performance
  - Landing Pages: visitas, conversoes, taxa conversao
  - Formularios: submissions, taxa preenchimento
  - Redes Sociais: posts agendados, engajamento
  - Videos: projetos em andamento
  - Segmentos: tamanho dos segmentos principais
  - Linha do tempo de atividades recentes
- **Opcao:** Criar dashboards de marketing separados (sub-secao)
- **Referencia:** Painel tipo RD Station / HubSpot

### 3.2 SEO — Nivel Semrush
- **Problema atual:** Muito basico
- **Objetivo:** Ferramenta completa de SEO
- **Deve incluir:**
  - Audit de paginas (meta tags, heading structure, alt tags, etc.)
  - Rastreamento de palavras-chave (posicao no Google)
  - Analise de backlinks
  - Analise de concorrentes
  - Sugestoes de otimizacao por IA
  - Score de SEO por pagina
  - Monitoramento de Core Web Vitals
  - Sitemap e robots.txt generator
  - Integracao com Google Search Console
- **Referencia:** Semrush, Ahrefs, Ubersuggest

### 3.3 Integracoes — UX para Cliente Terceiro
- **Problema atual:** Muito tecnico, dificil para cliente preencher
- **Objetivo:** Wizard guiado para cada integracao
- **Deve incluir:**
  - Passo-a-passo visual para cada servico
  - Validacao de credenciais em tempo real
  - Status de conexao (conectado/desconectado/erro)
  - Botoes "Conectar" estilo OAuth quando possivel
  - Help text claro explicando onde encontrar cada credencial
  - Screenshots/links diretos para paineis dos servicos
- **Integracoes prioritarias:**
  - MailerSend (email)
  - Meta Ads (publicos)
  - Google Ads (publicos)
  - Google Analytics (tracking)
  - Google Search Console (SEO)
  - Cloudflare (dominios)
  - Vercel (deploys)

### 3.4 Redes Sociais — Automacao de Postagem
- **Problema atual:** Basico, sem automacao
- **Objetivo:** Agendar e postar automaticamente em cada perfil
- **Deve incluir:**
  - Conectar perfis (Instagram, Facebook, LinkedIn, Twitter/X, TikTok)
  - Calendario de conteudo visual (mensal/semanal)
  - Agendamento de posts
  - Criacao de conteudo com IA:
    - Carrosseis (series de imagens)
    - Posts estaticos (imagem + legenda)
    - Videos curtos (Reels/TikTok)
    - Stories
  - Aprovacao de conteudo antes de postar
  - Analytics por rede e por post
  - Integracao com estrategia de marketing (ICP/persona)
- **Automacao:** n8n para disparar posts nos horarios agendados
- **Referencia:** mLabs, Hootsuite, Buffer

### 3.5 Organizacao — Contexto Completo por Org
- **Objetivo:** Cada organizacao tem seu proprio universo
- **Deve incluir:**
  - Briefing completo (ja existe no modulo Marketing)
  - ICP e Personas (ja existe)
  - Brand Identity (ja existe)
  - Tom de voz e diretrizes de comunicacao
  - Chatbot adapta respostas ao contexto da org
  - Conteudo gerado pela IA usa o contexto da org
  - Dashboard personalizado por org
- **Importante:** Ja temos `marketing_profiles` com estrategia completa. Precisamos garantir que TODOS os modulos usem esse contexto.

---

## 4. NOVAS FEATURES

### 4.1 Mapa de Calor (tipo Clarity)
- **Objetivo:** Tracking visual de comportamento em LPs
- **Deve incluir:**
  - Heatmap de cliques
  - Scroll depth
  - Gravacao de sessoes (replay)
  - Tempo medio por secao
  - Funil de conversao visual
- **Implementacao:**
  - Script JS leve embeddado nas LPs
  - Coleta de eventos (click, scroll, mousemove)
  - Armazena no Supabase (tabela `heatmap_events`)
  - Dashboard de visualizacao com canvas/overlay
- **Referencia:** Microsoft Clarity, Hotjar

### 4.2 Calendario de Conteudo + Criacao com IA
- **Objetivo:** Planejar e criar conteudo organico integrado a estrategia
- **Fluxo:**
  1. Na secao Marketing, apos criar estrategia/ICP
  2. IA sugere calendario de conteudo (30 dias)
  3. Para cada dia: tipo de post, tema, copy, hashtags
  4. Gerar criativos automaticamente:
     - Carrosseis (imagens sequenciais)
     - Posts estaticos (Nano Banana)
     - Videos curtos (Veo quando disponivel)
  5. Aprovar → Agendar → Postar automaticamente
- **Integracao:** Usa contexto da org (ICP, persona, tom de voz)
- **Usuario pode:** Anexar arquivo com ideias de conteudo

### 4.3 Chatbot — Instalacao + Contexto por Org
- **Melhorias:**
  - Tab "Instalacao" com embed code + instrucoes passo-a-passo
  - Opcao de instalar automaticamente nas LPs da org
  - System prompt alimentado pelo briefing/ICP da org
  - Widget preview antes de instalar
  - Analytics de conversas

### 4.4 Tracking — Separar por Organizacao
- **Problema atual:** Dados de tracking misturados entre orgs
- **Solucao:**
  - Filtrar dashboards/relatorios por org_id
  - Jornada do lead mostra TODAS as paginas visitadas (cross-org)
  - Script de tracking identifica a org de origem
  - Cada org ve so seus dados, mas lead mostra tudo

### 4.5 Landing Pages — Deploy Independente
- **Hoje:** Deploy como arquivo unico no Vercel (projeto principal)
- **Objetivo:**
  - Cada LP = projeto separado na Vercel
  - Futuro: subdominio por org via Cloudflare
    - Ex: `templum.rodriguinhodomarketing.com.br/lp-nome`
    - Ex: `evolutto.rodriguinhodomarketing.com.br/lp-nome`
  - DNS gerenciado via API Cloudflare
  - SSL automatico via Cloudflare

### 4.6 Copy (FUTURO)
- **Status:** Usuario vai trazer estrutura propria em breve
- **Conceito:** Modulo de copywriting com IA
- **Aguardando:** Estrutura/arquivo do usuario

### 4.7 Criativos Estaticos (FUTURO)
- **Status:** Usuario vai trazer ideias em breve
- **Conceito:** Criacao de imagens para ads e social
- **Aguardando:** Ideias/estrutura do usuario

---

## 5. REORGANIZACAO DA SIDEBAR

### Proposta: Agrupar por Categoria

```
📊 Dashboard (visao geral)

📈 Marketing
   ├─ Estrategia (briefing, ICP, persona)
   ├─ Calendario de Conteudo
   └─ Copy (futuro)

👥 Leads & Segmentos
   ├─ Leads
   ├─ Segmentos
   └─ Formularios

📧 Email Marketing
   ├─ Campanhas
   ├─ Templates
   └─ Automacoes

📱 Redes Sociais
   ├─ Posts & Agendamento
   ├─ Bio Links
   └─ Analytics Social

🎬 Criativos
   ├─ Videos (Ad Director)
   ├─ Imagens (futuro)
   └─ Carrosseis (futuro)

🌐 Web
   ├─ Landing Pages
   ├─ SEO
   ├─ Tracking & Heatmap
   └─ Chatbot

📤 Exportacoes
   ├─ Publicos (Meta/Google Ads)
   └─ Relatorios

⚙️ Configuracoes
   ├─ Organizacao
   ├─ Membros
   ├─ API Keys
   ├─ Dominio de Email
   ├─ Campos Personalizados
   ├─ Lead Scoring
   ├─ Integracoes
   └─ Aparencia
```

**Removidos:** White Label, Idioma
**Nota:** WhatsApp e SMS podem ficar dentro de "Automacoes" ou como grupo separado "Mensageria"

---

## 6. ORDEM DE EXECUCAO SUGERIDA

### Fase 1 — Bugs & Limpeza (1-2 dias)
- [ ] Fix Bio Links (pagina nao encontrada)
- [ ] Remover White Label e Idioma do Settings
- [ ] Verificar NEXT_PUBLIC_APP_URL na Vercel
- [ ] Testar todos os fixes ja deployados

### Fase 2 — Organizacao por Org (2-3 dias)
- [ ] Tracking separado por org
- [ ] Chatbot com contexto da org
- [ ] Garantir que todos os modulos usam org context

### Fase 3 — Dashboard Completo (2-3 dias)
- [ ] Redesign do dashboard com todos os KPIs
- [ ] Cards por modulo com metricas
- [ ] Linha do tempo de atividades

### Fase 4 — Integracoes UX (1-2 dias)
- [ ] Wizard guiado para cada integracao
- [ ] Validacao de credenciais
- [ ] Status de conexao visual

### Fase 5 — Landing Pages + Deploy (2-3 dias)
- [ ] Deploy como projeto separado na Vercel
- [ ] Chatbot integrado nas LPs
- [ ] Preparacao para subdominios Cloudflare

### Fase 6 — Redes Sociais + Calendario (3-5 dias)
- [ ] Conectar perfis de redes sociais
- [ ] Calendario de conteudo visual
- [ ] Criacao de posts com IA (texto + imagem)
- [ ] Agendamento via n8n

### Fase 7 — SEO Avancado (3-5 dias)
- [ ] Audit de paginas
- [ ] Tracking de keywords
- [ ] Integracao Google Search Console
- [ ] Sugestoes de otimizacao por IA

### Fase 8 — Mapa de Calor (3-5 dias)
- [ ] Script de coleta de eventos
- [ ] Dashboard de heatmap
- [ ] Gravacao/replay de sessoes
- [ ] Integracao com LPs

### Fase 9 — Sidebar + UX (1-2 dias)
- [ ] Reorganizar navegacao em categorias
- [ ] Submenus colapsaveis
- [ ] Quick actions / search

### Fase 10 — Copy & Criativos (AGUARDANDO)
- [ ] Modulo de Copy (aguardando estrutura do usuario)
- [ ] Criativos Estaticos (aguardando ideias do usuario)

---

## 7. NOTAS TECNICAS

### Variaveis de Ambiente Necessarias
| Variavel | Servico | Status |
|----------|---------|--------|
| NEXT_PUBLIC_APP_URL | Vercel/App | Verificar na Vercel |
| OPENROUTER_API_KEY | IA (cenas, imagens, chatbot) | ✅ Configurado |
| GOOGLE_GEMINI_API_KEY | Videos (Veo 3) | ⚠️ Precisa billing |
| MAILERSEND_API_KEY | Emails | ✅ Configurado |
| VERCEL_ACCESS_TOKEN | Deploy LPs | ✅ Configurado |
| CLOUDFLARE_API_TOKEN | DNS (futuro) | ❌ Nao configurado |
| META_ADS_TOKEN | Exportacao publicos (futuro) | ❌ Nao configurado |
| GOOGLE_ADS_TOKEN | Exportacao publicos (futuro) | ❌ Nao configurado |

### Tabelas Novas Necessarias
- `heatmap_events` — clicks, scrolls, mouse para mapa de calor
- `heatmap_sessions` — sessoes de gravacao
- `content_calendar` — calendario de conteudo
- `social_scheduled_posts` — posts agendados
- `social_connections` — OAuth tokens por rede social
- Ajustes em: `tracking events` (add org_id filter), `bio_link_pages` (fix rota)

---

*Documento gerado e mantido pelo Claude Code. Atualizar conforme evolucao do projeto.*
