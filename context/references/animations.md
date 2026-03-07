# Briefing Técnico — Efeitos & Animações para Landing Pages

> Catálogo extraído da LP "Plataforma de Marketing para Agências".
> Use como referência para replicar em páginas de outros clientes.

---

## 1. Background Ambiental

### 1.1 Grid Sutil (`.bg-grid`)
**O que faz:** Uma grade quadriculada fixa por trás de todo o conteúdo, dando textura e profundidade ao fundo escuro.

**CSS:**
```css
.bg-grid {
  position: fixed; inset: 0;
  background-image:
    linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
  background-size: 60px 60px;
  pointer-events: none; z-index: 0;
}
```

**Quando usar:** Em qualquer LP dark/tech. Transmite sensação de software, dashboard, produto digital.

---

### 1.2 Glow Radial (`.bg-glow`)
**O que faz:** Círculos grandes e borrados da cor de destaque posicionados no topo e rodapé, criando uma "atmosfera" colorida.

**CSS:**
```css
.bg-glow {
  position: fixed; width: 600px; height: 600px;
  border-radius: 50%; filter: blur(120px);
  opacity: 0.12; pointer-events: none;
}
.bg-glow--hero { background: #00E87B; top: -200px; left: 50%; transform: translateX(-50%); }
.bg-glow--bottom { background: #00E87B; bottom: -300px; right: -100px; opacity: 0.08; }
```

**Quando usar:** Sempre. É o que dá "vida" ao fundo. Trocar a cor para a cor primária do cliente.

---

## 2. Animações de Entrada (Scroll Reveal)

### 2.1 Fade-In com Slide Up (`.fade-in`)
**O que faz:** Elementos entram de baixo pra cima com fade ao entrar na viewport.

**CSS:**
```css
.fade-in {
  opacity: 0; transform: translateY(30px);
  transition: opacity 0.8s cubic-bezier(0.16,1,0.3,1),
              transform 0.8s cubic-bezier(0.16,1,0.3,1);
}
.fade-in.visible { opacity: 1; transform: translateY(0); }
```

**JS (IntersectionObserver):**
```js
const observer = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.fade-in').forEach((el) => observer.observe(el));
```

**Delays escalonados:**
```css
.fade-in-delay-1 { transition-delay: 0.1s; }
.fade-in-delay-2 { transition-delay: 0.25s; }
.fade-in-delay-3 { transition-delay: 0.4s; }
```

**Quando usar:** Em TODO elemento que aparece na tela. É o efeito base obrigatório.

---

### 2.2 Slide-In da Esquerda (Pain Cards)
**O que faz:** Cards entram deslizando da esquerda com leve scale, com delays crescentes.

**CSS:**
```css
.pain__card-wrap {
  opacity: 0; transform: translateX(-60px) scale(0.96);
  transition: opacity 1s cubic-bezier(0.16,1,0.3,1),
              transform 1s cubic-bezier(0.16,1,0.3,1);
}
.pain__card-wrap.visible { opacity: 1; transform: translateX(0) scale(1); }
.pain__card-wrap:nth-child(1) { transition-delay: 0.1s; }
.pain__card-wrap:nth-child(2) { transition-delay: 0.3s; }
.pain__card-wrap:nth-child(3) { transition-delay: 0.5s; }
```

**Quando usar:** Listas verticais de problemas, features ou depoimentos. Dá um ritmo "cascata" muito bom.

---

### 2.3 Scale Up (Pillar Cards)
**O que faz:** Cards entram de baixo com um leve "zoom in" (scale 0.95 → 1).

```css
.pillar.fade-in { opacity: 0; transform: translateY(40px) scale(0.95); }
.pillar.fade-in.visible { opacity: 1; transform: translateY(0) scale(1); }
```

**Quando usar:** Seções de "3 passos", "3 pilares" ou grid de benefícios.

---

## 3. Animações Contínuas (Loop)

### 3.1 Borda Pulsante (`.hero__badge`)
**O que faz:** A borda do badge oscila entre opacidade baixa e alta, chamando atenção sutil.

```css
@keyframes pulse-border {
  0%, 100% { border-color: rgba(0,232,123,0.2); }
  50% { border-color: rgba(0,232,123,0.5); }
}
.hero__badge { animation: pulse-border 3s ease-in-out infinite; }
```

**Quando usar:** Badges de "vagas limitadas", "novo", "beta", "oferta por tempo limitado".

---

