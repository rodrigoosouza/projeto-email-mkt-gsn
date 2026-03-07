export interface SeoResult {
  title: string | null
  meta_description: string | null
  overall_score: number
  issues: { type: 'error' | 'warning' | 'info'; category: string; message: string; element?: string }[]
  recommendations: string[]
  performance_data: Record<string, any>
}

export async function analyzeUrl(url: string): Promise<SeoResult> {
  const issues: SeoResult['issues'] = []
  const recommendations: string[] = []
  let score = 100

  try {
    const startTime = Date.now()
    const res = await fetch(url, {
      headers: { 'User-Agent': 'PlataformaEmail-SEO-Analyzer/1.0' },
      redirect: 'follow',
    })
    const loadTime = Date.now() - startTime
    const html = await res.text()

    // Extract title
    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i)
    const title = titleMatch ? titleMatch[1].trim() : null

    // Extract meta description
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["'](.*?)["']/i)
    const meta_description = descMatch ? descMatch[1].trim() : null

    // Check title
    if (!title) {
      issues.push({ type: 'error', category: 'Meta Tags', message: 'Pagina sem tag <title>' })
      recommendations.push('Adicione uma tag <title> com 30-60 caracteres descritivos')
      score -= 15
    } else if (title.length < 30) {
      issues.push({ type: 'warning', category: 'Meta Tags', message: `Title muito curto (${title.length} caracteres)`, element: title })
      score -= 5
    } else if (title.length > 60) {
      issues.push({ type: 'warning', category: 'Meta Tags', message: `Title muito longo (${title.length} caracteres)`, element: title })
      score -= 5
    }

    // Check meta description
    if (!meta_description) {
      issues.push({ type: 'error', category: 'Meta Tags', message: 'Sem meta description' })
      recommendations.push('Adicione meta description com 120-160 caracteres')
      score -= 15
    } else if (meta_description.length < 120) {
      issues.push({ type: 'warning', category: 'Meta Tags', message: `Meta description curta (${meta_description.length} chars)` })
      score -= 5
    } else if (meta_description.length > 160) {
      issues.push({ type: 'warning', category: 'Meta Tags', message: `Meta description longa (${meta_description.length} chars)` })
      score -= 5
    }

    // Check H1
    const h1Matches = html.match(/<h1[^>]*>/gi)
    if (!h1Matches) {
      issues.push({ type: 'error', category: 'Headings', message: 'Sem tag H1' })
      recommendations.push('Adicione exatamente uma tag H1 por pagina')
      score -= 10
    } else if (h1Matches.length > 1) {
      issues.push({ type: 'warning', category: 'Headings', message: `${h1Matches.length} tags H1 encontradas (recomendado: 1)` })
      score -= 5
    }

    // Check images without alt
    const imgCount = (html.match(/<img[^>]*>/gi) || []).length
    const imgWithoutAlt = (html.match(/<img(?![^>]*alt=)[^>]*>/gi) || []).length
    if (imgWithoutAlt > 0) {
      issues.push({ type: 'warning', category: 'Imagens', message: `${imgWithoutAlt} de ${imgCount} imagens sem atributo alt` })
      recommendations.push('Adicione atributo alt descritivo em todas as imagens')
      score -= Math.min(imgWithoutAlt * 2, 10)
    }

    // Check canonical
    const hasCanonical = /<link[^>]*rel=["']canonical["']/i.test(html)
    if (!hasCanonical) {
      issues.push({ type: 'info', category: 'SEO Tecnico', message: 'Sem tag canonical' })
      recommendations.push('Adicione link rel="canonical" para evitar conteudo duplicado')
      score -= 3
    }

    // Check viewport
    const hasViewport = /<meta[^>]*name=["']viewport["']/i.test(html)
    if (!hasViewport) {
      issues.push({ type: 'error', category: 'Mobile', message: 'Sem meta viewport' })
      recommendations.push('Adicione meta viewport para responsividade')
      score -= 10
    }

    // Check HTTPS
    if (!url.startsWith('https://')) {
      issues.push({ type: 'error', category: 'Seguranca', message: 'Site nao usa HTTPS' })
      recommendations.push('Migre para HTTPS para melhor ranking e seguranca')
      score -= 10
    }

    // Check Open Graph
    const hasOg = /<meta[^>]*property=["']og:/i.test(html)
    if (!hasOg) {
      issues.push({ type: 'info', category: 'Social', message: 'Sem tags Open Graph' })
      recommendations.push('Adicione tags og:title, og:description, og:image para melhor compartilhamento')
      score -= 3
    }

    // Check load time
    if (loadTime > 3000) {
      issues.push({ type: 'error', category: 'Performance', message: `Tempo de carregamento alto: ${loadTime}ms` })
      score -= 10
    } else if (loadTime > 1500) {
      issues.push({ type: 'warning', category: 'Performance', message: `Tempo de carregamento moderado: ${loadTime}ms` })
      score -= 5
    }

    // Check internal links
    const linkCount = (html.match(/<a[^>]*href/gi) || []).length

    return {
      title,
      meta_description,
      overall_score: Math.max(0, score),
      issues,
      recommendations,
      performance_data: {
        load_time_ms: loadTime,
        html_size_bytes: html.length,
        total_links: linkCount,
        total_images: imgCount,
        has_canonical: hasCanonical,
        has_viewport: hasViewport,
        has_open_graph: hasOg,
        uses_https: url.startsWith('https://'),
        status_code: res.status,
      },
    }
  } catch (error: any) {
    return {
      title: null,
      meta_description: null,
      overall_score: 0,
      issues: [{ type: 'error', category: 'Conexao', message: `Erro ao acessar URL: ${error.message}` }],
      recommendations: ['Verifique se a URL esta acessivel'],
      performance_data: {},
    }
  }
}
