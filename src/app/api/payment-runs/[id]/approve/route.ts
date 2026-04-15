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

    const now = new Date().toISOString()

    // 1. Update the payment run itself
    const { data: updated, error: updateError } = await supabase
      .from('payment_runs')
      .update({
        status: 'approved',
        approved_by: user.userId,
        approved_at: now,
        version: run.version + 1,
      })
      .eq('id', id)
      .eq('version', run.version)
      .select()
      .single()

    if (updateError || !updated) {
      return NextResponse.json({ error: 'version_conflict' }, { status: 409 })
    }

    // 2. Cascade: update all contained payment_orders to 'approved'
    const { error: ordersError } = await supabase
      .from('payment_orders')
      .update({ status: 'approved', updated_by: user.userId })
      .eq('payment_run_id', id)
      .eq('status', 'in_payment_run')

    if (ordersError) {
      console.error('Error cascading approval to orders:', ordersError)
      // Run is already approved — we log but don't rollback. Audit will show
      // the inconsistency if it occurs.
    }

    await supabase.from('payment_run_events').insert({
      payment_run_id: id,
      event_type: 'approved',
      actor_id: user.userId,
      payload: null,
    })

    return NextResponse.json(updated)
  } catch (err) {
    console.error('Unexpected error in POST /api/payment-runs/[id]/approve:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
