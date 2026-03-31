import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fullSetup as gtmFullSetup } from '@/lib/analytics/gtm-admin'
import { fullSetup as ga4FullSetup } from '@/lib/analytics/ga4-admin'

export const maxDuration = 60

interface SetupRequest {
  orgId: string
  websiteUrl?: string
  metaPixelId?: string
  googleAdsConversionId?: string
}

function generateTrackingScript(
  gtmContainerPublicId?: string,
  ga4MeasurementId?: string
): string {
  const parts: string[] = []

  if (gtmContainerPublicId) {
    parts.push(`<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${gtmContainerPublicId}');</script>
<!-- End Google Tag Manager -->`)
  }

  if (ga4MeasurementId) {
    parts.push(`<!-- GA4 fallback -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${ga4MeasurementId}"></script>
<script>
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${ga4MeasurementId}');
</script>`)
  }

  return parts.join('\n')
}

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const body: SetupRequest = await req.json()
    const { orgId, websiteUrl, metaPixelId, googleAdsConversionId } = body

    if (!orgId) {
      return NextResponse.json({ error: 'orgId obrigatorio' }, { status: 400 })
    }

    // Check user is admin of org
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', orgId)
      .eq('user_id', user.id)
      .single()

    if (!membership || membership.role !== 'admin') {
      return NextResponse.json({ error: 'Apenas admins podem configurar tracking' }, { status: 403 })
    }

    // Get org info
    const admin = createAdminClient()
    const { data: org } = await admin
      .from('organizations')
      .select('id, name, slug')
      .eq('id', orgId)
      .single()

    if (!org) {
      return NextResponse.json({ error: 'Organizacao nao encontrada' }, { status: 404 })
    }

    const setupLog: Array<{ step: string; status: string; details?: string; timestamp: string }> = []

    const logStep = (step: string, status: string, details?: string) => {
      setupLog.push({
        step,
        status,
        details,
        timestamp: new Date().toISOString(),
      })
    }

    // Upsert config record with status 'creating'
    const { data: existingConfig } = await admin
      .from('org_tracking_config')
      .select('id')
      .eq('org_id', orgId)
      .single()

    const configData: Record<string, any> = {
      org_id: orgId,
      setup_status: 'creating',
      auto_created: true,
      meta_pixel_id: metaPixelId || null,
      google_ads_conversion_id: googleAdsConversionId || null,
      updated_at: new Date().toISOString(),
    }

    if (existingConfig) {
      await admin
        .from('org_tracking_config')
        .update(configData)
        .eq('id', existingConfig.id)
    } else {
      await admin
        .from('org_tracking_config')
        .insert(configData)
    }

    logStep('init', 'completed', 'Config record created')

    // GTM Account ID from env (shared across orgs)
    const gtmAccountId = process.env.GTM_ACCOUNT_ID || ''
    // GA4 Account ID from env
    const ga4AccountId = process.env.GA4_ACCOUNT_ID || ''

    let gtmContainerPublicId: string | undefined
    let ga4MeasurementId: string | undefined

    // === GTM Setup ===
    if (gtmAccountId) {
      const gtmResult = await gtmFullSetup(gtmAccountId, org.name, {
        ga4MeasurementId: undefined, // Will be set after GA4 setup
        metaPixelId: metaPixelId,
      })

      if (gtmResult) {
        gtmContainerPublicId = gtmResult.containerPublicId
        configData.gtm_container_id = gtmResult.containerPublicId
        configData.gtm_account_id = gtmAccountId
        configData.gtm_workspace_id = gtmResult.workspaceId
        logStep('gtm', 'completed', `Container: ${gtmResult.containerPublicId}`)
      } else {
        logStep('gtm', 'skipped', 'GTM setup failed or auth not configured')
      }
    } else {
      logStep('gtm', 'skipped', 'GTM_ACCOUNT_ID not set')
    }

    // === GA4 Setup ===
    if (ga4AccountId && websiteUrl) {
      const ga4Result = await ga4FullSetup(ga4AccountId, org.name, websiteUrl)

      if (ga4Result) {
        ga4MeasurementId = ga4Result.measurementId
        configData.ga4_property_id = ga4Result.propertyId
        configData.ga4_measurement_id = ga4Result.measurementId
        configData.ga4_data_stream_id = ga4Result.dataStreamId
        logStep('ga4', 'completed', `Property: ${ga4Result.propertyId}, Measurement: ${ga4Result.measurementId}`)
      } else {
        logStep('ga4', 'skipped', 'GA4 setup failed or auth not configured')
      }
    } else {
      logStep('ga4', 'skipped', ga4AccountId ? 'No websiteUrl provided' : 'GA4_ACCOUNT_ID not set')
    }

    // === Generate tracking script ===
    const trackingScript = generateTrackingScript(gtmContainerPublicId, ga4MeasurementId)
    configData.tracking_script = trackingScript || null
    configData.setup_status = 'completed'
    configData.setup_log = setupLog

    logStep('script', 'completed', 'Tracking script generated')

    // Final update
    const { data: finalConfig, error: updateError } = await admin
      .from('org_tracking_config')
      .update({
        ...configData,
        setup_log: setupLog,
      })
      .eq('org_id', orgId)
      .select()
      .single()

    if (updateError) {
      console.error('[Auto-Setup] Failed to update config:', updateError)
      return NextResponse.json(
        { error: 'Falha ao salvar configuracao', details: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      config: finalConfig,
      log: setupLog,
    })
  } catch (err: any) {
    console.error('[Auto-Setup] Unexpected error:', err)
    return NextResponse.json(
      { error: 'Erro interno', details: err.message },
      { status: 500 }
    )
  }
}
