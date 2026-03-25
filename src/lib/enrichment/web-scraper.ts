/**
 * Web Scraper — enriches lead data from external sources.
 * Scrapes websites (Firecrawl), Instagram profiles, and Meta Ad Library.
 * All functions are non-fatal: errors are logged and null is returned.
 */

import { generateAI, parseAIJson } from '@/lib/ai-client'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WebsiteData {
  descricao: string
  produtos_servicos: string[]
  equipe: { name: string; role: string }[]
  depoimentos: string[]
  tecnologias: string[]
  diferenciais: string[]
  cta_principal: string
  tem_blog: boolean
  tem_ecommerce: boolean
  tem_chat: boolean
}

export interface InstagramData {
  username: string
  full_name: string
  bio: string
  followers: number
  following: number
  posts_count: number
  profile_pic_url: string
  is_business: boolean
  external_url: string
}

export interface MetaAdData {
  total_active_ads: number
  ads: {
    ad_creative_body: string
    ad_creative_link_title: string
    ad_creation_time: string
    page_name: string
    estimated_audience_size: string
  }[]
  plataformas: string[]
  tipos_criativos: string[]
}

export interface WebEnrichmentResult {
  website_data: WebsiteData | null
  instagram_data: InstagramData | null
  meta_ads_data: MetaAdData | null
}

// ---------------------------------------------------------------------------
// 1. scrapeWebsite
// ---------------------------------------------------------------------------

async function scrapeWithFirecrawl(url: string): Promise<string | null> {
  const apiKey = process.env.FIRECRAWL_API_KEY
  if (!apiKey) return null

  try {
    const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        url,
        formats: ['markdown'],
        onlyMainContent: true,
        timeout: 15000,
      }),
      signal: AbortSignal.timeout(15000),
    })

    if (!res.ok) {
      console.warn(`[WebScraper] Firecrawl returned ${res.status} for ${url}`)
      return null
    }

    const data = await res.json()
    return data?.data?.markdown || data?.markdown || null
  } catch (err) {
    console.warn('[WebScraper] Firecrawl error:', err)
    return null
  }
}

async function scrapeWithFetch(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(15000),
    })

    if (!res.ok) return null

    const html = await res.text()

    // Strip tags to get raw text (simple approach)
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim()

    // Limit to ~8000 chars to avoid huge payloads
    return text.slice(0, 8000)
  } catch (err) {
    console.warn('[WebScraper] Fallback fetch error:', err)
    return null
  }
}

export async function scrapeWebsite(url: string): Promise<WebsiteData | null> {
  try {
    console.log(`[WebScraper] Scraping website: ${url}`)

    // Try Firecrawl first, fallback to simple fetch
    let content = await scrapeWithFirecrawl(url)
    if (!content) {
      console.log('[WebScraper] Firecrawl unavailable, falling back to fetch')
      content = await scrapeWithFetch(url)
    }

    if (!content) {
      console.warn('[WebScraper] Could not fetch any content from', url)
      return null
    }

    // Truncate for AI processing
    const truncated = content.slice(0, 6000)

    const aiResponse = await generateAI({
      messages: [
        {
          role: 'system',
          content:
            'Voce e um analista de marketing digital. Extraia dados estruturados do conteudo de um site. Responda APENAS com JSON valido, sem markdown.',
        },
        {
          role: 'user',
          content: `Analise o conteudo do site abaixo e extraia as informacoes em JSON com estas chaves:
- descricao (string, 2-3 frases sobre o que a empresa faz)
- produtos_servicos (array de strings)
- equipe (array de objetos {name, role})
- depoimentos (array de strings com depoimentos ou nomes de clientes)
- tecnologias (array de strings com tecnologias/ferramentas mencionadas)
- diferenciais (array de strings com vantagens competitivas)
- cta_principal (string, principal call-to-action do site)
- tem_blog (boolean)
- tem_ecommerce (boolean)
- tem_chat (boolean)

Conteudo do site:
${truncated}`,
        },
      ],
      maxTokens: 1500,
      temperature: 0.3,
    })

    const parsed = parseAIJson(aiResponse.content) as WebsiteData
    if (!parsed || typeof parsed !== 'object') return null

    return {
      descricao: parsed.descricao || '',
      produtos_servicos: Array.isArray(parsed.produtos_servicos) ? parsed.produtos_servicos : [],
      equipe: Array.isArray(parsed.equipe) ? parsed.equipe : [],
      depoimentos: Array.isArray(parsed.depoimentos) ? parsed.depoimentos : [],
      tecnologias: Array.isArray(parsed.tecnologias) ? parsed.tecnologias : [],
      diferenciais: Array.isArray(parsed.diferenciais) ? parsed.diferenciais : [],
      cta_principal: parsed.cta_principal || '',
      tem_blog: !!parsed.tem_blog,
      tem_ecommerce: !!parsed.tem_ecommerce,
      tem_chat: !!parsed.tem_chat,
    }
  } catch (err) {
    console.warn('[WebScraper] scrapeWebsite error:', err)
    return null
  }
}