### 3.2 Borda Rotativa (Spinning Gradient Border)
**O que faz:** Um gradiente cônico gira 360° infinitamente ao redor do card, criando um efeito "neon" animado.

```css
.pain__card-wrap::before {
  content: ''; position: absolute;
  top: 50%; left: 50%; width: 200%; height: 200%;
  background: conic-gradient(from 0deg, var(--card-color), transparent 30%, transparent 70%, var(--card-color));
  animation: spin-border 4s linear infinite;
  opacity: 0.7;
}
@keyframes spin-border { to { transform: translate(-50%,-50%) rotate(360deg); } }
```

**Quando usar:** Cards de destaque, seções de problema/dor, features premium. Efeito muito impactante — usar com moderação (máximo 3-4 cards por página).

---

### 3.3 Glow Pulsante Atrás do Card
**O que faz:** Um brilho sutil por trás do card que pulsa suavemente.

```css
.pain__card-wrap::after {
  content: ''; position: absolute; inset: -40px;
  background: radial-gradient(ellipse at center, var(--card-color), transparent 70%);
  opacity: 0; animation: card-glow-pulse 3s ease-in-out infinite;
}
@keyframes card-glow-pulse {
  0%, 100% { opacity: 0; }
  50% { opacity: 0.06; }
}
```

---

### 3.4 SVG Ring Progress + Pulse
**O que faz:** Um anel SVG ao redor do ícone se "preenche" ao entrar na tela, e um anel externo pulsa.

```css
.pain__ring-progress {
  stroke-dasharray: 251; stroke-dashoffset: 251;
  transition: stroke-dashoffset 2s cubic-bezier(0.16,1,0.3,1);
}
.pain__card-wrap.visible .pain__ring-progress { stroke-dashoffset: 60; }

@keyframes ring-pulse {
  0% { opacity: 0.4; r: 40; }
  100% { opacity: 0; r: 52; }
}
```

**Quando usar:** Ícones de features, métricas, indicadores de progresso.

---

### 3.5 Shimmer / Brilho Deslizante
**O que faz:** Um brilho sutil que desliza horizontalmente sobre um elemento, como se "passasse" uma luz.

```css
.solution__note::before {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(90deg, transparent, rgba(0,232,123,0.05), transparent);
  animation: note-shimmer 4s ease-in-out infinite;
}
@keyframes note-shimmer {
  0%, 100% { opacity: 0; transform: translateX(-100%); }
  50% { opacity: 1; transform: translateX(100%); }
}
```

**Quando usar:** Banners de destaque, notas importantes, CTAs secundários, "garantia" boxes.

---

### 3.6 Borda Superior Animada (Border Slide)
**O que faz:** Uma linha de destaque no topo do card se move horizontalmente, aparecendo no hover.

```css
.pillar::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
  background: linear-gradient(90deg, transparent, var(--accent), transparent);
  background-size: 200% 100%;
  opacity: 0; transition: opacity 0.4s ease;
  animation: border-slide 3s linear infinite;
}
@keyframes border-slide { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
.pillar:hover::before { opacity: 1; }
```

---

## 4. Efeitos de Hover (Interação)

### 4.1 CTA com Glow
**O que faz:** Botão tem sombra neon por padrão, que intensifica no hover + sobe 2px.

```css
.hero__cta {
  box-shadow: 0 0 30px rgba(0,232,123,0.4);
  transition: all 0.3s ease;
}
.hero__cta:hover {
  transform: translateY(-2px);
  box-shadow: 0 0 50px rgba(0,232,123,0.4), 0 8px 32px rgba(0,0,0,0.3);
}
```

**Quando usar:** CTA principal. Sempre.

---

### 4.2 3D Tilt nos Cards (JavaScript)
**O que faz:** O card acompanha o mouse com rotação 3D sutil (perspective + rotateX/Y) e um radial-gradient segue o cursor.

```js
card.addEventListener('mousemove', (e) => {
  const r = card.getBoundingClientRect();
  const x = e.clientX - r.left, y = e.clientY - r.top;
  card.style.transform = `perspective(800px)
    rotateX(${((y - r.height/2) / r.height * 2) * -6}deg)
    rotateY(${((x - r.width/2) / r.width * 2) * 6}deg)
    translateY(-6px)`;
  card.style.setProperty('--mouse-x', (x/r.width*100).toFixed(1)+'%');
  card.style.setProperty('--mouse-y', (y/r.height*100).toFixed(1)+'%');
});
```

