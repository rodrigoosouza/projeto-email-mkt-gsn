import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateAI } from '@/lib/ai-client'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { orgId } = body

  if (!orgId) {
    return NextResponse.json(
      { error: 'orgId e obrigatorio' },
      { status: 400 }
    )
  }

  const admin = createAdminClient()

  // Fetch org data
  const { data: org } = await admin
    .from('organizations')
    .select('name, slug, logo_url, website, address, phone')
    .eq('id', orgId)
    .single()

  // Fetch marketing profile
  const { data: profile } = await admin
    .from('org_marketing_profiles')
    .select('brand_identity, briefing, strategy')
    .eq('org_id', orgId)
    .single()

  if (!org) {
    return NextResponse.json(
      { error: 'Organizacao nao encontrada' },
      { status: 404 }
    )
  }

  try {
    const aiResponse = await generateAI({
      messages: [
        {
          role: 'system',
          content: `You are an expert in creating llms.txt files for AI discoverability.

The llms.txt file follows this format:
# Company Name

> Brief one-line description of what the company does.

## About
Detailed description of the company, its mission, and what it offers.

## Services
- Service 1: Description
- Service 2: Description
- Service 3: Description

## Key Facts
- Founded: Year
- Location: City, Country
- Industry: Industry name
- Specialties: List of specialties

## Contact
- Website: URL
- Phone: Phone number
- Email: Email address

## Links
- [Page Title](URL): Description
- [Page Title](URL): Description

Generate a comprehensive llms.txt file that helps AI models understand and accurately cite this organization. The content should be factual, well-structured, and designed for machine readability while being human-friendly.

Write the content in Portuguese (Brazil) since this is a Brazilian company.
Return ONLY the llms.txt content, no markdown code blocks.`,
        },
        {
          role: 'user',
          content: `Generate llms.txt for this organization:

Name: ${org.name}
Website: ${org.website || 'N/A'}
Phone: ${org.phone || 'N/A'}
Address: ${org.address || 'N/A'}

Brand Identity: ${JSON.stringify(profile?.brand_identity || {}).slice(0, 2000)}
Briefing: ${JSON.stringify(profile?.briefing || {}).slice(0, 2000)}
Strategy: ${JSON.stringify(profile?.strategy || {}).slice(0, 2000)}`,
        },
      ],
      maxTokens: 3000,
      temperature: 0.5,
    })

    const content = aiResponse.content.trim()

    // Upsert into seo_llms_txt
    const { data: saved, error } = await admin
      .from('seo_llms_txt')
      .upsert(
        {
          org_id: orgId,
          content,
          auto_generated: true,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'org_id',
        }
      )
      .select()
      .single()

    if (error) {
      console.error('Error saving llms.txt:', error)
      return NextResponse.json(
        { error: 'Erro ao salvar llms.txt' },
        { status: 500 }
      )
    }

    return NextResponse.json({ llmsTxt: saved })
  } catch (err) {
    console.error('llms.txt generation failed:', err)
    return NextResponse.json(
      { error: 'Erro ao gerar llms.txt' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const orgId = searchParams.get('orgId')

  if (!orgId) {
    return NextResponse.json(
      { error: 'orgId e obrigatorio' },
      { status: 400 }
    )
  }

  const { data: llmsTxt, error } = await supabase
    .from('seo_llms_txt')
    .select('*')
    .eq('org_id', orgId)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching llms.txt:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar llms.txt' },
      { status: 500 }
    )
  }

  return NextResponse.json({ llmsTxt: llmsTxt || null })
}
