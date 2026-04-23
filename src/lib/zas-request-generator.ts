// =============================================================
// PROJ-23: ZAS Lebensnachweis — Anfragedatei-Generator (eCH-0086 V2)
//
// Erzeugt eine eCH-0086-konforme XML-Anfrage zur UPI-Vergleichs-
// abfrage. Der Anfrage-Body enthält pro aktiven Rentner einen
// dataToCompare-Block mit der 13-stelligen AHV-Nummer.
//
// Lebensnachweis-Trick:
//   Wir setzen comparedMissingElement = DATE_OF_DEATH, damit die
//   UPI in der Response bei verstorbenen Personen das Sterbedatum
//   mitliefert (sonst würde nur "differentData" ohne Detail kommen).
//
// Sedex-Umschlag (eCH-0090) wird hier NICHT erzeugt. Auf Vercel/
// Serverless gibt es keine Sedex-Outbox; der Sedex-Client beim
// Kunden generiert den Umschlag beim manuellen Upload selbst —
// analog zu PROJ-21 (pain.001).
//
// Quellen / Schemas (Stand 2023-05-23):
//   docs/ech-schemas/schemas/schema-UPI_20230523/eCH-0086/2/eCH-0086-2-0.xsd
//   docs/ech-schemas/schemas/schema-UPI_20230523/eCH-0058/5/eCH-0058-5-0.xsd
//   docs/ech-schemas/schemas/schema-UPI_20230523/eCH-0044/4/eCH-0044-4-1.xsd
//
// Implementierung: String-basiert, analog zu src/lib/pain001-generator.ts.
// Keine zusätzliche XML-Bibliothek nötig.
// =============================================================

// ---------------------------------------------------------------
// Defaults / Konstanten
// ---------------------------------------------------------------

/** Sedex-Message-Type für eCH-0086 UPI Compare (laut UPI-Handbuch V3.2D). */
const SEDEX_MESSAGE_TYPE = '86'

/** Test-Sender-ID (T-Präfix) — sicherer Fallback in Dev/Preview. */
const DEFAULT_TEST_SENDER_ID = 'sedex://T4-613196-9'

/** Test-Empfänger-ID (T-Präfix) — sicherer Fallback in Dev/Preview. */
const DEFAULT_TEST_RECIPIENT_ID = 'sedex://T3-CH-24'

/** Maximale Paketgrösse pro Lauf (UPI-Handbuch V3.2D, Abschnitt 5.1.3). */
export const ZAS_MAX_PENSIONERS_PER_RUN = 100_000

/** AHV-Nummer-Format laut eCH-0044 vnType (13-stellig, 7560xxxxxxxxx). */
const AHV_NUMBER_REGEX = /^756\d{10}$/

// ---------------------------------------------------------------
// Public Types
// ---------------------------------------------------------------

export interface ZasRequestPensioner {
  /** 13-stellige AHV-Nr. ohne Punkte (z.B. "7560000000002"). */
  ahv_number: string
  // Die folgenden Felder sind optional und werden im aktuellen
  // Request-Format nicht verwendet — wir behalten sie aber, damit
  // bestehende Aufrufer (POST /api/zas-runs) ohne Anpassung weiter
  // funktionieren und Daten für mögliche zukünftige Erweiterungen
  // (z.B. localPersonId-Mitsendung) verfügbar sind.
  first_name?: string
  last_name?: string
  date_of_birth?: string
}

export interface ZasRequestInput {
  runId: string
  pensioners: ZasRequestPensioner[]
  /** Optional override; sonst SEDEX_SENDER_ID env oder Test-Default. */
  sedexSenderId?: string
  /** Optional override; sonst ZAS_RECIPIENT_ID env oder Test-Default. */
  zasRecipientId?: string
  /** Override für deterministische Tests. */
  now?: Date
}

export interface ZasRequestResult {
  xml: string
  filename: string
  /** Eindeutige messageId (im Header verwendet). */
  messageId: string
  /** True, wenn die Test-IDs (T-Präfix) verwendet wurden. */
  isTestDelivery: boolean
}

/**
 * Marker-Fehler, behalten aus Stub-Phase. Wird vom aktuellen
 * Generator NICHT mehr geworfen, bleibt aber exportiert, damit
 * Caller die alte Branch-Logik nicht sofort entfernen müssen.
 */
