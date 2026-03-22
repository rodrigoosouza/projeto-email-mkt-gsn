import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createAdminClient()
  const { data: form } = await supabase
    .from('lead_forms')
    .select('*')
    .eq('id', params.id)
    .eq('is_active', true)
    .single()

  if (!form) {
    return new NextResponse('// Form not found', {
      headers: { 'Content-Type': 'application/javascript' },
    })
  }

  const apiBase = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin

  const script = generateEmbedScript(form, apiBase)

  return new NextResponse(script, {
    headers: {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'public, max-age=300',
      'Access-Control-Allow-Origin': '*',
    },
  })
}

function generateEmbedScript(form: any, apiBase: string): string {
  const fields = JSON.stringify(form.fields || [])
  const settings = JSON.stringify(form.settings || {})
  const style = form.style || {}
  const btnColor = style.button_color || '#3b82f6'
  const btnText = JSON.stringify(style.button_text || 'Enviar')
  const theme = style.theme || 'light'

  // Theme-aware colors
  const bgColor = theme === 'dark' ? '#1f2937' : '#ffffff'
  const textColor = theme === 'dark' ? '#f9fafb' : '#374151'
  const inputBg = theme === 'dark' ? '#374151' : '#ffffff'
  const inputBorder = theme === 'dark' ? '#4b5563' : '#d1d5db'
  const labelColor = theme === 'dark' ? '#e5e7eb' : '#374151'

  return `
(function() {
  var FORM_ID = "${form.id}";
  var API_URL = "${apiBase}/api/forms/${form.id}/submit";
  var FORM_TYPE = "${form.form_type}";
  var FIELDS = ${fields};
  var SETTINGS = ${settings};
  var SUCCESS_MSG = ${JSON.stringify(form.success_message || 'Obrigado! Recebemos seus dados.')};
  var REDIRECT_URL = ${JSON.stringify(form.redirect_url || null)};
  var BTN_COLOR = "${btnColor}";
  var BTN_TEXT = ${btnText};
  var BG_COLOR = "${bgColor}";
  var TEXT_COLOR = "${textColor}";
  var INPUT_BG = "${inputBg}";
  var INPUT_BORDER = "${inputBorder}";
  var LABEL_COLOR = "${labelColor}";

  function buildFieldHtml(field) {
    var html = '<div style="margin-bottom:14px;">';
    html += '<label style="display:block;margin-bottom:6px;font-size:14px;font-weight:500;color:' + LABEL_COLOR + ';">' + field.label + (field.required ? ' *' : '') + '</label>';

    if (field.type === 'textarea') {
      html += '<textarea name="' + field.name + '" placeholder="' + (field.placeholder || '') + '"' + (field.required ? ' required' : '') + ' style="width:100%;padding:10px 14px;border:1px solid ' + INPUT_BORDER + ';border-radius:6px;font-size:14px;resize:vertical;min-height:80px;box-sizing:border-box;font-family:inherit;background:' + INPUT_BG + ';color:' + TEXT_COLOR + ';"></textarea>';
    } else if (field.type === 'select' && field.options) {
      html += '<select name="' + field.name + '"' + (field.required ? ' required' : '') + ' style="width:100%;padding:10px 14px;border:1px solid ' + INPUT_BORDER + ';border-radius:6px;font-size:14px;box-sizing:border-box;background:' + INPUT_BG + ';color:' + TEXT_COLOR + ';">';
      html += '<option value="">Selecione...</option>';
      field.options.forEach(function(opt) { html += '<option value="' + opt + '">' + opt + '</option>'; });
      html += '</select>';
    } else {
      html += '<input type="' + field.type + '" name="' + field.name + '" placeholder="' + (field.placeholder || '') + '"' + (field.required ? ' required' : '') + ' style="width:100%;padding:10px 14px;border:1px solid ' + INPUT_BORDER + ';border-radius:6px;font-size:14px;box-sizing:border-box;background:' + INPUT_BG + ';color:' + TEXT_COLOR + ';" />';
    }

    html += '</div>';
    return html;
  }

  function createFormHtml() {
    var html = '<form id="pf-form-' + FORM_ID + '" style="font-family:system-ui,-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:' + BG_COLOR + ';border-radius:8px;">';
    FIELDS.forEach(function(field) { html += buildFieldHtml(field); });
    html += '<button type="submit" style="width:100%;padding:12px 16px;background:' + BTN_COLOR + ';color:#fff;border:none;border-radius:6px;font-size:15px;font-weight:600;cursor:pointer;transition:opacity 0.2s;margin-top:4px;" onmouseover="this.style.opacity=\\'0.9\\'" onmouseout="this.style.opacity=\\'1\\'">' + BTN_TEXT + '</button>';
    html += '</form>';
    return html;
  }

  function handleSubmit(formEl) {
    formEl.addEventListener('submit', function(e) {
      e.preventDefault();
      var submitBtn = formEl.querySelector('button[type="submit"]');
      var originalText = submitBtn.innerHTML;
      submitBtn.innerHTML = 'Enviando...';
      submitBtn.disabled = true;

      var formData = new FormData(formEl);
      var data = {};
      formData.forEach(function(value, key) { data[key] = value; });

      fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: data, source_url: window.location.href }),
      })
      .then(function(res) { return res.json(); })
      .then(function(result) {
        if (result.redirect_url || REDIRECT_URL) {
          window.location.href = result.redirect_url || REDIRECT_URL;
        } else {
          formEl.innerHTML = '<div style="text-align:center;padding:20px;"><p style="color:#16a34a;font-weight:500;font-size:16px;margin:0;">' + (result.message || SUCCESS_MSG) + '</p></div>';
        }
      })
      .catch(function(err) {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
        alert('Erro ao enviar. Tente novamente.');
      });
    });
  }

  function createInlineForm() {
    var container = document.getElementById('plataforma-form-' + FORM_ID);
    if (!container) return;
    container.innerHTML = createFormHtml();
    var formEl = document.getElementById('pf-form-' + FORM_ID);
    if (formEl) handleSubmit(formEl);
  }

  function createPopupForm() {
    var overlay = document.createElement('div');
    overlay.id = 'pf-overlay-' + FORM_ID;
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:99998;display:none;align-items:center;justify-content:center;';

    var popup = document.createElement('div');
    popup.style.cssText = 'background:' + BG_COLOR + ';border-radius:12px;padding:24px;max-width:500px;width:90%;max-height:90vh;overflow-y:auto;position:relative;box-shadow:0 20px 60px rgba(0,0,0,0.3);';

    var closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.style.cssText = 'position:absolute;top:8px;right:12px;background:none;border:none;font-size:24px;cursor:pointer;color:#666;line-height:1;';
    closeBtn.onclick = function() { overlay.style.display = 'none'; };

    var formContainer = document.createElement('div');
    formContainer.innerHTML = createFormHtml();

    popup.appendChild(closeBtn);
    popup.appendChild(formContainer);
    overlay.appendChild(popup);
    document.body.appendChild(overlay);

    var delay = (SETTINGS.popup_delay || 3) * 1000;
    var trigger = SETTINGS.trigger || 'time';

    if (trigger === 'exit_intent') {
      document.addEventListener('mouseout', function(e) {
        if (e.clientY < 0) {
          overlay.style.display = 'flex';
        }
      }, { once: true });
    } else if (trigger === 'scroll') {
      var scrollPercent = SETTINGS.scroll_percent || 50;
      window.addEventListener('scroll', function checkScroll() {
        var scrolled = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
        if (scrolled >= scrollPercent) {
          overlay.style.display = 'flex';
          window.removeEventListener('scroll', checkScroll);
        }
      });
    } else {
      setTimeout(function() { overlay.style.display = 'flex'; }, delay);
    }

    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) overlay.style.display = 'none';
    });

    var formEl = formContainer.querySelector('#pf-form-' + FORM_ID);
    if (formEl) handleSubmit(formEl);
  }

  function createSlideInForm() {
    var panel = document.createElement('div');
    panel.id = 'pf-slidein-' + FORM_ID;
    panel.style.cssText = 'position:fixed;bottom:0;right:20px;background:' + BG_COLOR + ';border-radius:12px 12px 0 0;padding:0;width:380px;max-height:0;overflow:hidden;z-index:99999;box-shadow:0 -4px 20px rgba(0,0,0,0.15);transition:max-height 0.3s ease;';

    var header = document.createElement('div');
    header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:' + BTN_COLOR + ';border-radius:12px 12px 0 0;cursor:pointer;';
    header.innerHTML = '<span style="font-weight:600;font-size:14px;color:#fff;">' + (SETTINGS.slide_title || 'Entre em contato') + '</span>';

    var closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.style.cssText = 'background:none;border:none;font-size:20px;cursor:pointer;color:#fff;line-height:1;';

    var isOpen = false;
    function togglePanel() {
      isOpen = !isOpen;
      panel.style.maxHeight = isOpen ? '500px' : '44px';
    }

    header.appendChild(closeBtn);
    closeBtn.onclick = function(e) { e.stopPropagation(); panel.style.maxHeight = '0'; };
    header.onclick = togglePanel;

    var formContainer = document.createElement('div');
    formContainer.innerHTML = createFormHtml();

    panel.appendChild(header);
    panel.appendChild(formContainer);
    document.body.appendChild(panel);

    var delay = (SETTINGS.popup_delay || 3) * 1000;
    setTimeout(function() {
      panel.style.maxHeight = '44px';
      setTimeout(function() { panel.style.maxHeight = '500px'; isOpen = true; }, 500);
    }, delay);

    var formEl = formContainer.querySelector('#pf-form-' + FORM_ID);
    if (formEl) handleSubmit(formEl);
  }

  function createFloatingButtonForm() {
    var btn = document.createElement('button');
    btn.innerHTML = BTN_TEXT;
    btn.style.cssText = 'position:fixed;bottom:20px;right:20px;background:' + BTN_COLOR + ';color:#fff;border:none;border-radius:50px;padding:12px 24px;font-size:14px;font-weight:500;cursor:pointer;z-index:99998;box-shadow:0 4px 12px rgba(0,0,0,0.15);transition:transform 0.2s;font-family:system-ui,-apple-system,sans-serif;';
    btn.onmouseover = function() { btn.style.transform = 'scale(1.05)'; };
    btn.onmouseout = function() { btn.style.transform = 'scale(1)'; };
    document.body.appendChild(btn);

    var panel = document.createElement('div');
    panel.style.cssText = 'position:fixed;bottom:80px;right:20px;background:' + BG_COLOR + ';border-radius:12px;padding:20px;width:360px;max-height:80vh;overflow-y:auto;z-index:99999;box-shadow:0 8px 30px rgba(0,0,0,0.12);display:none;';

    var closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.style.cssText = 'position:absolute;top:8px;right:12px;background:none;border:none;font-size:20px;cursor:pointer;color:#666;line-height:1;';
    closeBtn.onclick = function() { panel.style.display = 'none'; };

    var formContainer = document.createElement('div');
    formContainer.innerHTML = createFormHtml();

    panel.appendChild(closeBtn);
    panel.appendChild(formContainer);
    document.body.appendChild(panel);

    btn.onclick = function() {
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    };

    var formEl = formContainer.querySelector('#pf-form-' + FORM_ID);
    if (formEl) handleSubmit(formEl);
  }

  function init() {
    if (FORM_TYPE === 'popup') {
      createPopupForm();
    } else if (FORM_TYPE === 'slide_in') {
      createSlideInForm();
    } else if (FORM_TYPE === 'floating_button') {
      createFloatingButtonForm();
    } else {
      createInlineForm();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
`
}
