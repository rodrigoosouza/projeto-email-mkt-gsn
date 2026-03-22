import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getOrgContext } from '@/lib/supabase/org-context'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || ''

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { orgId } = await req.json()
    if (!orgId) {
      return NextResponse.json({ error: 'orgId obrigatorio' }, { status: 400 })
    }

    const orgContext = await getOrgContext(orgId)
    if (!orgContext) {
      return NextResponse.json({ error: 'Organizacao nao encontrada' }, { status: 404 })
    }

    if (!orgContext.strategy && !orgContext.briefing) {
      return NextResponse.json({ error: 'Complete o briefing e gere a estrategia primeiro' }, { status: 400 })
    }

    const admin = createAdminClient()
    const results: Record<string, any> = {
      form: null,
      templates: [],
      campaign: null,
      adCampaigns: [],
      automationFlow: null,
      calendar: [],
    }

    // === STEP 1: Generate all marketing assets with AI ===
    const [assetsResult, adsResult] = await Promise.allSettled([
      generateMarketingAssets(orgContext.summary),
      generateAdCampaigns(orgContext.summary),
    ])

    let assets: any = null
    if (assetsResult.status === 'fulfilled') {
      assets = assetsResult.value
    } else {
      console.error('[Auto Setup] Assets generation error:', assetsResult.reason)
    }

    let adsCampaigns: any[] = []
    if (adsResult.status === 'fulfilled') {
      adsCampaigns = adsResult.value
    } else {
      console.error('[Auto Setup] Ads generation error:', adsResult.reason)
    }

    // === STEP 2: Create capture form ===
    if (assets?.form) {
      try {
        const { data: form } = await admin
          .from('lead_forms')
          .insert({
            org_id: orgId,
            name: assets.form.name || 'Formulario de Captacao',
            description: assets.form.description || '',
            form_type: 'inline',
            fields: assets.form.fields || defaultFormFields(),
            settings: {
              notify_email: true,
              double_optin: false,
              tracking_enabled: true,
            },
            style: {
              theme: 'light',
              button_text: assets.form.button_text || 'Quero Receber',
              button_color: '#3b82f6',
            },
            success_message: assets.form.success_message || 'Obrigado! Voce recebera nossas atualizacoes.',
            is_active: true,
            created_by: user.id,
          })
          .select()
          .single()

        results.form = form
      } catch (e) {
        console.error('[Auto Setup] Form creation error:', e)
      }
    }

    // === STEP 3: Create email templates (5 templates for nurture sequence) ===
    if (assets?.templates && Array.isArray(assets.templates)) {
      for (const tpl of assets.templates) {
        try {
          const htmlContent = generateEmailHtml(tpl.subject, tpl.body, orgContext.org.name)
          const { data: template } = await admin
            .from('email_templates')
            .insert({
              org_id: orgId,
              name: tpl.name,
              description: tpl.description || '',
              category: tpl.category || 'marketing',
              subject: tpl.subject,
              html_content: htmlContent,
              preview_text: tpl.preview_text || '',
              is_ai_generated: true,
              created_by: user.id,
            })
            .select()
            .single()

          if (template) results.templates.push(template)
        } catch (e) {
          console.error('[Auto Setup] Template creation error:', e)
        }
      }
    }

    // === STEP 4: Create segment "Todos os Leads" ===
    const { data: existingSegments } = await admin
      .from('segments')
      .select('id')
      .eq('org_id', orgId)
      .limit(1)

    let segmentId = existingSegments?.[0]?.id
    if (!segmentId) {
      const { data: segment } = await admin
        .from('segments')
        .insert({
          org_id: orgId,
          name: 'Todos os Leads',
          description: 'Segmento com todos os leads da organizacao',
          type: 'dynamic',
          rules: { conditions: [], match: 'all' },
          created_by: user.id,
        })
        .select()
        .single()
      segmentId = segment?.id
    }

    // === STEP 5: Create campaigns linked to templates ===
    if (results.templates.length > 0 && segmentId) {
      // Create a campaign for each template with scheduled send dates
      for (let i = 0; i < results.templates.length; i++) {
        const tpl = results.templates[i]
        const sendDate = new Date()
        sendDate.setDate(sendDate.getDate() + (i * 3)) // Send every 3 days

        try {
          const { data: campaign } = await admin
            .from('campaigns')
            .insert({
              org_id: orgId,
              name: `${tpl.name} - ${orgContext.org.name}`,
              status: 'draft',
              template_id: tpl.id,
              segment_id: segmentId,
              scheduled_at: sendDate.toISOString(),
              created_by: user.id,
            })
            .select()
            .single()

          if (i === 0) results.campaign = campaign
        } catch (e) {
          console.error('[Auto Setup] Campaign creation error:', e)
        }
      }
    }

    // === STEP 6: Create automation flow (form → welcome → nurture sequence) ===
    if (results.form && results.templates.length > 0) {
      try {
        const flowNodes = buildAutomationFlowNodes(results.form, results.templates)
        const { data: flow } = await admin
          .from('automation_flows')
          .insert({
            org_id: orgId,
            name: `Sequencia de Boas-vindas - ${orgContext.org.name}`,
            description: 'Fluxo automatico: formulario → email boas-vindas → sequencia nurture',
            channel: 'email',
            trigger_type: 'form_submitted',
            trigger_config: { form_id: results.form.id },
            status: 'draft',
            flow_data: flowNodes,
            created_by: user.id,
          })
          .select()
          .single()

        results.automationFlow = flow
      } catch (e) {
        console.error('[Auto Setup] Automation flow creation error:', e)
      }
    }

    // === STEP 7: Create ad campaigns ===
    if (adsCampaigns.length > 0) {
      try {
        const adRows = adsCampaigns.map((c: any) => ({
          org_id: orgId,
          name: c.name,
          platform: c.platform || 'meta_ads',
          campaign_type: c.campaign_type || 'lead_generation',
          status: 'draft',
          objective: c.objective,
          target_audience: c.target_audience || {},
          budget_daily: c.budget_daily || 50,
          ad_creatives: c.ad_creatives || [],
          copy_variants: c.copy_variants || [],
          ai_generated: true,
          created_by: user.id,
        }))

        const { data: savedAds } = await admin
          .from('ad_campaigns')
          .insert(adRows)
          .select()

        results.adCampaigns = savedAds || []
      } catch (e) {
        console.error('[Auto Setup] Ads creation error:', e)
      }
    }

    // === STEP 8: Generate content calendar for current month ===
    try {
      const calendarPosts = await generateContentCalendar(orgContext.summary)
      if (calendarPosts.length > 0) {
        const now = new Date()
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

        const calRows = calendarPosts.map((p: any) => ({
          org_id: orgId,
          title: p.title || 'Post',
          pillar: validatePillar(p.pillar),
          content_type: p.content_type || 'tip',
          format: validateFormat(p.format),
          platform: p.platform || 'instagram',
          caption: p.caption || null,
          hashtags: Array.isArray(p.hashtags) ? p.hashtags : [],
          image_prompt: p.image_prompt || null,
          scheduled_for: p.scheduled_for || null,
          status: 'generated',
          ai_generated: true,
          created_by: user.id,
        }))

        const { data: savedPosts } = await admin
          .from('content_calendar')
          .insert(calRows)
          .select()

        results.calendar = savedPosts || []
      }
    } catch (e) {
      console.error('[Auto Setup] Calendar generation error (non-blocking):', e)
    }

    return NextResponse.json({
      success: true,
      message: 'Setup automatico concluido! Revise e aprove os assets gerados.',
      created: {
        form: results.form ? 1 : 0,
        templates: results.templates.length,
        campaigns: results.templates.length, // one campaign per template
        adCampaigns: results.adCampaigns.length,
        automationFlow: results.automationFlow ? 1 : 0,
        calendarPosts: results.calendar.length,
      },
      results,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[Auto Setup] Error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// === AI Generation Functions ===

async function generateMarketingAssets(orgSummary: string) {
  const prompt = `Com base no contexto da empresa abaixo, gere os assets de marketing em JSON.

CONTEXTO DA EMPRESA:
${orgSummary}

GERE UM JSON COM:

1. "form": Formulario de captacao de leads
   - name: nome do formulario
   - description: descricao curta
   - fields: array de campos (cada um com name, label, type [text|email|phone|select|textarea], required, placeholder)
     - OBRIGATORIOS: name (Nome), email (Email)
     - OPCIONAIS baseado no ICP: phone, company, cargo, segmento, etc.
     - Maximo 6 campos
   - button_text: texto do botao CTA (ex: "Quero meu diagnostico gratis")
   - success_message: mensagem apos submissao

2. "templates": Array de 5 templates de email (sequencia nurture completa)
   - Template 1: Email de boas-vindas imediato (category: "welcome")
   - Template 2: Email de valor/conteudo - enviado 3 dias depois (category: "marketing")
   - Template 3: Email de case/prova social - 6 dias depois (category: "marketing")
   - Template 4: Email de oferta/CTA - 9 dias depois (category: "marketing")
   - Template 5: Email de re-engajamento - 15 dias depois (category: "reengagement")

   Cada template deve ter:
   - name: nome do template
   - description: descricao + quando deve ser enviado
   - category: "welcome" | "marketing" | "reengagement"
   - subject: assunto do email (usar {{name}} para personalizar)
   - preview_text: texto de preview (max 90 chars)
   - body: conteudo HTML do corpo do email (texto com paragrafos <p>, <strong>, <a href="{{cta_url}}">, <ul><li>)
     - Usar {{name}} para nome do lead
     - Incluir CTA claro com link placeholder {{cta_url}}
     - Tom de voz alinhado com a marca
     - Maximo 300 palavras por email
     - Cada email deve ter um objetivo claro e progressivo na jornada do lead

RESPONDA APENAS COM O JSON, sem markdown.`

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'anthropic/claude-sonnet-4',
      max_tokens: 12000,
      messages: [
        {
          role: 'system',
          content: 'Voce e um especialista em marketing digital e automacao. Gere os assets solicitados em JSON valido. Responda APENAS com o JSON, sem markdown ou explicacoes.',
        },
        { role: 'user', content: prompt },
      ],
    }),
  })

  if (!response.ok) {
    const errBody = await response.text().catch(() => '')
    throw new Error(`OpenRouter error: ${response.status} - ${errBody.substring(0, 200)}`)
  }

  const aiData = await response.json()
  const content = aiData.choices?.[0]?.message?.content || ''
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  return jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content)
}

