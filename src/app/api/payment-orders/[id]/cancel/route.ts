import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import type { PaymentOrderStatus } from '@/lib/payment-orders.types'

// =============================================================
// PROJ-19: POST /api/payment-orders/[id]/cancel — Stornierung
// Nur im Status 'draft' oder 'in_payment_run' erlaubt.
// =============================================================

const CANCELLABLE_STATUSES: PaymentOrderStatus[] = ['draft', 'in_payment_run']

type RouteParams = {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params

    // 0. Rate limiting: 20 cancellations per 10 minutes per IP
    const ip = getClientIp(request)
    const rl = checkRateLimit(`payment-orders:cancel:${ip}`, { limit: 20, windowMs: 10 * 60 * 1000 })
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
      )
    }

    // 1. Check auth & permissions
    const roleResult = await requireRole('admin')
    if (roleResult.error) {
      return NextResponse.json(
        { error: roleResult.error.error },
        { status: roleResult.error.status }
      )
    }

    const user = roleResult.data

    // 2. Fetch current order
    const supabase = await createClient()
    const { data: existing, error: fetchError } = await supabase
      .from('payment_orders')
      .select('id, status')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Payment order not found' },
        { status: 404 }
      )
    }

    // 3. Check if cancellable
    if (!CANCELLABLE_STATUSES.includes(existing.status as PaymentOrderStatus)) {
      return NextResponse.json(
        { error: 'Only draft or in_payment_run orders can be cancelled' },
        { status: 422 }
      )
    }

    // 4. Cancel the order — if it was part of a payment run, detach it so the
    //    run's order set and the pain.001 export stay consistent.
    const updatePayload: Record<string, unknown> = {
      status: 'cancelled',
      updated_by: user.userId,
    }
    if (existing.status === 'in_payment_run') {
      updatePayload.payment_run_id = null
    }

    const { data: updated, error: updateError } = await supabase
      .from('payment_orders')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single()

    if (updateError || !updated) {
      console.error('Error cancelling payment order:', updateError)
      return NextResponse.json(
        { error: 'Failed to cancel payment order' },
        { status: 500 }
      )
    }

    return NextResponse.json(updated)
  } catch {
    console.error('Unexpected error in POST /api/payment-orders/[id]/cancel')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
