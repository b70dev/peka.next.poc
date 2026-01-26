import { type NextRequest, NextResponse } from 'next/server'
import createIntlMiddleware from 'next-intl/middleware'
import { createServerClient } from '@supabase/ssr'
import { routing } from '@/i18n/routing'

const intlMiddleware = createIntlMiddleware(routing)

export async function middleware(request: NextRequest) {
  // First, handle internationalization
  const intlResponse = intlMiddleware(request)

  // Create a response that we can modify
  let response = intlResponse || NextResponse.next({ request })

  // Create Supabase client for auth checks
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Get the pathname without locale prefix for route matching
  const pathname = request.nextUrl.pathname
  const pathnameWithoutLocale = pathname.replace(/^\/(de|en|fr)/, '') || '/'

  // Protected routes - redirect to login if not authenticated
  const isProtectedRoute = pathnameWithoutLocale.startsWith('/dashboard') ||
    pathnameWithoutLocale.startsWith('/insured') ||
    pathnameWithoutLocale.startsWith('/admin')

  const isAuthRoute = pathnameWithoutLocale === '/login' ||
    pathnameWithoutLocale.startsWith('/auth/')

  // Get locale from pathname or default
  const localeMatch = pathname.match(/^\/(de|en|fr)/)
  const locale = localeMatch ? localeMatch[1] : 'de'

  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone()
    url.pathname = `/${locale}/login`
    url.searchParams.set('redirectTo', pathnameWithoutLocale)
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users away from login page
  if (user && isAuthRoute && pathnameWithoutLocale === '/login') {
    const url = request.nextUrl.clone()
    const redirectTo = url.searchParams.get('redirectTo') || '/dashboard'
    url.pathname = `/${locale}${redirectTo}`
    url.searchParams.delete('redirectTo')
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder assets
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
