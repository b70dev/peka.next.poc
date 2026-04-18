import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

// =============================================================
// PROJ-20: POST /api/payment-runs/[id]/reject — Lauf ablehnen
// Wechsel: in_review | visaed → rejected. Ablehnungsgrund ist Pflicht.
// Rejected runs können manuell zurück in 'draft' gesetzt werden (separate
// Action) oder neu erstellt werden.
// =============================================================

const RejectSchema = z.object({
  reason: z.string().min(5, 'Rejection reason must be at least 5 characters').max(2000),
})

type RouteParams = { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params

    const ip = getClientIp(request)
    const rl = checkRateLimit(`payment-runs:reject:${ip}`, { limit: 20, windowMs: 10 * 60 * 1000 })
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
      )
    }

    const body = await request.json()
    const parseResult = RejectSchema.safeParse(body)
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

    const { data: run, error: runError } = await supabase
      .from('payment_runs')
      .select('id, status, version')
      .eq('id', id)
      .single()

    if (runError || !run) {
      return NextResponse.json({ error: 'Payment run not found' }, { status: 404 })
    }
    if (run.status !== 'in_review' && run.status !== 'visaed') {
      return NextResponse.json(
        { error: 'Only runs in review or visaed can be rejected' },
        { status: 422 }
      )
    }

    // Atomic RPC: updates run + returns orders to draft + writes audit event in one transaction
    const { data: rpcResult, error: rpcError } = await supabase.rpc('reject_payment_run', {
      p_run_id: id,
      p_actor_id: user.userId,
      p_expected_version: run.version,
      p_reason: parseResult.data.reason,
    })

    if (rpcError) {
      const msg = rpcError.message ?? ''
      if (msg.includes('version_conflict')) return NextResponse.json({ error: 'version_conflict' }, { status: 409 })
      if (msg.includes('invalid_status')) return NextResponse.json({ error: 'Only in_review or visaed runs can be rejected' }, { status: 422 })
      console.error('Error in reject_payment_run RPC:', rpcError)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    return NextResponse.json(rpcResult)
  } catch (err) {
    console.error('Unexpected error in POST /api/payment-runs/[id]/reject:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
