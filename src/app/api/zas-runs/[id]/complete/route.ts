import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

// =============================================================
// PROJ-23: PATCH /api/zas-runs/[id]/complete
// Schliesst einen Lauf ab.
//
// Query-Parameter:
//   ?mode=completed              (Default)
//   ?mode=completed_without_response
//
// Regeln:
//   - 'completed' nur zulässig, wenn der Lauf im Status
//     'response_imported' ist UND alle Todesfälle bearbeitet
//     (status != 'open').
//   - 'completed_without_response' nur zulässig, wenn der Lauf
//     im Status 'request_created' ist (keine Antwort erhalten).
//
// Nur admin/super_admin.
// =============================================================

type RouteParams = { params: Promise<{ id: string }> }

const ModeSchema = z.enum(['completed', 'completed_without_response'])

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params

    const ip = getClientIp(request)
    const rl = checkRateLimit(`zas-runs:complete:${ip}`, {
      limit: 30,
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

    const idCheck = z.string().uuid().safeParse(id)
    if (!idCheck.success) {
      return NextResponse.json({ error: 'Invalid run id' }, { status: 400 })
    }

    const url = new URL(request.url)
    const modeParam = url.searchParams.get('mode') ?? 'completed'
    const modeCheck = ModeSchema.safeParse(modeParam)
    if (!modeCheck.success) {
      return NextResponse.json(
        { error: 'Invalid mode, use "completed" or "completed_without_response"' },
        { status: 400 }
      )
    }
    const targetStatus = modeCheck.data

    const roleResult = await requireRole('admin')
    if (roleResult.error) {
      return NextResponse.json(
        { error: roleResult.error.error },
        { status: roleResult.error.status }
      )
    }
    const user = roleResult.data

    const supabase = await createClient()

    // 1. Lauf laden
    const { data: run, error: runError } = await supabase
      .from('zas_life_verification_runs')
      .select('id, status')
      .eq('id', id)
      .maybeSingle()

    if (runError) {
      console.error('Error loading run for complete:', runError)
      return NextResponse.json({ error: 'Failed to load run' }, { status: 500 })
    }
    if (!run) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 })
    }

    // 2. Status-Regel je Modus
    if (targetStatus === 'completed_without_response') {
      if (run.status !== 'request_created') {
        return NextResponse.json(
          {
            error: 'invalid_status',
            message:
              'Only runs in status "request_created" can be closed without response',
          },
          { status: 422 }
        )
      }
    } else {
      // 'completed'
      if (run.status !== 'response_imported') {
        return NextResponse.json(
          {
            error: 'invalid_status',
            message: 'Only runs with an imported response can be completed',
          },
          { status: 422 }
        )
      }

      // Prüfen, ob noch offene Todesfälle vorliegen
      const { count: openCount, error: countError } = await supabase
        .from('zas_life_verification_deaths')
        .select('id', { count: 'exact', head: true })
        .eq('run_id', id)
        .eq('status', 'open')

      if (countError) {
        console.error('Error counting open deaths:', countError)
        return NextResponse.json(
          { error: 'Failed to verify run completion' },
          { status: 500 }
        )
      }

      if ((openCount ?? 0) > 0) {
        return NextResponse.json(
          {
            error: 'open_deaths_remaining',
            message: 'There are still open deaths. Mark them as processed first.',
            open_count: openCount ?? 0,
          },
          { status: 422 }
        )
      }
    }

    // 3. Update durchführen
    const now = new Date().toISOString()
    const { data: updated, error: updateError } = await supabase
      .from('zas_life_verification_runs')
      .update({
        status: targetStatus,
        completed_at: now,
        completed_by: user.userId,
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError || !updated) {
      console.error('Error updating run to completed:', updateError)
      return NextResponse.json({ error: 'Failed to complete run' }, { status: 500 })
    }

    return NextResponse.json(updated)
  } catch (err) {
    console.error('Unexpected error in PATCH /api/zas-runs/[id]/complete:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
