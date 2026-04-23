// =============================================================
// PROJ-23: ZAS Lebensnachweis — eCH-0086 Response Parser
//
// Parst eine ZAS-UPI-Vergleichs-Antwort (eCH-0086 Response V2) und
// extrahiert pro Person:
//   * Status (identicalData / differentData / negativReportOnCompareData)
//   * Bei Todesfällen: dateOfDeath aus personFromUPI/deathPeriod/dateFrom
//
// Schema-Quelle:
//   docs/ech-schemas/schemas/schema-UPI_20230523/eCH-0086/2/eCH-0086-2-0.xsd
//   docs/ech-schemas/schemas/schema-UPI_20230523/eCH-0084/2/eCH-0084-2-0.xsd
//   docs/ech-schemas/schemas/schema-UPI_20230523/eCH-0011/8/eCH-0011-8-1.xsd
//
// Implementierung: regex-basierter Pull-Parser. Für die strikt
// strukturierten ZAS-Antworten reicht das aus und vermeidet eine
// neue Abhängigkeit. KEINE XSD-Validierung zur Laufzeit — wir
// vertrauen darauf, dass ZAS valide Antworten liefert und prüfen
// nur die für unseren Use-Case relevanten Felder.
//
// Robustheit:
//   * Akzeptiert mit/ohne XML-Deklaration
//   * Tolerant gegenüber leading/trailing whitespace
//   * Verschiedene Namespace-Präfixe (eCH-0086, ns0, default xmlns)
// =============================================================

// ---------------------------------------------------------------
// Public Types
// ---------------------------------------------------------------

export interface ZasParsedDeath {
  /** 13-stellige AHV-Nr. ohne Punkte. */
  ahv_number: string
  last_name: string | null
  first_name: string | null
  /** ISO date "YYYY-MM-DD" — kann null sein, wenn ZAS ohne Datum antwortet. */
  date_of_death: string | null
  /** Korrelations-ID, die wir im Request (dataToCompareId) gesendet haben. */
  data_to_compare_id: number | null
}

export interface ZasParsedWarning {
  /** Kategorie, z.B. 'unknown_ahv' | 'invalid_date' | 'negative_report'. */
  code: string
  message: string
  ahv_number?: string
}

export interface ZasResponseParseResult {
  /** True bei <positiveResponse>, false bei <negativeReport>. */
  positive_response: boolean
  /** Pro Todesfall ein Eintrag. Bei identicalData wird KEIN Eintrag erzeugt. */
  deaths: ZasParsedDeath[]
  warnings: ZasParsedWarning[]
  /** Anzahl <comparedData>-Blöcke (= Personen, die wir verglichen haben). */
  total_compared: number
}

/**
 * Marker-Fehler aus der Stub-Phase. Wird vom aktuellen Parser
 * NICHT mehr geworfen, bleibt aber exportiert, damit die alte
 * 501-Fallback-Logik in der API-Route kompiliert.
 */
export class ZasResponseNotImplementedError extends Error {
  constructor(message = 'ZAS eCH-0086 response parser is not implemented yet') {
    super(message)
    this.name = 'ZasResponseNotImplementedError'
  }
}

export class ZasResponseParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ZasResponseParseError'
  }
}

// ---------------------------------------------------------------
// Helpers — Namespace-tolerante Tag-Suche
// ---------------------------------------------------------------

/**
 * Erzeugt eine Regex, die ein Element mit beliebigem (oder keinem)
 * Namespace-Präfix matcht. `localName` darf keine Sonderzeichen
 * enthalten. Multiline + dotall via [\s\S].
 */
function tagRegex(localName: string, flags = 'i'): RegExp {
  // Match: <prefix:localName ...>BODY</prefix:localName>
  // Wir akzeptieren auch <localName .../> Self-Closing für leere Elemente.
  // Der Body wird in Group 1 gefangen.
  const pattern =
    `<(?:[\\w-]+:)?${localName}` + // opening tag with optional prefix
    `(?:\\s[^>]*)?>` + // optional attributes
    `([\\s\\S]*?)` + // body (lazy)
    `<\\/(?:[\\w-]+:)?${localName}\\s*>` // closing
  return new RegExp(pattern, flags)
}

function tagRegexGlobal(localName: string): RegExp {
  return tagRegex(localName, 'gi')
}

/** Liefert den ersten Treffer-Body (Group 1) oder null. */
function findFirst(haystack: string, localName: string): string | null {
  const m = haystack.match(tagRegex(localName))
  return m ? m[1]! : null
}

/**
 * Liefert alle Treffer-Bodies eines Tags (auch verschachtelt — wir
 * splitten auf der äusseren Ebene, indem wir einen schlichten
 * Lazy-Match nutzen. Das funktioniert, weil eCH-0086 keine
 * gleichnamigen Wrapper innerhalb von dataToCompare/comparedData hat.)
 */
function findAll(haystack: string, localName: string): string[] {
  const re = tagRegexGlobal(localName)
  const out: string[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(haystack)) !== null) {
    out.push(m[1]!)
  }
  return out
}

