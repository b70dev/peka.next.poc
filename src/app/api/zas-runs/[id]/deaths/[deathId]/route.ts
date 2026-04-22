import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

// =============================================================
// PROJ-23: PATCH /api/zas-runs/[id]/deaths/[deathId]
// Markiert einen einzelnen Todesfall als bearbeitet bzw. als
// "bereits bekannt" und speichert den Zeitstempel sowie den
// ausführenden Admin.
//
// Body:
//   { status: 'processed' | 'already_known', notes?: string | null }
//
// Nur admin/super_admin. Der Status 'open' kann über diese
// Route NICHT (re-)gesetzt werden — Zurücksetzen würde den
// Audit-Trail korrumpieren und ist nicht im Scope.
// =============================================================

type RouteParams = { params: Promise<{ id: string; deathId: string }> }

const UpdateDeathSchema = z.object({
  status: z.enum(['processed', 'already_known']),
  notes: z.string().max(2000).nullish(),
})

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id, deathId } = await params

    const ip = getClientIp(request)
    const rl = checkRateLimit(`zas-runs:deaths-patch:${ip}`, {
      limit: 120,
      windowMs: 10 * 60 * 1000,
    })
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        {
          status: 429,
          headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
        }
      )
    }

    const runIdCheck = z.string().uuid().safeParse(id)
    const deathIdCheck = z.string().uuid().safeParse(deathId)
    if (!runIdCheck.success || !deathIdCheck.success) {
      return NextResponse.json({ error: 'Invalid id parameter' }, { status: 400 })
    }

    const rawBody = await request.json().catch(() => null)
    const parseResult = UpdateDeathSchema.safeParse(rawBody)
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 }
      )
    }

    const roleResult = await requireRole('admin')
    if (roleResult.error) {
      return NextResponse.json(
        { error: roleResult.error.error },
        { status: roleResult.error.status }
      )
    }
    const user = roleResult.data

    const supabase = await createClient()

    // 1. Bestehenden Todesfall laden und prüfen, dass er zum Run gehört.
    const { data: death, error: deathError } = await supabase
      .from('zas_life_verification_deaths')
      .select('id, run_id, status')
      .eq('id', deathId)
      .maybeSingle()

    if (deathError) {
      console.error('Error loading death for patch:', deathError)
      return NextResponse.json({ error: 'Failed to load death' }, { status: 500 })
    }
    if (!death) {
      return NextResponse.json({ error: 'Death not found' }, { status: 404 })
    }
    if (death.run_id !== id) {
      // Keine Kreuz-Run-Zugriffe erlauben.
      return NextResponse.json({ error: 'Death does not belong to run' }, { status: 404 })
    }

    // 2. Status-Übergang: 'open' -> 'processed' / 'already_known' ist erlaubt;
    //    ein erneuter Wechsel zwischen 'processed' und 'already_known' ist zulässig
    //    (Admin könnte korrigieren). Ein Rück-Setzen auf 'open' ist nicht möglich.
    const now = new Date().toISOString()

    const updatePayload: Record<string, unknown> = {
      status: parseResult.data.status,
      processed_at: now,
      processed_by: user.userId,
    }
    if (parseResult.data.notes !== undefined) {
      updatePayload.notes = parseResult.data.notes ?? null
    }

    const { data: updated, error: updateError } = await supabase
      .from('zas_life_verification_deaths')
      .update(updatePayload)
      .eq('id', deathId)
      .select()
      .single()

    if (updateError || !updated) {
      console.error('Error updating death:', updateError)
      return NextResponse.json({ error: 'Failed to update death' }, { status: 500 })
    }

    return NextResponse.json(updated)
  } catch (err) {
    console.error(
      'Unexpected error in PATCH /api/zas-runs/[id]/deaths/[deathId]:',
      err
    )
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
