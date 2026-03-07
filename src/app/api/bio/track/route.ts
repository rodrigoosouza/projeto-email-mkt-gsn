import { NextRequest, NextResponse } from 'next/server'
import { trackBioLinkClick } from '@/lib/supabase/bio-links'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { link_id } = body

    if (!link_id) {
      return NextResponse.json(
        { error: 'link_id is required' },
        { status: 400 }
      )
    }

    await trackBioLinkClick(link_id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao rastrear clique:', error)
    return NextResponse.json({ success: true }) // Always return 200
  }
}