async function generateAdCampaigns(orgSummary: string) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'anthropic/claude-sonnet-4',
      max_tokens: 8000,
      messages: [
        {
          role: 'system',
          content: 'Voce e um especialista em trafego pago. Gere campanhas em JSON valido. Responda APENAS com o JSON array.',
        },
        {
          role: 'user',
          content: `Crie 6 campanhas de ads (3 Meta Ads + 3 Google Ads) para esta empresa:

${orgSummary}

Para cada plataforma, crie 3 campanhas:
1. Topo de funil (awareness/traffic)
2. Meio de funil (lead_generation/engagement)
3. Fundo de funil (conversion/retargeting)

Para cada campanha:
{
  "name": "Nome descritivo",
  "platform": "meta_ads" ou "google_ads",
  "campaign_type": "awareness|traffic|engagement|lead_generation|conversion|retargeting",
  "objective": "Descricao curta do objetivo",
  "target_audience": { "age_min": 25, "age_max": 55, "interests": ["..."], "locations": ["Brasil"] },
  "budget_daily": 50.00,
  "ad_creatives": [{ "headline": "max 40 chars", "description": "max 125 chars", "image_prompt": "prompt para imagem", "cta": "CTA" }],
  "copy_variants": [{ "primary_text": "max 250 chars", "headline": "titulo", "description": "desc", "cta": "CTA" }]
}

Retorne APENAS o JSON array.`,
        },
      ],
    }),
  })

  if (!response.ok) throw new Error(`Ads AI error: ${response.status}`)

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content || ''
  const adsMatch = content.match(/\[[\s\S]*\]/)
  return adsMatch ? JSON.parse(adsMatch[0]) : []
}

