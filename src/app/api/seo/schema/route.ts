import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateAI, parseAIJson } from '@/lib/ai-client'

export const maxDuration = 60

const SCHEMA_TEMPLATES: Record<string, object> = {
  Organization: {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: '',
    url: '',
    logo: '',
    description: '',
    sameAs: [],
    contactPoint: { '@type': 'ContactPoint', telephone: '', contactType: 'customer service' },
  },
  LocalBusiness: {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: '',
    url: '',
    image: '',
    description: '',
    address: { '@type': 'PostalAddress', streetAddress: '', addressLocality: '', addressRegion: '', postalCode: '' },
    telephone: '',
    openingHours: '',
  },
  FAQ: {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [],
  },
  Article: {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: '',
    author: { '@type': 'Organization', name: '' },
    datePublished: '',
    description: '',
    image: '',
  },
  HowTo: {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: '',
    description: '',
    step: [],
  },
  Service: {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: '',
    provider: { '@type': 'Organization', name: '' },
    description: '',
    areaServed: '',
  },
  Person: {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: '',
    jobTitle: '',
    worksFor: { '@type': 'Organization', name: '' },
    url: '',
  },
  BreadcrumbList: {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [],
  },
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { orgId, pageUrl, pageTitle, schemaTypes } = body as {
    orgId: string
    pageUrl: string
    pageTitle?: string
    schemaTypes: string[]
  }

  if (!orgId || !pageUrl || !schemaTypes?.length) {
    return NextResponse.json(
      { error: 'orgId, pageUrl e schemaTypes sao obrigatorios' },
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

  // Fetch brand identity from marketing profile
  const { data: profile } = await admin
    .from('org_marketing_profiles')
    .select('brand_identity, briefing, strategy')
    .eq('org_id', orgId)
    .single()

  const orgContext = {
    name: org?.name || '',
    website: org?.website || pageUrl,
    logo: org?.logo_url || '',
    phone: org?.phone || '',
    address: org?.address || '',
    brandIdentity: profile?.brand_identity || {},
    briefing: profile?.briefing || {},
  }

  try {
    // Generate schemas using AI
    const aiResponse = await generateAI({
      messages: [
        {
          role: 'system',
          content: `You are a Schema.org markup expert. Generate valid JSON-LD schema markup for the requested types.

Use this organization data:
- Name: ${orgContext.name}
- Website: ${orgContext.website}
- Logo: ${orgContext.logo}
- Phone: ${orgContext.phone}
- Address: ${orgContext.address}
- Brand: ${JSON.stringify(orgContext.brandIdentity).slice(0, 1000)}
- Briefing: ${JSON.stringify(orgContext.briefing).slice(0, 1000)}

Page URL: ${pageUrl}
Page Title: ${pageTitle || 'N/A'}

Generate complete, production-ready JSON-LD for each requested schema type.
For FAQ type, generate 5-8 relevant questions based on the business context.
For HowTo type, generate relevant steps based on the business context.

Return ONLY valid JSON (no markdown):
{
  "schemas": {
    "SchemaType": { ... complete JSON-LD ... }
  }
}

Each schema must be a complete, valid JSON-LD object with @context and @type.`,
        },
        {
          role: 'user',
          content: `Generate schema markup for these types: ${schemaTypes.join(', ')}

Base templates for reference:
${schemaTypes.map((t) => `${t}: ${JSON.stringify(SCHEMA_TEMPLATES[t] || {})}`).join('\n')}`,
        },
      ],
      maxTokens: 4000,
      temperature: 0.3,
    })

    const result = parseAIJson(aiResponse.content) as {
      schemas: Record<string, object>
    }

    // Save each schema to the database (upsert)
    const savedSchemas = []

    for (const schemaType of schemaTypes) {
      const schemaJson = result.schemas[schemaType]
      if (!schemaJson) continue

      const { data: saved, error } = await admin
        .from('seo_schemas')
        .upsert(
          {
            org_id: orgId,
            page_url: pageUrl,
            page_title: pageTitle || null,
            schema_type: schemaType,
            schema_json: schemaJson,
            auto_generated: true,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'org_id,page_url,schema_type',
          }
        )
        .select()
        .single()

      if (error) {
        console.error(`Error saving schema ${schemaType}:`, error)
        continue
      }

      savedSchemas.push(saved)
    }

    return NextResponse.json({ schemas: savedSchemas })
  } catch (err) {
    console.error('Schema generation failed:', err)
    return NextResponse.json(
      { error: 'Erro ao gerar schemas' },
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
  const pageUrl = searchParams.get('pageUrl')

  if (!orgId) {
    return NextResponse.json(
      { error: 'orgId e obrigatorio' },
      { status: 400 }
    )
  }

  let query = supabase
    .from('seo_schemas')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })

  if (pageUrl) {
    query = query.eq('page_url', pageUrl)
  }

  const { data: schemas, error } = await query

  if (error) {
    console.error('Error fetching schemas:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar schemas' },
      { status: 500 }
    )
  }

  return NextResponse.json({ schemas })
}
