import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'
import { normalizeIBAN } from '@/lib/iban-validation'

// =============================================================
// PROJ-19: GET /api/payment-orders/duplicate-check
// Prüft ob ein ähnlicher Zahlungsauftrag existiert:
// - Gleiche IBAN (exakt)
// - Ähnlicher Betrag (±5%)
// - Innerhalb der letzten 30 Tage
// =============================================================

const DuplicateCheckSchema = z.object({
  iban: z.string().min(1),
  amount: z.coerce.number().positive(),
  exclude_id: z.string().uuid().optional(),
})

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)

    // 1. Validate query params
    const parseResult = DuplicateCheckSchema.safeParse({
      iban: searchParams.get('iban'),
      amount: searchParams.get('amount'),
      exclude_id: searchParams.get('exclude_id') || undefined,
    })

    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0]
      return NextResponse.json(
        { error: firstError?.message ?? 'Invalid input' },
        { status: 400 }
      )
    }

    // 2. Check auth & permissions
    const roleResult = await requireRole('admin')
    if (roleResult.error) {
      return NextResponse.json(
        { error: roleResult.error.error },
        { status: roleResult.error.status }
      )
    }

    const { iban, amount, exclude_id } = parseResult.data
    const normalizedIban = normalizeIBAN(iban)

    // 3. Check for duplicates
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const lowerBound = amount * 0.95
    const upperBound = amount * 1.05

    const supabase = await createClient()
    let query = supabase
      .from('payment_orders')
      .select('id, recipient_name, iban, amount, purpose, created_at, status')
      .eq('iban', normalizedIban)
      .neq('status', 'cancelled')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .gte('amount', lowerBound)
      .lte('amount', upperBound)
      .limit(5)

    // Exclude current order when editing
    if (exclude_id) {
      query = query.neq('id', exclude_id)
    }

    const { data: duplicates, error } = await query

    if (error) {
      console.error('Error checking duplicates:', error)
      return NextResponse.json(
        { error: 'Failed to check duplicates' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      has_duplicates: (duplicates?.length ?? 0) > 0,
      duplicates: duplicates ?? [],
    })
  } catch {
    console.error('Unexpected error in GET /api/payment-orders/duplicate-check')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