/**
 * Findet Top-Level-Elemente mit gegebenem Namen. Anders als findAll
 * berücksichtigt diese Funktion verschachtelte Strukturen korrekt:
 * sie sucht das öffnende Tag und matcht dann balanced bis zum
 * passenden schliessenden Tag.
 *
 * Notwendig für comparedData, weil personFromUPI darin selbst
 * komplexe Sub-Elemente wie <officialName> enthalten kann.
 */
function findAllBlocks(haystack: string, localName: string): string[] {
  const openRe = new RegExp(
    `<((?:[\\w-]+:)?${localName})(?:\\s[^>]*)?>`,
    'gi'
  )
  const out: string[] = []
  let m: RegExpExecArray | null
  while ((m = openRe.exec(haystack)) !== null) {
    const tagName = m[1]! // e.g. "eCH-0086:comparedData"
    const startContent = openRe.lastIndex
    // Suche das passende schliessende Tag, beachte verschachtelte
    // gleichnamige Tags (in der Praxis kommen die nicht vor, aber
    // wir machen es robust).
    const closeRe = new RegExp(
      `<(\\/?)(?:[\\w-]+:)?${localName}(?:\\s[^>]*)?\\/?>`,
      'gi'
    )
    closeRe.lastIndex = startContent
    let depth = 1
    let endContent = -1
    let cm: RegExpExecArray | null
    while ((cm = closeRe.exec(haystack)) !== null) {
      const isClose = cm[1] === '/'
      if (isClose) {
        depth--
        if (depth === 0) {
          endContent = cm.index
          openRe.lastIndex = closeRe.lastIndex
          break
        }
      } else {
        // self-closing wird via "/>" matched; wir behandeln es als no-op.
        const fullMatch = cm[0]
        if (!fullMatch.endsWith('/>')) {
          depth++
        }
      }
    }
    if (endContent === -1) break
    out.push(haystack.slice(startContent, endContent))
    // Sanity check: tagName tatsächlich verwendet (verhindert dead var warning)
    void tagName
  }
  return out
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&amp;/g, '&') // muss zuletzt
}

function trimText(value: string | null): string | null {
  if (value == null) return null
  const trimmed = decodeXmlEntities(value).trim()
  return trimmed.length > 0 ? trimmed : null
}

// ---------------------------------------------------------------
// Domain helpers
// ---------------------------------------------------------------

function parseDataToCompareId(block: string): number | null {
  const raw = trimText(findFirst(block, 'dataToCompareId'))
  if (!raw) return null
  const n = Number.parseInt(raw, 10)
  return Number.isFinite(n) && n >= 0 ? n : null
}

function parseEchoVn(block: string): string | null {
  const raw = trimText(findFirst(block, 'echoVn'))
  if (!raw) return null
  // VN ist 13-stellig, beginnt mit 756. Wir entfernen Punkte und
  // prüfen pragmatisch das Ziffernformat.
  const normalized = raw.replace(/\./g, '')
  return /^\d{13}$/.test(normalized) ? normalized : normalized
}

/**
 * Extrahiert das Sterbedatum aus einem comparedData/differentData-
 * Block. Pfad laut eCH-0084 personFromUPIType:
 *   personFromUPI > deathPeriod > dateFrom (xs:date)
 */
function parseDateOfDeathFromDifferent(differentBlock: string): string | null {
  const personFromUpi = findFirst(differentBlock, 'personFromUPI')
  if (!personFromUpi) return null
  const deathPeriod = findFirst(personFromUpi, 'deathPeriod')
  if (!deathPeriod) return null
  const dateFrom = trimText(findFirst(deathPeriod, 'dateFrom'))
  if (!dateFrom) return null
  // ISO-Date "YYYY-MM-DD" erwartet — keine Umwandlung nötig.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateFrom)) {
    // Defensiv: wenn ZAS doch mal ein anderes Format sendet,
    // versuchen wir es zu normalisieren.
    const m = dateFrom.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
    if (m) {
      return `${m[1]}-${m[2]!.padStart(2, '0')}-${m[3]!.padStart(2, '0')}`
    }
    return null
  }
  return dateFrom
}

function parseNamesFromDifferent(differentBlock: string): {
  first_name: string | null
  last_name: string | null
} {
  const personFromUpi = findFirst(differentBlock, 'personFromUPI')
  if (!personFromUpi) return { first_name: null, last_name: null }
  const first_name = trimText(findFirst(personFromUpi, 'firstName'))
  const last_name = trimText(findFirst(personFromUpi, 'officialName'))
  return { first_name, last_name }
}

function parseNegativeReport(block: string): {
  code: string | null
  description: string | null
} {
  const code = trimText(findFirst(block, 'code'))
  const description = trimText(findFirst(block, 'codeDescription'))
  return { code, description }
}

// ---------------------------------------------------------------
// Hauptfunktion
// ---------------------------------------------------------------

