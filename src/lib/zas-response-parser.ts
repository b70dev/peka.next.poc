// =============================================================
// PROJ-23: ZAS Lebensnachweis — Rückmeldung-Parser (STUB)
//
// STUB — blocked on external deliverables:
//   * Offizielle eCH-0086 Response-XSD
//   * eCH-0090-V2 Sedex-Envelope-Schema
//   * Beispiel-Antworten aus ZAS-Test-Endpoint (abn/integration)
//   * UPI-Interface-Spezifikation V1.10D
//
// Siehe features/PROJ-23-zas-lebensnachweis.md → Abschnitt
// "Offene externe Abklärungen (vor /backend notwendig)".
//
// Solange die externen Deliverables nicht vorliegen, wirft diese
// Funktion gezielt eine ZasResponseNotImplementedError, damit die
// API-Route /api/zas-runs/[id]/import-response mit HTTP 501
// antworten kann und klar kommuniziert, dass die Verarbeitung
// noch aussteht.
//
// Sobald das Response-Schema verfügbar ist, wird hier ein echter
// eCH-0086-Response-Parser implementiert (Mapping AHV-Nr. →
// Status → Sterbedatum → insured_person_id-Lookup).
// =============================================================

export interface ZasParsedDeath {
  /** 13-stellige AHV-Nr. ohne Punkte */
  ahv_number: string
  last_name: string | null
  first_name: string | null
  date_of_death: string | null
}

export interface ZasParsedWarning {
  /** Kategorie der Warnung, z.B. 'unknown_ahv' | 'invalid_date' */
  code: string
  message: string
  ahv_number?: string
}

export interface ZasResponseParseResult {
  deaths: ZasParsedDeath[]
  warnings: ZasParsedWarning[]
}

/**
 * Fehler-Typ, den die API-Route abfangen und in 501 übersetzen
 * kann. Wir nutzen eine eigene Klasse, damit die Route nicht auf
 * Error-Message-Strings angewiesen ist.
 */
export class ZasResponseNotImplementedError extends Error {
  constructor(message = 'ZAS eCH-0086 response parser is not implemented yet') {
    super(message)
    this.name = 'ZasResponseNotImplementedError'
  }
}

/**
 * Platzhalter — wirft aktuell immer eine ZasResponseNotImplementedError.
 *
 * TODO: Bei Bereitstellung der offiziellen Schemas:
 *   1. eCH-0090-V2-Sedex-Envelope entpacken
 *   2. eCH-0086-Response-Body parsen
 *   3. Je Person Status und ggf. date_of_death extrahieren
 *   4. AHV-Nummer normalisieren (Punkte entfernen, 13-stellig)
 *   5. Warnungen sammeln (ungültige Daten, unbekannte Felder)
 *   6. Eingabegröße limitieren (max 10 MB wird bereits in der
 *      Route geprüft) und XSD-Validierung aktivieren.
 */
export function parseZasResponseXml(_xml: string): ZasResponseParseResult {
  throw new ZasResponseNotImplementedError()
}
