---
name: aieo-geo-implementation
description: >
  Skill de implementação de AIEO (AI Engine Optimization) e GEO (Generative Engine Optimization) para sites e conteúdos.
  Otimiza conteúdo para ser citado, recomendado e referenciado por motores de busca com IA (ChatGPT, Claude, Perplexity, Gemini, Google AI Overviews).
  Use SEMPRE que o usuário mencionar: SEO para IA, GEO, AEO, AIEO, AIO, SXO, otimização para busca generativa, visibilidade em IA,
  citabilidade, schema markup para IA, llms.txt, otimização para ChatGPT/Perplexity/Claude, "quero aparecer nas respostas da IA",
  "como ser citado por IA", featured snippets, AI Overviews, zero-click optimization, answer engine, ou qualquer variação desses termos.
  Também use quando o usuário pedir auditoria de SEO moderna, estratégia de conteúdo para 2025/2026, ou otimização omnichannel.
  O skill opera em 6 fases sequenciais com perguntas estratégicas ao usuário em cada fase.
---

# AIEO/GEO Implementation Skill

Skill completo para implementação de otimização para motores de busca generativos (AI Search Engines).
Baseado no estudo de Princeton/Georgia Tech (KDD 2024) que demonstrou até 40% de aumento em visibilidade,
combinado com práticas de mercado e frameworks consolidados.

## Filosofia

SEO tradicional foca em rankear em listas de resultados. AIEO/GEO foca em ser **citado, referenciado e recomendado**
pelas IAs quando respondem perguntas dos usuários. As duas disciplinas se complementam — SEO é fundação, AIEO/GEO é a camada de visibilidade em IA.

## As 6 Fases

O processo é dividido em fases sequenciais. **Sempre comece pela Fase 1** e avance conforme o usuário fornece informações.
Cada fase pode gerar entregas concretas (documentos, schemas, checklists, conteúdo otimizado).

```
FASE 1          FASE 2           FASE 3          FASE 4          FASE 5          FASE 6
─────────       ─────────        ─────────       ─────────       ─────────       ─────────
Contexto &      Auditoria        Estratégia      Implementação   Conteúdo        Monitoramento
Discovery       do Estado        de Conteúdo     Técnica         Otimizado       & Iteração
                Atual
```

---

## FASE 1: Contexto & Discovery (OBRIGATÓRIA)

**Objetivo**: Extrair o contexto profundo do negócio que vai além do que está óbvio no site.

### Perguntas Estratégicas para o Usuário

Faça estas perguntas ANTES de qualquer análise técnica. Agrupe em 2-3 blocos para não sobrecarregar:

**Bloco 1 — Identidade do Negócio:**
- Qual o site/URL principal?
- Qual o nicho exato e o público-alvo? (não aceite respostas genéricas — peça especificidade)
- Quais os 3-5 serviços/produtos principais que geram mais receita?
- Qual a região/cidade de atuação? (crítico para GEO local)
- Quem são os 3 principais concorrentes diretos?

**Bloco 2 — Diferenciação & Autoridade:**
- O que diferencia vocês dos concorrentes? (peça exemplos concretos, não slogans)
- Vocês têm dados próprios, pesquisas, cases com números reais?
- Há especialistas/fundadores com credenciais verificáveis? (certificações, publicações, prêmios)
- Vocês são citados em algum veículo de mídia, podcast, ou plataforma de terceiros?
- Existe presença ativa em fóruns/comunidades do nicho? (Reddit, Quora, grupos do LinkedIn, YouTube)

**Bloco 3 — Status Atual de Conteúdo:**
- O site tem blog? Com que frequência publica?
- Já têm schema markup implementado? Quais tipos?
- Já monitoram tráfego de IA? (GA4 mostra referrals de chatgpt.com, perplexity.ai etc.)
- Qual o CMS usado? (WordPress, custom, etc.)
- Existe um arquivo llms.txt no site?

