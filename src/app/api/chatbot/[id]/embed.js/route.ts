import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createAdminClient()

  const { data: config } = await supabase
    .from('chatbot_configs')
    .select('id, name, welcome_message, widget_color, widget_position, is_active')
    .eq('id', id)
    .single()

  const widgetColor = config?.widget_color || '#6366f1'
  const widgetPosition = config?.widget_position || 'bottom-right'
  const welcomeMessage = config?.welcome_message || 'Ola! Como posso ajudar?'
  const chatbotName = config?.name || 'Chat'
  const isActive = config?.is_active ?? false

  const positionCSS =
    widgetPosition === 'bottom-left'
      ? 'left: 20px; right: auto;'
      : 'right: 20px; left: auto;'

  const windowPositionCSS =
    widgetPosition === 'bottom-left'
      ? 'left: 20px; right: auto;'
      : 'right: 20px; left: auto;'

  const scriptContent = `
(function() {
  if (typeof window === 'undefined') return;
  if (window.__plataforma_chatbot_loaded) return;
  window.__plataforma_chatbot_loaded = true;

  var CHATBOT_ID = '${id}';
  var API_BASE = window.location.origin || '';
  var WIDGET_COLOR = '${widgetColor}';
  var WELCOME_MESSAGE = ${JSON.stringify(welcomeMessage)};
  var CHATBOT_NAME = ${JSON.stringify(chatbotName)};
  var IS_ACTIVE = ${isActive};

  if (!IS_ACTIVE) return;

  // Visitor ID
  var VISITOR_KEY = 'plataforma_chatbot_visitor_' + CHATBOT_ID;
  var visitorId = localStorage.getItem(VISITOR_KEY);
  if (!visitorId) {
    visitorId = 'v_' + Math.random().toString(36).substr(2, 12) + '_' + Date.now();
    localStorage.setItem(VISITOR_KEY, visitorId);
  }

  var conversationId = null;
  var isOpen = false;

  // Styles
  var style = document.createElement('style');
  style.textContent = [
    '#plataforma-chat-bubble {',
    '  position: fixed; bottom: 20px; ${positionCSS}',
    '  width: 56px; height: 56px; border-radius: 50%;',
    '  background: ' + WIDGET_COLOR + ';',
    '  color: #fff; border: none; cursor: pointer;',
    '  box-shadow: 0 4px 12px rgba(0,0,0,0.2);',
    '  z-index: 99999; display: flex; align-items: center;',
    '  justify-content: center; transition: transform 0.2s;',
    '}',
    '#plataforma-chat-bubble:hover { transform: scale(1.08); }',
    '#plataforma-chat-bubble svg { width: 26px; height: 26px; fill: #fff; }',
    '#plataforma-chat-window {',
    '  position: fixed; bottom: 88px; ${windowPositionCSS}',
    '  width: 380px; height: 500px; max-height: calc(100vh - 100px);',
    '  background: #fff; border-radius: 16px;',
    '  box-shadow: 0 8px 30px rgba(0,0,0,0.18);',
    '  z-index: 99999; display: none; flex-direction: column;',
    '  overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;',
    '}',
    '#plataforma-chat-window.open { display: flex; }',
    '#plataforma-chat-header {',
    '  background: ' + WIDGET_COLOR + '; color: #fff;',
    '  padding: 16px; display: flex; align-items: center;',
    '  justify-content: space-between; flex-shrink: 0;',
    '}',
    '#plataforma-chat-header h3 { margin: 0; font-size: 16px; font-weight: 600; }',
    '#plataforma-chat-close {',
    '  background: none; border: none; color: #fff;',
    '  cursor: pointer; font-size: 20px; line-height: 1; padding: 0 4px;',
    '}',
    '#plataforma-chat-messages {',
    '  flex: 1; overflow-y: auto; padding: 16px;',
    '  display: flex; flex-direction: column; gap: 10px;',
    '}',
    '.plataforma-msg {',
    '  max-width: 80%; padding: 10px 14px; border-radius: 12px;',
    '  font-size: 14px; line-height: 1.4; word-wrap: break-word;',
    '}',
    '.plataforma-msg.bot {',
    '  background: #f1f3f5; color: #333; align-self: flex-start;',
    '  border-bottom-left-radius: 4px;',
    '}',
    '.plataforma-msg.visitor {',
    '  background: ' + WIDGET_COLOR + '; color: #fff; align-self: flex-end;',
    '  border-bottom-right-radius: 4px;',
    '}',
    '#plataforma-chat-input-area {',
    '  padding: 12px; border-top: 1px solid #e5e7eb;',
    '  display: flex; gap: 8px; flex-shrink: 0;',
    '}',
    '#plataforma-chat-input {',
    '  flex: 1; border: 1px solid #d1d5db; border-radius: 8px;',
    '  padding: 8px 12px; font-size: 14px; outline: none;',
    '  font-family: inherit;',
    '}',
    '#plataforma-chat-input:focus { border-color: ' + WIDGET_COLOR + '; }',
    '#plataforma-chat-send {',
    '  background: ' + WIDGET_COLOR + '; color: #fff; border: none;',
    '  border-radius: 8px; padding: 8px 16px; cursor: pointer;',
    '  font-size: 14px; font-weight: 500;',
    '}',
    '#plataforma-chat-send:disabled { opacity: 0.5; cursor: not-allowed; }',
    '.plataforma-typing { color: #999; font-size: 13px; font-style: italic; align-self: flex-start; padding: 4px 0; }',
    '@media (max-width: 440px) {',
    '  #plataforma-chat-window { width: calc(100vw - 24px); left: 12px; right: 12px; bottom: 80px; }',
    '}',
  ].join('\\n');
  document.head.appendChild(style);

  // Bubble button
  var bubble = document.createElement('button');
  bubble.id = 'plataforma-chat-bubble';
  bubble.setAttribute('aria-label', 'Abrir chat');
  bubble.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>';
  document.body.appendChild(bubble);

  // Chat window
  var win = document.createElement('div');
  win.id = 'plataforma-chat-window';
  win.innerHTML = [
    '<div id="plataforma-chat-header">',
    '  <h3>' + CHATBOT_NAME + '</h3>',
    '  <button id="plataforma-chat-close" aria-label="Fechar chat">&times;</button>',
    '</div>',
    '<div id="plataforma-chat-messages"></div>',
    '<div id="plataforma-chat-input-area">',
    '  <input id="plataforma-chat-input" type="text" placeholder="Digite sua mensagem..." autocomplete="off" />',
    '  <button id="plataforma-chat-send">Enviar</button>',
    '</div>',
  ].join('\\n');
  document.body.appendChild(win);

  var messagesEl = document.getElementById('plataforma-chat-messages');
  var inputEl = document.getElementById('plataforma-chat-input');
  var sendBtn = document.getElementById('plataforma-chat-send');
  var closeBtn = document.getElementById('plataforma-chat-close');

  function addMessage(text, role) {
    var div = document.createElement('div');
    div.className = 'plataforma-msg ' + role;
    div.textContent = text;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function showTyping() {
    var el = document.createElement('div');
    el.className = 'plataforma-typing';
    el.id = 'plataforma-typing';
    el.textContent = 'Digitando...';
    messagesEl.appendChild(el);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function hideTyping() {
    var el = document.getElementById('plataforma-typing');
    if (el) el.remove();
  }

  function toggleChat() {
    isOpen = !isOpen;
    if (isOpen) {
      win.classList.add('open');
      if (messagesEl.children.length === 0) {
        addMessage(WELCOME_MESSAGE, 'bot');
      }
      inputEl.focus();
    } else {
      win.classList.remove('open');
    }
  }

  async function sendMessage() {
    var text = inputEl.value.trim();
    if (!text) return;

    inputEl.value = '';
    addMessage(text, 'visitor');
    sendBtn.disabled = true;
    showTyping();

    try {
      var res = await fetch(API_BASE + '/api/chatbot/' + CHATBOT_ID + '/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          visitor_id: visitorId,
          conversation_id: conversationId,
        }),
      });
      var data = await res.json();
      hideTyping();
      if (data.response) {
        addMessage(data.response, 'bot');
      }
      if (data.conversation_id) {
        conversationId = data.conversation_id;
      }
    } catch (err) {
      hideTyping();
      addMessage('Erro ao enviar mensagem. Tente novamente.', 'bot');
    }
    sendBtn.disabled = false;
    inputEl.focus();
  }

  bubble.addEventListener('click', toggleChat);
  closeBtn.addEventListener('click', toggleChat);
  sendBtn.addEventListener('click', sendMessage);
  inputEl.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
})();
`

  return new NextResponse(scriptContent, {
    headers: {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
