import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

// =============================================================
// PROJ-20: POST /api/payment-runs/[id]/approve — Freigabe (Schritt 2)
// Wechsel: visaed → approved. Vieraugenprinzip: muss anderer User
// als der Visierende sein. Unumkehrbar.
// Setzt parallel alle enthaltenen Zahlungsaufträge auf 'approved'.
// =============================================================

type RouteParams = { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params

    const ip = getClientIp(request)
    const rl = checkRateLimit(`payment-runs:approve:${ip}`, { limit: 20, windowMs: 10 * 60 * 1000 })
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
      )
    }

    const roleResult = await requireRole('admin')
    if (roleResult.error) {
      return NextResponse.json({ error: roleResult.error.error }, { status: roleResult.error.status })
    }

    const user = roleResult.data
    const supabase = await createClient()

    const { data: run, error: runError } = await supabase
      .from('payment_runs')
      .select('id, status, version, visaed_by')
      .eq('id', id)
      .single()

    if (runError || !run) {
      return NextResponse.json({ error: 'Payment run not found' }, { status: 404 })
    }
    if (run.status !== 'visaed') {
      return NextResponse.json(
        { error: 'Only visaed runs can be approved' },
        { status: 422 }
      )
    }

    // Four-eyes principle: approver must be a different user than visa
    if (run.visaed_by === user.userId) {
      return NextResponse.json(
        { error: 'four_eyes_violation' },
        { status: 403 }
      )
    }

    // Atomic RPC: updates run + cascades orders + writes audit event in one transaction
    const { data: rpcResult, error: rpcError } = await supabase.rpc('approve_payment_run', {
      p_run_id: id,
      p_actor_id: user.userId,
      p_expected_version: run.version,
    })

    if (rpcError) {
      const msg = rpcError.message ?? ''
      if (msg.includes('version_conflict')) return NextResponse.json({ error: 'version_conflict' }, { status: 409 })
      if (msg.includes('four_eyes_violation')) return NextResponse.json({ error: 'four_eyes_violation' }, { status: 403 })
      if (msg.includes('invalid_status')) return NextResponse.json({ error: 'Only visaed runs can be approved' }, { status: 422 })
      console.error('Error in approve_payment_run RPC:', rpcError)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    return NextResponse.json(rpcResult)
  } catch (err) {
    console.error('Unexpected error in POST /api/payment-runs/[id]/approve:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
