import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

// =============================================================
// PROJ-20: PATCH /api/payment-runs/[id] — Name/Datum bearbeiten
// Nur im Status 'draft' erlaubt. Optimistic Locking via version.
// =============================================================

const UpdatePaymentRunSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  execution_date: z.string().nullish(),
  version: z.number().int().positive(),
})

type RouteParams = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params

    const ip = getClientIp(request)
    const rl = checkRateLimit(`payment-runs:update:${ip}`, { limit: 30, windowMs: 10 * 60 * 1000 })
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
      )
    }

    const body = await request.json()
    const parseResult = UpdatePaymentRunSchema.safeParse(body)
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
    const { version, ...fields } = parseResult.data

    const supabase = await createClient()
    const { data: existing, error: fetchError } = await supabase
      .from('payment_runs')
      .select('id, status, version, name')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Payment run not found' }, { status: 404 })
    }

    if (existing.status !== 'draft') {
      return NextResponse.json(
        { error: 'Only draft runs can be edited' },
        { status: 422 }
      )
    }

    if (existing.version !== version) {
      return NextResponse.json({ error: 'version_conflict' }, { status: 409 })
    }

    const updatePayload: Record<string, unknown> = {
      version: version + 1,
    }
    if (fields.name !== undefined) updatePayload.name = fields.name
    if ('execution_date' in fields) updatePayload.execution_date = fields.execution_date ?? null

    const { data: updated, error: updateError } = await supabase
      .from('payment_runs')
      .update(updatePayload)
      .eq('id', id)
      .eq('version', version)
      .select()
      .single()

    if (updateError || !updated) {
      return NextResponse.json({ error: 'version_conflict' }, { status: 409 })
    }

    // Audit event if name changed
    if (fields.name !== undefined && fields.name !== existing.name) {
      await supabase.from('payment_run_events').insert({
        payment_run_id: id,
        event_type: 'renamed',
        actor_id: user.userId,
        payload: { old_name: existing.name, new_name: fields.name },
      })
    }

    return NextResponse.json(updated)
  } catch (err) {
    console.error('Unexpected error in PATCH /api/payment-runs/[id]:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
