import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { loadDebtorSettings } from '@/lib/debtor-settings'
import { generatePain001Xml } from '@/lib/pain001-generator'
import {
  PAIN001_VERSIONS,
  isDebtorConfigured,
  type Pain001Version,
} from '@/lib/payment-run-exports.types'
import type { PaymentRun } from '@/lib/payment-runs.types'
import type { PaymentOrder } from '@/lib/payment-orders.types'

// =============================================================
// PROJ-21: POST /api/payment-runs/[id]/export
// Generiert eine pain.001 XML-Datei fuer einen freigegebenen
// Zahlungslauf, validiert sie, persistiert sie in
// payment_run_exports, setzt den Lauf-Status auf 'exported'
// und liefert das XML als Download-Antwort zurueck.
// =============================================================

type RouteParams = { params: Promise<{ id: string }> }

const ExportRequestSchema = z.object({
  pain_version: z.enum(PAIN001_VERSIONS as unknown as [string, ...string[]]),
})

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params

    // 1. Rate limit (export is relatively expensive)
    const ip = getClientIp(request)
    const rl = checkRateLimit(`payment-runs:export:${ip}`, {
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

    // 2. Role check
    const roleResult = await requireRole('admin')
    if (roleResult.error) {
      return NextResponse.json(
        { error: roleResult.error.error },
        { status: roleResult.error.status }
      )
    }
    const user = roleResult.data

    // 3. Input validation
    const body = await request.json().catch(() => null)
    const parseResult = ExportRequestSchema.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parseResult.error.flatten() },
        { status: 400 }
      )
    }
    const painVersion = parseResult.data.pain_version as Pain001Version

    const supabase = await createClient()

    // 4. Load the run and check status
    const { data: runRow, error: runError } = await supabase
      .from('payment_runs')
      .select('*')
      .eq('id', id)
      .single()

    if (runError || !runRow) {
      return NextResponse.json({ error: 'Payment run not found' }, { status: 404 })
    }
    const run = runRow as PaymentRun

    // Allow export from 'approved' AND 're-export' from 'exported'
    if (run.status !== 'approved' && run.status !== 'exported') {
      return NextResponse.json(
        { error: 'Only approved runs can be exported', code: 'invalid_status' },
        { status: 422 }
      )
    }

    // 5. Load contained orders
    const { data: orderRows, error: ordersError } = await supabase
      .from('payment_orders')
      .select('*')
      .eq('payment_run_id', id)
      .order('created_at', { ascending: true })

    if (ordersError) {
      console.error('Error loading orders for export:', ordersError)
      return NextResponse.json({ error: 'Failed to load orders' }, { status: 500 })
    }
    const orders = (orderRows ?? []) as PaymentOrder[]

    if (orders.length === 0) {
      return NextResponse.json(
        { error: 'Payment run contains no orders', code: 'empty_run' },
        { status: 422 }
      )
    }

    // 6. Load debtor settings
    const debtor = await loadDebtorSettings(supabase)
    if (!isDebtorConfigured(debtor)) {
      return NextResponse.json(
        {
          error: 'Debtor settings are incomplete. Please configure them first.',
          code: 'debtor_not_configured',
        },
        { status: 400 }
      )
    }

    // 7. Generate + validate XML
    const result = generatePain001Xml({ run, orders, debtor, version: painVersion })
    if (!result.success || !result.xml || !result.message_id || !result.filename) {
      return NextResponse.json(
        { error: 'XML validation failed', code: 'validation_failed', errors: result.errors ?? [] },
        { status: 422 }
      )
    }

    // 8. Persist export row
    const { data: exportRow, error: insertError } = await supabase
      .from('payment_run_exports')
      .insert({
        payment_run_id: id,
        exported_by: user.userId,
        pain_version: painVersion,
        filename: result.filename,
        message_id: result.message_id,
        xml_content: result.xml,
      })
      .select('id, exported_at, filename, message_id, pain_version')
      .single()

    if (insertError || !exportRow) {
      console.error('Error persisting export:', insertError)
      return NextResponse.json({ error: 'Failed to persist export' }, { status: 500 })
    }

    // 9. If this was the first export, switch run status to 'exported' and cascade orders
    if (run.status === 'approved') {
      const { error: updateRunError } = await supabase
        .from('payment_runs')
        .update({
          status: 'exported',
          version: run.version + 1,
        })
        .eq('id', id)
        .eq('version', run.version)

      if (updateRunError) {
        console.error('Error updating run status to exported:', updateRunError)
        // Non-fatal: the export row is persisted. Subsequent calls will still work.
      } else {
        // Cascade: update contained payment_orders to 'exported'
        const { error: ordersUpdateError } = await supabase
          .from('payment_orders')
          .update({ status: 'exported', updated_by: user.userId })
          .eq('payment_run_id', id)
          .eq('status', 'approved')
        if (ordersUpdateError) {
          console.error('Error cascading exported status to orders:', ordersUpdateError)
        }

        // Audit event
        await supabase.from('payment_run_events').insert({
          payment_run_id: id,
          event_type: 'exported',
          actor_id: user.userId,
          payload: {
            pain_version: painVersion,
            filename: result.filename,
            message_id: result.message_id,
            export_id: exportRow.id,
          },
        })
      }
    } else {
      // Re-export: still log in audit trail
      await supabase.from('payment_run_events').insert({
        payment_run_id: id,
        event_type: 'exported',
        actor_id: user.userId,
        payload: {
          pain_version: painVersion,
          filename: result.filename,
          message_id: result.message_id,
          export_id: exportRow.id,
          re_export: true,
        },
      })
    }

    // 10. Stream XML as a download response
    return new NextResponse(result.xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Content-Disposition': `attachment; filename="${result.filename}"`,
        'X-Export-Id': exportRow.id,
        'X-Message-Id': result.message_id,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('Unexpected error in POST /api/payment-runs/[id]/export:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
