import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'
import { normalizeIBAN } from '@/lib/iban-validation'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

// =============================================================
// PROJ-19: POST /api/payment-orders — Zahlungsauftrag erstellen
// =============================================================

const CreatePaymentOrderSchema = z.object({
  recipient_name: z.string().min(1, 'Recipient name is required').max(140),
  iban: z.string().min(1, 'IBAN is required').max(34),
  amount: z.number().positive('Amount must be greater than 0'),
  currency: z.literal('CHF').default('CHF'),
  purpose: z.string().min(1, 'Purpose is required').max(140),
  reference_number: z.string().max(35).nullish(),
  execution_date: z.string().nullish(), // ISO date string
  note: z.string().max(5000).nullish(),
  insured_person_id: z.string().uuid().nullish(),
  employment_id: z.string().uuid().nullish(),
  force: z.boolean().optional(), // Skip duplicate warning
})

export async function POST(request: Request) {
  try {
    // 0. Rate limiting: 20 creates per 10 minutes per IP
    const ip = getClientIp(request)
    const rl = checkRateLimit(`payment-orders:create:${ip}`, { limit: 20, windowMs: 10 * 60 * 1000 })
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
      )
    }

    const body = await request.json()

    // 1. Validate input
    const parseResult = CreatePaymentOrderSchema.safeParse(body)
    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0]
      return NextResponse.json(
        { error: firstError?.message ?? 'Invalid input' },
        { status: 400 }
      )
    }

    // 2. Check auth & permissions (minimum: admin)
    const roleResult = await requireRole('admin')
    if (roleResult.error) {
      return NextResponse.json(
        { error: roleResult.error.error },
        { status: roleResult.error.status }
      )
    }

    const user = roleResult.data
    const data = parseResult.data
    const normalizedIban = normalizeIBAN(data.iban)

    // 3. Duplicate check (unless force=true)
    if (!data.force) {
      const supabaseCheck = await createClient()
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const lowerBound = data.amount * 0.95
      const upperBound = data.amount * 1.05

      const { data: duplicates } = await supabaseCheck
        .from('payment_orders')
        .select('id, recipient_name, iban, amount, purpose, created_at, status')
        .eq('iban', normalizedIban)
        .neq('status', 'cancelled')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .gte('amount', lowerBound)
        .lte('amount', upperBound)
        .limit(5)

      if (duplicates && duplicates.length > 0) {
        return NextResponse.json(
          {
            error: 'duplicate_warning',
            duplicates,
          },
          { status: 409 }
        )
      }
    }

    // 4. Insert payment order
    const supabase = await createClient()
    const { data: created, error: insertError } = await supabase
      .from('payment_orders')
      .insert({
        recipient_name: data.recipient_name,
        iban: normalizedIban,
        amount: data.amount,
        currency: 'CHF',
        purpose: data.purpose,
        reference_number: data.reference_number ?? null,
        execution_date: data.execution_date ?? null,
        note: data.note ?? null,
        status: 'draft',
        insured_person_id: data.insured_person_id ?? null,
        employment_id: data.employment_id ?? null,
        created_by: user.userId,
        updated_by: user.userId,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating payment order:', insertError)
      return NextResponse.json(
        { error: 'Failed to create payment order' },
        { status: 500 }
      )
    }

    return NextResponse.json(created, { status: 201 })
  } catch {
    console.error('Unexpected error in POST /api/payment-orders')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
