import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { deployToVercelGeneric } from '@/lib/lp-builder/deploy'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { landing_page_id, org_id, html, titulo, custom_domain } = await req.json()

    if (!org_id || !html || !titulo) {
      return NextResponse.json(
        { error: 'Campos obrigatorios: org_id, html, titulo' },
        { status: 400 }
      )
    }

    if (!process.env.VERCEL_ACCESS_TOKEN) {
      return NextResponse.json(
        { error: 'VERCEL_ACCESS_TOKEN nao configurada.' },
        { status: 500 }
      )
    }

    // Get org name for slug
    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', org_id)
      .single()

    const orgSlug = org?.name || 'org'

    const result = await deployToVercelGeneric(orgSlug, html, titulo, {
      customDomain: custom_domain || undefined,
    })

    // Update landing page record if ID provided
    if (landing_page_id) {
      await supabase
        .from('landing_pages')
        .update({
          deploy_url: result.url,
          vercel_deployment_id: result.deploymentId,
          status: 'published',
          published_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', landing_page_id)
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('[LP Deploy] Error:', error)
    return NextResponse.json(
      { error: 'Falha no deploy', details: String(error) },
      { status: 500 }
    )
  }
}
