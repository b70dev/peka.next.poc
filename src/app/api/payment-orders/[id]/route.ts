import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'
import { normalizeIBAN } from '@/lib/iban-validation'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

// =============================================================
// PROJ-19: PATCH /api/payment-orders/[id] — Zahlungsauftrag bearbeiten
// Nur im Status 'draft' erlaubt. Optimistic Locking via version.
// =============================================================

const UpdatePaymentOrderSchema = z.object({
  recipient_name: z.string().min(1).max(140).optional(),
  iban: z.string().min(1).max(34).optional(),
  amount: z.number().positive().optional(),
  purpose: z.string().min(1).max(140).optional(),
  reference_number: z.string().max(35).nullish(),
  execution_date: z.string().nullish(),
  note: z.string().max(5000).nullish(),
  version: z.number().int().positive('Version is required'),
})

type RouteParams = {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params

    // 0. Rate limiting: 30 edits per 10 minutes per IP
    const ip = getClientIp(request)
    const rl = checkRateLimit(`payment-orders:update:${ip}`, { limit: 30, windowMs: 10 * 60 * 1000 })
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
      )
    }

    const body = await request.json()

    // 1. Validate input
    const parseResult = UpdatePaymentOrderSchema.safeParse(body)
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

    const user = roleResult.data
    const { version, ...updateFields } = parseResult.data

    // 3. Fetch current order to check status and version
    const supabase = await createClient()
    const { data: existing, error: fetchError } = await supabase
      .from('payment_orders')
      .select('id, status, version')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Payment order not found' },
        { status: 404 }
      )
    }

    // 4. Check status — only draft orders can be edited
    if (existing.status !== 'draft') {
      return NextResponse.json(
        { error: 'Only draft orders can be edited' },
        { status: 422 }
      )
    }

    // 5. Optimistic locking — check version
    if (existing.version !== version) {
      return NextResponse.json(
        { error: 'version_conflict' },
        { status: 409 }
      )
    }

    // 6. Build update payload
    const updatePayload: Record<string, unknown> = {
      updated_by: user.userId,
      version: version + 1,
    }

    if (updateFields.recipient_name !== undefined) {
      updatePayload.recipient_name = updateFields.recipient_name
    }
    if (updateFields.iban !== undefined) {
      updatePayload.iban = normalizeIBAN(updateFields.iban)
    }
    if (updateFields.amount !== undefined) {
      updatePayload.amount = updateFields.amount
    }
    if (updateFields.purpose !== undefined) {
      updatePayload.purpose = updateFields.purpose
    }
    if ('reference_number' in updateFields) {
      updatePayload.reference_number = updateFields.reference_number ?? null
    }
    if ('execution_date' in updateFields) {
      updatePayload.execution_date = updateFields.execution_date ?? null
    }
    if ('note' in updateFields) {
      updatePayload.note = updateFields.note ?? null
    }

    // 7. Update with version check (double-check for race conditions)
    const { data: updated, error: updateError } = await supabase
      .from('payment_orders')
      .update(updatePayload)
      .eq('id', id)
      .eq('version', version)
      .select()
      .single()

    if (updateError || !updated) {
      // If no row matched, another update happened between our check and write
      return NextResponse.json(
        { error: 'version_conflict' },
        { status: 409 }
      )
    }

    return NextResponse.json(updated)
  } catch {
    console.error('Unexpected error in PATCH /api/payment-orders/[id]')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
