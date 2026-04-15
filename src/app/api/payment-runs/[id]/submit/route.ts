import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

// =============================================================
// PROJ-20: POST /api/payment-runs/[id]/submit — zur Prüfung einreichen
// Wechsel: draft → in_review. Erfordert mindestens einen Auftrag im Lauf.
// =============================================================

type RouteParams = { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params

    const ip = getClientIp(request)
    const rl = checkRateLimit(`payment-runs:submit:${ip}`, { limit: 20, windowMs: 10 * 60 * 1000 })
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
      .select('id, status, version')
      .eq('id', id)
      .single()

    if (runError || !run) {
      return NextResponse.json({ error: 'Payment run not found' }, { status: 404 })
    }
    if (run.status !== 'draft') {
      return NextResponse.json(
        { error: 'Only draft runs can be submitted' },
        { status: 422 }
      )
    }

    // Ensure the run contains at least one order
    const { count, error: countError } = await supabase
      .from('payment_orders')
      .select('id', { count: 'exact', head: true })
      .eq('payment_run_id', id)

    if (countError) {
      console.error('Error counting orders:', countError)
      return NextResponse.json({ error: 'Failed to validate run' }, { status: 500 })
    }
    if (!count || count === 0) {
      return NextResponse.json(
        { error: 'Cannot submit an empty run' },
        { status: 422 }
      )
    }

    const now = new Date().toISOString()
    const { data: updated, error: updateError } = await supabase
      .from('payment_runs')
      .update({
        status: 'in_review',
        submitted_by: user.userId,
        submitted_at: now,
        version: run.version + 1,
      })
      .eq('id', id)
      .eq('version', run.version)
      .select()
      .single()

    if (updateError || !updated) {
      return NextResponse.json({ error: 'version_conflict' }, { status: 409 })
    }

    await supabase.from('payment_run_events').insert({
      payment_run_id: id,
      event_type: 'submitted',
      actor_id: user.userId,
      payload: { order_count: count },
    })

    return NextResponse.json(updated)
  } catch (err) {
    console.error('Unexpected error in POST /api/payment-runs/[id]/submit:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
