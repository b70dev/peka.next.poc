import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

// =============================================================
// PROJ-20: POST /api/payment-runs/[id]/orders — Aufträge hinzufügen
// Body: { order_ids: string[] }
// Nur draft-Aufträge werden hinzugefügt, Status wechselt auf 'in_payment_run'
// =============================================================

const AddOrdersSchema = z.object({
  order_ids: z.array(z.string().uuid()).min(1).max(1000),
})

type RouteParams = { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id: runId } = await params

    const ip = getClientIp(request)
    const rl = checkRateLimit(`payment-runs:add-orders:${ip}`, { limit: 30, windowMs: 10 * 60 * 1000 })
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
      )
    }

    const body = await request.json()
    const parseResult = AddOrdersSchema.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 }
      )
    }

    const roleResult = await requireRole('admin')
    if (roleResult.error) {
      return NextResponse.json({ error: roleResult.error.error }, { status: roleResult.error.status })
    }

    const user = roleResult.data
    const supabase = await createClient()

    // Verify run is in draft status
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
        { error: 'Orders can only be added to draft runs' },
        { status: 422 }
      )
    }

    // Update orders: only those in draft status and not already assigned to a run
    const { data: updatedOrders, error: updateError } = await supabase
      .from('payment_orders')
      .update({
        status: 'in_payment_run',
        payment_run_id: runId,
        updated_by: user.userId,
      })
      .in('id', parseResult.data.order_ids)
      .eq('status', 'draft')
      .is('payment_run_id', null)
      .select('id')

    if (updateError) {
      console.error('Error adding orders to run:', updateError)
      return NextResponse.json({ error: 'Failed to add orders' }, { status: 500 })
    }

    const addedIds = updatedOrders?.map((o) => o.id) ?? []

    // Audit event per added order
    if (addedIds.length > 0) {
      await supabase.from('payment_run_events').insert({
        payment_run_id: runId,
        event_type: 'order_added',
        actor_id: user.userId,
        payload: { order_ids: addedIds, count: addedIds.length },
      })
    }

    return NextResponse.json({
      added: addedIds.length,
      skipped: parseResult.data.order_ids.length - addedIds.length,
      added_ids: addedIds,
    })
  } catch (err) {
    console.error('Unexpected error in POST /api/payment-runs/[id]/orders:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
