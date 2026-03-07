# Evolutto — Identidade Visual & Brand Guide

> Este arquivo é carregado automaticamente quando o cliente seleciona "Evolutto" no chat.
> Todas as variáveis aqui substituem os valores padrão do design-system.md.

---

## Dados da Empresa

- **Nome:** Evolutto
- **Segmento:** Plataforma/SaaS para escalar consultorias. Software de gestão e escalabilidade para empresas de consultoria e serviços profissionais.
- **Proposta de valor:** Plataforma que permite consultorias escalar suas operações — da entrega manual ao modelo de franquia/licenciamento. Tecnologia para transformar conhecimento em produto escalável.
- **Tom de voz:** Inovador e acessível, tecnológico mas próximo. Comunica com energia e modernidade, transmitindo que escalar consultoria é possível e prático.
- **Público-alvo:** Donos de consultorias, especialistas e profissionais de serviço que querem escalar suas operações, licenciar metodologias ou criar franquias de conhecimento.

---

## Identidade Visual

### Cores

```css
:root {
  /* Cores Evolutto — Extraídas do Social Guide 2023 */
  --primary: #3363FF;           /* Azul vibrante — cor principal */
  --primary-dark: #2850cc;      /* Azul escurecido para hover */
  --primary-light: #6b8cff;     /* Azul claro */
  --primary-bg: rgba(51, 99, 255, 0.08); /* Fundo sutil azul */
  --secondary: #D93E3F;         /* Vermelho — cor secundária de destaque */
  --accent: #6959DC;            /* Roxo — cor de accent */

  /* Fundo — tema dark com gradiente (conforme social guide) */
  --bg: #222222;                /* Fundo principal escuro */
  --bg-alt: #1a1a2e;            /* Fundo alternativo com toque azulado */
  --surface: #2a2a3e;           /* Superfície de cards */

  /* Texto — adaptado para fundo escuro */
  --text: #ffffff;              /* Branco — texto principal */
  --text-secondary: #d1d5db;    /* Cinza claro — texto secundário */
  --text-muted: #9ca3af;        /* Cinza — texto discreto */

  /* Bordas */
  --border: rgba(51, 99, 255, 0.2);
  --border-light: rgba(51, 99, 255, 0.1);

  /* Sombra primária (para botões e CTAs) */
  --shadow-primary: 0 8px 32px rgba(51, 99, 255, 0.3);
}
```

**Paleta completa do manual (referência):**

Cores principais:
- `#FFFFFF` — Branco
- `#3363FF` — Azul vibrante (PRIMARY)
- `#D93E3F` — Vermelho
- `#222222` — Escuro/preto

Cores de elementos:
- `#6959DC` — Roxo
- `#DB697A` — Rosa
- `#F3C87F` — Dourado/âmbar

Gradiente da marca:
- `#222222` → `#2D5EFF` (escuro para azul)

### Tema (Light ou Dark)

- **Tema padrão:** dark
  <!-- Social Guide 2023 usa predominantemente fundos escuros com gradiente dark→azul. -->

### Fontes

```css
:root {
  --font-main: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-accent: 'Inter', sans-serif;
}
```

**Google Fonts import:**
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

**Tipografia do manual:**
- **Inter Bold (700)** — Headlines/cabeçalhos
- **Inter Regular (400)** — Corpo/body text

**Pesos utilizados:**
- **Bold (700):** Headlines (h1, h2), botões
- **SemiBold (600):** h3, labels, destaques
- **Medium (500):** Corpo de texto com destaque
- **Regular (400):** Corpo de texto padrão

### Design System (do Social Guide)
- **Margens:** 30px
- **Border radius dos cards:** 38px (bem arredondado — estilo moderno)
- **Grid:** Layouts para 1080x1920 (stories), 1200x628 (meta ads), 1080x1080 (feed)

### Logo

- **Arquivo do logo:** assets/logos/evolutto-logo.jpeg
- **URL do logo (produção):** {{LOGO_URL}} <!-- PREENCHER após hospedar em CDN/Vercel -->
- **Favicon URL:** {{FAVICON_URL}} <!-- PREENCHER -->
- **Alt text:** "Evolutto - Plataforma para Escalar Consultorias"
- **Descrição do logo:** Wordmark "Evolutto" em azul vibrante. Estilo moderno e tech.

---

## Estilo de Copy