### Saída da Fase 1
Gerar um documento `contexto-aieo.md` com:
- Resumo do negócio em formato que uma IA entenderia (entity-first)
- Mapa de entidades: Organização → Pessoas → Serviços → Localização → Indústria
- Gaps identificados (o que falta para ser "citável" por IA)
- Declaração do posicionamento desejado em respostas de IA

---

## FASE 2: Auditoria do Estado Atual

**Objetivo**: Avaliar o quão preparado o site está para ser citado por IAs.

### Checklist de Auditoria AIEO/GEO

Avaliar cada item numa escala 0-3 (0=inexistente, 1=básico, 2=bom, 3=excelente):

**A. Citabilidade do Conteúdo (baseado no estudo de Princeton)**
- [ ] Conteúdo inclui estatísticas e dados quantitativos
- [ ] Citações de fontes externas confiáveis presentes
- [ ] Citações/quotes de especialistas do setor
- [ ] Tom autoritativo sem ser arrogante
- [ ] Linguagem fluente e fácil de resumir
- [ ] Termos técnicos do domínio usados corretamente
- [ ] Passagens auto-contidas de 130-170 palavras (tamanho ideal para citação por IA)
- [ ] Respostas diretas em 2-3 linhas após cada subheading (formato Q&A)

**B. Estrutura Técnica para IA**
- [ ] Schema markup JSON-LD implementado (Organization, LocalBusiness, FAQ, HowTo, Article)
- [ ] Hierarquia de headings semântica (H1 > H2 > H3 com perguntas naturais)
- [ ] Meta descriptions otimizadas para resposta direta
- [ ] Robots.txt permite crawlers de IA (GPTBot, ClaudeBot, PerplexityBot, Google-Extended)
- [ ] Arquivo llms.txt presente e bem estruturado
- [ ] Sitemap.xml atualizado e sem erros
- [ ] Core Web Vitals em bom estado

**C. Autoridade de Entidade**
- [ ] Google Business Profile completo e otimizado
- [ ] Dados NAP consistentes em todas as plataformas
- [ ] Presença em Wikidata/Wikipedia (se aplicável)
- [ ] Profiles verificados em plataformas-chave do nicho
- [ ] Menções da marca em fontes que IAs costumam citar (Reddit, fóruns, mídia)
- [ ] Links de sites autoritativos apontando para o domínio

**D. Formato de Conteúdo AI-Friendly**
- [ ] TL;DR ou resumo no início dos artigos
- [ ] Seções FAQ com schema markup
- [ ] Tabelas comparativas (IAs adoram citar comparações)
- [ ] Listas estruturadas com contexto (não apenas bullet points secos)
- [ ] Definições claras de termos-chave (formato glossário inline)
- [ ] CTAs estruturados com opções claras

### Saída da Fase 2
Gerar um relatório `auditoria-aieo.md` com:
- Score geral (0-100) com breakdown por categoria
- Top 5 problemas críticos (ordenados por impacto)
- Top 3 pontos fortes
- Benchmark contra concorrentes (se URLs fornecidas)

---

## FASE 3: Estratégia de Conteúdo

**Objetivo**: Definir o plano de conteúdo otimizado para visibilidade em IA.

### Framework de Cluster Temático para IA

Para cada serviço/produto principal identificado na Fase 1:

1. **Pillar Page** (página pilar): Conteúdo abrangente de 2000-3000 palavras
   - Estruturado em formato "guia definitivo"
   - Inclui definições, processos, dados, comparações, FAQ
   - Linkagem interna para todas as spoke pages

2. **Spoke Pages** (páginas satélite): 5-10 artigos de 800-1500 palavras cada
   - Cada um responde UMA pergunta específica que o público faz
   - Pesquisar perguntas reais em: AlsoAsked, AnswerThePublic, PAA do Google, Reddit, Quora
   - Formato: Pergunta no H2 → Resposta direta em 2-3 linhas → Explicação profunda → Dados/Citações

