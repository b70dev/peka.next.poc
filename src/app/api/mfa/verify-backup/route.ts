import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createBackupVerificationToken, COOKIE_NAME } from '@/lib/mfa/backup-verify'

export async function POST(request: Request) {
  try {
    const { code } = await request.json()

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Missing code' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.access_token || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Call Edge Function to verify the backup code
    const edgeFunctionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/mfa-backup-codes?action=verify`
    const edgeResponse = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      },
      body: JSON.stringify({ code: code.toUpperCase() }),
    })

    const edgeData = await edgeResponse.json()

    if (!edgeResponse.ok || !edgeData.valid) {
      return NextResponse.json({
        valid: false,
        error: edgeData.error || 'Invalid backup code',
        attempts_remaining: edgeData.attempts_remaining,
        locked: edgeData.locked,
        locked_until: edgeData.locked_until,
      }, { status: edgeResponse.status })
    }

    // Backup code verified successfully - create a signed token and set as httpOnly cookie
    const token = await createBackupVerificationToken(session.user.id)

    const response = NextResponse.json({
      valid: true,
      remaining: edgeData.remaining,
    })

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60, // 24 hours in seconds
    })

    return response
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
