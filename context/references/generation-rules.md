# Generation Rules — Regras Técnicas de Geração HTML

> Regras que a Claude API DEVE seguir ao gerar o HTML da landing page.
> Este arquivo pode ser incluído no system prompt ou como contexto adicional.

---

## Estrutura Obrigatória do HTML

Toda LP gerada DEVE seguir esta anatomia exata:

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{TITULO_PAGINA}</title>
  <meta name="description" content="{META_DESCRIPTION}">

  <!-- Favicon -->
  <link rel="icon" href="{FAVICON_URL}" type="image/x-icon">

  <!-- Google Fonts -->
  <link href="https://fonts.googleapis.com/css2?family={FONTE}&display=swap" rel="stylesheet">

  <!-- Google Tag Manager (snippet carregado do brand file da empresa) -->
  <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
  new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
  j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
  'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
  })(window,document,'script','dataLayer','{GTM_CONTAINER_ID}');</script>
  <!-- GTM_CONTAINER_ID vem do brand file: Templum=GTM-WLFN684J | Orbit=GTM-W6H3729J | Evolutto=GTM-PCS96CR -->

  <!-- CSS completo inline -->
  <style>
    /* 1. Reset */
    /* 2. Variáveis CSS (:root) — valores do brand guide */
    /* 3. Tipografia */
    /* 4. Componentes (botões, cards, forms) */
    /* 5. Seções (hero, features, testimonials, etc.) */
    /* 6. Animações */
    /* 7. Responsividade (@media queries) */
    /* 8. Feedback visual do formulário */
  </style>
</head>
<body>
  <!-- Google Tag Manager (noscript) -->
  <noscript><iframe src="https://www.googletagmanager.com/ns.html?id={GTM_CONTAINER_ID}"
  height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>

  <!-- Backgrounds visuais (grid, glow) — se tema dark -->
  <div class="bg-grid"></div>
  <div class="bg-glow bg-glow--hero"></div>

  <!-- HEADER (se aplicável) -->
  <header>...</header>

  <!-- MAIN CONTENT -->
  <main>
    <!-- HERO SECTION -->
    <section class="hero">...</section>

    <!-- SEÇÕES DO BRIEFING (na ordem definida) -->
    <section class="features fade-in">...</section>
    <section class="testimonials fade-in">...</section>
    <!-- etc. -->

    <!-- CTA FINAL + FORMULÁRIO -->
    <section class="cta-section fade-in">
      <form id="lead-form">
        <!-- Campos visíveis -->
        <!-- Hidden inputs UTMs -->
        <!-- Hidden inputs Click IDs -->
        <!-- Hidden inputs Sessão -->
        <!-- Botão submit -->
      </form>
    </section>
  </main>

  <!-- FOOTER -->
  <footer>...</footer>

  <!-- SCRIPT DE TRACKING (obrigatório — antes do </body>) -->
  <script>
    /* Código completo de references/tracking-integration.md */
  </script>

</body>
</html>
```

---

## CSS — Regras de Estilo

### Variáveis Obrigatórias no :root

```css
:root {
  /* Cores (do brand guide) */
  --primary: ...;
  --primary-dark: ...;
  --primary-light: ...;
  --primary-bg: ...;
  --secondary: ...;
  --bg: ...;
  --bg-alt: ...;
  --surface: ...;
  --text: ...;
  --text-secondary: ...;
  --text-muted: ...;
  --border: ...;
  --success: #22c55e;
  --error: #ef4444;

  /* Espaçamento */
  --section-py: 80px;
  --section-py-lg: 120px;
  --container-px: 20px;
  --max-width: 1200px;

  /* Bordas e sombras */
  --radius: 12px;
  --radius-sm: 8px;
  --radius-lg: 20px;
  --shadow-primary: ...;

  /* Transição padrão */
  --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  /* Fontes (do brand guide) */
  --font-main: ...;
  --font-accent: ...;
}
```

### Tipografia Obrigatória

- `h1`: `clamp(36px, 6vw, 64px)`, weight 800, line-height 1.1
- `h2`: `clamp(28px, 4vw, 44px)`, weight 700, line-height 1.2
- `h3`: `clamp(20px, 3vw, 28px)`, weight 600, line-height 1.3
- `p`: 16px, line-height 1.7, color var(--text-secondary)

### Responsividade Obrigatória

```css
/* Mobile first — valores base */

