import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

// =============================================================
// PROJ-21: GET /api/payment-runs/[id]/exports/[exportId]
// Liefert die bereits generierte XML-Datei erneut zum Download
// (ohne Neugenerierung). Protokolliert den Re-Download im Audit-
// Trail.
// =============================================================

type RouteParams = { params: Promise<{ id: string; exportId: string }> }

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id, exportId } = await params

    const ip = getClientIp(request)
    const rl = checkRateLimit(`payment-runs:re-download:${ip}`, {
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

    const roleResult = await requireRole('admin')
    if (roleResult.error) {
      return NextResponse.json(
        { error: roleResult.error.error },
        { status: roleResult.error.status }
      )
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('payment_run_exports')
      .select('id, payment_run_id, pain_version, filename, message_id, xml_content')
      .eq('id', exportId)
      .eq('payment_run_id', id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Export not found' }, { status: 404 })
    }

    return new NextResponse(data.xml_content, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Content-Disposition': `attachment; filename="${data.filename}"`,
        'X-Export-Id': data.id,
        'X-Message-Id': data.message_id,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('Unexpected error in GET /api/payment-runs/[id]/exports/[exportId]:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