**CSS do glow que segue o mouse:**
```css
.pillar::after {
  background: radial-gradient(circle at var(--mouse-x,50%) var(--mouse-y,0%),
    rgba(0,232,123,0.08), transparent 50%);
  opacity: 0; transition: opacity 0.4s ease;
}
.pillar:hover::after { opacity: 1; }
```

**Quando usar:** Grids de features, pricing cards, "como funciona". Desabilitar em mobile.

---

### 4.3 Hover nos Cards de Solução
**O que faz:** Combinação de translateY(-6px), mudança de background, borda accent, sombra expandida, ícone com glow, e número de step muda de cor.

**Quando usar:** Qualquer grid de cards com informação.

---

## 5. Efeitos Visuais com Canvas

### 5.1 Partículas Flutuantes
**O que faz:** 40 partículas coloridas (vermelho, laranja, amarelo) flutuam lentamente sobre a seção, criando movimento orgânico de fundo.

```js
for (let i = 0; i < 40; i++) {
  particles.push({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    r: Math.random() * 2 + 0.5,        // tamanho pequeno
    dx: (Math.random() - 0.5) * 0.4,    // velocidade lenta
    dy: (Math.random() - 0.5) * 0.3,
    color: colors[Math.floor(Math.random() * colors.length)],
    alpha: Math.random() * 0.3 + 0.05,  // bem sutil
  });
}
```

**Quando usar:** Seções de "problema", "antes/depois", ou hero sections com tema mais dramático. Trocar as cores conforme o tom da seção.

---

## 6. Efeitos Tipográficos

### 6.1 Texto Gradiente (Hero Title)
**O que faz:** Título com gradiente que vai do branco ao cinza claro, dando profundidade.

```css
.hero__title {
  background: linear-gradient(135deg, #F0F0F5, #9494A8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

**Quando usar:** Títulos principais (H1). Evitar em subtítulos para manter contraste.

---

## 7. Contador Animado

**O que faz:** Número conta de 0 até o valor final com easing cubic, disparado ao entrar na viewport.

```js
function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

function animateCounter(now) {
  const progress = Math.min((now - startTime) / duration, 1);
  counterEl.textContent = '+' + Math.floor(easeOutCubic(progress) * targetCount);
  if (progress < 1) requestAnimationFrame(animateCounter);
}
```

**Quando usar:** Prova social, métricas de resultado, número de clientes, leads gerados.

---

## 8. Micro-Interações de Form

### 8.1 Focus Glow nos Inputs
```css
.waitlist__input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(0,232,123,0.15);
}
```

### 8.2 Máscara de WhatsApp
Formatação automática `(XX) XXXXX-XXXX` enquanto o usuário digita.

### 8.3 Animação de Sucesso
```css
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
```

---

## 9. Resumo — Checklist de Implementação

| # | Efeito | Prioridade | Complexidade |
|---|--------|-----------|-------------|
| 1 | Fade-in no scroll | Obrigatório | Baixa |
| 2 | Background grid + glow | Obrigatório | Baixa |
| 3 | CTA com glow + hover lift | Obrigatório | Baixa |
| 4 | Texto gradiente no H1 | Obrigatório | Baixa |
| 5 | Delays escalonados | Obrigatório | Baixa |
| 6 | Contador animado | Recomendado | Baixa |
| 7 | Shimmer / brilho deslizante | Recomendado | Baixa |
| 8 | Borda rotativa nos cards | Recomendado | Média |
| 9 | 3D tilt nos cards | Diferencial | Média |
| 10 | SVG ring progress | Diferencial | Média |
| 11 | Partículas com Canvas | Diferencial | Média |
| 12 | Focus glow nos inputs | Obrigatório | Baixa |

---

## 10. Notas para Adaptação

- **Cores:** Trocar `--accent: #00E87B` pela cor primária do cliente. Todos os glows, bordas e destaques se adaptam automaticamente via CSS variables.
- **Dark/Light:** A estrutura toda é dark-first. Para clientes com LP light, inverter os valores de `--bg-primary`, `--bg-card` e ajustar opacidades dos glows (subir de 0.12 para 0.06 no light).
- **Performance:** Partículas Canvas e 3D tilt devem ser desabilitados em mobile. O código já faz isso.
- **Cubic-bezier:** O easing `cubic-bezier(0.16,1,0.3,1)` é o segredo — é um ease-out agressivo que dá a sensação de "snap" profissional. Usar em todas as transições.
- **Responsividade:** Todos os efeitos já têm breakpoints para 768px, 600px, 414px e 360px.

---

*Briefing gerado a partir da LP de lista de espera — Fevereiro 2026*