// ---------------------------------------------------------------------------
// 2. scrapeInstagram
// ---------------------------------------------------------------------------

export async function scrapeInstagram(handle: string): Promise<InstagramData | null> {
  try {
    const cleanHandle = handle.replace(/^@/, '').trim()
    if (!cleanHandle) return null

    console.log(`[WebScraper] Scraping Instagram: @${cleanHandle}`)

    const res = await fetch(`https://www.instagram.com/${cleanHandle}/`, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) {
      console.warn(`[WebScraper] Instagram returned ${res.status} for @${cleanHandle}`)
      return null
    }

    const html = await res.text()

    // Extract from meta tags and og: tags
    const getMetaContent = (property: string): string => {
      const regex = new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']*)["']`, 'i')
      const altRegex = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${property}["']`, 'i')
      return regex.exec(html)?.[1] || altRegex.exec(html)?.[1] || ''
    }

    const ogDescription = getMetaContent('og:description')
    const ogTitle = getMetaContent('og:title')
    const ogImage = getMetaContent('og:image')

    // Extract follower/following/posts counts from og:description
    // Typical format: "X Followers, Y Following, Z Posts - ..."
    const followersMatch = ogDescription.match(/([\d,.]+[KMkm]?)\s*Followers/i)
    const followingMatch = ogDescription.match(/([\d,.]+[KMkm]?)\s*Following/i)
    const postsMatch = ogDescription.match(/([\d,.]+[KMkm]?)\s*Posts/i)

    const parseCount = (str: string | undefined): number => {
      if (!str) return 0
      const clean = str.replace(/,/g, '')
      const multiplier = clean.match(/[KkMm]$/)?.[0]
      const num = parseFloat(clean.replace(/[KkMm]$/, ''))
      if (multiplier === 'K' || multiplier === 'k') return Math.round(num * 1000)
      if (multiplier === 'M' || multiplier === 'm') return Math.round(num * 1000000)
      return Math.round(num) || 0
    }

    // Extract bio from og:description after the counts section
    const bioMatch = ogDescription.match(/Posts\s*[-–—]\s*(.+)/i)
    const bio = bioMatch?.[1]?.trim() || ''

    // Extract full name from og:title — usually "Name (@handle)"
    const nameMatch = ogTitle.match(/^(.+?)\s*\(@/)
    const fullName = nameMatch?.[1]?.trim() || ogTitle.replace(/\s*\(.*\)/, '').trim()

    // Try to detect business account from page content
    const isBusiness =
      html.includes('"is_business_account":true') ||
      html.includes('"is_professional_account":true')

    // Extract external URL from page JSON
    const externalUrlMatch = html.match(/"external_url":"(https?:[^"]+)"/)
    const externalUrl = externalUrlMatch
      ? externalUrlMatch[1].replace(/\\u0026/g, '&').replace(/\\\//g, '/')
      : ''

    return {
      username: cleanHandle,
      full_name: fullName,
      bio,
      followers: parseCount(followersMatch?.[1]),
      following: parseCount(followingMatch?.[1]),
      posts_count: parseCount(postsMatch?.[1]),
      profile_pic_url: ogImage,
      is_business: isBusiness,
      external_url: externalUrl,
    }
  } catch (err) {
    console.warn('[WebScraper] scrapeInstagram error:', err)
    return null
  }
}

