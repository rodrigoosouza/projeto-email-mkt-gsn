# Templum — Identidade Visual & Brand Guide

> Este arquivo é carregado automaticamente quando o cliente seleciona "Templum" no chat.
> Todas as variáveis aqui substituem os valores padrão do design-system.md.

---

## Dados da Empresa

- **Nome:** Templum
- **Segmento:** Governança corporativa, consultoria empresarial e tecnologia. 30+ anos de experiência em certificações (ISO, LGPD, ESG, SASSMAQ, PBQP-H, HACCP, FSSC 22000).
- **Proposta de valor:** Consultoria e tecnologia para governança corporativa — olhando para o futuro sem esquecer quem nos trouxe até aqui. Une tradição (30 anos de mercado) com inovação (IA, plataformas digitais).
- **Tom de voz:** Profissional e confiável, porém acessível e moderno. Equilibra autoridade técnica com proximidade humana.
- **Público-alvo:** Empresas de médio e grande porte que buscam certificações, conformidade regulatória, governança corporativa e transformação digital.

---

## Identidade Visual

### Cores

```css
:root {
  /* Cores Templum — Extraídas do Manual de Marca 2025 */
  --primary: #FF5925;           /* Laranja vibrante — cor principal */
  --primary-dark: #AF4022;      /* Laranja escuro/terracota */
  --primary-light: #FDA47D;     /* Pêssego claro */
  --primary-bg: rgba(255, 89, 37, 0.08); /* Fundo sutil laranja */
  --secondary: #222831;         /* Azul-marinho/carvão escuro */
  --accent: #FDB73F;            /* Âmbar/dourado — destaque para CTAs */

  /* Fundo — tema dark inspirado nas imagens futuristas do manual */
  --bg: #0a0a0f;                /* Fundo principal escuro */
  --bg-alt: #141420;            /* Fundo alternativo */
  --surface: #1a1a2e;           /* Superfície de cards */

  /* Texto — adaptado para tema dark */
  --text: #FFF4DD;              /* Creme claro (do manual) — texto principal */
  --text-secondary: #FDA47D;    /* Pêssego — texto secundário */
  --text-muted: #6b7280;        /* Cinza neutro — texto discreto */

  /* Bordas */
  --border: rgba(255, 89, 37, 0.15);
  --border-light: rgba(255, 89, 37, 0.08);

  /* Sombra primária (para botões e CTAs) */
  --shadow-primary: 0 8px 32px rgba(255, 89, 37, 0.3);
}
```

**Paleta completa do manual (referência):**
- `#AF4022` — Laranja escuro/terracota
- `#FF5925` — Laranja vibrante (PRIMARY)
- `#FDA47D` — Pêssego claro
- `#FDD88C` — Dourado claro
- `#FFF4DD` — Creme
- `#000000` — Preto
- `#222831` — Carvão escuro
- `#4F251B` — Marrom escuro
- `#FDB73F` — Âmbar/dourado
- `#FFEE0D` — Amarelo vibrante

### Tema (Light ou Dark)

- **Tema padrão:** dark
  <!-- Baseado no estilo de imagens do manual: ambientes futuristas, tech, circuitos, robôs, tons de laranja/neon sobre fundos escuros -->

### Fontes

```css
:root {
  --font-main: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-accent: 'Montserrat', sans-serif;
}
```

**Google Fonts import:**
```html
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap" rel="stylesheet">
```

**Pesos utilizados:**
- **ExtraBold (800):** Headlines (h1, h2)
- **Bold (700):** Subtítulos, botões
- **SemiBold (600):** h3, labels
- **Medium (500):** Corpo de texto com destaque
- **Regular (400):** Corpo de texto padrão

### Logo

- **Arquivo do logo:** assets/logos/templum-logo.jpeg
- **URL do logo (produção):** {{LOGO_URL}} <!-- PREENCHER após hospedar em CDN/Vercel -->
- **Favicon URL:** {{FAVICON_URL}} <!-- PREENCHER -->
- **Alt text:** "Templum - Consultoria e Tecnologia em Governança"
- **Descrição do logo:** Wordmark "Templum" com símbolo de exclamação "!" integrado. Variantes: horizontal e vertical, sobre fundos escuro, laranja e creme.

---

## Estilo de Copy

### Tom de Voz
Templum comunica com autoridade técnica construída em 30 anos de mercado, mas de forma acessível e moderna. Equilibra tradição e inovação — mostra solidez sem parecer antiquada. Usa linguagem direta e profissional, mas nunca fria. Em headlines, prefere frases curtas e impactantes que transmitam confiança e resultado. O conceito central é "olhar para o futuro sem esquecer quem nos trouxe até aqui".

