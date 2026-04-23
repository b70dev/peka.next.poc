import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

// =============================================================
// PROJ-23: GET /api/zas-runs/[id]/download
//
// Liefert das beim POST /api/zas-runs gespeicherte eCH-0086-
// Anfrage-XML als Datei-Download. Die Datei enthält AHV-Nummern
// aller aktiven Rentner — Zugriff ist daher auf admin/super_admin
// beschränkt.
//
// Wenn ein Lauf vor der Migration 20260423_add_zas_request_xml
// angelegt wurde, fehlt request_xml. In dem Fall geben wir 422
// zurück mit klarer Anweisung (neuen Lauf erstellen).
// =============================================================

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params

    const ip = getClientIp(request)
    const rl = checkRateLimit(`zas-runs:download:${ip}`, {
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

    const idCheck = z.string().uuid().safeParse(id)
    if (!idCheck.success) {
      return NextResponse.json({ error: 'Invalid run id' }, { status: 400 })
    }

    // Download ist eine admin-only Aktion (die Anfragedatei
    // enthält AHV-Nummern aller aktiven Rentner).
    const roleResult = await requireRole('admin')
    if (roleResult.error) {
      return NextResponse.json(
        { error: roleResult.error.error },
        { status: roleResult.error.status }
      )
    }

    const supabase = await createClient()
    const { data: run, error: runError } = await supabase
      .from('zas_life_verification_runs')
      .select('id, request_filename, request_xml, status')
      .eq('id', id)
      .maybeSingle<{
        id: string
        request_filename: string | null
        request_xml: string | null
        status: string
      }>()

    if (runError) {
      console.error('Error loading zas run for download:', runError)
      return NextResponse.json({ error: 'Failed to load run' }, { status: 500 })
    }
    if (!run) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 })
    }

    // Pre-Migration Run ohne persistiertes XML — wir können die
    // Datei nicht mehr deterministisch reproduzieren (die Rentner-
    // Liste hat sich evtl. geändert). Klare Fehlermeldung statt
    // möglicherweise inkorrekter Re-Generierung.
    if (!run.request_xml) {
      return NextResponse.json(
        {
          error: 'request_xml_missing',
          message:
            'Dieser Lauf wurde vor der Generator-Implementierung angelegt ' +
            'und hat keine gespeicherte Anfragedatei. Bitte einen neuen Lauf erstellen.',
        },
        { status: 422 }
      )
    }

    const filename =
      run.request_filename && typeof run.request_filename === 'string'
        ? run.request_filename
        : `zas-lebensnachweis_${id.slice(0, 8)}.xml`

    // Sanitize the filename for the Content-Disposition header
    // (entferne Anführungszeichen, die das Header-Parsing brechen).
    const safeFilename = filename.replace(/["\r\n]/g, '_')

    return new NextResponse(run.request_xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Content-Disposition': `attachment; filename="${safeFilename}"`,
        // Verhindere zwischenspeichern in geteilten Caches —
        // die Datei enthält sensible Daten.
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (err) {
    console.error('Unexpected error in GET /api/zas-runs/[id]/download:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
