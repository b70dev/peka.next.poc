import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

// =============================================================
// PROJ-20: POST /api/payment-runs/[id]/visa — Visierung (Schritt 1)
// Wechsel: in_review → visaed. Erste Unterschrift im Vieraugenprinzip.
// =============================================================

type RouteParams = { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params

    const ip = getClientIp(request)
    const rl = checkRateLimit(`payment-runs:visa:${ip}`, { limit: 20, windowMs: 10 * 60 * 1000 })
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
    if (run.status !== 'in_review') {
      return NextResponse.json(
        { error: 'Only runs in review can be visaed' },
        { status: 422 }
      )
    }

    const now = new Date().toISOString()
    const { data: updated, error: updateError } = await supabase
      .from('payment_runs')
      .update({
        status: 'visaed',
        visaed_by: user.userId,
        visaed_at: now,
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
      event_type: 'visaed',
      actor_id: user.userId,
      payload: null,
    })

    return NextResponse.json(updated)
  } catch (err) {
    console.error('Unexpected error in POST /api/payment-runs/[id]/visa:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
