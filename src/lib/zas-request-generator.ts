// =============================================================
// PROJ-23: ZAS Lebensnachweis — Anfragedatei-Generator (STUB)
//
// STUB — blocked on external deliverables:
//   * Sedex-Zertifikat (Produktion + Test)
//   * Sedex-Teilnehmer-ID (Bundeskanzlei)
//   * UPI-Vertrag mit ZAS
//   * Offizielle eCH-0086-XSD/WSDL-Dateien (Stand 2026-01-29)
//   * eCH-0090-V2 Sedex-Envelope-Schema
//   * UPI-Interface-Spezifikation V1.10D
//
// Siehe features/PROJ-23-zas-lebensnachweis.md → Abschnitt
// "Offene externe Abklärungen (vor /backend notwendig)".
//
// Solange die externen Deliverables nicht vorliegen, gibt diese
// Funktion ein Platzhalter-XML mit einem klaren TODO-Kommentar
// zurück. Die API-Route /api/zas-runs/[id]/download antwortet
// deshalb mit HTTP 501 und verweist auf diese Datei.
//
// Sobald die XSDs verfügbar sind, wird hier ein echter eCH-0086-
// Request generiert (vgl. src/lib/pain001-generator.ts als
// Referenz-Implementierung für ein analoges, XSD-validiertes
// XML-Format).
// =============================================================

export interface ZasRequestPensioner {
  /** 13-stellige AHV-Nr. ohne Punkte */
  ahv_number: string
  first_name: string
  last_name: string
  date_of_birth: string
}

export interface ZasRequestInput {
  runId: string
  pensioners: ZasRequestPensioner[]
}

export interface ZasRequestResult {
  xml: string
  filename: string
}

/**
 * Platzhalter — echte Implementierung folgt nach Lieferung der
 * offiziellen eCH-0086-Schemas und Sedex-Umschlag-Vorlagen.
 *
 * Wir werfen absichtlich keine Exception, damit die API-Route den
 * Run auch ohne echten XML-Generator anlegen kann (der Download
 * selbst schlägt mit 501 fehl — siehe route).
 */
export function generateZasRequestXml(input: ZasRequestInput): ZasRequestResult {
  const datePart = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  const shortId = input.runId.slice(0, 8)
  const filename = `zas-lebensnachweis_${datePart}_${shortId}.xml`

  // TODO: eCH-0086-Request (UPI Vergleichsabfrage) implementieren.
  // Sobald das Schema vorliegt, hier:
  //   1. eCH-0090-V2-Sedex-Envelope mit messageType <UPI-spezifisch>
  //   2. Body mit <MeldegruendePerson> / <Person>-Elementen je Rentner
  //   3. AHV-Nr., Name, Geburtsdatum je Person
  //   4. XSD-Validierung analog zu pain001/xsd-validator.ts
  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<!--\n` +
    `  STUB zas-request-generator.ts\n` +
    `  run_id: ${input.runId}\n` +
    `  pensioner_count: ${input.pensioners.length}\n` +
    `  generated_at: ${new Date().toISOString()}\n` +
    `  TODO: eCH-0086 request XML not implemented yet.\n` +
    `        Blocked on external deliverables — see feature spec.\n` +
    `-->\n` +
    `<zas-request-placeholder runId="${input.runId}" count="${input.pensioners.length}"/>\n`

  return { xml, filename }
}

/**
 * Marker-Fehler für API-Routen, damit ein Caller das 501-Verhalten
 * unterscheiden kann. Wird aktuell im Generator noch nicht geworfen
 * (der Generator liefert einen Platzhalter). Die Download-Route
 * wirft diesen Fehler selbst, solange die Implementierung fehlt.
 */
export class ZasRequestNotImplementedError extends Error {
  constructor(message = 'ZAS eCH-0086 request generator is not implemented yet') {
    super(message)
    this.name = 'ZasRequestNotImplementedError'
  }
}