// ---------------------------------------------------------------------------
// 3. scrapeMetaAdLibrary
// ---------------------------------------------------------------------------

export async function scrapeMetaAdLibrary(
  companyName: string,
  pageId?: string
): Promise<MetaAdData | null> {
  try {
    const token = process.env.META_AD_LIBRARY_TOKEN || process.env.META_ACCESS_TOKEN || ''
    if (!token) {
      console.warn('[WebScraper] No Meta Ad Library token available')
      return null
    }

    console.log(`[WebScraper] Searching Meta Ad Library for: ${companyName}`)

    const params = new URLSearchParams({
      search_terms: companyName,
      ad_reached_countries: "['BR']",
      ad_active_status: 'active',
      limit: '10',
      access_token: token,
      fields:
        'ad_creative_bodies,ad_creative_link_titles,ad_creation_time,page_name,estimated_audience_size,publisher_platforms,ad_snapshot_url',
    })

    if (pageId) {
      params.set('search_page_ids', pageId)
    }

    const res = await fetch(
      `https://graph.facebook.com/v22.0/ads_archive?${params.toString()}`,
      {
        signal: AbortSignal.timeout(10000),
      }
    )

    if (!res.ok) {
      console.warn(`[WebScraper] Meta Ad Library returned ${res.status}`)
      return null
    }

    const data = await res.json()
    const adsRaw = data?.data || []

    const plataformasSet = new Set<string>()
    const tiposSet = new Set<string>()

    const ads = adsRaw.map((ad: Record<string, unknown>) => {
      // Collect platforms
      const platforms = ad.publisher_platforms as string[] | undefined
      if (Array.isArray(platforms)) {
        platforms.forEach((p: string) => plataformasSet.add(p))
      }

      // Detect creative types from snapshot URL or ad data
      const snapshotUrl = (ad.ad_snapshot_url as string) || ''
      if (snapshotUrl.includes('video')) tiposSet.add('video')
      if (snapshotUrl.includes('carousel')) tiposSet.add('carousel')
      if (!tiposSet.has('image')) tiposSet.add('image') // default

      const bodies = ad.ad_creative_bodies as string[] | undefined
      const titles = ad.ad_creative_link_titles as string[] | undefined

      return {
        ad_creative_body: bodies?.[0] || '',
        ad_creative_link_title: titles?.[0] || '',
        ad_creation_time: (ad.ad_creation_time as string) || '',
        page_name: (ad.page_name as string) || '',
        estimated_audience_size: ad.estimated_audience_size
          ? JSON.stringify(ad.estimated_audience_size)
          : '',
      }
    })

    return {
      total_active_ads: adsRaw.length,
      ads,
      plataformas: Array.from(plataformasSet),
      tipos_criativos: Array.from(tiposSet),
    }
  } catch (err) {
    console.warn('[WebScraper] scrapeMetaAdLibrary error:', err)
    return null
  }
}

// ---------------------------------------------------------------------------
// 4. enrichFromWeb (orchestrator)
// ---------------------------------------------------------------------------

function extractInstagramHandle(url: string): string | null {
  // Handle various Instagram URL formats
  const match = url.match(
    /(?:https?:\/\/)?(?:www\.)?instagram\.com\/([a-zA-Z0-9_.]+)\/?/
  )
  return match?.[1] || null
}

// ---------------------------------------------------------------------------
// Google Search — find website and Instagram when URLs are unknown
// ---------------------------------------------------------------------------

async function searchGoogle(query: string): Promise<string | null> {
  try {
    const encoded = encodeURIComponent(query)
    const response = await fetch(
      `https://www.google.com/search?q=${encoded}&num=3&hl=pt-BR`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        },
        signal: AbortSignal.timeout(8000),
      }
    )
    if (!response.ok) return null
    return await response.text()
  } catch {
    return null
  }
}

