# Orbit Gestão — Identidade Visual & Brand Guide

> Este arquivo é carregado automaticamente quando o cliente seleciona "Orbit" no chat.
> Todas as variáveis aqui substituem os valores padrão do design-system.md.

---

## Dados da Empresa

- **Nome:** Orbit Gestão
- **Segmento:** Plataforma de IA para gestão empresarial. "Onde a Estratégia vira Execução." SaaS de inteligência artificial aplicada à gestão de negócios.
- **Proposta de valor:** Plataforma de IA que transforma estratégia em execução — pragmatismo radical, sistema sobre heróis. Inteligência artificial aplicada para gestão empresarial que entrega resultado real, não teoria.
- **Tom de voz:** Pragmática e direta, segura e provocadora, tecnológica mas humana. Posicionamento de especialista (Arquétipo: O Sábio). Menos adjetivos, mais verbos. Foco no problema.
- **Público-alvo:** Empresários, gestores e líderes que precisam transformar estratégia em execução prática com apoio de IA. Perfil pragmático, orientado a resultado.
- **Website:** orbitgestao.com.br

---

## Identidade Visual

### Cores

```css
:root {
  /* Cores Orbit — Extraídas do Manual de Identidade Jan/2026 */
  /* Paleta minimalista: preto + amarelo */
  --primary: #FDB73F;           /* Amarelo/âmbar — "Alerta da Inteligência" */
  --primary-dark: #e5a435;      /* Amarelo escurecido para hover */
  --primary-light: #fdd88c;     /* Amarelo claro */
  --primary-bg: rgba(253, 183, 63, 0.08); /* Fundo sutil amarelo */
  --secondary: #000000;         /* Preto — cor de base */
  --accent: #FDB73F;            /* Mesmo amarelo — usado como accent */

  /* Fundo — tema 100% dark */
  --bg: #000000;                /* Fundo principal preto puro */
  --bg-alt: #0a0a0a;            /* Fundo alternativo */
  --surface: #111111;           /* Superfície de cards */

  /* Texto — adaptado para fundo preto */
  --text: #ffffff;              /* Branco — texto principal */
  --text-secondary: #d1d5db;    /* Cinza claro — texto secundário */
  --text-muted: #6b7280;        /* Cinza — texto discreto */

  /* Bordas */
  --border: rgba(253, 183, 63, 0.2);
  --border-light: rgba(253, 183, 63, 0.1);

  /* Sombra primária (para botões e CTAs) */
  --shadow-primary: 0 8px 32px rgba(253, 183, 63, 0.25);
}
```

**Paleta completa do manual (referência):**
- `#000000` — Preto (base)
- `#FDB73F` — Amarelo/âmbar (primary — "alerta da inteligência")

### Tema (Light ou Dark)

- **Tema padrão:** dark
  <!-- Tema 100% dark conforme todo o manual de marca. Preto com acentos em amarelo. -->

### Fontes

```css
:root {
  /* Neo Tech NÃO está disponível no Google Fonts.
     Para LPs web, usar Poppins como fallback para headlines.
     Se o cliente fornecer a fonte Neo Tech hospedada, incluir via @font-face. */
  --font-main: 'Poppins', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-accent: 'Poppins', sans-serif;
  /* Alternativa se Neo Tech estiver hospedada:
     --font-accent: 'Neo Tech', 'Poppins', sans-serif; */
}
```

**Google Fonts import:**
```html
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap" rel="stylesheet">
```

**Tipografia do manual (referência):**
- **Neo Tech** — Headlines/cabeçalhos (fonte custom, não disponível no Google Fonts)
- **Poppins** — Corpo/body text (disponível no Google Fonts)

**Pesos utilizados:**
- **ExtraBold (800):** Headlines (h1, h2) — impacto máximo
- **Bold (700):** Subtítulos, botões
- **SemiBold (600):** h3, labels
- **Medium (500):** Corpo de texto com destaque
- **Regular (400):** Corpo de texto padrão

**Nota sobre Neo Tech:**
Se o cliente fornecer os arquivos .woff2/.woff da fonte Neo Tech, incluir via @font-face:
```css
@font-face {
  font-family: 'Neo Tech';
  src: url('/fonts/neotech-bold.woff2') format('woff2');
  font-weight: 700;
  font-display: swap;
}
```

### Logo

- **Arquivo do logo:** assets/logos/orbit-logo.jpeg
- **URL do logo (produção):** {{LOGO_URL}} <!-- PREENCHER após hospedar em CDN/Vercel -->
- **Favicon URL:** {{FAVICON_URL}} <!-- PREENCHER -->
- **Alt text:** "Orbit Gestão - Plataforma de IA para Gestão"
- **Descrição do logo:** Círculo "O" como marca (simbolizando orbita/ciclo) + wordmark "Orbit Gestão". O ponto amarelo no "O" simboliza a inteligência artificial. Variantes: amarelo sobre preto, preto sobre branco.

