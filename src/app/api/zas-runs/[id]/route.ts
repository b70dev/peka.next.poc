import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

// =============================================================
// PROJ-23: GET /api/zas-runs/[id]
// Lädt einen einzelnen ZAS-Lebensnachweis-Lauf inkl. der
// verknüpften Todesfall-Meldungen. Viewer dürfen lesen.
// =============================================================

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params

    const ip = getClientIp(request)
    const rl = checkRateLimit(`zas-runs:detail:${ip}`, {
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

    const idCheck = z.string().uuid().safeParse(id)
    if (!idCheck.success) {
      return NextResponse.json({ error: 'Invalid run id' }, { status: 400 })
    }

    const roleResult = await requireRole('viewer')
    if (roleResult.error) {
      return NextResponse.json(
        { error: roleResult.error.error },
        { status: roleResult.error.status }
      )
    }

    const supabase = await createClient()

    const { data: run, error: runError } = await supabase
      .from('zas_life_verification_runs')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (runError) {
      console.error('Error loading zas run:', runError)
      return NextResponse.json({ error: 'Failed to load run' }, { status: 500 })
    }
    if (!run) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 })
    }

    // Verknüpfte Todesfälle laden (sortiert für stabile Anzeige).
    const { data: deaths, error: deathsError } = await supabase
      .from('zas_life_verification_deaths')
      .select('*')
      .eq('run_id', id)
      .order('last_name', { ascending: true, nullsFirst: false })
      .order('first_name', { ascending: true, nullsFirst: false })
      .limit(10_000)

    if (deathsError) {
      console.error('Error loading zas deaths:', deathsError)
      return NextResponse.json({ error: 'Failed to load deaths' }, { status: 500 })
    }

    return NextResponse.json({
      run,
      deaths: deaths ?? [],
    })
  } catch (err) {
    console.error('Unexpected error in GET /api/zas-runs/[id]:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
