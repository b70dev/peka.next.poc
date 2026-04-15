import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

// =============================================================
// PROJ-20: POST /api/payment-runs — neuen Zahlungslauf erstellen
// =============================================================

const CreatePaymentRunSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  execution_date: z.string().nullish(),
})

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request)
    const rl = checkRateLimit(`payment-runs:create:${ip}`, { limit: 20, windowMs: 10 * 60 * 1000 })
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
      )
    }

    const body = await request.json()
    const parseResult = CreatePaymentRunSchema.safeParse(body)
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

    const { data: run, error: insertError } = await supabase
      .from('payment_runs')
      .insert({
        name: parseResult.data.name,
        execution_date: parseResult.data.execution_date ?? null,
        status: 'draft',
        created_by: user.userId,
      })
      .select()
      .single()

    if (insertError || !run) {
      console.error('Error creating payment run:', insertError)
      return NextResponse.json({ error: 'Failed to create payment run' }, { status: 500 })
    }

    // Audit event
    await supabase.from('payment_run_events').insert({
      payment_run_id: run.id,
      event_type: 'created',
      actor_id: user.userId,
      payload: { name: run.name, execution_date: run.execution_date },
    })

    return NextResponse.json(run, { status: 201 })
  } catch (err) {
    console.error('Unexpected error in POST /api/payment-runs:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
