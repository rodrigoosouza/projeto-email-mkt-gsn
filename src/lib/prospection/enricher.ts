/**
 * Prospect Enricher — extracts contact info from prospect websites.
 * Uses Firecrawl (or fetch fallback) + AI to find emails, social profiles, etc.
 * Non-fatal: returns partial data on errors.
 */

import { generateAI, parseAIJson } from '@/lib/ai-client'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProspectData {
  website?: string | null
  name: string
  address?: string | null
  phone?: string | null
}

export interface EnrichedData {
  email: string | null
  owner_name: string | null
  instagram: string | null
  facebook: string | null
  linkedin: string | null
  description: string | null
}

// ---------------------------------------------------------------------------
// Scraping helpers (reuse patterns from web-scraper.ts)
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
      console.warn(`[Enricher] Firecrawl returned ${res.status} for ${url}`)
      return null
    }

    const data = await res.json()
    return data?.data?.markdown || data?.markdown || null
  } catch (err) {
    console.warn('[Enricher] Firecrawl error:', err)
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

    // Strip tags to get raw text
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim()

    return text.slice(0, 8000)
  } catch (err) {
    console.warn('[Enricher] Fallback fetch error:', err)
    return null
  }
}

// ---------------------------------------------------------------------------
// Extract emails from raw HTML/text
// ---------------------------------------------------------------------------

function extractEmailsFromText(text: string): string[] {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
  const matches = text.match(emailRegex) || []
  // Filter out common false positives
  const filtered = matches.filter(
    (e) =>
      !e.includes('example.com') &&
      !e.includes('sentry.io') &&
      !e.includes('wixpress.com') &&
      !e.includes('w3.org') &&
      !e.includes('schema.org')
  )
  return Array.from(new Set(filtered))
}

// ---------------------------------------------------------------------------
// Google Search for email (fallback when no website)
// ---------------------------------------------------------------------------

async function searchForEmail(businessName: string, city: string): Promise<string | null> {
  try {
    const query = encodeURIComponent(`"${businessName}" "${city}" email contato`)
    const response = await fetch(
      `https://www.google.com/search?q=${query}&num=5&hl=pt-BR`,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml',
          'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        },
        signal: AbortSignal.timeout(8000),
      }
    )
    if (!response.ok) return null

    const html = await response.text()
    const emails = extractEmailsFromText(html)
    return emails.length > 0 ? emails[0] : null
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Main enrichment function
// ---------------------------------------------------------------------------

export async function enrichProspect(prospect: ProspectData): Promise<EnrichedData> {
  const result: EnrichedData = {
    email: null,
    owner_name: null,
    instagram: null,
    facebook: null,
    linkedin: null,
    description: null,
  }

  try {
    console.log(`[Enricher] Enriching prospect: ${prospect.name}`)

    // Strategy 1: Scrape website if available
    if (prospect.website) {
      let url = prospect.website
      if (!url.startsWith('http')) {
        url = `https://${url}`
      }

      console.log(`[Enricher] Scraping website: ${url}`)

      // Try Firecrawl first, then fallback
      let content = await scrapeWithFirecrawl(url)
      if (!content) {
        console.log('[Enricher] Firecrawl unavailable, falling back to fetch')
        content = await scrapeWithFetch(url)
      }

      if (content) {
        // Extract emails directly from content
        const directEmails = extractEmailsFromText(content)
        if (directEmails.length > 0) {
          result.email = directEmails[0]
        }

        // Use AI to extract structured data
        const truncated = content.slice(0, 6000)

        try {
          const aiResponse = await generateAI({
            messages: [
              {
                role: 'system',
                content:
                  'Voce e um analista de prospecao. Extraia dados de contato do conteudo de um site. Responda APENAS com JSON valido, sem markdown.',
              },
              {
                role: 'user',
                content: `Analise o conteudo do site da empresa "${prospect.name}" e extraia as informacoes em JSON:
- email (string ou null): email de contato principal (nao use emails genericos como noreply@ ou support@)
- owner_name (string ou null): nome do proprietario/fundador/CEO/diretor
- instagram (string ou null): handle do Instagram (sem @)
- facebook (string ou null): URL ou nome da pagina do Facebook
- linkedin (string ou null): URL do LinkedIn (empresa ou pessoa)
- description (string ou null): O que a empresa faz em 2 frases

Conteudo do site:
${truncated}`,
              },
            ],
            maxTokens: 800,
            temperature: 0.2,
          })

          const parsed = parseAIJson(aiResponse.content) as Record<string, string | null>
          if (parsed && typeof parsed === 'object') {
            if (parsed.email && !result.email) result.email = parsed.email
            if (parsed.owner_name) result.owner_name = parsed.owner_name
            if (parsed.instagram) result.instagram = parsed.instagram
            if (parsed.facebook) result.facebook = parsed.facebook
            if (parsed.linkedin) result.linkedin = parsed.linkedin
            if (parsed.description) result.description = parsed.description
          }
        } catch (aiErr) {
          console.warn('[Enricher] AI extraction error:', aiErr)
        }
      }
    }

    // Strategy 2: If no website or no email found, search Google
    if (!result.email && prospect.name) {
      const city = prospect.address?.split(',').pop()?.trim() || ''
      console.log(`[Enricher] No email from website, searching Google for ${prospect.name}`)
      const foundEmail = await searchForEmail(prospect.name, city)
      if (foundEmail) {
        result.email = foundEmail
      }
    }

    console.log(
      `[Enricher] Enrichment complete for ${prospect.name}: email=${result.email}, owner=${result.owner_name}`
    )
    return result
  } catch (err) {
    console.error('[Enricher] enrichProspect error:', err)
    return result
  }
}
