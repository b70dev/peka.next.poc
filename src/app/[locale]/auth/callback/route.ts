import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
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

  const supabase = await createClient()

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
      return NextResponse.redirect(`${origin}/auth/reset-password`)
    }

    // For signup verification, go to dashboard
    return NextResponse.redirect(`${origin}/dashboard`)
  }

  // Handle code exchange (PKCE flow: OAuth, email verification, password reset)
  if (code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (!exchangeError) {
      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }

    console.error('Code exchange error:', exchangeError)
  }

  // Return to login with error
  const redirectUrl = new URL('/login', origin)
  redirectUrl.searchParams.set('error', 'auth_callback_error')
  return NextResponse.redirect(redirectUrl)
}
