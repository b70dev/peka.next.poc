import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

// =============================================================
// PROJ-24: PATCH /api/pensioners/[accountId]/pension-amount
// Aktualisiert den monatlichen Rentenbetrag auf einem
// Renten-Konto (accounts-Tabelle). Der Parameter [accountId]
// ist die UUID der Konto-Zeile (nicht der Versicherten-Person).
//
// Berechtigungen:
//   - Admin / Super-Admin: dürfen schreiben
//   - Viewer:              403 (wie pro Spec gefordert)
//
// Validierung:
//   - Body: { monthly_pension_amount: number }
//   - Wert >= 0, max. 2 Nachkommastellen, max. 9'999'999.99
//   - Das Konto muss existieren und vom Typ "Rente" sein
//     (account_types.code startet mit 'RENT' oder == 'PENSION' / 'PENS')
// =============================================================

// Zod-Schema: non-negative Zahl mit maximal 2 Nachkommastellen.
// Die obere Grenze ergibt sich aus NUMERIC(10,2) → 8 Vorkomma-Stellen.
const PensionAmountSchema = z.object({
  monthly_pension_amount: z
    .number()
    .positive('Amount must be greater than zero')
    .max(9_999_999.99, 'Amount exceeds maximum of 9,999,999.99')
    .refine((v) => Number.isFinite(v), { message: 'Amount must be a finite number' })
    .refine((v) => Math.round(v * 100) === v * 100, {
      message: 'Amount must have at most 2 decimal places',
    }),
})

type RouteParams = { params: Promise<{ accountId: string }> }

// Erwartete Form der Join-Abfrage: accounts + account_types.code
interface AccountWithTypeRow {
  id: string
  monthly_pension_amount: number | null
  retirement_date: string | null
  account_type: { code: string | null } | null
}

function isPensionAccountCode(code: string | null | undefined): boolean {
  if (!code) return false
  const upper = code.toUpperCase()
  return upper.startsWith('RENT') || upper === 'PENSION' || upper === 'PENS'
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { accountId } = await params

    // 1. Rate limit (eine moderate Grenze für Einzel-Edits)
    const ip = getClientIp(request)
    const rl = checkRateLimit(`pensioners:patch-amount:${ip}`, {
      limit: 60,
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

    // 2. Validierung der Pfad-ID (UUID)
    const idCheck = z.string().uuid().safeParse(accountId)
    if (!idCheck.success) {
      return NextResponse.json({ error: 'Invalid account id' }, { status: 400 })
    }

    // 3. Validierung des Bodys
    const rawBody = await request.json().catch(() => null)
    const parseResult = PensionAmountSchema.safeParse(rawBody)
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 }
      )
    }

    // 4. Authentifizierung + Rollen-Prüfung (mindestens admin)
    const roleResult = await requireRole('admin')
    if (roleResult.error) {
      return NextResponse.json(
        { error: roleResult.error.error },
        { status: roleResult.error.status }
      )
    }

    const supabase = await createClient()

    // 5. Account laden + prüfen dass er vom Typ "Rente" ist
    const { data: accountRow, error: fetchError } = await supabase
      .from('accounts')
      .select(
        `id,
         monthly_pension_amount,
         retirement_date,
         account_type:account_types!inner(code)`
      )
      .eq('id', accountId)
      .maybeSingle<AccountWithTypeRow>()

    if (fetchError) {
      console.error('Error loading account for pension-amount patch:', fetchError)
      return NextResponse.json({ error: 'Failed to load account' }, { status: 500 })
    }

    if (!accountRow) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    if (!isPensionAccountCode(accountRow.account_type?.code)) {
      return NextResponse.json(
        { error: 'Account is not a pension account' },
        { status: 400 }
      )
    }

    // 6. Update durchführen
    const { data: updated, error: updateError } = await supabase
      .from('accounts')
      .update({ monthly_pension_amount: parseResult.data.monthly_pension_amount })
      .eq('id', accountId)
      .select(
        `id,
         employment_id,
         is_active,
         monthly_pension_amount,
         retirement_date,
         updated_at`
      )
      .single()

    if (updateError || !updated) {
      console.error('Error updating pension amount:', updateError)
      return NextResponse.json(
        { error: 'Failed to update pension amount' },
        { status: 500 }
      )
    }

    return NextResponse.json(updated)
  } catch (err) {
    console.error(
      'Unexpected error in PATCH /api/pensioners/[accountId]/pension-amount:',
      err
    )
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