async function generateContentCalendar(orgSummary: string) {
  const now = new Date()
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'anthropic/claude-sonnet-4',
      max_tokens: 12000,
      messages: [
        {
          role: 'system',
          content: 'Voce e um estrategista de conteudo digital especializado no Metodo Hyesser. Responda APENAS em JSON valido.',
        },
        {
          role: 'user',
          content: `Gere um calendario de conteudo para ${month} no Instagram, seguindo o Metodo Hyesser.

CONTEXTO:
${orgSummary}

PILARES:
1. CRESCIMENTO (44%): Dicas, tutoriais, reels, carrosseis, frases motivacionais
2. CONEXAO (22%): Historia pessoal, bastidores, valores
3. QUEBRA DE OBJECOES (22%): Depoimentos, cases, resultados, FAQ
4. AUTORIDADE (12%): Eventos, certificacoes, entrevistas

Gere ~30 posts (seg-sex + 2 fim de semana). JSON array:
[{"title":"...","pillar":"growth|connection|objection_breaking|authority","content_type":"tip|tutorial|testimonial|...","format":"reels|carousel|static_post|stories|article","platform":"instagram","scheduled_for":"${month}-DDTHH:MM:00Z","caption":"copy com emojis e hashtags","hashtags":["..."],"image_prompt":"..."}]

APENAS JSON.`,
        },
      ],
    }),
  })

  if (!response.ok) throw new Error(`Calendar AI error: ${response.status}`)

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content || ''
  const jsonMatch = content.match(/\[[\s\S]*\]/)
  return jsonMatch ? JSON.parse(jsonMatch[0]) : []
}

