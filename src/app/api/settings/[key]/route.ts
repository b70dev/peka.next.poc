import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

// =============================================================
// GET    /api/settings/[key] — Wert auslesen (authentifiziert)
// PATCH  /api/settings/[key] — Wert setzen (nur super_admin)
// =============================================================

const ALLOWED_KEYS = new Set<string>(['payment_run.high_amount_threshold'])

type RouteParams = { params: Promise<{ key: string }> }

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { key } = await params

    if (!ALLOWED_KEYS.has(key)) {
      return NextResponse.json({ error: 'Unknown setting key' }, { status: 404 })
    }

    const roleResult = await requireRole('viewer')
    if (roleResult.error) {
      return NextResponse.json({ error: roleResult.error.error }, { status: roleResult.error.status })
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('app_settings')
      .select('key, value, description, updated_at')
      .eq('key', key)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Setting not found' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('Unexpected error in GET /api/settings/[key]:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

const UpdateSettingSchema = z.object({
  value: z.unknown(),
})

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { key } = await params

    if (!ALLOWED_KEYS.has(key)) {
      return NextResponse.json({ error: 'Unknown setting key' }, { status: 404 })
    }

    const ip = getClientIp(request)
    const rl = checkRateLimit(`settings:update:${ip}`, { limit: 20, windowMs: 10 * 60 * 1000 })
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
      )
    }

    const body = await request.json()
    const parseResult = UpdateSettingSchema.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }

    // Specific validation per key
    if (key === 'payment_run.high_amount_threshold') {
      const v = parseResult.data.value
      if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) {
        return NextResponse.json({ error: 'Threshold must be a positive number' }, { status: 400 })
      }
    }

    const roleResult = await requireRole('super_admin')
    if (roleResult.error) {
      return NextResponse.json({ error: roleResult.error.error }, { status: roleResult.error.status })
    }

    const user = roleResult.data
    const supabase = await createClient()

    const { data: updated, error: updateError } = await supabase
      .from('app_settings')
      .update({
        value: parseResult.data.value,
        updated_by: user.userId,
        updated_at: new Date().toISOString(),
      })
      .eq('key', key)
      .select()
      .single()

    if (updateError || !updated) {
      console.error('Error updating setting:', updateError)
      return NextResponse.json({ error: 'Failed to update setting' }, { status: 500 })
    }

    return NextResponse.json(updated)
  } catch (err) {
    console.error('Unexpected error in PATCH /api/settings/[key]:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