3. **Content Blocks Citáveis**: Dentro de cada artigo, criar blocos de 130-170 palavras que:
   - São autocontidos (fazem sentido sozinhos fora de contexto)
   - Incluem pelo menos 1 dado estatístico ou citação
   - Respondem diretamente a uma pergunta específica
   - Podem ser copiados por uma IA como resposta

### Perguntas para o Usuário nesta Fase
- Quais as 10 perguntas que seus clientes mais fazem antes de comprar?
- Quais mitos ou mal-entendidos existem no seu mercado?
- Vocês têm dados/resultados próprios que podem ser transformados em conteúdo?
- Há termos técnicos do setor que o público precisa entender?

### Saída da Fase 3
Gerar `estrategia-conteudo-aieo.md` com:
- Mapa de clusters (pillar + spokes) para cada serviço principal
- Calendário editorial priorizado (quick wins primeiro)
- Lista de content blocks citáveis a criar
- Templates de estrutura para cada tipo de conteúdo

---

## FASE 4: Implementação Técnica

**Objetivo**: Implementar a infraestrutura técnica para IA.

### 4.1 Schema Markup

Gerar JSON-LD para:
- **Organization/LocalBusiness**: Com geo-coordenadas, área de atuação, sameAs para perfis sociais
- **Person**: Para fundadores/especialistas com credentials
- **FAQ**: Para cada seção de perguntas frequentes
- **HowTo**: Para guias passo-a-passo
- **Article/BlogPosting**: Para cada conteúdo do blog com author, datePublished, dateModified
- **BreadcrumbList**: Navegação estruturada
- **Product/Service**: Para páginas de serviços/produtos

Consultar `references/schema-templates.md` para templates prontos.

### 4.2 Arquivo llms.txt

Criar o arquivo `llms.txt` na raiz do site seguindo o padrão emergente:
```
# [Nome da Empresa]
> [Descrição curta em 1 linha]

## Sobre
[2-3 parágrafos descrevendo a empresa, serviços, diferenciação]

## Documentação
- [Página principal](URL): Descrição
- [Serviço A](URL): Descrição
- [Blog](URL): Descrição

## Contato
[Informações de contato]
```

### 4.3 Configuração de Robots.txt

Garantir que os crawlers de IA tenham acesso:
```
# AI Crawlers - Allow
User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: Amazonbot
Allow: /

User-agent: FacebookBot
Allow: /
```

### 4.4 Headers e Meta Tags AI-Friendly

Para cada página principal:
- Title tag: Formato "O que é [Termo] — [Resposta curta] | [Marca]"
- Meta description: Resposta direta à intenção de busca em 150-160 caracteres
- Heading H1: Formato pergunta ou declaração autoritativa
- Primeiro parágrafo: Definição/resposta direta (será usado como snippet)

### Saída da Fase 4
Gerar arquivos prontos para implementação:
- `schemas/` — JSONs de schema markup por página
- `llms.txt` — Arquivo pronto
- `robots-txt-additions.txt` — Linhas para adicionar
- `meta-tags-otimizadas.md` — Lista de title/description por página

---

## FASE 5: Conteúdo Otimizado

**Objetivo**: Criar/reescrever conteúdo aplicando os 9 métodos GEO de Princeton.

### Os 9 Métodos GEO (Princeton, KDD 2024)

Aplicar ao criar/otimizar cada peça de conteúdo:

1. **Cite Sources** (+40% visibilidade) — Adicionar citações de fontes confiáveis
2. **Quotation Addition** (+30% visibilidade) — Incluir citações diretas de especialistas
3. **Statistics Addition** (+30% visibilidade) — Inserir dados quantitativos
4. **Fluency Optimization** — Melhorar fluidez e legibilidade
5. **Authoritative Tone** — Escrever com confiança e autoridade
6. **Easy-to-Understand** — Simplificar linguagem sem perder profundidade
7. **Technical Terms** — Usar terminologia do domínio corretamente
8. **Unique Words** — Adicionar vocabulário diferenciado
9. **Keyword Optimization** — Integrar keywords naturalmente (NÃO keyword stuffing)

