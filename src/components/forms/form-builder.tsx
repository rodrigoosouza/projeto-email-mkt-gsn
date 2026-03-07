'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  Code,
  Copy,
  Check,
  Info,
  EyeOff,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useToast } from '@/components/ui/use-toast'
import { useOrganizationContext } from '@/contexts/organization-context'
import { useAuth } from '@/hooks/use-auth'
import { createForm, updateForm } from '@/lib/supabase/forms'
import { createSegment } from '@/lib/supabase/segments'
import { createClient } from '@/lib/supabase/client'
import type { FormField, FormType, LeadForm, LeadTag, Segment } from '@/lib/types'

interface FormBuilderProps {
  initialData?: LeadForm
}

const FORM_TYPES: { value: FormType; label: string; description: string }[] = [
  { value: 'inline', label: 'Inline', description: 'Formulario embutido diretamente na pagina' },
  { value: 'popup', label: 'Pop-up', description: 'Janela modal que aparece sobre o conteudo' },
  { value: 'slide_in', label: 'Slide-in', description: 'Painel que desliza do canto da tela' },
  { value: 'floating_button', label: 'Botao Flutuante', description: 'Botao fixo que abre um formulario' },
]

const FIELD_TYPES: { value: string; label: string }[] = [
  { value: 'text', label: 'Texto' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Telefone' },
  { value: 'number', label: 'Numero' },
  { value: 'select', label: 'Selecao' },
  { value: 'textarea', label: 'Texto longo' },
]

const DEFAULT_FIELDS: FormField[] = [
  { name: 'name', label: 'Nome completo', type: 'text', required: true, placeholder: 'Seu nome completo' },
  { name: 'email', label: 'Email', type: 'email', required: true, placeholder: 'seu@email.com' },
  { name: 'phone', label: 'WhatsApp', type: 'phone', required: true, placeholder: '(00) 00000-0000' },
  { name: 'company', label: 'Empresa', type: 'text', required: true, placeholder: 'Nome da sua empresa' },
  { name: 'role', label: 'Cargo', type: 'text', required: false, placeholder: 'Seu cargo' },
  { name: 'revenue', label: 'Faturamento mensal', type: 'select', required: false, placeholder: '', options: ['Ate R$ 50 mil', 'R$ 50 mil a R$ 100 mil', 'R$ 100 mil a R$ 500 mil', 'R$ 500 mil a R$ 1 milhao', 'Acima de R$ 1 milhao'] },
]

// UTM and tracking hidden fields — always included in generated forms
const UTM_HIDDEN_FIELDS = [
  { name: 'utm_source', group: 'UTMs' },
  { name: 'utm_medium', group: 'UTMs' },
  { name: 'utm_campaign', group: 'UTMs' },
  { name: 'utm_content', group: 'UTMs' },
  { name: 'utm_term', group: 'UTMs' },
]

const CLICK_ID_HIDDEN_FIELDS = [
  { name: 'gclid', group: 'Click IDs' },
  { name: 'fbclid', group: 'Click IDs' },
  { name: 'gbraid', group: 'Click IDs' },
  { name: 'wbraid', group: 'Click IDs' },
  { name: 'ttclid', group: 'Click IDs' },
  { name: 'twclid', group: 'Click IDs' },
  { name: 'gad_campaignid', group: 'Click IDs' },
  { name: 'gad_source', group: 'Click IDs' },
  { name: 'msclkid', group: 'Click IDs' },
  { name: 'li_fat_id', group: 'Click IDs' },
  { name: 'sck', group: 'Click IDs' },
]

const COOKIE_HIDDEN_FIELDS = [
  { name: 'fbc', group: 'Cookies' },
  { name: 'fbp', group: 'Cookies' },
  { name: 'ttp', group: 'Cookies' },
]

const SESSION_HIDDEN_FIELDS = [
  { name: 'session_id', group: 'Sessao' },
  { name: 'landing_page', group: 'Sessao' },
  { name: 'origin_page', group: 'Sessao' },
  { name: 'first_visit', group: 'Sessao' },
  { name: 'ref', group: 'Sessao' },
  { name: 'user_agent', group: 'Sessao' },
  { name: 'session_attributes_encoded', group: 'Sessao' },
]

const ALL_HIDDEN_FIELDS = [...UTM_HIDDEN_FIELDS, ...CLICK_ID_HIDDEN_FIELDS, ...COOKIE_HIDDEN_FIELDS, ...SESSION_HIDDEN_FIELDS]

export function FormBuilder({ initialData }: FormBuilderProps) {
  const router = useRouter()
  const { currentOrg } = useOrganizationContext()
  const { user } = useAuth()
  const { toast } = useToast()
  const orgId = currentOrg?.id

  // Form state
  const [name, setName] = useState(initialData?.name || '')
  const [description, setDescription] = useState(initialData?.description || '')
  const [formType, setFormType] = useState<FormType>(initialData?.form_type || 'inline')
  const [fields, setFields] = useState<FormField[]>(initialData?.fields || DEFAULT_FIELDS)
  const [successMessage, setSuccessMessage] = useState(
    initialData?.success_message || 'Obrigado! Recebemos seus dados.'
  )
  const [redirectUrl, setRedirectUrl] = useState(initialData?.redirect_url || '')
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(initialData?.tag_ids || [])
  const [selectedSegmentId, setSelectedSegmentId] = useState(initialData?.segment_id || 'none')
  const [includeTracking, setIncludeTracking] = useState(
    initialData?.settings?.include_tracking ?? true
  )
  const [showHiddenFields, setShowHiddenFields] = useState(false)
  const [newSegmentName, setNewSegmentName] = useState('')
  const [creatingSegment, setCreatingSegment] = useState(false)
  const [showNewSegment, setShowNewSegment] = useState(false)

  // Settings
  const [popupDelay, setPopupDelay] = useState(
    initialData?.settings?.popup_delay ?? 3
  )
  const [trigger, setTrigger] = useState(
    initialData?.settings?.trigger || 'time'
  )
  const [scrollPercent, setScrollPercent] = useState(
    initialData?.settings?.scroll_percent ?? 50
  )
  const [buttonText, setButtonText] = useState(
    initialData?.settings?.button_text || 'Fale conosco'
  )
  const [buttonColor, setButtonColor] = useState(
    initialData?.settings?.button_color || '#2563eb'
  )
  const [slideTitle, setSlideTitle] = useState(
    initialData?.settings?.slide_title || 'Entre em contato'
  )
  const [webhookUrl, setWebhookUrl] = useState(
    initialData?.settings?.webhook_url || ''
  )
  const [cookieDomain, setCookieDomain] = useState(
    initialData?.settings?.cookie_domain || ''
  )

  // Data
  const [tags, setTags] = useState<LeadTag[]>([])
  const [segments, setSegments] = useState<Segment[]>([])
  const [saving, setSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [showEmbedCode, setShowEmbedCode] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!orgId) return
    loadOptions()
  }, [orgId])

  async function loadOptions() {
    if (!orgId) return
    const supabase = createClient()
    const [{ data: tagsData }, { data: segsData }] = await Promise.all([
      supabase.from('lead_tags').select('*').eq('org_id', orgId).order('name'),
      supabase.from('segments').select('*').eq('org_id', orgId).order('name'),
    ])
    setTags((tagsData || []) as LeadTag[])
    setSegments((segsData || []) as Segment[])
  }

  function addField() {
    setFields([
      ...fields,
      {
        name: `field_${Date.now()}`,
        label: 'Novo Campo',
        type: 'text',
        required: false,
        placeholder: '',
      },
    ])
  }

  function removeField(index: number) {
    setFields(fields.filter((_, i) => i !== index))
  }

  function updateField(index: number, updates: Partial<FormField>) {
    setFields(fields.map((f, i) => (i === index ? { ...f, ...updates } : f)))
  }

  function moveField(index: number, direction: 'up' | 'down') {
    const newFields = [...fields]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= newFields.length) return
    ;[newFields[index], newFields[targetIndex]] = [newFields[targetIndex], newFields[index]]
    setFields(newFields)
  }

  function buildSettings(): Record<string, any> {
    const settings: Record<string, any> = {
      include_tracking: includeTracking,
    }
    if (webhookUrl) settings.webhook_url = webhookUrl
    if (cookieDomain) settings.cookie_domain = cookieDomain
    if (formType === 'popup') {
      settings.popup_delay = popupDelay
      settings.trigger = trigger
      if (trigger === 'scroll') settings.scroll_percent = scrollPercent
    }
    if (formType === 'floating_button') {
      settings.button_text = buttonText
      settings.button_color = buttonColor
    }
    if (formType === 'slide_in') {
      settings.popup_delay = popupDelay
      settings.slide_title = slideTitle
    }
    return settings
  }

  async function handleCreateSegment() {
    if (!orgId || !newSegmentName.trim()) return
    setCreatingSegment(true)
    try {
      const seg = await createSegment(orgId, {
        name: newSegmentName.trim(),
        type: 'static',
      })
      setSegments((prev) => [...prev, seg])
      setSelectedSegmentId(seg.id)
      setNewSegmentName('')
      setShowNewSegment(false)
      toast({ title: 'Segmento criado', description: `"${seg.name}" criado com sucesso.` })
    } catch (err) {
      console.error('Erro ao criar segmento:', err)
      toast({ title: 'Erro', description: 'Nao foi possivel criar o segmento.', variant: 'destructive' })
    } finally {
      setCreatingSegment(false)
    }
  }

  async function handleSave() {
    if (!orgId || !user?.id || !name.trim()) return
    setSaving(true)
    try {
      const formData = {
        name: name.trim(),
        description: description.trim() || undefined,
        form_type: formType,
        fields,
        settings: buildSettings(),
        style: {},
        success_message: successMessage,
        redirect_url: redirectUrl.trim() || undefined,
        tag_ids: selectedTagIds,
        segment_id: selectedSegmentId === 'none' ? undefined : selectedSegmentId || undefined,
      }

      if (initialData) {
        await updateForm(initialData.id, formData)
        toast({ title: 'Formulario atualizado', description: `"${name}" foi atualizado.` })
      } else {
        await createForm(orgId, user.id, formData)
        toast({ title: 'Formulario criado', description: `"${name}" foi criado com sucesso.` })
      }
      router.push('/forms')
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao salvar formulario.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  function toggleTag(tagId: string) {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    )
  }

  function generateEmbedHtml(): string {
    const formId = initialData?.id || 'FORM_ID'
    const domain = cookieDomain || '.seudominio.com.br'
    const webhook = webhookUrl || 'https://SEU-DOMINIO.com/webhook/CONFIGURAR'

    // Build visible fields HTML
    const visibleFieldsHtml = fields.map((field) => {
      if (field.type === 'textarea') {
        return `  <div class="form-group">
    <label for="${field.name}">${field.label}${field.required ? ' *' : ''}</label>
    <textarea id="${field.name}" name="${field.name}" placeholder="${field.placeholder || ''}"${field.required ? ' required' : ''}></textarea>
  </div>`
      }
      if (field.type === 'select' && field.options?.length) {
        const options = field.options.map((o) => `      <option value="${o}">${o}</option>`).join('\n')
        return `  <div class="form-group">
    <label for="${field.name}">${field.label}${field.required ? ' *' : ''}</label>
    <select id="${field.name}" name="${field.name}"${field.required ? ' required' : ''}>
      <option value="" disabled selected>Selecione...</option>
${options}
    </select>
  </div>`
      }
      return `  <div class="form-group">
    <label for="${field.name}">${field.label}${field.required ? ' *' : ''}</label>
    <input type="${field.type}" id="${field.name}" name="${field.name}" placeholder="${field.placeholder || ''}"${field.required ? ' required' : ''}>
  </div>`
    }).join('\n\n')

    // Build hidden fields HTML
    let hiddenFieldsHtml = ''
    if (includeTracking) {
      const utmInputs = UTM_HIDDEN_FIELDS.map(
        (f) => `  <input type="hidden" name="${f.name}" data-field-id="${f.name}">`
      ).join('\n')
      const clickInputs = CLICK_ID_HIDDEN_FIELDS.map(
        (f) => `  <input type="hidden" name="${f.name}" data-field-id="${f.name}">`
      ).join('\n')
      const cookieInputs = COOKIE_HIDDEN_FIELDS.map(
        (f) => `  <input type="hidden" name="${f.name}" data-field-id="${f.name}">`
      ).join('\n')
      const sessionInputs = [
        `  <input type="hidden" name="session_id" id="hidden_session_id">`,
        `  <input type="hidden" name="landing_page" data-field-id="landing_page">`,
        `  <input type="hidden" name="origin_page" data-field-id="origin_page">`,
        `  <input type="hidden" name="first_visit" data-field-id="first_visit">`,
        `  <input type="hidden" name="ref" data-field-id="ref">`,
        `  <input type="hidden" name="user_agent" data-field-id="user_agent">`,
        `  <input type="hidden" name="session_attributes_encoded" data-field-id="session_attributes_encoded">`,
      ].join('\n')

      hiddenFieldsHtml = `
  <!-- ===== UTMs OCULTAS (preenchidas automaticamente pelo script de tracking) ===== -->
${utmInputs}

  <!-- ===== CLICK IDs OCULTOS ===== -->
${clickInputs}

  <!-- ===== COOKIES META/TIKTOK OCULTOS ===== -->
${cookieInputs}

  <!-- ===== DADOS DE SESSAO OCULTOS ===== -->
${sessionInputs}
`
    }

    // Form HTML
    const formHtml = `<form id="lead-form-${formId}" method="POST">
${visibleFieldsHtml}
${hiddenFieldsHtml}
  <!-- BOTAO -->
  <button type="submit" class="btn-submit">Enviar</button>
</form>`

    // If tracking enabled, add the tracking script
    if (includeTracking) {
      return `<!-- Formulario: ${name || 'Sem nome'} -->
${formHtml}

<!-- Script de Tracking (preenche campos ocultos automaticamente) -->
<script>
(function() {
  // Domain dinamico — funciona em qualquer dominio
  var DOMAIN = (function(){var p=window.location.hostname.split('.');return '.'+p.slice(-2).join('.')})();
  var MAX_AGE = 63072000;
  var WEBHOOK_URL = '${webhook}';
  var FORM_ID = 'lead-form-${formId}';

  var utms = ['utm_source','utm_medium','utm_campaign','utm_content','utm_term'];
  var clicks = ['gclid','gbraid','wbraid','fbclid','ttclid','twclid','gad_campaignid','gad_source','msclkid','li_fat_id','sck'];

  function getCookie(n){var m=document.cookie.match(new RegExp('(^| )'+n+'=([^;]+)'));return m?decodeURIComponent(m[2]):null}
  function setCookie(n,v){document.cookie=n+'='+encodeURIComponent(v)+';max-age='+MAX_AGE+';path=/;domain='+DOMAIN+';SameSite=Lax'}
  function setCookieFT(n,v){if(!getCookie(n))setCookie(n,v)}
  function getParam(n){return new URLSearchParams(window.location.search).get(n)}

  // Session ID
  var sid=(function(){try{var k='apex_session_id',s=sessionStorage.getItem(k);if(!s){s=Date.now()+'_'+Math.random().toString(36).substr(2,9);sessionStorage.setItem(k,s)}return s}catch(e){return Date.now()+'_'+Math.random().toString(36).substr(2,9)}})();

  // Referrer mapping (inclui AI, social, search)
  var refMap={'google.com':{utm_source:'google',utm_medium:'organic'},'bing.com':{utm_source:'bing',utm_medium:'organic'},'yahoo.com':{utm_source:'yahoo',utm_medium:'organic'},'duckduckgo.com':{utm_source:'duckduckgo',utm_medium:'organic'},'yandex.com':{utm_source:'yandex',utm_medium:'organic'},'facebook.com':{utm_source:'facebook',utm_medium:'organic'},'instagram.com':{utm_source:'instagram',utm_medium:'organic'},'linkedin.com':{utm_source:'linkedin',utm_medium:'organic'},'youtube.com':{utm_source:'youtube',utm_medium:'organic'},'tiktok.com':{utm_source:'tiktok',utm_medium:'organic'},'twitter.com':{utm_source:'twitter',utm_medium:'organic'},'x.com':{utm_source:'twitter',utm_medium:'organic'},'pinterest.com':{utm_source:'pinterest',utm_medium:'organic'},'whatsapp.com':{utm_source:'whatsapp',utm_medium:'organic'},'telegram.org':{utm_source:'telegram',utm_medium:'organic'},'reddit.com':{utm_source:'reddit',utm_medium:'organic'},'chat.openai.com':{utm_source:'chatgpt',utm_medium:'ai'},'chatgpt.com':{utm_source:'chatgpt',utm_medium:'ai'},'gemini.google.com':{utm_source:'gemini',utm_medium:'ai'},'claude.ai':{utm_source:'claude',utm_medium:'ai'},'poe.com':{utm_source:'poe',utm_medium:'ai'},'wikipedia.org':{utm_source:'wikipedia',utm_medium:'referral'},'github.com':{utm_source:'github',utm_medium:'referral'}};

  function isInternal(r){if(!r)return false;try{var rh=new URL(r).hostname,ch=window.location.hostname;return rh===ch||rh.endsWith('.'+ch.replace('www.',''))||ch.endsWith('.'+rh.replace('www.',''))}catch(e){return false}}

  // 1. UTMs — first touch
  var hasUtm=utms.some(function(p){return!!getParam(p)});
  if(hasUtm){utms.forEach(function(p){setCookieFT(p,getParam(p)||'')})}
  else{var ref=document.referrer||'';if(ref&&!isInternal(ref)){for(var d in refMap){if(ref.indexOf(d)!==-1){utms.forEach(function(p){setCookieFT(p,refMap[d][p]||'')});break}}}}

  // 2. Click IDs — first touch
  clicks.forEach(function(p){var v=getParam(p);if(v)setCookieFT(p,v)});

  // 3. _fbc from fbclid
  var fbclidVal=getParam('fbclid');if(fbclidVal&&!getCookie('_fbc'))setCookie('_fbc','fb.1.'+Date.now()+'.'+fbclidVal);

  // 4. Ref param
  var refParam=getParam('ref');if(refParam&&!getCookie('ref'))setCookie('ref',refParam);

  // 5. First visit, landing page, origin page
  if(!getCookie('first_visit'))setCookie('first_visit',new Date().toISOString());
  if(!getCookie('landing_page'))setCookie('landing_page',window.location.href);
  if(!getCookie('origin_page')){var or=document.referrer||'';if(or&&!isInternal(or))setCookie('origin_page',or)}

  // 6. User agent
  setCookie('user_agent',navigator.userAgent);

  // 7. Session attributes encoded
  var sa={};utms.forEach(function(p){sa[p]=getCookie(p)||''});clicks.forEach(function(p){sa[p]=getCookie(p)||''});
  sa.landing_page=getCookie('landing_page')||'';sa.origin_page=getCookie('origin_page')||'';
  sa.first_visit=getCookie('first_visit')||'';sa.ref=getCookie('ref')||'';
  try{setCookie('session_attributes_encoded',btoa(JSON.stringify(sa)))}catch(e){}

  // 8. Fill hidden inputs
  var form=document.getElementById(FORM_ID);
  if(form){
    utms.concat(clicks).forEach(function(p){var v=getCookie(p);if(!v)return;var el=form.querySelector('input[name="'+p+'"]');if(el)el.value=v});
    var sidEl=form.querySelector('input[name="session_id"]');if(sidEl)sidEl.value=sid;
    var lpEl=form.querySelector('input[name="landing_page"]');if(lpEl)lpEl.value=getCookie('landing_page')||window.location.href;
    var opEl=form.querySelector('input[name="origin_page"]');if(opEl)opEl.value=getCookie('origin_page')||document.referrer||'';
    var saeEl=form.querySelector('input[name="session_attributes_encoded"]');if(saeEl)saeEl.value=getCookie('session_attributes_encoded')||'';
    var fvEl=form.querySelector('input[name="first_visit"]');if(fvEl)fvEl.value=getCookie('first_visit')||'';
    var refEl=form.querySelector('input[name="ref"]');if(refEl)refEl.value=getCookie('ref')||'';
    var uaEl=form.querySelector('input[name="user_agent"]');if(uaEl)uaEl.value=navigator.userAgent;
    var fbcEl=form.querySelector('input[name="fbc"]');if(fbcEl)fbcEl.value=getCookie('_fbc')||'';
    var fbpEl=form.querySelector('input[name="fbp"]');if(fbpEl)fbpEl.value=getCookie('_fbp')||'';
    var ttpEl=form.querySelector('input[name="ttp"]');if(ttpEl)ttpEl.value=getCookie('_ttp')||'';

    // Form submit handler
    var pageStart=Date.now();
    form.addEventListener('submit',function(e){
      e.preventDefault();
      var btn=form.querySelector('button[type="submit"]');
      var origText=btn.textContent;btn.textContent='Enviando...';btn.disabled=true;
      var fd=new FormData(form);var payload={};
      fd.forEach(function(v,k){if(v)payload[k]=v});
      payload.session_id=sid;payload.page_url=window.location.href;
      payload.page_path=window.location.pathname;payload.referrer=document.referrer||'';
      payload.submitted_at=new Date().toISOString();
      payload.time_on_page_at_submit=Math.round((Date.now()-pageStart)/1000);
      var nameParts=(payload.name||'').split(' ');
      payload.first_name=nameParts[0]||'';payload.last_name=nameParts.slice(1).join(' ')||'';
      window.dataLayer=window.dataLayer||[];
      window.dataLayer.push({event:'form_submit',session_id:sid,form_id:FORM_ID});
      fetch(WEBHOOK_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
      .then(function(r){if(r.ok){form.innerHTML='<div style="text-align:center;padding:24px"><h3>${successMessage}</h3></div>'}else{throw new Error('Erro')}})
      .catch(function(){btn.textContent=origText;btn.disabled=false;alert('Erro ao enviar. Tente novamente.')});
    });
  }

  // 9. DataLayer — first touch + last touch + page view
  window.dataLayer=window.dataLayer||[];
  var dl={};
  utms.concat(clicks).forEach(function(p){var v=getCookie(p);if(v)dl['ft_'+p]=v});
  utms.forEach(function(p){var fromUrl=getParam(p);if(fromUrl){dl[p]=fromUrl}else{var r=document.referrer,det=null;if(r){for(var dm in refMap){if(r.indexOf(dm)!==-1){det=refMap[dm];break}}}if(det&&p==='utm_source')dl[p]=det.utm_source;else if(det&&p==='utm_medium')dl[p]=det.utm_medium;else dl[p]=getCookie(p)||''}});
  clicks.forEach(function(p){var fromUrl=getParam(p);dl[p]=fromUrl||getCookie(p)||''});
  dl.session_id=sid;dl.landing_page=getCookie('landing_page')||'';dl.origin_page=getCookie('origin_page')||'';
  dl.first_visit=getCookie('first_visit')||'';dl.ref=getCookie('ref')||'';dl.user_agent=navigator.userAgent;
  dl.session_attributes_encoded=getCookie('session_attributes_encoded')||'';
  if(Object.keys(dl).length)window.dataLayer.push(dl);
  window.dataLayer.push({event:'custom_page_view',session_id:sid,page_url:window.location.href,page_path:window.location.pathname,page_hostname:window.location.hostname,referrer:document.referrer||''});

  // 10. Scroll depth tracking
  (function(){var milestones=[25,50,75,90],reached={},ps=Date.now();function gsp(){var d=document.documentElement,b=document.body,st=d.scrollTop||b.scrollTop,sh=Math.max(d.scrollHeight,b.scrollHeight)-d.clientHeight;return sh<=0?100:Math.round(st/sh*100)}window.addEventListener('scroll',function(){var pct=gsp();milestones.forEach(function(m){if(!reached[m]&&pct>=m){reached[m]=true;window.dataLayer=window.dataLayer||[];window.dataLayer.push({event:'scroll_depth',session_id:sid,scroll_depth:m,time_on_page:Math.round((Date.now()-ps)/1000),page_path:window.location.pathname})}})},{passive:true})})();

  // 11. Time on page heartbeat
  (function(){var ps=Date.now(),hc=0;var hb=setInterval(function(){hc++;window.dataLayer=window.dataLayer||[];window.dataLayer.push({event:'time_on_page_heartbeat',session_id:sid,time_on_page:Math.round((Date.now()-ps)/1000),heartbeat:hc,page_path:window.location.pathname});if(hc>=20)clearInterval(hb)},30000)})();
})();
</script>`
    }

    return formHtml
  }

  function copyEmbedCode() {
    navigator.clipboard.writeText(generateEmbedHtml())
    setCopied(true)
    toast({ title: 'Copiado!', description: 'Codigo HTML copiado para a area de transferencia.' })
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {initialData ? 'Editar Formulario' : 'Novo Formulario'}
          </h2>
          <p className="text-muted-foreground">
            Configure os campos e aparencia do formulario de captura.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowEmbedCode(true)}>
            <Code className="mr-2 h-4 w-4" />
            Codigo HTML
          </Button>
          <Button variant="outline" onClick={() => setShowPreview(true)}>
            <Eye className="mr-2 h-4 w-4" />
            Visualizar
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || fields.length === 0 || saving}>
            {saving ? 'Salvando...' : initialData ? 'Salvar Alteracoes' : 'Criar Formulario'}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main settings */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informacoes Basicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="form-name">Nome do Formulario *</Label>
                <Input
                  id="form-name"
                  placeholder="Ex: Cadastro Newsletter"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="form-desc">Descricao</Label>
                <Textarea
                  id="form-desc"
                  placeholder="Descreva o proposito deste formulario..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tipo do Formulario</CardTitle>
              <CardDescription>Escolha como o formulario sera exibido.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {FORM_TYPES.map((ft) => (
                  <button
                    key={ft.value}
                    type="button"
                    onClick={() => setFormType(ft.value)}
                    className={`flex flex-col items-start rounded-lg border-2 p-4 text-left transition-colors ${
                      formType === ft.value
                        ? 'border-primary bg-primary/5'
                        : 'border-muted hover:border-muted-foreground/25'
                    }`}
                  >
                    <span className="font-medium">{ft.label}</span>
                    <span className="text-xs text-muted-foreground mt-1">{ft.description}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Campos Visiveis</CardTitle>
              <CardDescription>
                Campos que os visitantes devem preencher.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {fields.map((field, index) => (
                <div key={index} className="flex items-start gap-3 rounded-lg border p-4">
                  <div className="flex flex-col gap-1 pt-2">
                    <button
                      type="button"
                      onClick={() => moveField(index, 'up')}
                      disabled={index === 0}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveField(index, 'down')}
                      disabled={index === fields.length - 1}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="flex-1 grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Nome do Campo</Label>
                      <Input
                        value={field.name}
                        onChange={(e) =>
                          updateField(index, { name: e.target.value.toLowerCase().replace(/\s+/g, '_') })
                        }
                        placeholder="nome_do_campo"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Label</Label>
                      <Input
                        value={field.label}
                        onChange={(e) => updateField(index, { label: e.target.value })}
                        placeholder="Label exibido"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Tipo</Label>
                      <Select
                        value={field.type}
                        onValueChange={(val) =>
                          updateField(index, { type: val as FormField['type'] })
                        }
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FIELD_TYPES.map((ft) => (
                            <SelectItem key={ft.value} value={ft.value}>
                              {ft.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Placeholder</Label>
                      <Input
                        value={field.placeholder || ''}
                        onChange={(e) => updateField(index, { placeholder: e.target.value })}
                        placeholder="Texto de exemplo"
                        className="h-8 text-sm"
                      />
                    </div>
                    {field.type === 'select' && (
                      <div className="sm:col-span-2 space-y-1">
                        <Label className="text-xs">Opcoes (separadas por virgula)</Label>
                        <Input
                          value={(field.options || []).join(', ')}
                          onChange={(e) =>
                            updateField(index, {
                              options: e.target.value.split(',').map((o) => o.trim()).filter(Boolean),
                            })
                          }
                          placeholder="Opcao 1, Opcao 2, Opcao 3"
                          className="h-8 text-sm"
                        />
                      </div>
                    )}
                    <div className="flex items-center gap-2 sm:col-span-2">
                      <Switch
                        checked={field.required}
                        onCheckedChange={(checked) => updateField(index, { required: checked })}
                      />
                      <Label className="text-xs">Obrigatorio</Label>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeField(index)}
                    className="text-destructive hover:text-destructive shrink-0"
                    disabled={fields.length <= 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" onClick={addField} className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Campo
              </Button>
            </CardContent>
          </Card>

          {/* Tracking Hidden Fields */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <EyeOff className="h-4 w-4" />
                    Campos Ocultos de Tracking
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Campos preenchidos automaticamente para rastrear a origem do lead (UTMs, click IDs, sessao).
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={includeTracking}
                    onCheckedChange={setIncludeTracking}
                  />
                  <Label className="text-sm">{includeTracking ? 'Ativo' : 'Inativo'}</Label>
                </div>
              </div>
            </CardHeader>
            {includeTracking && (
              <CardContent className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-800 dark:text-blue-300">
                      <p className="font-medium">Rastreamento automatico incluido</p>
                      <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">
                        O formulario gerado inclui automaticamente campos ocultos e um script de tracking que captura
                        UTMs, click IDs (gclid, fbclid, etc.), sessao, landing page e origem do visitante.
                        Esses dados sao enviados junto com o formulario para o webhook.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Dominio do Cookie</Label>
                    <Input
                      value={cookieDomain}
                      onChange={(e) => setCookieDomain(e.target.value)}
                      placeholder=".seudominio.com.br"
                    />
                    <p className="text-xs text-muted-foreground">
                      Dominio para salvar os cookies de tracking (sempre com ponto no inicio). Ex: .templum.com.br
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>URL do Webhook</Label>
                    <Input
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      placeholder="https://n8n.seudominio.com/webhook/abc123"
                    />
                    <p className="text-xs text-muted-foreground">
                      URL para onde os dados do formulario serao enviados (n8n, Supabase, etc.)
                    </p>
                  </div>
                </div>

                <Separator />

                <div>
                  <button
                    type="button"
                    onClick={() => setShowHiddenFields(!showHiddenFields)}
                    className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    {showHiddenFields ? 'Ocultar' : 'Ver'} {ALL_HIDDEN_FIELDS.length} campos ocultos incluidos
                    {showHiddenFields ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                  </button>

                  {showHiddenFields && (
                    <div className="mt-3 space-y-3">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">UTMs (5 campos)</p>
                        <div className="flex flex-wrap gap-1.5">
                          {UTM_HIDDEN_FIELDS.map((f) => (
                            <Badge key={f.name} variant="outline" className="text-xs font-mono">
                              {f.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">Click IDs (10 campos)</p>
                        <div className="flex flex-wrap gap-1.5">
                          {CLICK_ID_HIDDEN_FIELDS.map((f) => (
                            <Badge key={f.name} variant="outline" className="text-xs font-mono">
                              {f.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">Sessao (4 campos)</p>
                        <div className="flex flex-wrap gap-1.5">
                          {SESSION_HIDDEN_FIELDS.map((f) => (
                            <Badge key={f.name} variant="outline" className="text-xs font-mono">
                              {f.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            )}
          </Card>
        </div>

        {/* Sidebar settings */}
        <div className="space-y-6">
          {/* Type-specific settings */}
          {formType === 'popup' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Configuracoes do Pop-up</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Gatilho</Label>
                  <Select value={trigger} onValueChange={setTrigger}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="time">Tempo</SelectItem>
                      <SelectItem value="scroll">Scroll</SelectItem>
                      <SelectItem value="exit_intent">Intencao de saida</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {trigger === 'time' && (
                  <div className="space-y-2">
                    <Label>Atraso (segundos)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={popupDelay}
                      onChange={(e) => setPopupDelay(Number(e.target.value))}
                    />
                  </div>
                )}
                {trigger === 'scroll' && (
                  <div className="space-y-2">
                    <Label>Percentual de scroll (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={scrollPercent}
                      onChange={(e) => setScrollPercent(Number(e.target.value))}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {formType === 'slide_in' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Configuracoes do Slide-in</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Titulo do painel</Label>
                  <Input
                    value={slideTitle}
                    onChange={(e) => setSlideTitle(e.target.value)}
                    placeholder="Entre em contato"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Atraso (segundos)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={popupDelay}
                    onChange={(e) => setPopupDelay(Number(e.target.value))}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {formType === 'floating_button' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Configuracoes do Botao</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Texto do botao</Label>
                  <Input
                    value={buttonText}
                    onChange={(e) => setButtonText(e.target.value)}
                    placeholder="Fale conosco"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cor do botao</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={buttonColor}
                      onChange={(e) => setButtonColor(e.target.value)}
                      className="h-8 w-8 rounded border cursor-pointer"
                    />
                    <Input
                      value={buttonColor}
                      onChange={(e) => setButtonColor(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Apos o Envio</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Mensagem de sucesso</Label>
                <Textarea
                  value={successMessage}
                  onChange={(e) => setSuccessMessage(e.target.value)}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>URL de redirecionamento (opcional)</Label>
                <Input
                  value={redirectUrl}
                  onChange={(e) => setRedirectUrl(e.target.value)}
                  placeholder="https://exemplo.com/obrigado"
                />
                <p className="text-xs text-muted-foreground">
                  Se preenchido, o visitante sera redirecionado em vez de ver a mensagem.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tags</CardTitle>
              <CardDescription>
                Tags adicionadas automaticamente aos leads capturados.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {tags.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma tag disponivel.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className="transition-opacity"
                    >
                      <Badge
                        variant={selectedTagIds.includes(tag.id) ? 'default' : 'outline'}
                        style={
                          selectedTagIds.includes(tag.id)
                            ? { backgroundColor: tag.color, borderColor: tag.color }
                            : { borderColor: tag.color, color: tag.color }
                        }
                      >
                        {tag.name}
                      </Badge>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Segmento</CardTitle>
              <CardDescription>
                Adicionar leads capturados a um segmento automaticamente.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select value={selectedSegmentId} onValueChange={setSelectedSegmentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Nenhum segmento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {segments.map((seg) => (
                    <SelectItem key={seg.id} value={seg.id}>
                      {seg.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {showNewSegment ? (
                <div className="flex gap-2">
                  <Input
                    placeholder="Nome do segmento"
                    value={newSegmentName}
                    onChange={(e) => setNewSegmentName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleCreateSegment()
                      }
                    }}
                    autoFocus
                  />
                  <Button
                    size="sm"
                    onClick={handleCreateSegment}
                    disabled={!newSegmentName.trim() || creatingSegment}
                  >
                    {creatingSegment ? 'Criando...' : 'Criar'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => { setShowNewSegment(false); setNewSegmentName('') }}
                  >
                    Cancelar
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setShowNewSegment(true)}
                >
                  <Plus className="mr-2 h-3.5 w-3.5" />
                  Criar novo segmento
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Visualizacao do Formulario</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="border rounded-lg p-4">
              {fields.map((field) => (
                <div key={field.name} className="mb-3">
                  <label className="block text-sm font-medium mb-1">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-0.5">*</span>}
                  </label>
                  {field.type === 'textarea' ? (
                    <Textarea
                      placeholder={field.placeholder}
                      disabled
                    />
                  ) : field.type === 'select' ? (
                    <Select disabled>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                    </Select>
                  ) : (
                    <Input
                      type={field.type}
                      placeholder={field.placeholder}
                      disabled
                    />
                  )}
                </div>
              ))}
              <Button className="w-full" disabled>
                Enviar
              </Button>
              {includeTracking && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <EyeOff className="h-3 w-3" />
                    {ALL_HIDDEN_FIELDS.length} campos ocultos de tracking incluidos (UTMs, click IDs, sessao)
                  </p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Embed Code Dialog */}
      <Dialog open={showEmbedCode} onOpenChange={setShowEmbedCode}>
        <DialogContent className="max-w-3xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Codigo HTML do Formulario</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                {includeTracking
                  ? 'Este codigo inclui o formulario + script de tracking completo. Cole antes do </body> da sua pagina.'
                  : 'Este codigo inclui apenas o formulario (sem tracking). Adicione o script de tracking separadamente se necessario.'}
              </p>
            </div>
            <div className="relative">
              <pre className="bg-muted p-4 rounded-md text-xs overflow-auto max-h-[50vh] whitespace-pre-wrap break-all font-mono">
                {generateEmbedHtml()}
              </pre>
              <Button
                variant="secondary"
                size="sm"
                className="absolute top-2 right-2"
                onClick={copyEmbedCode}
              >
                {copied ? (
                  <><Check className="h-4 w-4 mr-1" /> Copiado</>
                ) : (
                  <><Copy className="h-4 w-4 mr-1" /> Copiar</>
                )}
              </Button>
            </div>
            {includeTracking && (
              <div className="text-xs text-muted-foreground space-y-1">
                <p><strong>Importante:</strong></p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>Substitua o dominio do cookie pelo seu dominio (com ponto: .seudominio.com.br)</li>
                  <li>Configure a URL do webhook para receber os dados (n8n, Supabase, etc.)</li>
                  <li>O formulario envia UTMs, click IDs e dados de sessao automaticamente</li>
                  <li>O site deve usar HTTPS para os cookies funcionarem</li>
                </ul>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