### Palavras-chave da Marca
- Governança
- Certificação
- Conformidade
- Inovação
- Tecnologia
- Resultado
- Excelência
- Transformação digital

### Palavras a Evitar
- Barato / econômico (posicionamento premium)
- Complicado / burocrático
- Tentativa / experimental (transmitir certeza)

### Estilo de Headlines
- **Formato preferido:** Afirmação bold com resultado implícito. Pode usar pergunta retórica quando abordar dor do público.
- **Tamanho ideal:** 5-10 palavras

### Estilo de CTA
- **Tom do CTA:** Imperativo direto com senso de ação — transmite confiança e urgência sutil
- **Exemplos de CTAs da marca:**
  - "QUERO FALAR COM UM ESPECIALISTA"
  - "SOLICITAR DIAGNÓSTICO GRATUITO"
  - "AGENDAR CONSULTORIA"

---

## Configurações Técnicas

### Tracking
- **Cookie Domain:** {{COOKIE_DOMAIN}} <!-- Ex: .templum.com.br — PREENCHER -->
- **GTM Web Container ID:** GTM-WLFN684J
- **GTM Server Container URL:** {{GTM_SERVER_URL}} <!-- PREENCHER -->
- **GA4 Measurement ID:** {{GA4_ID}} <!-- PREENCHER -->
- **Meta Pixel ID:** {{META_PIXEL_ID}} <!-- PREENCHER -->
- **Google Ads Tag:** {{GADS_TAG}} <!-- PREENCHER -->

### Webhook
- **URL padrão do webhook (n8n):** {{WEBHOOK_URL}} <!-- PREENCHER -->

### Deploy
- **Domínio de produção:** {{DOMINIO_PRODUCAO}} <!-- Ex: lp.templum.com.br — PREENCHER -->
- **Vercel Team ID:** {{VERCEL_TEAM_ID}} <!-- PREENCHER -->
- **Vercel Project ID:** {{VERCEL_PROJECT_ID}} <!-- PREENCHER -->

---

## Seções Padrão para LPs Templum

Quando o cliente não especificar seções, usar este layout padrão:

1. **Hero** — Headline impactante + subtítulo + CTA laranja vibrante + background dark com grid sutil
2. **Social Proof** — Logos de clientes ou badge "+500 empresas certificadas" / "30 anos de mercado"
3. **Problema** — 3 pain points do público-alvo (compliance, riscos, ineficiência)
4. **Solução** — Como a Templum resolve (Consultoria + Tecnologia + Experiência)
5. **Benefícios** — Grid de 4-6 benefícios com ícones SVG outline em laranja
6. **Depoimentos** — 2-3 depoimentos de clientes (cards com fundo surface)
7. **CTA Final** — Formulário de captura com destaque âmbar + texto de urgência
8. **FAQ** — 4-5 perguntas frequentes com accordion
9. **Footer** — Logo + copyright + links legais

---

## Assets & Imagens

### Banco de Imagens Padrão
- **Hero background:** {{IMG_HERO_BG}} <!-- Imagem futurista, tech, circuitos com tons de laranja -->
- **Ícone benefício 1:** {{IMG_ICON_1}}
- **Ícone benefício 2:** {{IMG_ICON_2}}
- **Foto depoimento 1:** {{IMG_DEPO_1}}
- **Foto depoimento 2:** {{IMG_DEPO_2}}

### Estilo Visual
- **Estilo de imagens:** Futuristas e tech-inspired — ambientes digitais, circuitos, robôs, IA, tons de laranja e neon sobre fundos escuros. Transmite inovação e futuro.
- **Estilo de ícones:** SVG outline em laranja (#FF5925) sobre fundo escuro. Linhas finas e modernas.
- **Cantos dos cards:** Arredondados (12px — var(--radius))
- **Efeitos especiais (tema dark):** Background grid sutil, glow effects no hero, texto gradiente no h1, borda com glow nos cards de destaque

### Sub-marcas (certificações)
A Templum possui sub-marcas para cada certificação que oferece:
ISO 9001, ISO 14001, ISO 27001, ISO 37001, ISO 37301, ISO 45001, LGPD, PBQP-H, HACCP, FSSC 22000, ESG, SGI, SASSMAQ, Auditoria.
Cada uma pode ser referenciada em LPs específicas de produto/serviço.
