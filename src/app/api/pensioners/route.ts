import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

// =============================================================
// PROJ-24: POST /api/pensioners
// Erfasst einen neuen Rentenbezug: erzeugt ein neues Konto vom
// Typ "rente" (account_types.code='rente') für eine bestehende
// Anstellung. Der Button/Dialog auf /rentner ruft diese Route.
//
// Berechtigungen: nur Admin / Super-Admin
// Regel: pro Versicherter Person darf jeweils nur EIN aktives
// Rentenkonto existieren; ein zweiter Versuch liefert 409.
// =============================================================

const CreatePensionSchema = z.object({
  insured_person_id: z.string().uuid(),
  employment_id: z.string().uuid(),
  retirement_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/u, 'Retirement date must be ISO date (YYYY-MM-DD)'),
  monthly_pension_amount: z
    .number()
    .positive('Amount must be greater than zero')
    .max(9_999_999.99, 'Amount exceeds maximum of 9,999,999.99')
    .refine((v) => Number.isFinite(v), { message: 'Amount must be a finite number' })
    .refine((v) => Math.round(v * 100) === v * 100, {
      message: 'Amount must have at most 2 decimal places',
    }),
})

export async function POST(request: Request) {
  try {
    // 1. Rate limit (Kontoerfassung ist selten)
    const ip = getClientIp(request)
    const rl = checkRateLimit(`pensioners:create:${ip}`, {
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

    // 2. Body validieren
    const rawBody = await request.json().catch(() => null)
    const parsed = CreatePensionSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 }
      )
    }
    const { insured_person_id, employment_id, retirement_date, monthly_pension_amount } =
      parsed.data

    // 3. Auth + Rolle
    const roleResult = await requireRole('admin')
    if (roleResult.error) {
      return NextResponse.json(
        { error: roleResult.error.error },
        { status: roleResult.error.status }
      )
    }

    const supabase = await createClient()

    // 4. Anstellung muss zur Person gehören
    const { data: employment, error: empErr } = await supabase
      .from('employments')
      .select('id, insured_person_id, exit_date')
      .eq('id', employment_id)
      .maybeSingle()

    if (empErr) {
      console.error('Error loading employment:', empErr)
      return NextResponse.json({ error: 'Failed to load employment' }, { status: 500 })
    }
    if (!employment) {
      return NextResponse.json({ error: 'Employment not found' }, { status: 404 })
    }
    if (employment.insured_person_id !== insured_person_id) {
      return NextResponse.json(
        { error: 'Employment does not belong to selected person' },
        { status: 400 }
      )
    }

    // 5. Account-Type "rente" laden
    const { data: accountType, error: atErr } = await supabase
      .from('account_types')
      .select('id')
      .eq('code', 'rente')
      .maybeSingle()

    if (atErr || !accountType) {
      console.error('Error loading rente account_type:', atErr)
      return NextResponse.json(
        { error: 'Pension account type is not configured' },
        { status: 500 }
      )
    }

    // 6. Prüfung: existiert bereits ein aktives Rentenkonto für diese Person?
    // Wir laden alle Accounts der Anstellungen dieser Person und filtern.
    const { data: existingPensions, error: existErr } = await supabase
      .from('accounts')
      .select('id, is_active, employment:employments!inner(insured_person_id)')
      .eq('account_type_id', accountType.id)
      .eq('is_active', true)
      .eq('employment.insured_person_id', insured_person_id)
      .limit(1)

    if (existErr) {
      console.error('Error checking existing pension accounts:', existErr)
      return NextResponse.json(
        { error: 'Failed to check existing pension' },
        { status: 500 }
      )
    }
    if (existingPensions && existingPensions.length > 0) {
      return NextResponse.json(
        { error: 'Person already has an active pension account' },
        { status: 409 }
      )
    }

    // 7. Konto einfügen
    const { data: created, error: insertErr } = await supabase
      .from('accounts')
      .insert({
        employment_id,
        account_type_id: accountType.id,
        is_active: true,
        monthly_pension_amount,
        retirement_date,
      })
      .select('id, employment_id, account_type_id, is_active, monthly_pension_amount, retirement_date')
      .single()

    if (insertErr || !created) {
      console.error('Error inserting pension account:', insertErr)
      return NextResponse.json(
        { error: 'Failed to create pension account' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { ...created, insured_person_id },
      { status: 201 }
    )
  } catch (err) {
    console.error('Unexpected error in POST /api/pensioners:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
