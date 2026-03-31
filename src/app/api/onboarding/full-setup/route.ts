import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getOrgContext } from '@/lib/supabase/org-context'

export const maxDuration = 300 // 5 min max

interface StepResult {
  name: string
  status: 'completed' | 'failed' | 'skipped'
  duration_ms: number
  error?: string
  reason?: string
  data?: Record<string, unknown>
}

async function runStep(
  name: string,
  fn: () => Promise<{ data?: Record<string, unknown>; skipped?: boolean; reason?: string }>
): Promise<StepResult> {
  const start = Date.now()
  try {
    const result = await fn()
    if (result.skipped) {
      return {
        name,
        status: 'skipped',
        duration_ms: Date.now() - start,
        reason: result.reason,
      }
    }
    return {
      name,
      status: 'completed',
      duration_ms: Date.now() - start,
      data: result.data,
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error(`[Full Setup] Step "${name}" failed:`, msg)
    return {
      name,
      status: 'failed',
      duration_ms: Date.now() - start,
      error: msg,
    }
  }
}

export async function POST(request: NextRequest) {
  const totalStart = Date.now()

  try {
    // === Auth check ===
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { orgId } = await request.json()
    if (!orgId) {
      return NextResponse.json({ error: 'orgId obrigatorio' }, { status: 400 })
    }

    // Check if user is admin of this org
    const admin = createAdminClient()
    const { data: membership } = await admin
      .from('organization_members')
      .select('role')
      .eq('org_id', orgId)
      .eq('user_id', user.id)
      .single()

    if (!membership || membership.role !== 'admin') {
      return NextResponse.json({ error: 'Apenas admins podem executar o setup completo' }, { status: 403 })
    }

    // === Step 1: Check prerequisites ===
    const orgContext = await getOrgContext(orgId)
    if (!orgContext) {
      return NextResponse.json({ error: 'Organizacao nao encontrada' }, { status: 404 })
    }

    if (!orgContext.briefing && !orgContext.strategy) {
      return NextResponse.json(
        { error: 'Preencha o briefing primeiro em /marketing' },
        { status: 400 }
      )
    }

    const steps: StepResult[] = []

    // Base URL for internal API calls
    const baseUrl = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || ''

    // Forward cookies for auth in internal calls
    const cookieHeader = request.headers.get('cookie') || ''
    const internalHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'Cookie': cookieHeader,
    }

    // === Steps 2, 3, 5, 6: Parallel-safe steps ===
    const [trackingResult, siteResult, calendarResult, adsResult] = await Promise.allSettled([
      // Step 2: Auto-setup tracking
      runStep('tracking', async () => {
        const res = await fetch(`${baseUrl}/api/tracking/auto-setup`, {
          method: 'POST',
          headers: internalHeaders,
          body: JSON.stringify({ orgId }),
        })
        if (!res.ok) {
          const body = await res.text().catch(() => '')
          throw new Error(`HTTP ${res.status}: ${body.substring(0, 200)}`)
        }
        const data = await res.json()
        return { data }
      }),

      // Step 3: Generate site
      runStep('site', async () => {
        const res = await fetch(`${baseUrl}/api/sites/auto-generate`, {
          method: 'POST',
          headers: internalHeaders,
          body: JSON.stringify({ orgId }),
        })
        if (!res.ok) {
          const body = await res.text().catch(() => '')
          throw new Error(`HTTP ${res.status}: ${body.substring(0, 200)}`)
        }
        const data = await res.json()
        return { data }
      }),

      // Step 5: Generate content calendar
      runStep('calendar', async () => {
        const res = await fetch(`${baseUrl}/api/content-calendar/generate`, {
          method: 'POST',
          headers: internalHeaders,
          body: JSON.stringify({
            orgId,
            orgContext: orgContext.summary,
          }),
        })
        if (!res.ok) {
          const body = await res.text().catch(() => '')
          throw new Error(`HTTP ${res.status}: ${body.substring(0, 200)}`)
        }
        const data = await res.json()
        return { data }
      }),

      // Step 6: Generate ad campaigns
      runStep('ads', async () => {
        const res = await fetch(`${baseUrl}/api/ads/generate`, {
          method: 'POST',
          headers: internalHeaders,
          body: JSON.stringify({ orgId, platforms: ['meta_ads'] }),
        })
        if (!res.ok) {
          const body = await res.text().catch(() => '')
          throw new Error(`HTTP ${res.status}: ${body.substring(0, 200)}`)
        }
        const data = await res.json()
        return { data }
      }),
    ])

    // Collect parallel results
    steps.push(
      trackingResult.status === 'fulfilled' ? trackingResult.value : { name: 'tracking', status: 'failed', duration_ms: 0, error: String(trackingResult.reason) },
      siteResult.status === 'fulfilled' ? siteResult.value : { name: 'site', status: 'failed', duration_ms: 0, error: String(siteResult.reason) },
    )

    // === Step 4: Setup blog (sequential — quick DB operations) ===
    const blogResult = await runStep('blog', async () => {
      // Check if blog_settings already exists
      const { data: existing } = await admin
        .from('blog_settings')
        .select('id')
        .eq('org_id', orgId)
        .maybeSingle()

      if (!existing) {
        await admin
          .from('blog_settings')
          .insert({
            org_id: orgId,
            blog_title: `Blog ${orgContext.org.name}`,
            blog_description: `Conteudo e novidades de ${orgContext.org.name}`,
          })
      }

      // Create default categories if none exist
      const { data: existingCategories } = await admin
        .from('blog_categories')
        .select('id')
        .eq('org_id', orgId)
        .limit(1)

      if (!existingCategories || existingCategories.length === 0) {
        const defaultCategories = [
          { org_id: orgId, name: 'Artigos', slug: 'artigos', description: 'Artigos e conteudo educativo', color: '#3b82f6', sort_order: 0 },
          { org_id: orgId, name: 'Cases', slug: 'cases', description: 'Cases de sucesso e depoimentos', color: '#10b981', sort_order: 1 },
          { org_id: orgId, name: 'Novidades', slug: 'novidades', description: 'Novidades e atualizacoes', color: '#f59e0b', sort_order: 2 },
        ]

        const { error } = await admin
          .from('blog_categories')
          .insert(defaultCategories)

        if (error) throw new Error(`Blog categories: ${error.message}`)

        return { data: { settings_created: !existing, categories_created: 3 } }
      }

      return { data: { settings_created: !existing, categories_created: 0 } }
    })
    steps.push(blogResult)

    // Add parallel results for calendar and ads
    steps.push(
      calendarResult.status === 'fulfilled' ? calendarResult.value : { name: 'calendar', status: 'failed', duration_ms: 0, error: String(calendarResult.reason) },
      adsResult.status === 'fulfilled' ? adsResult.value : { name: 'ads', status: 'failed', duration_ms: 0, error: String(adsResult.reason) },
    )

    // === Step 7: Form + templates + campaigns + automation (existing auto-setup) ===
    const autoSetupResult = await runStep('auto_setup', async () => {
      const res = await fetch(`${baseUrl}/api/onboarding/auto-setup`, {
        method: 'POST',
        headers: internalHeaders,
        body: JSON.stringify({ orgId }),
      })
      if (!res.ok) {
        const body = await res.text().catch(() => '')
        throw new Error(`HTTP ${res.status}: ${body.substring(0, 200)}`)
      }
      const data = await res.json()
      return { data }
    })
    steps.push(autoSetupResult)

    // === Build summary ===
    const completed = steps.filter(s => s.status === 'completed').length
    const failed = steps.filter(s => s.status === 'failed').length
    const skipped = steps.filter(s => s.status === 'skipped').length

    return NextResponse.json({
      success: true,
      message: 'Setup completo finalizado! Revise os assets gerados no dashboard.',
      duration_ms: Date.now() - totalStart,
      steps,
      completed,
      failed,
      skipped,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[Full Setup] Fatal error:', msg)
    return NextResponse.json(
      { error: msg, duration_ms: Date.now() - totalStart },
      { status: 500 }
    )
  }
}
