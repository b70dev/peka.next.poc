import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')

  // Handle OAuth/Auth errors
  if (error) {
    console.error('Auth callback error:', error, errorDescription)

    if (errorDescription?.includes('expired')) {
      const redirectUrl = new URL('/login', origin)
      redirectUrl.searchParams.set('error', 'link_expired')
      return NextResponse.redirect(redirectUrl)
    }

    const redirectUrl = new URL('/login', origin)
    redirectUrl.searchParams.set('error', 'oauth_error')
    return NextResponse.redirect(redirectUrl)
  }

  // Collect auth cookies and headers to apply on the redirect response
  const authCookies: Array<{ name: string; value: string; options: Record<string, unknown> }> = []
  let authHeaders: Record<string, string> = {}

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          authCookies.push(...cookiesToSet)
          authHeaders = headers
        },
      },
    }
  )

  // Helper: create redirect response with session cookies and cache headers applied
  const redirectWithCookies = (url: string | URL) => {
    const response = NextResponse.redirect(url)
    for (const { name, value, options } of authCookies) {
      response.cookies.set(name, value, options)
    }
    Object.entries(authHeaders).forEach(([key, value]) =>
      response.headers.set(key, value)
    )
    return response
  }

  // Handle token_hash (email verification, password reset via implicit flow)
  if (tokenHash && type) {
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as 'signup' | 'recovery' | 'email',
    })

    if (verifyError) {
      console.error('OTP verification error:', verifyError)
      const redirectUrl = new URL('/login', origin)
      redirectUrl.searchParams.set('error', 'verification_error')
      return NextResponse.redirect(redirectUrl)
    }

    // Redirect based on type
    if (type === 'recovery') {
      return redirectWithCookies(`${origin}/auth/reset-password`)
    }

    // For signup verification, go to dashboard
    return redirectWithCookies(`${origin}/dashboard`)
  }

  // Handle code exchange (PKCE flow: OAuth, email verification, password reset)
  if (code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (!exchangeError) {
      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'

      if (isLocalEnv) {
        return redirectWithCookies(`${origin}${next}`)
      } else if (forwardedHost) {
        return redirectWithCookies(`https://${forwardedHost}${next}`)
      } else {
        return redirectWithCookies(`${origin}${next}`)
      }
    }

    console.error('Code exchange error:', exchangeError)
  }

  // Return to login with error
  const redirectUrl = new URL('/login', origin)
  redirectUrl.searchParams.set('error', 'auth_callback_error')
  return NextResponse.redirect(redirectUrl)
}