### Tom de Voz
Evolutto comunica com energia e modernidade — é a marca que mostra que escalar consultoria é possível. O tom é próximo e motivador, com base tecnológica. Usa linguagem que inspira ação e mostra resultados concretos. Evita ser acadêmica ou distante — prefere falar a língua do consultor que quer crescer. Combina profissionalismo com acessibilidade.

### Palavras-chave da Marca
- Escalar
- Consultoria
- Plataforma
- Metodologia
- Licenciamento
- Franquia
- Crescimento
- Tecnologia

### Palavras a Evitar
- Complicado / difícil (mostrar que é acessível)
- Tradicional / convencional (posicionamento inovador)
- Limitado (transmitir possibilidade e escala)

### Estilo de Headlines
- **Formato preferido:** Benefício direto com energia. Pode usar números e resultados concretos. Tom de possibilidade e transformação.
- **Tamanho ideal:** 5-10 palavras

### Estilo de CTA
- **Tom do CTA:** Convite energético — combina urgência com acessibilidade
- **Exemplos de CTAs da marca:**
  - "QUERO ESCALAR MINHA CONSULTORIA"
  - "CONHECER A PLATAFORMA"
  - "AGENDAR DEMONSTRAÇÃO"

---

## Configurações Técnicas

### Tracking
- **Cookie Domain:** {{COOKIE_DOMAIN}} <!-- Ex: .evolutto.com.br — PREENCHER -->
- **GTM Web Container ID:** GTM-PCS96CR
- **GTM Server Container URL:** {{GTM_SERVER_URL}} <!-- PREENCHER -->
- **GA4 Measurement ID:** {{GA4_ID}} <!-- PREENCHER -->
- **Meta Pixel ID:** {{META_PIXEL_ID}} <!-- PREENCHER -->
- **Google Ads Tag:** {{GADS_TAG}} <!-- PREENCHER -->

### Webhook
- **URL padrão do webhook (n8n):** {{WEBHOOK_URL}} <!-- PREENCHER -->

### Deploy
- **Domínio de produção:** {{DOMINIO_PRODUCAO}} <!-- Ex: lp.evolutto.com.br — PREENCHER -->
- **Vercel Team ID:** {{VERCEL_TEAM_ID}} <!-- PREENCHER -->
- **Vercel Project ID:** {{VERCEL_PROJECT_ID}} <!-- PREENCHER -->

---

## Seções Padrão para LPs Evolutto

Quando o cliente não especificar seções, usar este layout padrão:

1. **Hero** — Headline motivadora + subtítulo com resultado + CTA azul vibrante + fundo gradiente dark→azul
2. **Social Proof** — Logos de consultorias que usam ou números (+X consultorias escalando)
3. **Problema** — 3 dores do consultor (entrega manual, tempo limitado, dificuldade de escalar)
4. **Solução** — Como a Evolutto resolve: Plataforma + Metodologia + Escalabilidade
5. **Benefícios** — Grid de 4-6 benefícios com ícones coloridos (paleta de elementos)
6. **Como Funciona** — 3-4 passos para escalar (visual e objetivo)
7. **Depoimentos** — 2-3 depoimentos de consultores (cards com border-radius 38px)
8. **CTA Final** — Formulário de captura com fundo dark + destaque azul
9. **FAQ** — 4-5 perguntas frequentes com accordion
10. **Footer** — Logo + copyright + links legais

---

## Assets & Imagens

### Banco de Imagens Padrão
- **Hero background:** {{IMG_HERO_BG}} <!-- Gradiente #222222 → #2D5EFF ou imagem tech -->
- **Ícone benefício 1:** {{IMG_ICON_1}}
- **Ícone benefício 2:** {{IMG_ICON_2}}
- **Foto depoimento 1:** {{IMG_DEPO_1}}
- **Foto depoimento 2:** {{IMG_DEPO_2}}

### Estilo Visual
- **Estilo de imagens:** Moderno e tech — gradientes escuros com acentos em azul, roxo e rosa. Estilo digital/startup. Fotos de pessoas reais em contexto profissional.
- **Estilo de ícones:** Coloridos da paleta de elementos (roxo, rosa, dourado) ou SVG em azul sobre fundo escuro
- **Cantos dos cards:** Muito arredondados (38px — conforme design system do Social Guide)
- **Efeitos especiais (tema dark):** Gradiente de fundo #222→#2D5EFF, glow azul no hero, cards com border-radius 38px, elementos decorativos em roxo e rosa