@media (min-width: 768px) {
  :root { --section-py: 100px; --container-px: 32px; }
  /* Grids em 2+ colunas */
}

@media (min-width: 1024px) {
  :root { --section-py: 120px; --container-px: 40px; }
  /* Layout expandido */
}
```

---

## Formulário — Estrutura Obrigatória

### Campos Visíveis Padrão (SEMPRE incluir estes 6 campos)

Estes são os campos padrão que TODO formulário deve ter. Aplicável a TODAS as empresas (Templum, Evolutto, Orbit):

```html
<!-- ===== CAMPOS VISÍVEIS PADRÃO (6 campos obrigatórios) ===== -->
<div class="form-group">
  <label for="name">Nome completo</label>
  <input type="text" id="name" name="name" placeholder="Seu nome completo" required autocomplete="name">
</div>

<div class="form-group">
  <label for="email">E-mail</label>
  <input type="email" id="email" name="email" placeholder="seu@email.com" required autocomplete="email">
</div>

<div class="form-group">
  <label for="phone">WhatsApp</label>
  <input type="tel" id="phone" name="phone" placeholder="(00) 00000-0000" required autocomplete="tel">
</div>

<div class="form-group">
  <label for="company">Empresa</label>
  <input type="text" id="company" name="company" placeholder="Nome da sua empresa" required autocomplete="organization">
</div>

<div class="form-group">
  <label for="role">Cargo</label>
  <input type="text" id="role" name="role" placeholder="Seu cargo" autocomplete="organization-title">
</div>

<div class="form-group">
  <label for="revenue">Faturamento mensal</label>
  <select id="revenue" name="revenue" required>
    <option value="" disabled selected>Selecione o faturamento</option>
    <option value="ate-50k">Até R$ 50 mil</option>
    <option value="50k-100k">R$ 50 mil a R$ 100 mil</option>
    <option value="100k-500k">R$ 100 mil a R$ 500 mil</option>
    <option value="500k-1m">R$ 500 mil a R$ 1 milhão</option>
    <option value="acima-1m">Acima de R$ 1 milhão</option>
  </select>
</div>
```

**Resumo dos campos padrão:**
| # | Campo | name | Tipo | Obrigatório |
|---|-------|------|------|-------------|
| 1 | Nome completo | `name` | text | Sim |
| 2 | E-mail | `email` | email | Sim |
| 3 | WhatsApp | `phone` | tel | Sim |
| 4 | Empresa | `company` | text | Sim |
| 5 | Cargo | `role` | text | Não |
| 6 | Faturamento | `revenue` | select | Sim |

### Hidden Inputs Obrigatórios (NUNCA omitir)

```html
<!-- UTMs (5 campos) -->
<input type="hidden" name="utm_source" data-field-id="utm_source">
<input type="hidden" name="utm_medium" data-field-id="utm_medium">
<input type="hidden" name="utm_campaign" data-field-id="utm_campaign">
<input type="hidden" name="utm_content" data-field-id="utm_content">
<input type="hidden" name="utm_term" data-field-id="utm_term">

<!-- Click IDs (10 campos) -->
<input type="hidden" name="gclid" data-field-id="gclid">
<input type="hidden" name="fbclid" data-field-id="fbclid">
<input type="hidden" name="gbraid" data-field-id="gbraid">
<input type="hidden" name="wbraid" data-field-id="wbraid">
<input type="hidden" name="ttclid" data-field-id="ttclid">
<input type="hidden" name="gad_campaignid" data-field-id="gad_campaignid">
<input type="hidden" name="gad_source" data-field-id="gad_source">
<input type="hidden" name="msclkid" data-field-id="msclkid">
<input type="hidden" name="li_fat_id" data-field-id="li_fat_id">
<input type="hidden" name="sck" data-field-id="sck">

