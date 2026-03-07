# Design System — Referência para Landing Pages

Padrões de design para criar landing pages bonitas, modernas e responsivas em CSS puro. Adaptável para qualquer cliente — basta trocar as cores e fontes nas variáveis CSS.

## Índice

1. [Reset e Base](#reset-e-base)
2. [Variáveis CSS](#variáveis-css)
3. [Tipografia](#tipografia)
4. [Botões](#botões)
5. [Formulário](#formulário)
6. [Seções Comuns](#seções-comuns)
7. [Componentes](#componentes)
8. [Animações](#animações)
9. [Responsividade](#responsividade)
10. [Paletas de Cores Prontas](#paletas-de-cores-prontas)
11. [Fontes Recomendadas](#fontes-recomendadas)

---

## Reset e Base

Sempre começar com este reset mínimo:

```css
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  scroll-behavior: smooth;
  -webkit-text-size-adjust: 100%;
}

body {
  font-family: var(--font-main);
  background: var(--bg);
  color: var(--text);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  overflow-x: hidden;
}

img {
  max-width: 100%;
  height: auto;
  display: block;
}

a {
  color: inherit;
  text-decoration: none;
}
```

---

## Variáveis CSS

Definir no `:root`. Adaptar cores conforme briefing do cliente:

```css
:root {
  /* Cores — AJUSTAR POR CLIENTE */
  --primary: #2563eb;
  --primary-dark: #1d4ed8;
  --primary-light: #3b82f6;
  --primary-bg: rgba(37, 99, 235, 0.08);
  --secondary: #f59e0b;
  --bg: #ffffff;
  --bg-alt: #f8fafc;
  --surface: #ffffff;
  --text: #0f172a;
  --text-secondary: #475569;
  --text-muted: #94a3b8;
  --border: #e2e8f0;
  --border-light: #f1f5f9;
  --success: #22c55e;
  --error: #ef4444;

  /* Espaçamento */
  --section-py: 80px;
  --section-py-lg: 120px;
  --container-px: 20px;
  --max-width: 1200px;
  --max-width-narrow: 720px;

  /* Bordas */
  --radius: 12px;
  --radius-sm: 8px;
  --radius-lg: 20px;
  --radius-full: 9999px;

  /* Sombras */
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.06);
  --shadow: 0 4px 24px rgba(0,0,0,0.08);
  --shadow-lg: 0 12px 48px rgba(0,0,0,0.12);
  --shadow-xl: 0 24px 64px rgba(0,0,0,0.16);
  --shadow-primary: 0 8px 32px rgba(37, 99, 235, 0.3);

  /* Transição */
  --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  --transition-fast: all 0.15s ease;

  /* Fontes */
  --font-main: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-accent: 'Inter', sans-serif;
}
```

### Tema escuro

Para landing pages com fundo escuro:

```css
:root {
  --bg: #0a0a0f;
  --bg-alt: #12121f;
  --surface: #1a1a2e;
  --text: #e2e8f0;
  --text-secondary: #94a3b8;
  --text-muted: #64748b;
  --border: #1e293b;
  --border-light: #1e293b;
}
```

---

## Tipografia

```css
h1 {
  font-family: var(--font-accent);
  font-size: clamp(36px, 6vw, 64px);
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.03em;
  color: var(--text);
}

h2 {
  font-family: var(--font-accent);
  font-size: clamp(28px, 4vw, 44px);
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.02em;
  color: var(--text);
}

h3 {
  font-size: clamp(20px, 3vw, 28px);
  font-weight: 600;
  line-height: 1.3;
  color: var(--text);
}

p {
  font-size: 16px;
  line-height: 1.7;
  color: var(--text-secondary);
}

.text-large {
  font-size: clamp(18px, 2.5vw, 22px);
  line-height: 1.6;
}

.text-accent {
  color: var(--primary);
}

.text-gradient {
  background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.eyebrow {
  display: inline-block;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--primary);
  background: var(--primary-bg);
  padding: 6px 16px;
  border-radius: var(--radius-full);
  margin-bottom: 16px;
}
```

---

## Botões

```css
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px 32px;
  font-family: var(--font-main);
  font-size: 16px;
  font-weight: 600;
  border: none;
  border-radius: var(--radius);
  cursor: pointer;
  transition: var(--transition);
  text-decoration: none;
  line-height: 1;
}

.btn-primary {
  background: var(--primary);
  color: #fff;
  box-shadow: var(--shadow-primary);
}

.btn-primary:hover {
  background: var(--primary-dark);
  transform: translateY(-2px);
  box-shadow: 0 12px 40px rgba(37, 99, 235, 0.4);
}

.btn-primary:active {
  transform: translateY(0);
}

.btn-large {
  padding: 20px 40px;
  font-size: 18px;
  border-radius: var(--radius-lg);
}

.btn-outline {
  background: transparent;
  color: var(--primary);
  border: 2px solid var(--primary);
}

.btn-outline:hover {
  background: var(--primary);
  color: #fff;
}

.btn-full { width: 100%; }

.btn-submit {
  display: block;
  width: 100%;
  padding: 18px 32px;
  font-family: var(--font-main);
  font-size: 18px;
  font-weight: 700;
  color: #fff;
  background: var(--primary);
  border: none;
  border-radius: var(--radius);
  cursor: pointer;
  transition: var(--transition);
  box-shadow: var(--shadow-primary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-top: 8px;
}

.btn-submit:hover {
  background: var(--primary-dark);
  transform: translateY(-2px);
}

.btn-submit:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}
```

---

## Formulário

```css
.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--text);
  margin-bottom: 6px;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 14px 16px;
  font-family: var(--font-main);
  font-size: 16px;
  color: var(--text);
  background: var(--bg);
  border: 1.5px solid var(--border);
  border-radius: var(--radius-sm);
  outline: none;
  transition: var(--transition-fast);
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 4px var(--primary-bg);
}

.form-group input::placeholder {
  color: var(--text-muted);
}

.form-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 40px 32px;
  box-shadow: var(--shadow-lg);
}

/* Para fundo escuro */
.form-card-dark {
  background: rgba(255,255,255,0.05);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,0.1);
}
```

---

## Seções Comuns

### Container

```css
.container {
  max-width: var(--max-width);
  margin: 0 auto;
  padding: 0 var(--container-px);
}

.container-narrow {
  max-width: var(--max-width-narrow);
  margin: 0 auto;
  padding: 0 var(--container-px);
}

.section-header {
  text-align: center;
  max-width: 640px;
  margin: 0 auto 48px;
}
```

### Hero

```css
.hero {
  padding: 100px 0 var(--section-py);
  text-align: center;
  position: relative;
  overflow: hidden;
}

.hero h1 { max-width: 800px; margin: 0 auto 24px; }
.hero p { max-width: 600px; margin: 0 auto 40px; font-size: clamp(16px, 2vw, 20px); }

.hero-gradient {
  background: linear-gradient(180deg, var(--bg-alt) 0%, var(--bg) 100%);
}

.hero-image {
  background-size: cover;
  background-position: center;
  color: #fff;
}

.hero-image::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.4) 100%);
}

.hero-image .container { position: relative; z-index: 1; }

/* Hero split: texto + form lado a lado */
.hero-split {
  display: flex;
  flex-direction: column;
  gap: 48px;
  align-items: center;
}

@media (min-width: 768px) {
  .hero-split { flex-direction: row; text-align: left; }
  .hero-split .hero-content { flex: 1; }
  .hero-split .hero-form { flex: 0 0 420px; }
}
```

### Features / Benefícios

```css
.features { padding: var(--section-py) 0; }

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 32px;
  margin-top: 48px;
}

.feature-card {
  padding: 32px 24px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  background: var(--surface);
  transition: var(--transition);
}

.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow);
  border-color: var(--primary);
}

.feature-icon {
  width: 52px; height: 52px;
  border-radius: var(--radius);
  background: var(--primary-bg);
  display: flex; align-items: center; justify-content: center;
  font-size: 24px;
  margin-bottom: 20px;
}

.feature-card h3 { font-size: 18px; margin-bottom: 8px; }
.feature-card p { font-size: 14px; color: var(--text-muted); }
```

### Depoimentos / Social Proof

```css
.testimonials { padding: var(--section-py) 0; background: var(--bg-alt); }

.testimonials-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
  margin-top: 48px;
}

.testimonial-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 32px;
}

.testimonial-text {
  font-size: 16px; line-height: 1.7;
  color: var(--text-secondary);
  margin-bottom: 20px; font-style: italic;
}

.testimonial-text::before {
  content: '"'; font-size: 48px; color: var(--primary);
  line-height: 0; display: block; margin-bottom: 8px; font-style: normal;
}

.testimonial-author { display: flex; align-items: center; gap: 12px; }
.testimonial-avatar { width: 48px; height: 48px; border-radius: 50%; object-fit: cover; background: var(--primary-bg); }
.testimonial-name { font-weight: 600; font-size: 14px; }
.testimonial-role { font-size: 12px; color: var(--text-muted); }
```

### FAQ

```css
.faq { padding: var(--section-py) 0; }
.faq-list { max-width: 720px; margin: 48px auto 0; }
.faq-item { border-bottom: 1px solid var(--border); }

.faq-question {
  width: 100%; padding: 24px 0;
  font-family: var(--font-main); font-size: 16px; font-weight: 600;
  color: var(--text); background: none; border: none;
  text-align: left; cursor: pointer;
  display: flex; justify-content: space-between; align-items: center; gap: 16px;
}

.faq-question::after {
  content: '+'; font-size: 24px; color: var(--primary);
  transition: var(--transition); flex-shrink: 0;
}

.faq-item.active .faq-question::after { transform: rotate(45deg); }

.faq-answer { max-height: 0; overflow: hidden; transition: max-height 0.3s ease; }
.faq-answer-inner { padding: 0 0 24px; font-size: 15px; color: var(--text-secondary); line-height: 1.7; }
.faq-item.active .faq-answer { max-height: 500px; }
```

### CTA Section

```css
.cta-section { padding: var(--section-py-lg) 0; text-align: center; background: var(--bg-alt); }

.cta-bold {
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
  color: #fff;
}

.cta-bold h2, .cta-bold p { color: #fff; }

.cta-bold .btn-submit {
  background: #fff; color: var(--primary);
  box-shadow: var(--shadow-lg);
}
```

### Footer

```css
.footer {
  padding: 32px 0; text-align: center;
  border-top: 1px solid var(--border);
}
.footer p { font-size: 13px; color: var(--text-muted); }
```

---

## Componentes

### Badge/pill
```css
.badge {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 12px; font-size: 12px; font-weight: 600;
  border-radius: var(--radius-full);
  background: var(--primary-bg); color: var(--primary);
}
```

### Divider
```css
.divider {
  width: 60px; height: 3px; background: var(--primary);
  border-radius: 2px; margin: 16px auto 0;
}
```

### Stats/números
```css
.stats-row { display: flex; justify-content: center; gap: 48px; flex-wrap: wrap; margin-top: 48px; }
.stat-item { text-align: center; }
.stat-number {
  font-size: clamp(36px, 5vw, 56px); font-weight: 800;
  color: var(--primary); line-height: 1; letter-spacing: -0.03em;
}
.stat-label { font-size: 14px; color: var(--text-muted); margin-top: 4px; }
```

### Trust logos
```css
.trust-bar { display: flex; align-items: center; justify-content: center; gap: 32px; flex-wrap: wrap; margin-top: 40px; opacity: 0.5; }
.trust-bar img { height: 28px; filter: grayscale(100%); transition: var(--transition); }
.trust-bar img:hover { filter: none; opacity: 1; }
```

---

## Animações

### Reveal on scroll
```css
.reveal { opacity: 0; transform: translateY(24px); transition: opacity 0.6s ease, transform 0.6s ease; }
.reveal.visible { opacity: 1; transform: none; }
```

### Hover lift
```css
.hover-lift { transition: var(--transition); }
.hover-lift:hover { transform: translateY(-4px); box-shadow: var(--shadow-lg); }
```

### Pulse no CTA
```css
@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.4); }
  50% { box-shadow: 0 0 0 12px rgba(37, 99, 235, 0); }
}
.btn-pulse { animation: pulse 2s infinite; }
```

---

## Responsividade

```css
@media (min-width: 768px) {
  :root { --section-py: 100px; --container-px: 32px; }
}

@media (min-width: 1024px) {
  :root { --section-py: 120px; --container-px: 40px; }
}
```

---

## Paletas de Cores Prontas

Usar quando o cliente não tem cores definidas. Sugerir no briefing.

### Profissional / Corporativo (fundo claro)
```css
--primary: #2563eb; --primary-dark: #1d4ed8; --primary-bg: rgba(37,99,235,0.08);
--bg: #ffffff; --bg-alt: #f8fafc; --text: #0f172a;
```

### Tech / Startup (fundo escuro)
```css
--primary: #8b5cf6; --primary-dark: #7c3aed; --primary-bg: rgba(139,92,246,0.1);
--bg: #0a0a0f; --bg-alt: #12121f; --text: #e2e8f0;
```

### Saúde / Bem-estar (fundo claro)
```css
--primary: #10b981; --primary-dark: #059669; --primary-bg: rgba(16,185,129,0.08);
--bg: #ffffff; --bg-alt: #f0fdf4; --text: #1e293b;
```

### Bold / Impactante (fundo escuro)
```css
--primary: #ef4444; --primary-dark: #dc2626; --primary-bg: rgba(239,68,68,0.1);
--bg: #0f0f0f; --bg-alt: #1a1a1a; --text: #ffffff;
```

### Elegante / Premium (fundo escuro)
```css
--primary: #d4a853; --primary-dark: #b8922e; --primary-bg: rgba(212,168,83,0.1);
--bg: #0c0c0c; --bg-alt: #161616; --text: #f5f5f5;
```

### Educação / Confiança (fundo claro)
```css
--primary: #0ea5e9; --primary-dark: #0284c7; --primary-bg: rgba(14,165,233,0.08);
--bg: #ffffff; --bg-alt: #f0f9ff; --text: #1e293b;
```

### Energia / Ação (fundo claro)
```css
--primary: #f97316; --primary-dark: #ea580c; --primary-bg: rgba(249,115,22,0.08);
--bg: #ffffff; --bg-alt: #fff7ed; --text: #1c1917;
```

---

## Fontes Recomendadas

### Para headings impactantes
- **Inter** — `Inter:wght@400;500;600;700;800`
- **Syne** — `Syne:wght@400;600;700;800`
- **Plus Jakarta Sans** — `Plus+Jakarta+Sans:wght@400;500;600;700;800`
- **Outfit** — `Outfit:wght@400;500;600;700;800`
- **Manrope** — `Manrope:wght@400;500;600;700;800`

### Para body legível
- **Inter** — universal
- **DM Sans** — `DM+Sans:wght@400;500;700`
- **Nunito Sans** — `Nunito+Sans:wght@400;600;700`

### Combinações que funcionam
1. **Syne** (headings) + **Inter** (body) → Tech/Moderno
2. **Plus Jakarta Sans** (ambos) → Clean/Profissional
3. **Outfit** (headings) + **DM Sans** (body) → Friendly/Startup
4. **Inter** (ambos) → Universal/Seguro
5. **Manrope** (headings) + **Inter** (body) → Contemporâneo

### Como importar
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
```

Sempre usar `display=swap` para não bloquear renderização.
