import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    // Supabase not configured — allow all requests (dev mode)
    return supabaseResponse
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Public paths that don't require auth
  const publicPaths = ['/login', '/register', '/magic-link', '/reset-password', '/update-password', '/auth/callback', '/f/', '/b/']
  const isPublicPath = publicPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  )
  const isApiWebhook = request.nextUrl.pathname.startsWith('/api/webhooks')
  const isApiPublic = ['/api/forms/', '/api/tracking/', '/api/bio/', '/api/chatbot/', '/api/meta-ads/sync', '/api/pipedrive/sync', '/api/leads-lovable/ingest'].some(
    (path) => request.nextUrl.pathname.startsWith(path)
  )

  if (!user && !isPublicPath && !isApiWebhook && !isApiPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  const isUpdatePassword = request.nextUrl.pathname.startsWith('/update-password')
  if (user && isPublicPath && !isUpdatePassword) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