### GEO Writing Stack (Estrutura de cada seção)

Para cada seção de conteúdo, usar esta estrutura em camadas:

```
1. Q-Style Subhead (H2/H3 em formato de pergunta)
2. Resposta Direta (2-3 linhas que respondem a pergunta)
3. Explicação Profunda (contexto, nuances, processo)
4. Ferramenta/Exemplo (caso real, ferramenta mencionada)
5. Estatística/Fonte (dado quantitativo com link)
6. Link Interno + Externo (construir clusters + credibilidade)
```

### Checklist por Conteúdo
Antes de publicar, verificar:
- [ ] Tem pelo menos 3 citações de fontes externas confiáveis
- [ ] Tem pelo menos 2 estatísticas com fonte
- [ ] Tem pelo menos 1 citação/quote de especialista
- [ ] Primeiro parágrafo responde a pergunta principal diretamente
- [ ] Existe seção FAQ com 3-5 perguntas
- [ ] Schema markup gerado e pronto para implementação
- [ ] Pelo menos 2 "content blocks citáveis" de 130-170 palavras
- [ ] Links internos para pillar page e spoke pages relacionadas
- [ ] Links externos para 2-3 fontes autoritativas

### Saída da Fase 5
Conteúdo otimizado pronto, com:
- Texto formatado em Markdown com hierarquia semântica
- Schema markup embutido
- Notas de implementação (onde publicar, como linkar)

---

## FASE 6: Monitoramento & Iteração

**Objetivo**: Medir resultados e iterar.

### Métricas para Monitorar

1. **AI Share of Voice**: Testar queries do seu nicho em ChatGPT, Perplexity, Claude, Gemini
   - A sua marca é mencionada? Citada? Recomendada?
   - Com que frequência vs concorrentes?

2. **AI Referral Traffic** (GA4):
   - Fonte: chatgpt.com, perplexity.ai, claude.ai
   - Volume e tendência mensal
   - Taxa de conversão comparada a organic search

3. **Featured Snippets e AI Overviews**:
   - Monitorar via Search Console quais queries ativam AI Overviews
   - Verificar se seu conteúdo é citado nessas respostas

4. **Citabilidade Score**:
   - Periodicamente testar conteúdos-chave nas IAs
   - Registrar se está sendo citado, parafraseado ou ignorado

### Cadência de Iteração
- **Semanal**: Testar 3-5 queries-chave nas IAs, registrar resultados
- **Mensal**: Revisar métricas de tráfego de IA, atualizar conteúdos top
- **Trimestral**: Auditoria completa (repetir Fase 2), ajustar estratégia

### Perguntas para o Usuário nesta Fase
- Quais queries são mais importantes para o negócio?
- Vocês já testaram buscar pela própria marca nas IAs?
- Houve mudanças no mercado/serviços desde a última auditoria?

---

## Regras de Operação

1. **Sempre comece pela Fase 1** — sem contexto, tudo que vier depois será genérico
2. **Faça perguntas ativas** — não aceite contexto superficial, extrapole
3. **Entregue artefatos concretos** — cada fase deve gerar um documento ou arquivo utilizável
4. **Adapte ao nível do usuário** — se é técnico, vá mais fundo; se é gestor, foque em estratégia
5. **Priorize quick wins** — identifique o que dá resultado mais rápido com menos esforço
6. **Língua**: Responda no idioma do usuário. Todo conteúdo otimizado deve ser no idioma do site-alvo.

## Referências

Para templates de schema e exemplos detalhados, consultar:
- `references/schema-templates.md` — Templates JSON-LD prontos
- `references/geo-methods-detail.md` — Detalhamento dos 9 métodos GEO de Princeton
- `references/audit-scoring.md` — Sistema de pontuação detalhado para auditoria
