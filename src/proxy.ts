import { type NextRequest, NextResponse } from 'next/server'
import createIntlMiddleware from 'next-intl/middleware'
import { createServerClient } from '@supabase/ssr'
import { routing } from '@/i18n/routing'
import { verifyBackupVerificationToken, COOKIE_NAME as MFA_BACKUP_COOKIE } from '@/lib/mfa/backup-verify'

const intlMiddleware = createIntlMiddleware(routing)

export async function proxy(request: NextRequest) {
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
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
          Object.entries(headers).forEach(([key, value]) =>
            response.headers.set(key, value)
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
    pathnameWithoutLocale.startsWith('/admin') ||
    pathnameWithoutLocale.startsWith('/settings') ||
    pathnameWithoutLocale.startsWith('/accounts')

  const isAuthRoute = pathnameWithoutLocale === '/login' ||
    pathnameWithoutLocale.startsWith('/auth/')

  const isMfaRoute = pathnameWithoutLocale.startsWith('/mfa/')

  // Get locale from pathname or default
  const localeMatch = pathname.match(/^\/(de|en|fr)/)
  const locale = localeMatch ? localeMatch[1] : 'de'

  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone()
    url.pathname = `/${locale}/login`
    url.searchParams.set('redirectTo', pathnameWithoutLocale)
    return NextResponse.redirect(url)
  }

  // Redirect unauthenticated users away from MFA pages
  if (!user && isMfaRoute) {
    const url = request.nextUrl.clone()
    url.pathname = `/${locale}/login`
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

  // MFA checks for authenticated users on protected routes
  if (user && (isProtectedRoute || isMfaRoute)) {
    // Check if user is an IDP user (Microsoft/Google) - skip MFA for IDP users
    const provider = user.app_metadata?.provider
    const isIDPUser = provider && provider !== 'email'

    if (!isIDPUser) {
      // Email/password user: check MFA status
      const { data: factorsData } = await supabase.auth.mfa.listFactors()
      const verifiedFactors = factorsData?.totp?.filter(
        (factor) => factor.status === 'verified'
      ) ?? []
      const hasMFA = verifiedFactors.length > 0

      // Get current AAL level using Supabase MFA API
      const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      const currentAAL = aalData?.currentLevel ?? 'aal1'

      if (!hasMFA) {
        // No MFA enrolled - redirect to setup (unless already there)
        if (!pathnameWithoutLocale.startsWith('/mfa/setup')) {
          const url = request.nextUrl.clone()
          url.pathname = `/${locale}/mfa/setup`
          return NextResponse.redirect(url)
        }
      } else if (currentAAL !== 'aal2') {
        // Check if user verified via backup code (signed httpOnly cookie)
        const backupToken = request.cookies.get(MFA_BACKUP_COOKIE)?.value
        const isBackupVerified = backupToken
          ? await verifyBackupVerificationToken(backupToken, user.id)
          : false

        if (!isBackupVerified) {
          // MFA enrolled but not yet verified in this session - redirect to verify
          if (!pathnameWithoutLocale.startsWith('/mfa/verify')) {
            const url = request.nextUrl.clone()
            url.pathname = `/${locale}/mfa/verify`
            return NextResponse.redirect(url)
          }
        } else {
          // Backup code verified - redirect away from MFA pages
          if (isMfaRoute) {
            const url = request.nextUrl.clone()
            url.pathname = `/${locale}/dashboard`
            return NextResponse.redirect(url)
          }
        }
      } else {
        // MFA verified (aal2) - redirect away from MFA pages if user navigates there
        if (isMfaRoute && !pathnameWithoutLocale.startsWith('/mfa/setup')) {
          const url = request.nextUrl.clone()
          url.pathname = `/${locale}/dashboard`
          return NextResponse.redirect(url)
        }
      }
    } else {
      // IDP user should not see MFA pages
      if (isMfaRoute) {
        const url = request.nextUrl.clone()
        url.pathname = `/${locale}/dashboard`
        return NextResponse.redirect(url)
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes — handle their own auth via requireRole, must not be
     *   localized by next-intl or they return 404)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder assets
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
