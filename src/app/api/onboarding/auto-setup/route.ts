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

    // Generate all assets with AI
    const prompt = buildAutoSetupPrompt(orgContext.summary)

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
            content: 'Voce e um especialista em marketing digital. Gere os assets solicitados em JSON valido. Responda APENAS com o JSON, sem markdown ou explicacoes.',
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
    const content = aiData.choices[0].message.content || ''

    let assets: any
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      assets = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content)
    } catch {
      return NextResponse.json({ error: 'Erro ao parsear resposta da IA', raw: content }, { status: 500 })
    }

    const admin = createAdminClient()
    const results: Record<string, any> = { form: null, templates: [], campaign: null }

    // 1. Create capture form
    if (assets.form) {
      const { data: form } = await admin
        .from('lead_forms')
        .insert({
          org_id: orgId,
          name: assets.form.name || 'Formulario de Captacao',
          description: assets.form.description || '',
          form_type: 'inline',
          fields: assets.form.fields || [
            { name: 'name', label: 'Nome', type: 'text', required: true, placeholder: 'Seu nome' },
            { name: 'email', label: 'Email', type: 'email', required: true, placeholder: 'seu@email.com' },
            { name: 'phone', label: 'Telefone', type: 'phone', required: false, placeholder: '(11) 99999-9999' },
          ],
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
    }

    // 2. Create email templates
    if (assets.templates && Array.isArray(assets.templates)) {
      for (const tpl of assets.templates) {
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
      }
    }

    // 3. Create a segment for "all leads" if doesn't exist
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

    // 4. Create welcome campaign (draft) using first template
    if (results.templates.length > 0 && segmentId) {
      const welcomeTemplate = results.templates[0]
      const { data: campaign } = await admin
        .from('campaigns')
        .insert({
          org_id: orgId,
          name: `Boas-vindas - ${orgContext.org.name}`,
          status: 'draft',
          template_id: welcomeTemplate.id,
          segment_id: segmentId,
          created_by: user.id,
        })
        .select()
        .single()

      results.campaign = campaign
    }

    return NextResponse.json({
      success: true,
      message: 'Setup automatico concluido',
      created: {
        form: results.form ? 1 : 0,
        templates: results.templates.length,
        campaign: results.campaign ? 1 : 0,
      },
      results,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[Auto Setup] Error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

function buildAutoSetupPrompt(orgSummary: string): string {
  return `Com base no contexto da empresa abaixo, gere os assets de marketing em JSON.

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

2. "templates": Array de 3 templates de email
   - Template 1: Email de boas-vindas (category: "welcome")
   - Template 2: Email de nurture/conteudo (category: "marketing")
   - Template 3: Email de re-engajamento (category: "reengagement")

   Cada template deve ter:
   - name: nome do template
   - description: descricao
   - category: "welcome" | "marketing" | "reengagement"
   - subject: assunto do email (usar {{name}} para personalizar)
   - preview_text: texto de preview (max 90 chars)
   - body: conteudo HTML do corpo do email (texto com paragrafos <p>, <strong>, <a>, <ul><li>)
     - Usar {{name}} para nome do lead
     - Incluir CTA claro com link placeholder {{cta_url}}
     - Tom de voz alinhado com a marca
     - Maximo 300 palavras por email

RESPONDA APENAS COM O JSON, sem markdown.`
}

function generateEmailHtml(subject: string, body: string, orgName: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f4f5;">
<tr><td align="center" style="padding:40px 20px;">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;">
<tr><td style="background-color:#3b82f6;padding:24px 32px;">
<h1 style="color:#ffffff;margin:0;font-size:20px;">${orgName}</h1>
</td></tr>
<tr><td style="padding:32px;">
${body}
</td></tr>
<tr><td style="padding:24px 32px;background-color:#f9fafb;text-align:center;border-top:1px solid #e5e7eb;">
<p style="margin:0;font-size:12px;color:#9ca3af;">${orgName} | Voce recebeu este email porque se cadastrou.</p>
<p style="margin:8px 0 0;font-size:12px;"><a href="{{unsubscribe_url}}" style="color:#9ca3af;">Cancelar inscricao</a></p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
}
