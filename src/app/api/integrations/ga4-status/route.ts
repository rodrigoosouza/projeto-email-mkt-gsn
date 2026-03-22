import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const propertyId = process.env.GA4_PROPERTY_ID || ''
    const clientEmail = process.env.GA4_CLIENT_EMAIL || ''
    const hasPrivateKey = !!process.env.GA4_PRIVATE_KEY

    const configured = !!(propertyId && clientEmail && hasPrivateKey)

    return NextResponse.json({
      configured,
      propertyId: configured ? propertyId : null,
      clientEmail: configured ? clientEmail : null,
    })
  } catch (error: any) {
    console.error('GA4 status error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