---

## Estilo de Copy

### Tom de Voz
Orbit comunica como O Sábio — com autoridade, profundidade e provocação inteligente. O tom é pragmático e direto: foca no problema, não na feature. Usa menos adjetivos e mais verbos de ação. Posiciona-se como especialista que já viu de tudo e sabe o caminho. Tecnológica mas humana — nunca robótica. O amarelo funciona como "alerta da inteligência", sinalizando insights e momentos de destaque.

### Valores Centrais (refletir na copy)
- **Pragmatismo Radical** — resultado acima de teoria
- **Inovação** — IA aplicada, não conceitual
- **Sistema sobre Heróis** — processos > pessoas individuais

### Palavras-chave da Marca
- Estratégia
- Execução
- Inteligência artificial
- Gestão
- Resultado
- Pragmatismo
- Sistema
- Performance

### Palavras a Evitar
- Fácil / simples (subestima o desafio do gestor)
- Mágica / milagre (contraria o pragmatismo)
- Talvez / quem sabe (transmitir certeza e autoridade)

### Estilo de Headlines
- **Formato preferido:** Afirmação provocadora e direta. Foco no problema ou no resultado. Pode usar contraste (ex: "Estratégia sem execução é apenas desejo").
- **Tamanho ideal:** 5-8 palavras

### Estilo de CTA
- **Tom do CTA:** Direto e provocador — convida a agir com confiança. Verbos de ação.
- **Exemplos de CTAs da marca:**
  - "QUERO VER NA PRÁTICA"
  - "TESTAR A PLATAFORMA"
  - "COMEÇAR AGORA"

---

## Configurações Técnicas

### Tracking
- **Cookie Domain:** {{COOKIE_DOMAIN}} <!-- Ex: .orbitgestao.com.br — PREENCHER -->
- **GTM Web Container ID:** GTM-W6H3729J
- **GTM Server Container URL:** {{GTM_SERVER_URL}} <!-- PREENCHER -->
- **GA4 Measurement ID:** {{GA4_ID}} <!-- PREENCHER -->
- **Meta Pixel ID:** {{META_PIXEL_ID}} <!-- PREENCHER -->
- **Google Ads Tag:** {{GADS_TAG}} <!-- PREENCHER -->

### Webhook
- **URL padrão do webhook (n8n):** {{WEBHOOK_URL}} <!-- PREENCHER -->

### Deploy
- **Domínio de produção:** {{DOMINIO_PRODUCAO}} <!-- Ex: lp.orbitgestao.com.br — PREENCHER -->
- **Vercel Team ID:** {{VERCEL_TEAM_ID}} <!-- PREENCHER -->
- **Vercel Project ID:** {{VERCEL_PROJECT_ID}} <!-- PREENCHER -->

---

## Seções Padrão para LPs Orbit

Quando o cliente não especificar seções, usar este layout padrão:

1. **Hero** — Headline provocadora + subtítulo pragmático + CTA amarelo vibrante + fundo preto puro
2. **Stats** — Números de impacto (empresas usando, % de resultado, tempo economizado)
3. **Problema** — 3 dores reais do gestor (foco no problema, linguagem direta)
4. **Solução** — Como a Orbit resolve: IA + Sistema + Execução
5. **Benefícios** — Grid de 4-6 benefícios com ícones minimalistas em amarelo
6. **Como Funciona** — 3-4 passos sequenciais (pragmáticos)
7. **Depoimentos** — 2-3 depoimentos de gestores (cards com borda amarela sutil)
8. **CTA Final** — Formulário de captura com fundo #111 + destaque amarelo
9. **FAQ** — 4-5 perguntas frequentes com accordion
10. **Footer** — Logo + copyright + links legais

---

## Assets & Imagens

### Banco de Imagens Padrão
- **Hero background:** {{IMG_HERO_BG}} <!-- Fundo preto puro ou com grid sutil -->
- **Ícone benefício 1:** {{IMG_ICON_1}}
- **Ícone benefício 2:** {{IMG_ICON_2}}
- **Foto depoimento 1:** {{IMG_DEPO_1}}
- **Foto depoimento 2:** {{IMG_DEPO_2}}

### Estilo Visual
- **Estilo de imagens:** Minimalista e bold — fundos pretos, elementos gráficos em amarelo, fotos de alto contraste. Estética tech-premium.
- **Estilo de ícones:** SVG minimalistas, linhas finas ou preenchidos em amarelo (#FDB73F) sobre fundo preto
- **Cantos dos cards:** Arredondados (12px — var(--radius))
- **Efeitos especiais (tema dark):** Background grid sutil em cinza muito escuro, glow amarelo no hero, destaque amarelo em palavras-chave do h1, bordas com glow amarelo em cards de destaque
