import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getOrgContext } from '@/lib/supabase/org-context'
import { generateAI, parseAIJson } from '@/lib/ai-client'

export const maxDuration = 120

interface SectionData {
  type: string
  title?: string
  subtitle?: string
  content?: string
  items?: Array<Record<string, unknown>>
  cta_text?: string
  cta_url?: string
  background?: string
  image?: string
}

interface PageData {
  slug: string
  title: string
  description: string
  sections: SectionData[]
  seo: {
    title: string
    description: string
    keywords: string[]
  }
}

interface SiteAIResponse {
  site_name: string
  global_styles: Record<string, unknown>
  navigation: Array<{ label: string; href: string }>
  footer: Record<string, unknown>
  seo_global: Record<string, unknown>
  pages: PageData[]
}

/**
 * POST /api/sites/auto-generate — AI-generated site structure
 * Body: { orgId }
 */
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

    // Check admin role
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('org_id', orgId)
      .eq('user_id', user.id)
      .single()

    if (!membership || membership.role !== 'admin') {
      return NextResponse.json({ error: 'Apenas administradores podem gerar sites' }, { status: 403 })
    }

    // Check if site already exists
    const admin = createAdminClient()
    const { data: existingSite } = await admin
      .from('org_sites')
      .select('id')
      .eq('org_id', orgId)
      .maybeSingle()

    if (existingSite) {
      return NextResponse.json({ error: 'Ja existe um site para esta organizacao. Exclua o existente primeiro.' }, { status: 409 })
    }

    // Fetch org context for AI prompt
    const orgContext = await getOrgContext(orgId)
    if (!orgContext) {
      return NextResponse.json({ error: 'Organizacao nao encontrada' }, { status: 404 })
    }

    const systemPrompt = `Voce e um web designer e copywriter especialista em criar sites institucionais e comerciais.
Gere a estrutura completa de um site profissional com conteudo real baseado no perfil da empresa.
Todo o conteudo deve ser em portugues brasileiro.
Retorne APENAS um JSON valido (sem markdown code blocks) no formato especificado.`

    const userPrompt = `Crie a estrutura completa de um site profissional para a seguinte empresa:

${orgContext.summary}

Gere 6 paginas com conteudo real e profissional:
1. Home (slug: "home") — Hero impactante, features/diferenciais, depoimentos, CTA
2. Sobre (slug: "sobre") — Historia, missao/visao/valores, equipe, numeros
3. Servicos (slug: "servicos") — Lista de servicos com descricao, beneficios, CTA
4. Cases/Portfolio (slug: "cases") — Cases de sucesso, resultados, depoimentos detalhados
5. Blog (slug: "blog") — Estrutura da pagina do blog, categorias, CTA newsletter
6. Contato (slug: "contato") — Formulario, mapa, informacoes de contato, FAQ

Para cada pagina, crie sections com esta estrutura:
{
  "type": "hero|features|testimonials|cta|pricing|faq|contact_form|stats|team|services|portfolio|text_block|newsletter",
  "title": "Titulo da secao",
  "subtitle": "Subtitulo opcional",
  "content": "Texto principal da secao",
  "items": [{"title": "...", "description": "...", "icon": "...", "image": "..."}],
  "cta_text": "Texto do botao CTA",
  "cta_url": "/contato",
  "background": "white|gray|primary|dark|gradient",
  "image": "placeholder descrevendo a imagem ideal"
}

Retorne um JSON com esta estrutura:
{
  "site_name": "Nome do site",
  "global_styles": {
    "primary_color": "#hex",
    "secondary_color": "#hex",
    "accent_color": "#hex",
    "font_heading": "nome da fonte",
    "font_body": "nome da fonte",
    "border_radius": "8px"
  },
  "navigation": [{"label": "Home", "href": "/"}],
  "footer": {
    "company_name": "...",
    "description": "Descricao curta",
    "links": [{"label": "...", "href": "..."}],
    "social": [{"platform": "...", "url": "..."}],
    "copyright": "..."
  },
  "seo_global": {
    "site_title": "...",
    "site_description": "...",
    "og_image_description": "..."
  },
  "pages": [
    {
      "slug": "home",
      "title": "...",
      "description": "...",
      "sections": [...],
      "seo": {
        "title": "...",
        "description": "...",
        "keywords": ["..."]
      }
    }
  ]
}

Regras:
- Conteudo realista e persuasivo baseado no perfil da empresa
- Minimo 3-5 sections por pagina
- Tom profissional e confiavel
- CTAs claros e acionaveis
- SEO otimizado para cada pagina
- Cores coerentes com a identidade da marca (se disponivel)
- Retorne APENAS o JSON, sem texto antes ou depois`

    const { content: aiContent } = await generateAI({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      maxTokens: 8000,
      temperature: 0.7,
    })

    const parsed = parseAIJson(aiContent) as SiteAIResponse

    if (!parsed.pages || parsed.pages.length === 0) {
      console.error('AI returned incomplete site response:', aiContent.substring(0, 500))
      return NextResponse.json({ error: 'IA retornou resposta incompleta. Tente novamente.' }, { status: 500 })
    }

    // Create the site record
    const { data: site, error: siteError } = await admin
      .from('org_sites')
      .insert({
        org_id: orgId,
        name: parsed.site_name || `Site ${orgContext.org.name}`,
        template: 'business',
        global_styles: parsed.global_styles || {},
        navigation: parsed.navigation || [],
        footer: parsed.footer || {},
        seo_global: parsed.seo_global || {},
        status: 'draft',
      })
      .select()
      .single()

    if (siteError) {
      console.error('Error creating site:', siteError)
      return NextResponse.json({ error: siteError.message }, { status: 500 })
    }

    // Create pages
    const pageRecords = parsed.pages.map((page, index) => ({
      site_id: site.id,
      org_id: orgId,
      slug: page.slug,
      title: page.title,
      description: page.description || '',
      sections: page.sections || [],
      seo: page.seo || {},
      status: 'draft' as const,
      sort_order: index,
    }))

    const { data: pages, error: pagesError } = await admin
      .from('site_pages')
      .insert(pageRecords)
      .select()

    if (pagesError) {
      console.error('Error creating site pages:', pagesError)
      // Clean up site if pages failed
      await admin.from('org_sites').delete().eq('id', site.id)
      return NextResponse.json({ error: pagesError.message }, { status: 500 })
    }

    return NextResponse.json({
      site: { ...site, pages: pages || [] },
    }, { status: 201 })
  } catch (err) {
    console.error('Site auto-generate error:', err)
    const message = err instanceof Error ? err.message : 'Erro ao gerar site'
    return NextResponse.json({ error: message.substring(0, 200) }, { status: 500 })
  }
}
