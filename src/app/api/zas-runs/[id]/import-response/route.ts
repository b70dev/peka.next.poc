import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import {
  parseZasResponseXml,
  ZasResponseNotImplementedError,
} from '@/lib/zas-response-parser'

// =============================================================
// PROJ-23: POST /api/zas-runs/[id]/import-response — STUB (HTTP 501)
//
// Nimmt den Datei-Upload entgegen und validiert ihn strukturell
// (multipart form, XML, max. 10 MB). Die eigentliche
// eCH-0086-Response-Parser-Implementierung steht noch aus
// (Stub: src/lib/zas-response-parser.ts) — diese Route liefert
// deshalb ein 501 Not Implemented mit klarer Fehlermeldung.
//
// Sobald der Parser steht:
//   1. Response-XML validieren (XSD)
//   2. Todesfälle extrahieren + per AHV-Nr. gegen
//      insured_persons matchen
//   3. zas_life_verification_deaths-Rows anlegen
//   4. Lauf-Status auf 'response_imported' setzen
//   5. Importierenden Admin + Timestamp speichern
//   6. JSON-Zusammenfassung zurückgeben
// =============================================================

type RouteParams = { params: Promise<{ id: string }> }

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024 // 10 MB

// Zod-Schema für die entpackten Formularfelder. Das eigentliche
// File-Handling passiert aus FormData (Web Streams API).
const UploadMetadataSchema = z.object({
  filename: z.string().min(1).max(512),
  size: z.number().int().nonnegative().max(MAX_UPLOAD_BYTES, 'File exceeds 10 MB'),
  mimeType: z.string().max(200),
})

function isLikelyXmlMime(mime: string, filename: string): boolean {
  const lowered = mime.toLowerCase()
  if (
    lowered === 'application/xml' ||
    lowered === 'text/xml' ||
    lowered.startsWith('application/xml;') ||
    lowered.startsWith('text/xml;')
  ) {
    return true
  }
  // Manche Browser liefern application/octet-stream für .xml —
  // wir akzeptieren das, wenn der Dateiname auf .xml endet.
  return filename.toLowerCase().endsWith('.xml')
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params

    const ip = getClientIp(request)
    const rl = checkRateLimit(`zas-runs:import:${ip}`, {
      limit: 20,
      windowMs: 60 * 60 * 1000,
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

    const roleResult = await requireRole('admin')
    if (roleResult.error) {
      return NextResponse.json(
        { error: roleResult.error.error },
        { status: roleResult.error.status }
      )
    }

    // 1. FormData-Upload entpacken
    let formData: FormData
    try {
      formData = await request.formData()
    } catch (err) {
      console.error('Failed to parse multipart form-data:', err)
      return NextResponse.json(
        { error: 'Invalid multipart form-data' },
        { status: 400 }
      )
    }

    const file = formData.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: 'Missing "file" field in form-data' },
        { status: 400 }
      )
    }

    // 2. Metadaten validieren (Grösse + MIME)
    const metaCheck = UploadMetadataSchema.safeParse({
      filename: file.name,
      size: file.size,
      mimeType: file.type,
    })
    if (!metaCheck.success) {
      return NextResponse.json(
        { error: metaCheck.error.issues[0]?.message ?? 'Invalid file metadata' },
        { status: 400 }
      )
    }

    if (!isLikelyXmlMime(file.type, file.name)) {
      return NextResponse.json(
        { error: 'Only XML files are accepted' },
        { status: 400 }
      )
    }

    // 3. Existenz des Laufs prüfen — wir wollen keinen Upload
    //    für nicht vorhandene Runs akzeptieren.
    const supabase = await createClient()
    const { data: run, error: runError } = await supabase
      .from('zas_life_verification_runs')
      .select('id, status')
      .eq('id', id)
      .maybeSingle()

    if (runError) {
      console.error('Error loading run for import:', runError)
      return NextResponse.json({ error: 'Failed to load run' }, { status: 500 })
    }
    if (!run) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 })
    }

    if (run.status !== 'request_created') {
      return NextResponse.json(
        {
          error: 'invalid_status',
          message: 'Response can only be imported for runs in status request_created',
        },
        { status: 422 }
      )
    }

    // 4. Datei einlesen (max. 10 MB — oben bereits geprüft)
    const xmlText = await file.text()

    // 5. Parser-Stub aufrufen — aktuell immer NotImplementedError
    try {
      parseZasResponseXml(xmlText)
    } catch (err) {
      if (err instanceof ZasResponseNotImplementedError) {
        return NextResponse.json(
          {
            error: 'not_implemented',
            message:
              'eCH-0086 response parser is not implemented yet. ' +
              'See features/PROJ-23-zas-lebensnachweis.md and src/lib/zas-response-parser.ts.',
          },
          { status: 501 }
        )
      }
      // Zukünftige echte Parse-Fehler:
      const message = err instanceof Error ? err.message : 'Failed to parse response'
      console.error('Error parsing ZAS response:', err)
      return NextResponse.json(
        { error: 'parse_failed', message },
        { status: 422 }
      )
    }

    // Sollte nach NotImplementedError nicht erreicht werden —
    // solange der Parser ein Stub ist. Wir geben dennoch einen
    // definierten Fallback zurück.
    return NextResponse.json(
      {
        error: 'not_implemented',
        message: 'Response import pipeline is incomplete.',
      },
      { status: 501 }
    )
  } catch (err) {
    console.error('Unexpected error in POST /api/zas-runs/[id]/import-response:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