// === Helper Functions ===

function defaultFormFields() {
  return [
    { name: 'name', label: 'Nome', type: 'text', required: true, placeholder: 'Seu nome' },
    { name: 'email', label: 'Email', type: 'email', required: true, placeholder: 'seu@email.com' },
    { name: 'phone', label: 'Telefone', type: 'phone', required: false, placeholder: '(11) 99999-9999' },
  ]
}

function buildAutomationFlowNodes(form: any, templates: any[]) {
  const nodes: any[] = [
    {
      id: 'trigger-1',
      type: 'trigger',
      position: { x: 250, y: 50 },
      data: {
        label: 'Formulario Preenchido',
        triggerType: 'form_submitted',
        config: { form_id: form.id, form_name: form.name },
      },
    },
  ]

  const edges: any[] = []
  let prevNodeId = 'trigger-1'
  let yPos = 150

  for (let i = 0; i < templates.length; i++) {
    const tpl = templates[i]
    const delayDays = i === 0 ? 0 : [0, 3, 6, 9, 15][i] || (i * 3)

    // Add delay node (except for first email which is immediate)
    if (delayDays > 0) {
      const delayId = `delay-${i}`
      nodes.push({
        id: delayId,
        type: 'delay',
        position: { x: 250, y: yPos },
        data: {
          label: `Esperar ${delayDays} dias`,
          delayType: 'fixed',
          delayValue: delayDays,
          delayUnit: 'days',
        },
      })
      edges.push({ id: `e-${prevNodeId}-${delayId}`, source: prevNodeId, target: delayId })
      prevNodeId = delayId
      yPos += 100
    }

    // Add email send node
    const emailId = `email-${i}`
    nodes.push({
      id: emailId,
      type: 'send_email',
      position: { x: 250, y: yPos },
      data: {
        label: tpl.name,
        templateId: tpl.id,
        templateName: tpl.name,
        subject: tpl.subject,
      },
    })
    edges.push({ id: `e-${prevNodeId}-${emailId}`, source: prevNodeId, target: emailId })
    prevNodeId = emailId
    yPos += 100
  }

  // Add tag node at the end
  const tagId = 'tag-end'
  nodes.push({
    id: tagId,
    type: 'add_tag',
    position: { x: 250, y: yPos },
    data: {
      label: 'Adicionar Tag: Nurture Completo',
      tag: 'nurture_completo',
    },
  })
  edges.push({ id: `e-${prevNodeId}-${tagId}`, source: prevNodeId, target: tagId })

  return { nodes, edges }
}

function validatePillar(p: string): string {
  const valid = ['growth', 'connection', 'objection_breaking', 'authority']
  return valid.includes(p) ? p : 'growth'
}

function validateFormat(f: string): string {
  const valid = ['reels', 'carousel', 'static_post', 'stories', 'article']
  return valid.includes(f) ? f : 'static_post'
}

function generateEmailHtml(subject: string, body: string, orgName: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f4f5;">
<tr><td align="center" style="padding:40px 20px;">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;">
<tr><td style="background-color:#3b82f6;padding:24px 32px;">
<h1 style="color:#ffffff;margin:0;font-size:20px;">${escapeHtml(orgName)}</h1>
</td></tr>
<tr><td style="padding:32px;color:#374151;font-size:15px;line-height:1.6;">
${body}
</td></tr>
<tr><td style="padding:24px 32px;background-color:#f9fafb;text-align:center;border-top:1px solid #e5e7eb;">
<p style="margin:0;font-size:12px;color:#9ca3af;">${escapeHtml(orgName)} | Voce recebeu este email porque se cadastrou.</p>
<p style="margin:8px 0 0;font-size:12px;"><a href="{{unsubscribe_url}}" style="color:#9ca3af;">Cancelar inscricao</a></p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
