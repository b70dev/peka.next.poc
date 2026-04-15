import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { loadDebtorSettings } from '@/lib/debtor-settings'
import { validateIBANInput } from '@/lib/iban-validation'

// =============================================================
// PROJ-21: Auftraggeber-Konfiguration (Debtor)
//   GET   -> alle Debtor-Felder lesen (admin/super_admin)
//   PATCH -> Felder schreiben (nur super_admin)
// =============================================================

export async function GET() {
  try {
    const roleResult = await requireRole('admin')
    if (roleResult.error) {
      return NextResponse.json(
        { error: roleResult.error.error },
        { status: roleResult.error.status }
      )
    }

    const supabase = await createClient()
    const debtor = await loadDebtorSettings(supabase)
    return NextResponse.json(debtor)
  } catch (err) {
    console.error('Unexpected error in GET /api/settings/debtor:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

const DebtorUpdateSchema = z.object({
  name: z.string().trim().min(1).max(140),
  street: z.string().trim().min(1).max(140),
  postal_code: z.string().trim().min(1).max(16),
  city: z.string().trim().min(1).max(70),
  country: z
    .string()
    .trim()
    .regex(/^[A-Z]{2}$/, 'Country must be a 2-letter ISO code'),
  iban: z.string().trim().min(15).max(34),
  organisation_id: z.string().trim().min(1).max(35),
})

export async function PATCH(request: Request) {
  try {
    const ip = getClientIp(request)
    const rl = checkRateLimit(`settings:debtor:${ip}`, {
      limit: 20,
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

    const roleResult = await requireRole('super_admin')
    if (roleResult.error) {
      return NextResponse.json(
        { error: roleResult.error.error },
        { status: roleResult.error.status }
      )
    }
    const user = roleResult.data

    const body = await request.json().catch(() => null)
    const parseResult = DebtorUpdateSchema.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parseResult.error.flatten() },
        { status: 400 }
      )
    }
    const input = parseResult.data

    // IBAN must be CH or LI
    const ibanCheck = validateIBANInput(input.iban)
    if (!ibanCheck.valid) {
      return NextResponse.json(
        { error: 'IBAN is invalid', field: 'iban' },
        { status: 400 }
      )
    }
    if (ibanCheck.isForeignIBAN) {
      return NextResponse.json(
        { error: 'IBAN must be from Switzerland (CH) or Liechtenstein (LI)', field: 'iban' },
        { status: 400 }
      )
    }

    // Country must also be CH or LI to match IBAN
    if (input.country !== 'CH' && input.country !== 'LI') {
      return NextResponse.json(
        { error: 'Country must be CH or LI', field: 'country' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Write each key individually (upsert). Updates only — inserts were done
    // by the migration seed.
    const now = new Date().toISOString()
    const updates: Array<{ key: string; value: unknown }> = [
      { key: 'debtor.name', value: input.name },
      { key: 'debtor.street', value: input.street },
      { key: 'debtor.postal_code', value: input.postal_code },
      { key: 'debtor.city', value: input.city },
      { key: 'debtor.country', value: input.country },
      { key: 'debtor.iban', value: input.iban.replace(/\s+/g, '').toUpperCase() },
      { key: 'debtor.organisation_id', value: input.organisation_id },
    ]

    for (const u of updates) {
      const { error } = await supabase
        .from('app_settings')
        .update({ value: u.value, updated_by: user.userId, updated_at: now })
        .eq('key', u.key)
      if (error) {
        console.error(`Error updating ${u.key}:`, error)
        return NextResponse.json(
          { error: `Failed to update ${u.key}` },
          { status: 500 }
        )
      }
    }

    const debtor = await loadDebtorSettings(supabase)
    return NextResponse.json(debtor)
  } catch (err) {
    console.error('Unexpected error in PATCH /api/settings/debtor:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