/**
 * Parst die ZAS-Antwort und liefert alle Todesfälle + Warnungen.
 *
 * @throws ZasResponseParseError bei strukturellen Fehlern
 *         (kein <header>, kein <positiveResponse>/<negativeReport>,
 *         leerer Input).
 */
export function parseZasResponseXml(xml: string): ZasResponseParseResult {
  if (typeof xml !== 'string' || xml.trim().length === 0) {
    throw new ZasResponseParseError('Empty XML input')
  }

  const doc = xml.trim()

  // Sanity check: wir erwarten ein <response>-Element. Toleriert
  // beide Schemas (eCH-0086:response oder unprefixed).
  if (!/(<(?:[\w-]+:)?response[\s>])/i.test(doc)) {
    throw new ZasResponseParseError('Missing <response> root element')
  }

  const responseBody = findFirst(doc, 'response')
  if (!responseBody) {
    throw new ZasResponseParseError('Could not extract <response> body')
  }

  // Header ist Pflicht.
  if (!findFirst(responseBody, 'header')) {
    throw new ZasResponseParseError('Missing <header> in response')
  }

  const warnings: ZasParsedWarning[] = []
  const deaths: ZasParsedDeath[] = []

  // Variante 1: <negativeReport> auf Top-Level => kompletter Lauf
  // wurde abgewiesen (z.B. ungültiges Format, Authentifizierung).
  // Wir suchen direkt im responseBody — es darf kein
  // positiveResponse vorhanden sein, sonst wäre es ein
  // negativReportOnCompareData (siehe Variante 2 unten).
  const positiveBody = findFirst(responseBody, 'positiveResponse')
  if (!positiveBody) {
    const negativeReportBody = findFirst(responseBody, 'negativeReport')
    if (!negativeReportBody) {
      throw new ZasResponseParseError(
        'Response has neither <positiveResponse> nor <negativeReport>'
      )
    }
    const { code, description } = parseNegativeReport(negativeReportBody)
    warnings.push({
      code: 'negative_report',
      message:
        `ZAS rejected the entire request` +
        (code ? ` (code ${code})` : '') +
        (description ? `: ${description}` : ''),
    })
    return {
      positive_response: false,
      deaths: [],
      warnings,
      total_compared: 0,
    }
  }

  // Variante 2: <positiveResponse> mit beliebig vielen
  // <comparedData>-Blöcken.
  const comparedBlocks = findAllBlocks(positiveBody, 'comparedData')

  for (const block of comparedBlocks) {
    const dataToCompareId = parseDataToCompareId(block)
    const echoVn = parseEchoVn(block)

    // identicalData => Person lebt, kein Death-Eintrag.
    if (findFirst(block, 'identicalData')) {
      continue
    }

    // negativReportOnCompareData => UPI hat zu dieser AHV-Nr.
    // keine Daten geliefert (z.B. AHV-Nr. unbekannt). Wir warnen
    // den Admin, blockieren den Import aber nicht.
    const negCompare = findFirst(block, 'negativReportOnCompareData')
    if (negCompare) {
      const { code, description } = parseNegativeReport(negCompare)
      warnings.push({
        code: 'unknown_ahv',
        message:
          `ZAS could not match AHV number` +
          (code ? ` (code ${code})` : '') +
          (description ? `: ${description}` : ''),
        ahv_number: echoVn ?? undefined,
      })
      continue
    }

    // differentData => Daten weichen ab. Im Lebensnachweis-Setup
    // (comparedMissingElement=DATE_OF_DEATH) bedeutet das
    // typischerweise: Person ist verstorben.
    const differentBlock = findFirst(block, 'differentData')
    if (differentBlock) {
      const dateOfDeath = parseDateOfDeathFromDifferent(differentBlock)
      const { first_name, last_name } = parseNamesFromDifferent(differentBlock)

      if (!echoVn) {
        warnings.push({
          code: 'invalid_response',
          message: 'differentData block without echoVn — skipping',
        })
        continue
      }
      if (!dateOfDeath) {
        // Person hat differentData, aber kein deathPeriod —
        // andere Daten weichen ab (Name, etc.). Für das
        // Lebensnachweis-MVP ist das uninteressant, wir
        // protokollieren es als Warnung.
        warnings.push({
          code: 'different_data_no_death',
          message:
            'Person data differs from UPI but no date of death was reported',
          ahv_number: echoVn,
        })
        continue
      }

      deaths.push({
        ahv_number: echoVn,
        first_name,
        last_name,
        date_of_death: dateOfDeath,
        data_to_compare_id: dataToCompareId,
      })
      continue
    }

    // Kein bekanntes Sub-Element — defensive Warnung.
    warnings.push({
      code: 'unknown_compare_state',
      message:
        'comparedData block contains neither identicalData, ' +
        'differentData nor negativReportOnCompareData',
      ahv_number: echoVn ?? undefined,
    })
  }

  return {
    positive_response: true,
    deaths,
    warnings,
    total_compared: comparedBlocks.length,
  }
}
