import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

// =============================================================
// PROJ-23: GET /api/zas-runs/[id]/download — STUB (HTTP 501)
//
// Der eCH-0086-XML-Generator ist noch nicht implementiert
// (Stub: src/lib/zas-request-generator.ts). Diese Route antwortet
// deshalb absichtlich mit 501 Not Implemented, liefert aber
// bereits den korrekten Dateinamen, damit das Frontend die
// Fehlermeldung kontextualisieren kann.
//
// Sobald der Generator steht:
//  1. Aktive Rentner laden (wie in POST /api/zas-runs)
//  2. generateZasRequestXml() aufrufen
//  3. xsd-Validierung durchführen
//  4. XML als Download streamen (Content-Disposition: attachment)
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
      .select('id, request_filename, status')
      .eq('id', id)
      .maybeSingle()

    if (runError) {
      console.error('Error loading zas run for download:', runError)
      return NextResponse.json({ error: 'Failed to load run' }, { status: 500 })
    }
    if (!run) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 })
    }

    // Fallback-Dateiname, falls der Run-Datensatz aus Alt-Zeiten
    // ohne gesetzten request_filename existiert.
    const filename =
      run.request_filename && typeof run.request_filename === 'string'
        ? run.request_filename
        : `zas-lebensnachweis_${id.slice(0, 8)}.xml`

    return NextResponse.json(
      {
        error: 'not_implemented',
        message:
          'eCH-0086 XML-Generator steht aus, siehe feature spec (features/PROJ-23-zas-lebensnachweis.md). ' +
          'Blocked on Sedex certificate, UPI contract and official XSD files.',
        filename,
      },
      { status: 501 }
    )
  } catch (err) {
    console.error('Unexpected error in GET /api/zas-runs/[id]/download:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
