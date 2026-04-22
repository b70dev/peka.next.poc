import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { generateZasRequestXml, type ZasRequestPensioner } from '@/lib/zas-request-generator'

// =============================================================
// PROJ-23: /api/zas-runs
//   GET  — Alle ZAS-Lebensnachweis-Läufe auflisten (viewer+)
//   POST — Neuen Lauf starten + (Stub) Anfragedatei erzeugen
//
// Voraussetzungen:
//   * Authentifizierung: aktive Session
//   * GET: mindestens Rolle viewer
//   * POST: mindestens Rolle admin
// =============================================================

// ---------- Typen für die Join-Queries ----------

interface PensionAccountRow {
  id: string
  is_active: boolean
  account_type: { code: string | null } | null
  employment: {
    insured_person_id: string
    insured_person: {
      id: string
      first_name: string
      last_name: string
      ahv_number: string
      date_of_birth: string
      status: string | null
    } | null
  } | null
}

function isPensionAccountCode(code: string | null | undefined): boolean {
  if (!code) return false
  const upper = code.toUpperCase()
  return upper.startsWith('RENT') || upper === 'PENSION' || upper === 'PENS'
}

// =============================================================
// GET /api/zas-runs
// =============================================================
export async function GET(request: Request) {
  try {
    const ip = getClientIp(request)
    const rl = checkRateLimit(`zas-runs:list:${ip}`, {
      limit: 120,
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

    const roleResult = await requireRole('viewer')
    if (roleResult.error) {
      return NextResponse.json(
        { error: roleResult.error.error },
        { status: roleResult.error.status }
      )
    }

    const supabase = await createClient()

    const { data: runs, error } = await supabase
      .from('zas_life_verification_runs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500)

    if (error) {
      console.error('Error loading zas runs:', error)
      return NextResponse.json({ error: 'Failed to load runs' }, { status: 500 })
    }

    return NextResponse.json({ runs: runs ?? [] })
  } catch (err) {
    console.error('Unexpected error in GET /api/zas-runs:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// =============================================================
// POST /api/zas-runs
// Legt einen neuen Lauf an. Der eigentliche eCH-0086-XML-
// Generator ist noch ein Stub; wir speichern den Lauf aber
// bereits mit einem Platzhalter-Dateinamen und dem gezählten
// Rentner-Bestand, sodass das Frontend (Liste + Detail) ohne
// Einschränkung arbeiten kann.
// =============================================================
export async function POST(request: Request) {
  try {
    const ip = getClientIp(request)
    const rl = checkRateLimit(`zas-runs:create:${ip}`, {
      limit: 10,
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

    const roleResult = await requireRole('admin')
    if (roleResult.error) {
      return NextResponse.json(
        { error: roleResult.error.error },
        { status: roleResult.error.status }
      )
    }
    const user = roleResult.data

    const supabase = await createClient()

    // 1. Aktive Rentner ermitteln: aktive Konten vom Typ "Rente"
    //    mit zugehöriger (nicht verstorbener) versicherter Person.
    const { data: rawAccounts, error: accountsError } = await supabase
      .from('accounts')
      .select(
        `id,
         is_active,
         account_type:account_types!inner(code),
         employment:employments!inner(
           insured_person_id,
           insured_person:insured_persons!inner(
             id, first_name, last_name, ahv_number, date_of_birth, status
           )
         )`
      )
      .eq('is_active', true)
      .returns<PensionAccountRow[]>()

    if (accountsError) {
      console.error('Error loading pension accounts for ZAS run:', accountsError)
      return NextResponse.json({ error: 'Failed to load pensioners' }, { status: 500 })
    }

    // 2. Nach Rente-Typ + nicht-deceased filtern und je Person
    //    deduplizieren (mehrere Rentenkonten pro Person möglich).
    const uniqueByPerson = new Map<string, ZasRequestPensioner>()
    for (const row of rawAccounts ?? []) {
      if (!isPensionAccountCode(row.account_type?.code)) continue
      const person = row.employment?.insured_person
      if (!person) continue
      if (person.status === 'deceased') continue
      if (uniqueByPerson.has(person.id)) continue

      uniqueByPerson.set(person.id, {
        ahv_number: person.ahv_number,
        first_name: person.first_name,
        last_name: person.last_name,
        date_of_birth: person.date_of_birth,
      })
    }

    const pensioners = Array.from(uniqueByPerson.values())

    if (pensioners.length === 0) {
      return NextResponse.json(
        { error: 'no_active_pensioners', message: 'No active pensioners found' },
        { status: 422 }
      )
    }

    // 3. Run-Datensatz anlegen (Status = request_created).
    //    request_filename und request_generated_at werden im
    //    selben Insert mit gesetzt, sobald wir die (Stub-)
    //    Datei generiert haben. Die eigentliche Datei wird
    //    bei Bedarf on-the-fly über den /download-Endpoint
    //    erzeugt — wir persistieren keinen XML-Blob.
    const now = new Date().toISOString()

    const { data: inserted, error: insertError } = await supabase
      .from('zas_life_verification_runs')
      .insert({
        status: 'request_created',
        pensioner_count: pensioners.length,
        request_generated_at: now,
        // request_filename wird direkt danach aktualisiert,
        // sobald der Generator die konkrete Dateinamen-
        // Konvention liefert (abhängig von der Run-ID).
        created_by: user.userId,
      })
      .select()
      .single()

    if (insertError || !inserted) {
      console.error('Error inserting zas run:', insertError)
      return NextResponse.json({ error: 'Failed to create run' }, { status: 500 })
    }

    // 4. Stub-Generator aufrufen (wirft aktuell nicht — liefert
    //    Platzhalter). Dateinamen persistieren, damit das
    //    Frontend eine konsistente Benennung anzeigen kann.
    // TODO(PROJ-23): Sobald das eCH-0086-XML echt generiert wird,
    // kann hier zusätzlich eine XSD-Validierung erfolgen.
    const { filename } = generateZasRequestXml({
      runId: inserted.id,
      pensioners,
    })

    const { data: updated, error: updateError } = await supabase
      .from('zas_life_verification_runs')
      .update({ request_filename: filename })
      .eq('id', inserted.id)
      .select()
      .single()

    if (updateError || !updated) {
      console.error('Error setting zas request filename:', updateError)
      // Nicht fatal — der Run ist angelegt. Wir geben den ursprünglichen Datensatz zurück.
      return NextResponse.json(inserted, { status: 201 })
    }

    return NextResponse.json(updated, { status: 201 })
  } catch (err) {
    console.error('Unexpected error in POST /api/zas-runs:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
