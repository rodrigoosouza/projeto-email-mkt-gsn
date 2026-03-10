// ============================================================
// Organization Context Helper
// Loads briefing + ICP + persona + strategy for any module
// ============================================================

import { createAdminClient } from '@/lib/supabase/admin'
import type { Organization } from '@/lib/types'
import type { MarketingProfile, BriefingAnswers, Persona, ICP, BrandIdentity, FullStrategy } from '@/lib/marketing/types'

export interface OrgContext {
  org: Organization
  briefing: BriefingAnswers | null
  persona: Persona | null
  icp: ICP | null
  brand: BrandIdentity | null
  strategy: FullStrategy | null
  toneOfVoice: string | null
  summary: string // Text summary for AI system prompts
}

/**
 * Loads full organization context including marketing profile.
 * Uses admin client (no RLS) so it works in API routes.
 */
export async function getOrgContext(orgId: string): Promise<OrgContext | null> {
  const supabase = createAdminClient()

  // Fetch org and marketing profile in parallel
  const [orgResult, profileResult] = await Promise.all([
    supabase.from('organizations').select('*').eq('id', orgId).single(),
    supabase.from('org_marketing_profiles').select('*').eq('org_id', orgId).maybeSingle(),
  ])

  if (orgResult.error || !orgResult.data) return null

  const org = orgResult.data as Organization
  const profile = profileResult.data as MarketingProfile | null

  const briefing = profile?.briefing || null
  const persona = profile?.persona || null
  const icp = profile?.icp || null
  const brand = profile?.brand_identity || null
  const strategy = profile?.strategy || null
  const toneOfVoice = brand?.tone_of_voice || null

  return {
    org,
    briefing,
    persona,
    icp,
    brand,
    strategy,
    toneOfVoice,
    summary: buildContextSummary(org, briefing, persona, icp, brand),
  }
}

/**
 * Builds a text summary of the org context for AI system prompts.
 */
function buildContextSummary(
  org: Organization,
  briefing: BriefingAnswers | null,
  persona: Persona | null,
  icp: ICP | null,
  brand: BrandIdentity | null
): string {
  const parts: string[] = []

  parts.push(`Empresa: ${org.name}`)
  if (org.website) parts.push(`Site: ${org.website}`)

  if (briefing) {
    if (briefing.segmento) parts.push(`Segmento: ${briefing.segmento}`)
    if (briefing.produtoServico) parts.push(`Produto/Servico: ${briefing.produtoServico}`)
    if (briefing.publicoB2B) parts.push(`Publico: ${briefing.publicoB2B}`)
    if (briefing.maiorDor) parts.push(`Maior dor do cliente: ${briefing.maiorDor}`)
    if (briefing.resultadoEsperado) parts.push(`Resultado esperado: ${briefing.resultadoEsperado}`)
    if (briefing.diferenciais) parts.push(`Diferenciais: ${briefing.diferenciais}`)
    if (briefing.precoMedio) parts.push(`Preco medio: ${briefing.precoMedio}`)
  }

  if (persona) {
    parts.push(`\nPersona: ${persona.quemE}`)
    if (persona.cargo) parts.push(`Cargo: ${persona.cargo}`)
    if (persona.dorPrincipal) parts.push(`Dor principal: ${persona.dorPrincipal}`)
    if (persona.desejoPrimario) parts.push(`Desejo primario: ${persona.desejoPrimario}`)
    if (persona.medosObjecoes?.length) parts.push(`Objecoes: ${persona.medosObjecoes.join(', ')}`)
  }

  if (icp) {
    parts.push(`\nICP: ${icp.tipoEmpresa}`)
    if (icp.segmentoMercado) parts.push(`Mercado: ${icp.segmentoMercado}`)
    if (icp.faturamentoAnual) parts.push(`Faturamento: ${icp.faturamentoAnual}`)
    if (icp.cargoComprador) parts.push(`Comprador: ${icp.cargoComprador}`)
  }

  if (brand) {
    if (brand.tone_of_voice) parts.push(`\nTom de voz: ${brand.tone_of_voice}`)
    if (brand.brand_promise) parts.push(`Promessa de marca: ${brand.brand_promise}`)
    if (brand.brand_values?.length) parts.push(`Valores: ${brand.brand_values.join(', ')}`)
  }

  return parts.join('\n')
}
