import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'
  const type = searchParams.get('type')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Recovery flow — redirect to update password page
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/update-password`)
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Handle hash-based recovery (Supabase PKCE flow)
  // When Supabase redirects with token in URL after email verification
  if (type === 'recovery') {
    return NextResponse.redirect(`${origin}/update-password`)
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}