<!-- Sessão (4 campos) -->
<input type="hidden" name="session_id" id="hidden_session_id">
<input type="hidden" name="landing_page" data-field-id="landing_page">
<input type="hidden" name="origin_page" data-field-id="origin_page">
<input type="hidden" name="session_attributes_encoded" data-field-id="session_attributes_encoded">
```

**Total: 19 hidden inputs obrigatórios em todo formulário.**

---

## Tracking — Script Obrigatório

O script completo de `references/tracking-integration.md` DEVE ser incluído antes do `</body>`.

Configurações a substituir:
- `DOMAIN` → Cookie domain do brand guide
- `WEBHOOK_URL` → Webhook URL do brand guide

O script cobre:
1. Session ID (sessionStorage)
2. Cookies first-touch UTMs
3. Click IDs capture
4. Referrer mapping
5. Hidden inputs auto-fill
6. DataLayer events (custom_page_view, scroll_depth, time_on_page_heartbeat)
7. Form submit handler com fetch POST JSON
8. Feedback visual (sucesso/erro)
9. Máscara de telefone brasileiro
10. FAQ accordion
11. Scroll reveal animations

---

## Animações — Prioridade

### Obrigatórias (SEMPRE incluir)

| Efeito | Onde aplicar |
|--------|-------------|
| Fade-in scroll | Toda seção abaixo do hero (classe `.fade-in`) |
| Delays escalonados | Cards em grid (`.fade-in-delay-1`, `-2`, `-3`) |
| CTA glow + hover lift | Botão principal |
| Focus glow nos inputs | Todos os campos do formulário |
| Background grid | Temas dark (`.bg-grid`) |
| Background glow | Temas dark (`.bg-glow`) |
| Texto gradiente H1 | Temas dark |

### Recomendadas (incluir quando o design pedir)

| Efeito | Quando usar |
|--------|-------------|
| Contador animado | Seção de números/stats |
| Shimmer | Banners de destaque, garantia |
| Borda rotativa | Cards de destaque (máx 3-4) |

### Opcionais (usar com moderação)

| Efeito | Quando usar |
|--------|-------------|
| 3D tilt | Cards premium (desktop only) |
| SVG ring progress | Ícones de features |
| Partículas canvas | Seções dramáticas |

---

## Checklist de Validação (antes de entregar)

### Design
- [ ] Responsivo (funciona em 375px, 768px, 1280px)
- [ ] Cores da marca aplicadas
- [ ] Hierarquia tipográfica clara
- [ ] Espaçamento generoso entre seções
- [ ] Botões com hover/active/disabled
- [ ] Imagens com loading="lazy" e alt

### Formulário
- [ ] Campos visíveis conforme briefing
- [ ] 19 hidden inputs presentes (5 UTMs + 10 clicks + 4 sessão)
- [ ] Validação HTML5 (required, type)
- [ ] Máscara de telefone
- [ ] Feedback visual de envio
- [ ] Webhook URL configurada

### Tracking
- [ ] Script antes do </body>
- [ ] COOKIE_DOMAIN correto
- [ ] WEBHOOK_URL correto
- [ ] dataLayer declarado
- [ ] custom_page_view disparando
- [ ] scroll_depth (25/50/75/90%)
- [ ] time_on_page heartbeat (30s)
- [ ] form_submit com dados do lead
- [ ] Session ID via sessionStorage

### Animações
- [ ] fade-in nas seções
- [ ] CTA glow
- [ ] IntersectionObserver funcionando
- [ ] Delays escalonados em grids

### SEO
- [ ] <title> descritivo
- [ ] <meta description>
- [ ] Fontes com display=swap
- [ ] HTML semântico
