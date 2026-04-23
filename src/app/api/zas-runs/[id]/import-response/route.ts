import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import {
  parseZasResponseXml,
  ZasResponseParseError,
  ZasResponseNotImplementedError,
} from '@/lib/zas-response-parser'

// =============================================================
// PROJ-23: POST /api/zas-runs/[id]/import-response
//
// Nimmt eine ZAS-Antwortdatei (eCH-0086 Response) entgegen,
// extrahiert alle Todesfälle und legt sie in
// zas_life_verification_deaths an. Lauf-Status wird auf
// 'response_imported' gesetzt.
//
// Eingabe:  multipart/form-data, Feld "file" (.xml, max 10 MB)
// Ausgabe:  { run, deaths, warnings, total_compared, imported_count }
//
// Sicherheit: requireRole('admin'), Rate-Limit 20/h pro IP.
// =============================================================

type RouteParams = { params: Promise<{ id: string }> }

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024 // 10 MB

const UploadMetadataSchema = z.object({
  filename: z.string().min(1).max(512),
  size: z.number().int().nonnegative().max(MAX_UPLOAD_BYTES, 'File exceeds 10 MB'),
  mimeType: z.string().max(200),
})

interface RunRow {
  id: string
  status: string
}

interface InsuredPersonLookup {
  id: string
  ahv_number: string
  status: string | null
}

interface DeathInsertRow {
  run_id: string
  insured_person_id: string | null
  ahv_number: string
  first_name: string | null
  last_name: string | null
  date_of_death: string | null
  status: 'open' | 'already_known'
}

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
  // Manche Browser liefern application/octet-stream — wir
  // akzeptieren das, wenn der Dateiname auf .xml endet.
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
    const user = roleResult.data

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

    // 3. Existenz und Status des Laufs prüfen
    const supabase = await createClient()
    const { data: run, error: runError } = await supabase
      .from('zas_life_verification_runs')
      .select('id, status')
      .eq('id', id)
      .maybeSingle<RunRow>()

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

    // 4. XML-Inhalt einlesen (max 10 MB — oben bereits geprüft)
    const xmlText = await file.text()

    // 5. Parser aufrufen
    let parsed: ReturnType<typeof parseZasResponseXml>
    try {
      parsed = parseZasResponseXml(xmlText)
    } catch (err) {
      // Marker aus der Stub-Phase — sollte nicht mehr auftreten,
      // wir behandeln es trotzdem sauber.
      if (err instanceof ZasResponseNotImplementedError) {
        return NextResponse.json(
          {
            error: 'not_implemented',
            message: 'eCH-0086 response parser is not implemented yet.',
          },
          { status: 501 }
        )
      }
      const message =
        err instanceof ZasResponseParseError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to parse response'
      console.error('Error parsing ZAS response:', err)
      return NextResponse.json(
        { error: 'parse_failed', message },
        { status: 422 }
      )
    }

    // 6. Lookup insured_persons für die gemeldeten AHV-Nummern.
    //    Wir brauchen die UUID für insured_person_id und den
    //    aktuellen Status (deceased => already_known).
    const ahvNumbers = parsed.deaths.map((d) => d.ahv_number)
    let lookupByAhv = new Map<string, InsuredPersonLookup>()

    if (ahvNumbers.length > 0) {
      const { data: persons, error: personsError } = await supabase
        .from('insured_persons')
        .select('id, ahv_number, status')
        .in('ahv_number', ahvNumbers)
        .returns<InsuredPersonLookup[]>()

      if (personsError) {
        console.error('Error looking up insured persons:', personsError)
        return NextResponse.json(
          { error: 'Failed to lookup persons' },
          { status: 500 }
        )
      }

      lookupByAhv = new Map(
        (persons ?? []).map((p) => [p.ahv_number, p])
      )
    }

    // 7. Death-Rows zusammensetzen. AHV-Nrn., die nicht im System
    //    sind, kommen mit insured_person_id = null in die Tabelle
    //    und triggern eine Warnung.
    const deathRows: DeathInsertRow[] = []
    const enrichedWarnings = [...parsed.warnings]

    for (const d of parsed.deaths) {
      const match = lookupByAhv.get(d.ahv_number)
      if (!match) {
        enrichedWarnings.push({
          code: 'unknown_ahv_in_system',
          message:
            'AHV number not found in insured_persons — death record stored without link',
          ahv_number: d.ahv_number,
        })
      }

      // already_known: Person ist im System bereits als verstorben
      // markiert. Da insured_persons aktuell keine date_of_death-
      // Spalte hat, nutzen wir status='deceased' als Indikator.
      // TODO(zas): wenn eine date_of_death-Spalte hinzukommt, hier
      //            zusätzlich auf NULL prüfen.
      const alreadyKnown = match?.status === 'deceased'

      deathRows.push({
        run_id: id,
        insured_person_id: match?.id ?? null,
        ahv_number: d.ahv_number,
        first_name: d.first_name,
        last_name: d.last_name,
        date_of_death: d.date_of_death,
        status: alreadyKnown ? 'already_known' : 'open',
      })
    }

    // 8. Bulk-Insert. Bei 0 Todesfällen überspringen wir den
    //    Insert; Lauf-Status wird trotzdem aktualisiert (war
    //    eine valide Response ohne Todesfälle).
    let insertedDeaths: unknown[] = []
    if (deathRows.length > 0) {
      const { data, error: insertError } = await supabase
        .from('zas_life_verification_deaths')
        .insert(deathRows)
        .select()

      if (insertError) {
        console.error('Error inserting zas deaths:', insertError)
        return NextResponse.json(
          { error: 'Failed to store deaths', message: insertError.message },
          { status: 500 }
        )
      }
      insertedDeaths = data ?? []
    }

    // 9. Lauf-Status aktualisieren
    const importedAt = new Date().toISOString()
    const { data: updatedRun, error: updateError } = await supabase
      .from('zas_life_verification_runs')
      .update({
        status: 'response_imported',
        response_imported_at: importedAt,
        response_imported_by: user.userId,
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError || !updatedRun) {
      console.error('Error updating run status:', updateError)
      return NextResponse.json(
        { error: 'Failed to update run status' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        run: updatedRun,
        deaths: insertedDeaths,
        warnings: enrichedWarnings,
        total_compared: parsed.total_compared,
        imported_count: insertedDeaths.length,
        positive_response: parsed.positive_response,
      },
      { status: 200 }
    )
  } catch (err) {
    console.error('Unexpected error in POST /api/zas-runs/[id]/import-response:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
