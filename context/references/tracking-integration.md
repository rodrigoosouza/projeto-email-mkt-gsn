# Tracking Integration — Referência Completa

Código de tracking para integrar em todas as landing pages. Configurável por cliente — basta ajustar `COOKIE_DOMAIN` e `WEBHOOK_URL`.

## Índice

1. [Script de Tracking Completo](#script-de-tracking-completo)
2. [Formulário com Hidden Inputs](#formulário-com-hidden-inputs)
3. [Envio do Formulário via Fetch](#envio-do-formulário-via-fetch)
4. [CSS do Feedback Visual](#css-do-feedback-visual)
5. [Máscara de Telefone](#máscara-de-telefone)
6. [Placeholders para Configurar](#placeholders-para-configurar)

---

## Script de Tracking Completo

Inserir **antes do `</body>`**. Ajustar as duas variáveis de configuração no topo.

```html
<script>
(function() {

  // ============================================
  // CONFIGURAÇÃO — AJUSTAR POR CLIENTE
  // ============================================
  var DOMAIN      = '{{COOKIE_DOMAIN}}';  // Ex: '.dominiocliente.com.br'
  var MAX_AGE     = 63072000;             // 2 anos em segundos
  var WEBHOOK_URL = '{{WEBHOOK_URL}}';    // Ex: 'https://n8n.dominio.com/webhook/abc123'

  var utms   = ['utm_source','utm_medium','utm_campaign','utm_content','utm_term'];
  var clicks = ['gclid','gbraid','wbraid','fbclid','ttclid','gad_campaignid','gad_source','msclkid','li_fat_id','twclid','sck'];

  // ── Helpers ──────────────────────────────────────────────────────

  function getCookie(name) {
    var match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
  }

  function setCookie(name, value) {
    document.cookie = name + '=' + encodeURIComponent(value)
      + ';max-age=' + MAX_AGE
      + ';path=/;domain=' + DOMAIN
      + ';SameSite=None;Secure';
  }

  function setCookieFirstTouch(name, value) {
    if (getCookie(name)) return;
    setCookie(name, value);
  }

  function getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function isInternalReferrer(referrer) {
    if (!referrer) return false;
    try {
      var ref = new URL(referrer).hostname;
      var cur = window.location.hostname;
      return ref === cur
        || ref.endsWith('.' + cur.replace('www.',''))
        || cur.endsWith('.' + ref.replace('www.',''));
    } catch(e) { return false; }
  }

  // ── Session ID ───────────────────────────────────────────────────

  var sessionId = (function() {
    try {
      var key = 'lp_session_id';
      var s = sessionStorage.getItem(key);
      if (!s) {
        s = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        sessionStorage.setItem(key, s);
      }
      return s;
    } catch(e) {
      return Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
  })();

  // ── Referrer Mapping ─────────────────────────────────────────────
  // Detecta a origem do tráfego mesmo sem UTMs na URL.

  var referrerMap = {
    'google.com':        { utm_source: 'google',       utm_medium: 'organic' },
    'bing.com':          { utm_source: 'bing',         utm_medium: 'organic' },
    'yahoo.com':         { utm_source: 'yahoo',        utm_medium: 'organic' },
    'duckduckgo.com':    { utm_source: 'duckduckgo',   utm_medium: 'organic' },
    'yandex.com':        { utm_source: 'yandex',       utm_medium: 'organic' },
    'instagram.com':     { utm_source: 'instagram',    utm_medium: 'organic' },
    'youtube.com':       { utm_source: 'youtube',      utm_medium: 'organic' },
    'facebook.com':      { utm_source: 'facebook',     utm_medium: 'organic' },
    'twitter.com':       { utm_source: 'twitter',      utm_medium: 'organic' },
    'x.com':             { utm_source: 'twitter',      utm_medium: 'organic' },
    'linkedin.com':      { utm_source: 'linkedin',     utm_medium: 'organic' },
    'tiktok.com':        { utm_source: 'tiktok',       utm_medium: 'organic' },
    'pinterest.com':     { utm_source: 'pinterest',    utm_medium: 'organic' },
    'whatsapp.com':      { utm_source: 'whatsapp',     utm_medium: 'organic' },
    'telegram.org':      { utm_source: 'telegram',     utm_medium: 'organic' },
    'reddit.com':        { utm_source: 'reddit',       utm_medium: 'organic' },
    'chat.openai.com':   { utm_source: 'chatgpt',      utm_medium: 'ai' },
    'chatgpt.com':       { utm_source: 'chatgpt',      utm_medium: 'ai' },
    'gemini.google.com': { utm_source: 'gemini',       utm_medium: 'ai' },
    'claude.ai':         { utm_source: 'claude',       utm_medium: 'ai' },
    'poe.com':           { utm_source: 'poe',          utm_medium: 'ai' },
    'wikipedia.org':     { utm_source: 'wikipedia',    utm_medium: 'referral' },
    'github.com':        { utm_source: 'github',       utm_medium: 'referral' }
  };

  // ── 1. UTMs da URL — first touch ─────────────────────────────────

  var hasUtmInUrl = utms.some(function(p) { return !!getParam(p); });

  if (hasUtmInUrl) {
    utms.forEach(function(p) {
      var val = getParam(p) || '';
      setCookieFirstTouch(p, val);
    });
  } else {
    var referrer = document.referrer || '';
    if (referrer && !isInternalReferrer(referrer)) {
      for (var domain in referrerMap) {
        if (referrer.indexOf(domain) !== -1) {
          var map = referrerMap[domain];
          utms.forEach(function(p) {
            setCookieFirstTouch(p, map[p] || '');
          });
          break;
        }
      }
    }
  }

  // ── 2. Click params — first touch ────────────────────────────────

  clicks.forEach(function(p) {
    var val = getParam(p);
    if (val) setCookieFirstTouch(p, val);
  });

  // ── 3. Gera _fbc se veio fbclid ──────────────────────────────────

  var fbclid = getParam('fbclid');
  if (fbclid && !getCookie('_fbc')) {
    setCookie('_fbc', 'fb.1.' + Date.now() + '.' + fbclid);
  }

  // ── 4. First visit, landing page, origin page ─────────────────────

  if (!getCookie('first_visit')) {
    setCookie('first_visit', new Date().toISOString());
  }

  if (!getCookie('landing_page')) {
    setCookie('landing_page', window.location.href);
  }

  if (!getCookie('origin_page')) {
    var originRef = document.referrer || '';
    if (originRef && !isInternalReferrer(originRef)) {
      setCookie('origin_page', originRef);
    }
  }

  // ── 5. Ref param ─────────────────────────────────────────────────

  var refParam = getParam('ref');
  if (refParam && !getCookie('ref')) {
    setCookie('ref', refParam);
  }

  // ── 6. User Agent cookie ──────────────────────────────────────────

  setCookie('user_agent', navigator.userAgent);

  // ── 7. Session attributes encoded ────────────────────────────────

  var sessionAttrs = {
    utm_source:    getCookie('utm_source') || '',
    utm_medium:    getCookie('utm_medium') || '',
    utm_campaign:  getCookie('utm_campaign') || '',
    utm_content:   getCookie('utm_content') || '',
    utm_term:      getCookie('utm_term') || '',
    gclid:         getCookie('gclid') || '',
    fbclid:        getCookie('fbclid') || '',
    ttclid:        getCookie('ttclid') || '',
    msclkid:       getCookie('msclkid') || '',
    landing_page:  getCookie('landing_page') || '',
    origin_page:   getCookie('origin_page') || '',
    first_visit:   getCookie('first_visit') || '',
    ref:           getCookie('ref') || ''
  };
  try {
    setCookie('session_attributes_encoded', btoa(JSON.stringify(sessionAttrs)));
  } catch(e) {}

  // ── 8. Preenche hidden inputs do form ────────────────────────────

  utms.concat(clicks).forEach(function(p) {
    var val = getCookie(p);
    if (!val) return;
    document.querySelectorAll(
      'input[name="' + p + '"], input[data-field-id="' + p + '"]'
    ).forEach(function(f) { f.value = val; });
  });

  var sessionIdInput = document.getElementById('hidden_session_id');
  if (sessionIdInput) sessionIdInput.value = sessionId;

  var lpInput = document.querySelector('input[data-field-id="landing_page"]');
  if (lpInput) lpInput.value = getCookie('landing_page') || window.location.href;

  var opInput = document.querySelector('input[data-field-id="origin_page"]');
  if (opInput) opInput.value = getCookie('origin_page') || document.referrer || '';

  var saeInput = document.querySelector('input[data-field-id="session_attributes_encoded"]');
  if (saeInput) saeInput.value = getCookie('session_attributes_encoded') || '';

  // ── 9. DataLayer ─────────────────────────────────────────────────

  window.dataLayer = window.dataLayer || [];
  var dl = {};

  // First-touch (cookies — nunca sobrescreve)
  utms.concat(clicks).forEach(function(p) {
    var val = getCookie(p);
    if (val) dl['ft_' + p] = val;
  });

  // Last-touch UTMs (URL atual — atualiza a cada visita)
  utms.forEach(function(p) {
    var fromUrl = getParam(p);
    if (fromUrl) {
      dl[p] = fromUrl;
    } else {
      var ref = document.referrer;
      var detected = null;
      if (ref) {
        for (var d in referrerMap) {
          if (ref.indexOf(d) !== -1) { detected = referrerMap[d]; break; }
        }
      }
      if (detected && p === 'utm_source') dl[p] = detected.utm_source;
      else if (detected && p === 'utm_medium') dl[p] = detected.utm_medium;
      else dl[p] = getCookie(p) || '';
    }
  });

  // Last-touch click IDs
  clicks.forEach(function(p) {
    var fromUrl = getParam(p);
    dl[p] = fromUrl || getCookie(p) || '';
  });

  dl.session_id = sessionId;
  dl.landing_page = getCookie('landing_page') || '';
  dl.origin_page = getCookie('origin_page') || '';
  dl.first_visit = getCookie('first_visit') || '';
  dl.ref = getCookie('ref') || '';
  dl.user_agent = navigator.userAgent;
  dl.session_attributes_encoded = getCookie('session_attributes_encoded') || '';

  if (Object.keys(dl).length) window.dataLayer.push(dl);

  // Evento custom_page_view
  window.dataLayer.push({
    event:         'custom_page_view',
    session_id:    sessionId,
    page_url:      window.location.href,
    page_path:     window.location.pathname,
    page_hostname: window.location.hostname,
    referrer:      document.referrer || ''
  });

  // ── 10. Scroll Depth ─────────────────────────────────────────────

  (function() {
    var milestones = [25, 50, 75, 90];
    var reached = {};
    var pageStart = Date.now();

    function getScrollPercent() {
      var doc = document.documentElement;
      var body = document.body;
      var scrollTop = doc.scrollTop || body.scrollTop;
      var scrollHeight = Math.max(doc.scrollHeight, body.scrollHeight) - doc.clientHeight;
      if (scrollHeight <= 0) return 100;
      return Math.round((scrollTop / scrollHeight) * 100);
    }

    window.addEventListener('scroll', function() {
      var pct = getScrollPercent();
      milestones.forEach(function(m) {
        if (!reached[m] && pct >= m) {
          reached[m] = true;
          var timeOnPage = Math.round((Date.now() - pageStart) / 1000);
          window.dataLayer.push({
            event:        'scroll_depth',
            session_id:    sessionId,
            scroll_depth:  m,
            time_on_page:  timeOnPage,
            page_path:     window.location.pathname
          });
        }
      });
    }, { passive: true });
  })();

  // ── 11. Time on Page Heartbeat ───────────────────────────────────

  (function() {
    var pageStart = Date.now();
    var heartbeatCount = 0;

    document.addEventListener('submit', function() {
      var timeOnPage = Math.round((Date.now() - pageStart) / 1000);
      window.dataLayer.push({
        session_id: sessionId,
        time_on_page_at_submit: timeOnPage
      });
    }, true);

    var hb = setInterval(function() {
      heartbeatCount++;
      var timeOnPage = Math.round((Date.now() - pageStart) / 1000);
      window.dataLayer.push({
        event:       'time_on_page_heartbeat',
        session_id:   sessionId,
        time_on_page: timeOnPage,
        heartbeat:    heartbeatCount,
        page_path:    window.location.pathname
      });
      if (heartbeatCount >= 20) clearInterval(hb); // para em 10 min
    }, 30000);
  })();

  // ── 12. Form Submit Handler ──────────────────────────────────────

  var form = document.getElementById('lead-form');
  if (form) {
    var formPageStart = Date.now();

    form.addEventListener('submit', function(e) {
      e.preventDefault();

      var btn = form.querySelector('button[type="submit"]');
      var originalText = btn.textContent;
      btn.textContent = 'Enviando...';
      btn.disabled = true;

      // Dados do lead (6 campos padrão)
      var nameField = form.querySelector('input[name="name"]');
      var emailField = form.querySelector('input[name="email"]');
      var phoneField = form.querySelector('input[name="phone"]');
      var companyField = form.querySelector('input[name="company"]');
      var roleField = form.querySelector('input[name="role"]');
      var revenueField = form.querySelector('select[name="revenue"]');

      var leadName = nameField ? nameField.value.trim() : '';
      var leadEmail = emailField ? emailField.value.trim() : '';
      var leadPhone = phoneField ? phoneField.value.trim().replace(/\D/g, '') : '';
      var leadCompany = companyField ? companyField.value.trim() : '';
      var leadRole = roleField ? roleField.value.trim() : '';
      var leadRevenue = revenueField ? revenueField.value : '';

      var nameParts = leadName.split(' ');
      var firstName = nameParts[0] || '';
      var lastName = nameParts.slice(1).join(' ') || '';

      // Evento form_submit no dataLayer
      window.dataLayer.push({
        event: 'form_submit',
        session_id: sessionId,
        lead_name: leadName,
        lead_email: leadEmail,
        lead_phone: leadPhone,
        lead_company: leadCompany,
        lead_role: leadRole,
        lead_revenue: leadRevenue,
        lead_first_name: firstName,
        lead_last_name: lastName,
        time_on_page_at_submit: Math.round((Date.now() - formPageStart) / 1000)
      });

      // Monta payload
      var formData = new FormData(form);
      var payload = {};
      formData.forEach(function(value, key) {
        if (value) payload[key] = value;
      });

      payload.first_name = firstName;
      payload.last_name = lastName;
      payload.session_id = sessionId;
      payload.page_url = window.location.href;
      payload.page_path = window.location.pathname;
      payload.referrer = document.referrer || '';
      payload.submitted_at = new Date().toISOString();

      // Envia para webhook
      fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      .then(function(response) {
        if (response.ok) {
          showFormSuccess(form);
        } else {
          throw new Error('Erro no envio');
        }
      })
      .catch(function(error) {
        console.error('[Form] Erro:', error);
        showFormError(form, btn, originalText);
      });
    });
  }

  // ── 13. Feedback Visual ──────────────────────────────────────────

  function showFormSuccess(form) {
    // Página de obrigado full-screen com a mesma identidade visual
    var style = getComputedStyle(document.documentElement);
    var primary = style.getPropertyValue('--primary').trim() || '#3b82f6';
    var bg = style.getPropertyValue('--bg').trim() || '#0a0a0f';
    var text = style.getPropertyValue('--text').trim() || '#ffffff';
    var textSec = style.getPropertyValue('--text-secondary').trim() || '#94a3b8';
    var fontMain = style.getPropertyValue('--font-main').trim() || 'Inter, sans-serif';

    document.body.innerHTML = '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:' + bg + ';font-family:' + fontMain + ';text-align:center;padding:40px 20px;">' +
      '<div style="max-width:520px;">' +
        '<div style="width:80px;height:80px;border-radius:50%;background:' + primary + ';display:flex;align-items:center;justify-content:center;margin:0 auto 24px;font-size:36px;color:#fff;box-shadow:0 0 40px ' + primary + '40;">✓</div>' +
        '<h1 style="font-size:clamp(28px,5vw,40px);font-weight:800;color:' + text + ';margin-bottom:16px;line-height:1.2;">Obrigado pelo contato!</h1>' +
        '<p style="font-size:18px;color:' + textSec + ';line-height:1.7;margin-bottom:32px;">Recebemos suas informações com sucesso. Nossa equipe entrará em contato em breve.</p>' +
        '<a href="' + window.location.href.split('?')[0] + '" style="display:inline-block;padding:16px 32px;background:' + primary + ';color:#fff;border-radius:12px;font-weight:600;font-size:16px;text-decoration:none;box-shadow:0 8px 32px ' + primary + '40;transition:transform 0.3s ease;">Voltar à página</a>' +
      '</div>' +
    '</div>';

    // Dispara evento de thank_you_page_view no dataLayer
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'thank_you_page_view',
      session_id: sessionId,
      page_url: window.location.href
    });
  }

  function showFormError(form, btn, originalText) {
    btn.textContent = originalText;
    btn.disabled = false;
    var errorDiv = form.querySelector('.form-error');
    if (!errorDiv) {
      errorDiv = document.createElement('div');
      errorDiv.className = 'form-error';
      errorDiv.textContent = 'Erro ao enviar. Tente novamente.';
      form.appendChild(errorDiv);
    }
    setTimeout(function() { if (errorDiv.parentNode) errorDiv.remove(); }, 5000);
  }

  // ── 14. Máscara de Telefone ──────────────────────────────────────

  var phoneInput = document.getElementById('phone');
  if (phoneInput) {
    phoneInput.addEventListener('input', function(e) {
      var x = e.target.value.replace(/\D/g, '').match(/(\d{0,2})(\d{0,5})(\d{0,4})/);
      e.target.value = !x[2] ? x[1] : '(' + x[1] + ') ' + x[2] + (x[3] ? '-' + x[3] : '');
    });
  }

  // ── 15. FAQ Accordion ────────────────────────────────────────────

  document.querySelectorAll('.faq-question').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var item = this.parentElement;
      var wasActive = item.classList.contains('active');
      document.querySelectorAll('.faq-item').forEach(function(i) { i.classList.remove('active'); });
      if (!wasActive) item.classList.add('active');
    });
  });

  // ── 16. Scroll Reveal Animation ──────────────────────────────────

  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal').forEach(function(el) {
    observer.observe(el);
  });

})();
</script>
```

---

## Formulário com Hidden Inputs

### Estrutura HTML completa

```html
<form id="lead-form" method="POST">
  <!-- ===== CAMPOS VISÍVEIS PADRÃO (6 campos — igual para todas as empresas) ===== -->
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

  <!-- ===== UTMs OCULTAS (preenchidas automaticamente pelo script) ===== -->
  <input type="hidden" name="utm_source" data-field-id="utm_source">
  <input type="hidden" name="utm_medium" data-field-id="utm_medium">
  <input type="hidden" name="utm_campaign" data-field-id="utm_campaign">
  <input type="hidden" name="utm_content" data-field-id="utm_content">
  <input type="hidden" name="utm_term" data-field-id="utm_term">

  <!-- ===== CLICK IDs OCULTOS ===== -->
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

  <!-- ===== DADOS DE SESSÃO OCULTOS ===== -->
  <input type="hidden" name="session_id" id="hidden_session_id">
  <input type="hidden" name="landing_page" data-field-id="landing_page">
  <input type="hidden" name="origin_page" data-field-id="origin_page">
  <input type="hidden" name="session_attributes_encoded" data-field-id="session_attributes_encoded">

  <!-- ===== BOTÃO ===== -->
  <button type="submit" class="btn-submit">{{TEXTO_CTA}}</button>
</form>
```

---

## CSS do Feedback Visual

Incluir no `<style>` da página:

```css
.form-success {
  text-align: center;
  padding: 40px 20px;
  animation: fadeIn 0.5s ease;
}

.form-success-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--success);
  color: white;
  font-size: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
}

.form-success h3 {
  font-size: 20px;
  margin-bottom: 8px;
  color: var(--text);
}

.form-success p {
  color: var(--text-muted);
  font-size: 14px;
}

.form-error {
  background: rgba(239, 68, 68, 0.1);
  color: var(--error);
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 14px;
  margin-top: 12px;
  animation: fadeIn 0.3s ease;
}

button[type="submit"]:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: none; }
}
```

---

## Payload JSON que chega no webhook

Quando alguém preenche o form, o webhook recebe este JSON:

```json
{
  "name": "João Silva",
  "email": "joao@email.com",
  "phone": "11999999999",
  "company": "Empresa Exemplo LTDA",
  "role": "Diretor",
  "revenue": "100k-500k",
  "first_name": "João",
  "last_name": "Silva",
  "session_id": "1708901234_abc123def",
  "page_url": "https://dominio.com/lp-oferta",
  "page_path": "/lp-oferta",
  "referrer": "https://google.com",
  "submitted_at": "2026-02-23T14:30:00.000Z",
  "utm_source": "google",
  "utm_medium": "cpc",
  "utm_campaign": "campanha-x",
  "utm_content": "anuncio-1",
  "utm_term": "palavra-chave",
  "gclid": "abc123...",
  "fbclid": "",
  "landing_page": "https://dominio.com/lp-oferta?utm_source=google&...",
  "origin_page": "https://google.com",
  "session_attributes_encoded": "eyJ1dG1fc291cmNlIjoiZ29vZ2xlIi..."
}
```

---

## Placeholders para Configurar

Ao criar uma landing page, substituir:

| Placeholder | Exemplo | Onde |
|---|---|---|
| `{{COOKIE_DOMAIN}}` | `.dominiocliente.com.br` | Script de tracking, variável DOMAIN |
| `{{WEBHOOK_URL}}` | `https://n8n.dominio.com/webhook/abc` | Script de tracking, variável WEBHOOK_URL |
| `{{TEXTO_CTA}}` | `QUERO MINHA VAGA` | Botão do formulário |

### Notas importantes

1. **O snippet do GTM É incluído automaticamente** — o GTM Container ID é carregado do brand file da empresa selecionada (Templum: `GTM-WLFN684J`, Orbit: `GTM-W6H3729J`, Evolutto: `GTM-PCS96CR`). O snippet padrão do GTM deve ser inserido no `<head>` e o `<noscript>` logo após o `<body>`
2. **Cookie domain** — sempre com ponto no início (ex: `.site.com.br`, não `site.com.br`)
3. **HTTPS obrigatório** — cookies com `SameSite=None; Secure` requerem HTTPS
4. **Se o usuário não tiver webhook** — usar placeholder: `https://SEU-DOMINIO.com/webhook/CONFIGURAR`
5. **O form_submit dispara no dataLayer** — o GTM Web Container pode capturar esse evento e enviar para GA4, Meta CAPI, Google Ads, etc.
6. **O session_attributes_encoded** — é um Base64 do JSON com todos os dados de atribuição, útil para debug e integração com CRMs