async function findCompanyWebsite(companyName: string): Promise<string | null> {
  try {
    const html = await searchGoogle(`"${companyName}" site oficial`)
    if (!html) return null

    // Extract URLs from search results, skip social media and directories
    const urlMatches = html.match(/https?:\/\/(?:www\.)?([a-zA-Z0-9\-]+\.[a-zA-Z]{2,}(?:\.[a-zA-Z]{2,})?)\/?/g)
    if (!urlMatches) return null

    const skipDomains = ['google.', 'facebook.', 'instagram.', 'linkedin.', 'twitter.', 'youtube.', 'tiktok.', 'wikipedia.', 'reclameaqui.', 'cnpj.', 'consultasocio.', 'casadosdados.']

    for (const url of urlMatches) {
      const clean = url.replace(/\/+$/, '')
      if (skipDomains.some(d => clean.includes(d))) continue
      if (clean.includes('webcache')) continue
      console.log(`[WebScraper] Found website for "${companyName}": ${clean}`)
      return clean
    }
    return null
  } catch {
    return null
  }
}

async function findInstagramHandle(companyName: string): Promise<string | null> {
  try {
    const html = await searchGoogle(`"${companyName}" site:instagram.com`)
    if (!html) return null

    const matches = html.match(/https?:\/\/(?:www\.)?instagram\.com\/([a-zA-Z0-9_.]+)/g)
    if (!matches) return null

    for (const url of matches) {
      const handle = url.split('instagram.com/')[1]?.split(/[/?&]/)[0]
      if (handle && handle.length > 1 && handle.length < 50 && !['p', 'reel', 'explore', 'stories', 'accounts'].includes(handle)) {
        console.log(`[WebScraper] Found Instagram for "${companyName}": @${handle}`)
        return handle
      }
    }
    return null
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Main orchestrator
// ---------------------------------------------------------------------------

export async function enrichFromWeb(
  website: string | null,
  instagramUrl: string | null,
  companyName: string
): Promise<WebEnrichmentResult & { found_website?: string; found_instagram?: string }> {
  console.log(`[WebScraper] Starting web enrichment for: ${companyName}`)

  // Step 1: If no website or Instagram, search Google to find them
  let siteUrl = website
  let igHandle = instagramUrl
    ? extractInstagramHandle(instagramUrl) || instagramUrl.replace(/^@/, '')
    : null

  if (!siteUrl || !igHandle) {
    console.log(`[WebScraper] Searching Google for missing URLs...`)
    const [foundSite, foundIg] = await Promise.allSettled([
      !siteUrl ? findCompanyWebsite(companyName) : Promise.resolve(null),
      !igHandle ? findInstagramHandle(companyName) : Promise.resolve(null),
    ])

    if (!siteUrl && foundSite.status === 'fulfilled' && foundSite.value) {
      siteUrl = foundSite.value
    }
    if (!igHandle && foundIg.status === 'fulfilled' && foundIg.value) {
      igHandle = foundIg.value
    }
  }

  // Step 2: Run all scrapers in parallel
  const websitePromise = siteUrl
    ? scrapeWebsite(siteUrl)
    : Promise.resolve(null)

  const instagramPromise = igHandle
    ? scrapeInstagram(igHandle)
    : Promise.resolve(null)

  const metaAdsPromise = companyName
    ? scrapeMetaAdLibrary(companyName)
    : Promise.resolve(null)

  const [websiteResult, instagramResult, metaAdsResult] = await Promise.allSettled([
    websitePromise,
    instagramPromise,
    metaAdsPromise,
  ])

  return {
    website_data: websiteResult.status === 'fulfilled' ? websiteResult.value : null,
    instagram_data: instagramResult.status === 'fulfilled' ? instagramResult.value : null,
    meta_ads_data: metaAdsResult.status === 'fulfilled' ? metaAdsResult.value : null,
    found_website: siteUrl && siteUrl !== website ? siteUrl : undefined,
    found_instagram: igHandle && igHandle !== instagramUrl ? `https://instagram.com/${igHandle}` : undefined,
  }
}