export class ZasRequestNotImplementedError extends Error {
  constructor(message = 'ZAS eCH-0086 request generator is not implemented yet') {
    super(message)
    this.name = 'ZasRequestNotImplementedError'
  }
}

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Resolved sender/recipient IDs:
 *   1. Explicit override (function arg)
 *   2. Environment variable
 *   3. Test default (sicherer Fallback)
 */
function resolveSenderId(override?: string): string {
  return override ?? process.env.SEDEX_SENDER_ID ?? DEFAULT_TEST_SENDER_ID
}

function resolveRecipientId(override?: string): string {
  return override ?? process.env.ZAS_RECIPIENT_ID ?? DEFAULT_TEST_RECIPIENT_ID
}

/**
 * Eine Sedex-Teilnehmer-ID gilt als Test-Adresse, wenn der lokale
 * Teil mit "T" beginnt (Konvention "sedex://T4-..." vs "sedex://4-...").
 */
function isTestParticipantId(id: string): boolean {
  const stripped = id.replace(/^sedex:\/\//i, '')
  return /^T\d/i.test(stripped)
}

/**
 * Erzeugt eine eindeutige messageId. eCH-0058 erlaubt bis zu 36
 * Zeichen (token). Wir nehmen die runId ohne Bindestriche
 * (32 Zeichen, UUID-Hex) — das ist eindeutig und reproduzierbar.
 */
function buildMessageId(runId: string): string {
  const compact = runId.replace(/-/g, '').slice(0, 32)
  if (compact.length >= 8) return compact
  // Fallback für nicht-UUID Run-IDs
  return `peka-${Date.now().toString(36)}`.slice(0, 36)
}

function formatDateTime(date: Date): string {
  // eCH-0058 messageDateType = xs:dateTime. Wir senden UTC mit
  // Sekunden-Genauigkeit, ohne Millisekunden — das wird von ZAS
  // gemäss Beispielen in den Schemas akzeptiert.
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z')
}

function formatDatePart(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/**
 * Validiert Inputs vor der XML-Generierung. Wirft strukturierte
 * Fehler — bewusst keine "errors[]"-Sammlung wie bei pain.001:
 * Bei einem ZAS-Lauf ist jeder fehlerhafte Datensatz ein harter
 * Stopp (es geht um Personenidentifikation gegenüber dem Bund).
 */
function validateInputs(input: ZasRequestInput): void {
  if (!input.runId || typeof input.runId !== 'string') {
    throw new Error('ZAS request: runId is required')
  }
  if (!Array.isArray(input.pensioners) || input.pensioners.length === 0) {
    throw new Error('ZAS request: at least one pensioner is required')
  }
  if (input.pensioners.length > ZAS_MAX_PENSIONERS_PER_RUN) {
    throw new Error(
      `ZAS request: too many pensioners (${input.pensioners.length}). ` +
        `Max ${ZAS_MAX_PENSIONERS_PER_RUN} per run (UPI-Handbuch V3.2D).`
    )
  }

  // AHV-Nr. validieren — 13-stellig, beginnt mit 756.
  for (let i = 0; i < input.pensioners.length; i++) {
    const ahv = input.pensioners[i]?.ahv_number
    if (typeof ahv !== 'string') {
      throw new Error(`ZAS request: pensioner[${i}] missing ahv_number`)
    }
    const normalized = ahv.replace(/\./g, '').trim()
    if (!AHV_NUMBER_REGEX.test(normalized)) {
      throw new Error(
        `ZAS request: pensioner[${i}] has invalid AHV number "${ahv}" ` +
          `(expected 13 digits starting with 756)`
      )
    }
  }
}

function normalizeAhv(ahv: string): string {
  return ahv.replace(/\./g, '').trim()
}

// ---------------------------------------------------------------
// XML-Generierung
// ---------------------------------------------------------------

function buildXml(
  pensioners: ZasRequestPensioner[],
  options: {
    senderId: string
    recipientId: string
    messageId: string
    messageDate: string
    isTestDelivery: boolean
  }
): string {
  const { senderId, recipientId, messageId, messageDate, isTestDelivery } = options

  const lines: string[] = []
  lines.push('<?xml version="1.0" encoding="UTF-8"?>')
  lines.push(
    '<eCH-0086:request xmlns:eCH-0086="http://www.ech.ch/xmlns/eCH-0086/2"' +
      ' xmlns:eCH-0058="http://www.ech.ch/xmlns/eCH-0058/5"' +
      ' xmlns:eCH-0044="http://www.ech.ch/xmlns/eCH-0044/4"' +
      ' xmlns:eCH-0011="http://www.ech.ch/xmlns/eCH-0011/8"' +
      ' minorVersion="0">'
  )

  // ----- Header (eCH-0058) -----
  // Reihenfolge der Elemente entspricht der headerType-Definition
  // im eCH-0058-5-0.xsd (Sequence ist strikt).
  lines.push('  <eCH-0058:header>')
  lines.push(`    <eCH-0058:senderId>${xmlEscape(senderId)}</eCH-0058:senderId>`)
  lines.push(`    <eCH-0058:recipientId>${xmlEscape(recipientId)}</eCH-0058:recipientId>`)
  lines.push(`    <eCH-0058:messageId>${xmlEscape(messageId)}</eCH-0058:messageId>`)
  lines.push(`    <eCH-0058:messageType>${SEDEX_MESSAGE_TYPE}</eCH-0058:messageType>`)
  lines.push('    <eCH-0058:sendingApplication>')
  lines.push('      <eCH-0058:manufacturer>peka.next</eCH-0058:manufacturer>')
  lines.push('      <eCH-0058:product>peka.next</eCH-0058:product>')
  lines.push('      <eCH-0058:productVersion>1.0</eCH-0058:productVersion>')
  lines.push('    </eCH-0058:sendingApplication>')
  lines.push(`    <eCH-0058:messageDate>${messageDate}</eCH-0058:messageDate>`)
  // action=1 = "neue Meldung" (Standardwert für eine Anfrage).
  lines.push('    <eCH-0058:action>1</eCH-0058:action>')
  lines.push(
    `    <eCH-0058:testDeliveryFlag>${isTestDelivery ? 'true' : 'false'}</eCH-0058:testDeliveryFlag>`
  )
  lines.push('  </eCH-0058:header>')

  // ----- Content (eCH-0086) -----
  lines.push('  <eCH-0086:content>')
  // responseLanguage = de (eCH-0011 languageType, max 2 chars).
  lines.push('    <eCH-0086:responseLanguage>de</eCH-0086:responseLanguage>')
  // Lebensnachweis-Trick: wir wollen das Sterbedatum mitgeliefert
  // bekommen, falls die Person verstorben ist.
  lines.push(
    '    <eCH-0086:comparedMissingElement>DATE_OF_DEATH</eCH-0086:comparedMissingElement>'
  )

  // Pro Rentner ein dataToCompare-Block. Die ID läuft fortlaufend
  // ab 1 (XSD: unsignedInt, max 100'000'000).
  for (let i = 0; i < pensioners.length; i++) {
    const ahv = normalizeAhv(pensioners[i]!.ahv_number)
    const id = i + 1
    lines.push('    <eCH-0086:dataToCompare>')
    lines.push(`      <eCH-0086:dataToCompareId>${id}</eCH-0086:dataToCompareId>`)
    lines.push(`      <eCH-0086:vn>${ahv}</eCH-0086:vn>`)
    lines.push('    </eCH-0086:dataToCompare>')
  }

  lines.push('  </eCH-0086:content>')
  lines.push('</eCH-0086:request>')

  return lines.join('\n')
}

function buildFilename(runId: string, now: Date): string {
  const datePart = formatDatePart(now)
  const shortId = runId.slice(0, 8)
  return `zas-lebensnachweis_${datePart}_${shortId}.xml`
}

// ---------------------------------------------------------------
// Hauptfunktion
// ---------------------------------------------------------------

/**
 * Erzeugt das eCH-0086-Anfrage-XML inklusive eCH-0058-Header.
 *
 * @throws Error bei ungültigen Eingaben (siehe validateInputs).
 */
export function generateZasRequestXml(input: ZasRequestInput): ZasRequestResult {
  validateInputs(input)

  const now = input.now ?? new Date()
  const senderId = resolveSenderId(input.sedexSenderId)
  const recipientId = resolveRecipientId(input.zasRecipientId)
  const isTestDelivery = isTestParticipantId(senderId) || isTestParticipantId(recipientId)
  const messageId = buildMessageId(input.runId)

  const xml = buildXml(input.pensioners, {
    senderId,
    recipientId,
    messageId,
    messageDate: formatDateTime(now),
    isTestDelivery,
  })

  return {
    xml,
    filename: buildFilename(input.runId, now),
    messageId,
    isTestDelivery,
  }
}
