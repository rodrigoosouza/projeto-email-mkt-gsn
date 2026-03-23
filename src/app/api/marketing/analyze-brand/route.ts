import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateAI, parseAIJson } from '@/lib/ai-client'

export const maxDuration = 120

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const orgId = formData.get('orgId') as string | null

    if (!orgId) {
      return NextResponse.json({ error: 'orgId obrigatorio' }, { status: 400 })
    }

    if (!file) {
      return NextResponse.json({ error: 'Arquivo obrigatorio' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'image/png', 'image/jpeg', 'image/webp', 'image/gif',
    ]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de arquivo nao suportado. Envie PDF ou imagem (PNG, JPG, WebP).' },
        { status: 400 }
      )
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Arquivo excede 10MB' }, { status: 400 })
    }

    // Upload file to Supabase storage
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const storagePath = `${orgId}/brand/${Date.now()}-${safeName}`
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: uploadError } = await supabase.storage
      .from('ad-creatives')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json({ error: 'Erro no upload do arquivo' }, { status: 500 })
    }

    const { data: urlData } = supabase.storage
      .from('ad-creatives')
      .getPublicUrl(storagePath)

    const publicUrl = urlData.publicUrl

    // Read file content for AI analysis
    let fileDescription = ''

    if (file.type === 'application/pdf') {
      // For PDFs, convert to base64 and describe
      const base64 = buffer.toString('base64')
      fileDescription = `[Documento PDF: ${file.name}, ${(file.size / 1024).toFixed(0)}KB]
Este e um PDF de Style Guide / Brand Guidelines. Analise o conteudo base64 a seguir para extrair informacoes visuais da marca.
Base64 (primeiros 50000 chars): ${base64.substring(0, 50000)}`
    } else {
      // For images, use base64 directly
      const base64 = buffer.toString('base64')
      fileDescription = `[Imagem: ${file.name}, tipo: ${file.type}]
Esta e uma imagem de Style Guide / Brand Guidelines. Analise visualmente para extrair cores, tipografia, estilo e elementos da marca.
Data URL: data:${file.type};base64,${base64.substring(0, 80000)}`
    }

    const prompt = `Voce e um especialista em branding e design visual. Analise este documento de Style Guide / Brand Guidelines e extraia todas as informacoes de identidade visual que encontrar.

${fileDescription}

Retorne APENAS um JSON valido (sem markdown, sem texto extra) com esta estrutura:

{
  "primary_color": "#hexcolor - cor principal/primaria da marca",
  "secondary_color": "#hexcolor - cor secundaria da marca",
  "accent_color": "#hexcolor - cor de destaque/accent",
  "additional_colors": ["#hex1", "#hex2", "...outras cores encontradas na paleta"],
  "fonts": ["Nome da fonte principal", "Nome da fonte secundaria", "...outras fontes"],
  "logo_description": "Descricao detalhada do logo: formato, cores usadas, elementos graficos, tipografia do logo",
  "tone_of_voice": "Tom de voz da marca conforme o style guide (formal, informal, tecnico, amigavel, etc)",
  "visual_style": "Descricao do estilo visual geral (moderno, classico, minimalista, vibrante, corporativo, etc)",
  "brand_values": ["valores da marca identificados no documento"],
  "brand_personality": ["tracos de personalidade da marca"],
  "brand_archetype": "arquetipo da marca se identificado (heroi, sabio, explorador, criador, governante, mago, amante, bobo, cuidador, inocente, rebelde, cara_comum)",
  "brand_archetype_description": "descricao do arquetipo se identificado"
}

REGRAS:
- Extraia APENAS o que esta REALMENTE no documento, nao invente
- Cores devem ser em formato hexadecimal (#RRGGBB)
- Se nao conseguir identificar um campo, use null
- Para fontes, identifique pelo nome (ex: "Montserrat", "Open Sans", "Roboto")
- Inclua TODAS as cores que encontrar na paleta em additional_colors
- Seja detalhado na descricao do logo
- Se for um PDF e voce nao conseguir ler o conteudo visual, extraia o maximo das informacoes textuais`

    const result = await generateAI({
      messages: [
        {
          role: 'system',
          content: 'Voce e um especialista em branding e identidade visual. Analise style guides e extraia informacoes de marca. Responda APENAS em JSON valido.',
        },
        { role: 'user', content: prompt },
      ],
      maxTokens: 3000,
      temperature: 0.3,
    })

    const brandData = parseAIJson(result.content) as Record<string, unknown>

    // Add the storage URL
    brandData.style_guide_url = publicUrl

    // Clean null values
    const cleanedBrand: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(brandData)) {
      if (value !== null && value !== undefined) {
        cleanedBrand[key] = value
      }
    }

    return NextResponse.json({
      brand: cleanedBrand,
      fileUrl: publicUrl,
    })
  } catch (error) {
    console.error('Brand analysis error:', error)
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
