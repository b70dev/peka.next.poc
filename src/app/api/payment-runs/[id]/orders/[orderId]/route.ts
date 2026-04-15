import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

// =============================================================
// PROJ-20: DELETE /api/payment-runs/[id]/orders/[orderId]
// Entfernt einen Auftrag aus dem Lauf. Auftrag geht zurück auf 'draft'.
// Nur im Status 'draft' des Laufs erlaubt.
// =============================================================

type RouteParams = { params: Promise<{ id: string; orderId: string }> }

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id: runId, orderId } = await params

    const ip = getClientIp(request)
    const rl = checkRateLimit(`payment-runs:remove-order:${ip}`, { limit: 60, windowMs: 10 * 60 * 1000 })
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
      .select('id, status')
      .eq('id', runId)
      .single()

    if (runError || !run) {
      return NextResponse.json({ error: 'Payment run not found' }, { status: 404 })
    }
    if (run.status !== 'draft') {
      return NextResponse.json(
        { error: 'Orders can only be removed from draft runs' },
        { status: 422 }
      )
    }

    const { data: updated, error: updateError } = await supabase
      .from('payment_orders')
      .update({
        status: 'draft',
        payment_run_id: null,
        updated_by: user.userId,
      })
      .eq('id', orderId)
      .eq('payment_run_id', runId)
      .select('id')
      .single()

    if (updateError || !updated) {
      return NextResponse.json({ error: 'Order not found in this run' }, { status: 404 })
    }

    await supabase.from('payment_run_events').insert({
      payment_run_id: runId,
      event_type: 'order_removed',
      actor_id: user.userId,
      payload: { order_id: orderId },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Unexpected error in DELETE /api/payment-runs/[id]/orders/[orderId]:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
