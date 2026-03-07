import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { analyzeUrl } from '@/lib/seo/analyzer'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { url, org_id } = body

  if (!url || !org_id) {
    return NextResponse.json(
      { error: 'URL e org_id sao obrigatorios' },
      { status: 400 }
    )
  }

  // Validate URL format
  try {
    new URL(url)
  } catch {
    return NextResponse.json(
      { error: 'URL invalida' },
      { status: 400 }
    )
  }

  // Create analysis record
  const { data: analysis, error: createError } = await supabase
    .from('seo_analyses')
    .insert({
      org_id,
      url,
      status: 'analyzing',
      overall_score: 0,
      issues: [],
      recommendations: [],
      performance_data: {},
      created_by: user.id,
    })
    .select()
    .single()

  if (createError) {
    return NextResponse.json(
      { error: 'Erro ao criar analise', details: createError.message },
      { status: 500 }
    )
  }

  try {
    // Run SEO analysis
    const result = await analyzeUrl(url)

    // Update analysis with results
    const { data: updated, error: updateError } = await supabase
      .from('seo_analyses')
      .update({
        title: result.title,
        meta_description: result.meta_description,
        overall_score: result.overall_score,
        issues: result.issues,
        recommendations: result.recommendations,
        performance_data: result.performance_data,
        status: 'completed',
        analyzed_at: new Date().toISOString(),
      })
      .eq('id', analysis.id)
      .select()
      .single()

    if (updateError) throw updateError

    return NextResponse.json({ success: true, analysis: updated })
  } catch (error: any) {
    // Update with error status
    await supabase
      .from('seo_analyses')
      .update({
        status: 'failed',
        issues: [{ type: 'error', category: 'Sistema', message: error.message }],
      })
      .eq('id', analysis.id)

    return NextResponse.json(
      { error: 'Erro ao analisar URL', details: error.message },
      { status: 500 }
    )
  }
}
