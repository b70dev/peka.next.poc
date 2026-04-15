// =============================================================
// PROJ-21: pain.001 XML-Generator (ISO 20022, SIX Swiss Payment Standards)
//
// Unterstuetzt:
//   - pain.001.001.03.ch.02 (SIX-Standard, weit verbreitet)
//   - pain.001.001.09.ch.03 (neuere Version)
//
// XML wird als sauberer String aufgebaut. Fuer jede Transaktion wird
// ein CdtTrfTxInf-Block erzeugt. Zeichen werden auf den von SIX
// zugelassenen Latin-Zeichensatz reduziert.
// =============================================================

import { XMLValidator } from 'fast-xml-parser'
import { normalizeIBAN, validateIBANInput } from '@/lib/iban-validation'
import type { PaymentOrder } from '@/lib/payment-orders.types'
import type { PaymentRun } from '@/lib/payment-runs.types'
import type {
  DebtorSettings,
  Pain001Version,
  Pain001ValidationError,
  Pain001GenerationResult,
} from '@/lib/payment-run-exports.types'

// ---------------------------------------------------------------
// SIX erlaubter Zeichensatz (Swiss Payment Standards §2.3)
// Latin character set: A-Z a-z 0-9 und eine begrenzte Menge Sonderzeichen
// Umlaute werden transliteriert, nicht unterstuetzte Zeichen entfernt.
// ---------------------------------------------------------------
const SIX_ALLOWED_CHARS = /^[A-Za-z0-9 /\-?:().,'+*#=!"&<>;@[\]{}%_\\`^~$]+$/

const TRANSLITERATIONS: Record<string, string> = {
  'ä': 'ae', 'Ä': 'Ae', 'ö': 'oe', 'Ö': 'Oe', 'ü': 'ue', 'Ü': 'Ue',
  'ß': 'ss', 'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
  'à': 'a', 'â': 'a', 'á': 'a', 'ã': 'a', 'å': 'a',
  'î': 'i', 'ï': 'i', 'í': 'i', 'ì': 'i',
  'ô': 'o', 'ò': 'o', 'ó': 'o', 'õ': 'o',
  'û': 'u', 'ù': 'u', 'ú': 'u',
  'ç': 'c', 'ñ': 'n', 'ý': 'y', 'ÿ': 'y',
  'É': 'E', 'È': 'E', 'Ê': 'E', 'Ë': 'E',
  'À': 'A', 'Â': 'A', 'Á': 'A', 'Ã': 'A', 'Å': 'A',
  'Î': 'I', 'Ï': 'I', 'Í': 'I', 'Ì': 'I',
  'Ô': 'O', 'Ò': 'O', 'Ó': 'O', 'Õ': 'O',
  'Û': 'U', 'Ù': 'U', 'Ú': 'U',
  'Ç': 'C', 'Ñ': 'N',
}

/**
 * Bereinigt einen String fuer den Einsatz in pain.001 nach SIX-Richtlinien.
 * - Umlaute werden transliteriert (ae, oe, ue, ...)
 * - Nicht erlaubte Zeichen werden entfernt
 * - Whitespace wird normalisiert
 */
export function sanitizeForPain001(input: string): string {
  let out = ''
  for (const ch of input) {
    if (TRANSLITERATIONS[ch]) {
      out += TRANSLITERATIONS[ch]
    } else if (SIX_ALLOWED_CHARS.test(ch)) {
      out += ch
    } else {
      // Silently drop disallowed chars (SIX §2.3 conformant)
    }
  }
  return out.replace(/\s+/g, ' ').trim()
}

/** Escapes a string for safe inclusion in XML text content. */
function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/** Formats a decimal amount to 2 fixed decimals (pain.001 requirement). */
function formatAmount(amount: number): string {
  return amount.toFixed(2)
}

/** Formats a date as YYYY-MM-DD (ISO 8601 date). */
function formatDate(dateIso: string): string {
  return new Date(dateIso).toISOString().slice(0, 10)
}

/** Formats a timestamp in ISO 8601 (YYYY-MM-DDTHH:mm:ss). */
function formatDateTime(dateIso: string): string {
  return new Date(dateIso).toISOString().slice(0, 19)
}

/**
 * Erzeugt eine eindeutige MsgId im Format:
 *   [ORG]-[RUN-SHORT]-[TIMESTAMP]
 * Max. 35 Zeichen gemaess pain.001 Spezifikation.
 */
function buildMessageId(orgId: string, runId: string): string {
  const org = sanitizeForPain001(orgId).replace(/\s+/g, '').slice(0, 8) || 'PEKA'
  const runShort = runId.replace(/-/g, '').slice(0, 10).toUpperCase()
  const ts = Date.now().toString(36).toUpperCase()
  return `${org}-${runShort}-${ts}`.slice(0, 35)
}

function buildFilename(runId: string, executionDate: string | null): string {
  const datePart = executionDate
    ? formatDate(executionDate)
    : new Date().toISOString().slice(0, 10)
  const runShort = runId.slice(0, 8)
  return `pain001_${datePart}_${runShort}.xml`
}

// ---------------------------------------------------------------
// Vorab-Validierung: strukturelle Pruefung, bevor XML gebaut wird
// ---------------------------------------------------------------
function validateInputs(
  debtor: DebtorSettings,
  orders: PaymentOrder[]
): Pain001ValidationError[] {
  const errors: Pain001ValidationError[] = []

  // Debtor-Validierung
  if (!debtor.name.trim()) errors.push({ field: 'debtor.name', message: 'Debtor name is required' })
  if (!debtor.street.trim()) errors.push({ field: 'debtor.street', message: 'Debtor street is required' })
  if (!debtor.postal_code.trim()) errors.push({ field: 'debtor.postal_code', message: 'Debtor postal code is required' })
  if (!debtor.city.trim()) errors.push({ field: 'debtor.city', message: 'Debtor city is required' })
  if (!debtor.country.trim() || !/^[A-Z]{2}$/.test(debtor.country)) {
    errors.push({ field: 'debtor.country', message: 'Debtor country must be ISO 3166-1 alpha-2 (e.g. CH)' })
  }

  const debtorIbanCheck = validateIBANInput(debtor.iban)
  if (!debtorIbanCheck.valid) {
    errors.push({ field: 'debtor.iban', message: 'Debtor IBAN is invalid' })
  } else if (debtorIbanCheck.isForeignIBAN) {
    errors.push({ field: 'debtor.iban', message: 'Debtor IBAN must be from CH or LI' })
  }

  if (orders.length === 0) {
    errors.push({ field: 'orders', message: 'At least one payment order is required' })
  }

  // Pro-Order Validierung
  for (const o of orders) {
    if (!o.recipient_name?.trim()) {
      errors.push({ field: 'recipient_name', message: 'Recipient name is required', order_id: o.id })
    }
    const creditorIban = validateIBANInput(o.iban)
    if (!creditorIban.valid) {
      errors.push({
        field: 'iban',
        message: 'Creditor IBAN is invalid',
        order_id: o.id,
        recipient_name: o.recipient_name,
      })
    }
    if (!Number.isFinite(Number(o.amount)) || Number(o.amount) <= 0) {
      errors.push({
        field: 'amount',
        message: 'Amount must be positive',
        order_id: o.id,
        recipient_name: o.recipient_name,
      })
    }
    if ((o.currency ?? 'CHF') !== 'CHF') {
      errors.push({
        field: 'currency',
        message: 'Only CHF is supported',
        order_id: o.id,
        recipient_name: o.recipient_name,
      })
    }
    if (!o.purpose?.trim()) {
      errors.push({
        field: 'purpose',
        message: 'Purpose is required',
        order_id: o.id,
        recipient_name: o.recipient_name,
      })
    }
  }

  return errors
}

// ---------------------------------------------------------------
// XML-Generierung pain.001.001.03.ch.02
// ---------------------------------------------------------------
function buildXmlV03(
  run: PaymentRun,
  orders: PaymentOrder[],
  debtor: DebtorSettings,
  messageId: string,
  createdAt: string
): string {
  const totalAmount = orders.reduce((sum, o) => sum + Number(o.amount), 0)
  const executionDate = run.execution_date ? formatDate(run.execution_date) : formatDate(createdAt)
  const paymentInfoId = `PMT-${messageId}`.slice(0, 35)

  const lines: string[] = []
  lines.push('<?xml version="1.0" encoding="UTF-8"?>')
  lines.push(
    '<Document xmlns="http://www.six-interbank-clearing.com/de/pain.001.001.03.ch.02.xsd" ' +
      'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">'
  )
  lines.push('  <CstmrCdtTrfInitn>')

  // Group Header
  lines.push('    <GrpHdr>')
  lines.push(`      <MsgId>${xmlEscape(messageId)}</MsgId>`)
  lines.push(`      <CreDtTm>${formatDateTime(createdAt)}</CreDtTm>`)
  lines.push(`      <NbOfTxs>${orders.length}</NbOfTxs>`)
  lines.push(`      <CtrlSum>${formatAmount(totalAmount)}</CtrlSum>`)
  lines.push('      <InitgPty>')
  lines.push(`        <Nm>${xmlEscape(sanitizeForPain001(debtor.name))}</Nm>`)
  lines.push('      </InitgPty>')
  lines.push('    </GrpHdr>')

  // Payment Information (single block covering all transactions)
  lines.push('    <PmtInf>')
  lines.push(`      <PmtInfId>${xmlEscape(paymentInfoId)}</PmtInfId>`)
  lines.push('      <PmtMtd>TRF</PmtMtd>')
  lines.push(`      <NbOfTxs>${orders.length}</NbOfTxs>`)
  lines.push(`      <CtrlSum>${formatAmount(totalAmount)}</CtrlSum>`)
  lines.push('      <PmtTpInf>')
  lines.push('        <SvcLvl>')
  lines.push('          <Cd>SEPA</Cd>')
  lines.push('        </SvcLvl>')
  lines.push('      </PmtTpInf>')
  lines.push(`      <ReqdExctnDt>${executionDate}</ReqdExctnDt>`)

  // Debtor
  lines.push('      <Dbtr>')
  lines.push(`        <Nm>${xmlEscape(sanitizeForPain001(debtor.name))}</Nm>`)
  lines.push('        <PstlAdr>')
  lines.push(`          <StrtNm>${xmlEscape(sanitizeForPain001(debtor.street))}</StrtNm>`)
  lines.push(`          <PstCd>${xmlEscape(sanitizeForPain001(debtor.postal_code))}</PstCd>`)
  lines.push(`          <TwnNm>${xmlEscape(sanitizeForPain001(debtor.city))}</TwnNm>`)
  lines.push(`          <Ctry>${xmlEscape(debtor.country)}</Ctry>`)
  lines.push('        </PstlAdr>')
  lines.push('      </Dbtr>')
  lines.push('      <DbtrAcct>')
  lines.push('        <Id>')
  lines.push(`          <IBAN>${xmlEscape(normalizeIBAN(debtor.iban))}</IBAN>`)
  lines.push('        </Id>')
  lines.push('      </DbtrAcct>')
  lines.push('      <DbtrAgt>')
  lines.push('        <FinInstnId>')
  lines.push('          <Othr>')
  lines.push('            <Id>NOTPROVIDED</Id>')
  lines.push('          </Othr>')
  lines.push('        </FinInstnId>')
  lines.push('      </DbtrAgt>')

  // Credit Transfer Transaction Information
  for (const [idx, o] of orders.entries()) {
    const endToEndId = `E2E-${o.id.slice(0, 8)}-${idx + 1}`.slice(0, 35)
    lines.push('      <CdtTrfTxInf>')
    lines.push('        <PmtId>')
    lines.push(`          <EndToEndId>${xmlEscape(endToEndId)}</EndToEndId>`)
    lines.push('        </PmtId>')
    lines.push(`        <Amt>`)
    lines.push(
      `          <InstdAmt Ccy="${o.currency ?? 'CHF'}">${formatAmount(Number(o.amount))}</InstdAmt>`
    )
    lines.push('        </Amt>')
    lines.push('        <Cdtr>')
    lines.push(`          <Nm>${xmlEscape(sanitizeForPain001(o.recipient_name))}</Nm>`)
    lines.push('        </Cdtr>')
    lines.push('        <CdtrAcct>')
    lines.push('          <Id>')
    lines.push(`            <IBAN>${xmlEscape(normalizeIBAN(o.iban))}</IBAN>`)
    lines.push('          </Id>')
    lines.push('        </CdtrAcct>')

    // Remittance information
    lines.push('        <RmtInf>')
    if (o.reference_number && o.reference_number.trim()) {
      // Strukturierte Referenz (QR-Referenz oder ISR)
      const ref = o.reference_number.replace(/\s+/g, '')
      const isQrRef = /^\d{27}$/.test(ref)
      lines.push('          <Strd>')
      lines.push('            <CdtrRefInf>')
      lines.push('              <Tp>')
      lines.push('                <CdOrPrtry>')
      lines.push(`                  <Prtry>${isQrRef ? 'QRR' : 'SCOR'}</Prtry>`)
      lines.push('                </CdOrPrtry>')
      lines.push('              </Tp>')
      lines.push(`              <Ref>${xmlEscape(ref)}</Ref>`)
      lines.push('            </CdtrRefInf>')
      lines.push('          </Strd>')
    } else {
      lines.push(
        `          <Ustrd>${xmlEscape(sanitizeForPain001(o.purpose).slice(0, 140))}</Ustrd>`
      )
    }
    lines.push('        </RmtInf>')
    lines.push('      </CdtTrfTxInf>')
  }

  lines.push('    </PmtInf>')
  lines.push('  </CstmrCdtTrfInitn>')
  lines.push('</Document>')

  return lines.join('\n')
}

// ---------------------------------------------------------------
// XML-Generierung pain.001.001.09.ch.03 (neuere Version)
// Struktur ist weitgehend identisch; Namespace und einzelne Elemente
// unterscheiden sich leicht.
// ---------------------------------------------------------------
function buildXmlV09(
  run: PaymentRun,
  orders: PaymentOrder[],
  debtor: DebtorSettings,
  messageId: string,
  createdAt: string
): string {
  const totalAmount = orders.reduce((sum, o) => sum + Number(o.amount), 0)
  const executionDate = run.execution_date ? formatDate(run.execution_date) : formatDate(createdAt)
  const paymentInfoId = `PMT-${messageId}`.slice(0, 35)

  const lines: string[] = []
  lines.push('<?xml version="1.0" encoding="UTF-8"?>')
  lines.push(
    '<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.09.ch.03" ' +
      'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">'
  )
  lines.push('  <CstmrCdtTrfInitn>')

  lines.push('    <GrpHdr>')
  lines.push(`      <MsgId>${xmlEscape(messageId)}</MsgId>`)
  lines.push(`      <CreDtTm>${formatDateTime(createdAt)}</CreDtTm>`)
  lines.push(`      <NbOfTxs>${orders.length}</NbOfTxs>`)
  lines.push(`      <CtrlSum>${formatAmount(totalAmount)}</CtrlSum>`)
  lines.push('      <InitgPty>')
  lines.push(`        <Nm>${xmlEscape(sanitizeForPain001(debtor.name))}</Nm>`)
  lines.push('      </InitgPty>')
  lines.push('    </GrpHdr>')

  lines.push('    <PmtInf>')
  lines.push(`      <PmtInfId>${xmlEscape(paymentInfoId)}</PmtInfId>`)
  lines.push('      <PmtMtd>TRF</PmtMtd>')
  lines.push('      <BtchBookg>true</BtchBookg>')
  lines.push(`      <NbOfTxs>${orders.length}</NbOfTxs>`)
  lines.push(`      <CtrlSum>${formatAmount(totalAmount)}</CtrlSum>`)
  lines.push(`      <ReqdExctnDt><Dt>${executionDate}</Dt></ReqdExctnDt>`)

  lines.push('      <Dbtr>')
  lines.push(`        <Nm>${xmlEscape(sanitizeForPain001(debtor.name))}</Nm>`)
  lines.push('        <PstlAdr>')
  lines.push(`          <StrtNm>${xmlEscape(sanitizeForPain001(debtor.street))}</StrtNm>`)
  lines.push(`          <PstCd>${xmlEscape(sanitizeForPain001(debtor.postal_code))}</PstCd>`)
  lines.push(`          <TwnNm>${xmlEscape(sanitizeForPain001(debtor.city))}</TwnNm>`)
  lines.push(`          <Ctry>${xmlEscape(debtor.country)}</Ctry>`)
  lines.push('        </PstlAdr>')
  lines.push('      </Dbtr>')
  lines.push('      <DbtrAcct>')
  lines.push('        <Id>')
  lines.push(`          <IBAN>${xmlEscape(normalizeIBAN(debtor.iban))}</IBAN>`)
  lines.push('        </Id>')
  lines.push('      </DbtrAcct>')
  lines.push('      <DbtrAgt>')
  lines.push('        <FinInstnId>')
  lines.push('          <Othr>')
  lines.push('            <Id>NOTPROVIDED</Id>')
  lines.push('          </Othr>')
  lines.push('        </FinInstnId>')
  lines.push('      </DbtrAgt>')

  for (const [idx, o] of orders.entries()) {
    const endToEndId = `E2E-${o.id.slice(0, 8)}-${idx + 1}`.slice(0, 35)
    lines.push('      <CdtTrfTxInf>')
    lines.push('        <PmtId>')
    lines.push(`          <EndToEndId>${xmlEscape(endToEndId)}</EndToEndId>`)
    lines.push('        </PmtId>')
    lines.push(`        <Amt>`)
    lines.push(
      `          <InstdAmt Ccy="${o.currency ?? 'CHF'}">${formatAmount(Number(o.amount))}</InstdAmt>`
    )
    lines.push('        </Amt>')
    lines.push('        <Cdtr>')
    lines.push(`          <Nm>${xmlEscape(sanitizeForPain001(o.recipient_name))}</Nm>`)
    lines.push('        </Cdtr>')
    lines.push('        <CdtrAcct>')
    lines.push('          <Id>')
    lines.push(`            <IBAN>${xmlEscape(normalizeIBAN(o.iban))}</IBAN>`)
    lines.push('          </Id>')
    lines.push('        </CdtrAcct>')

    lines.push('        <RmtInf>')
    if (o.reference_number && o.reference_number.trim()) {
      const ref = o.reference_number.replace(/\s+/g, '')
      const isQrRef = /^\d{27}$/.test(ref)
      lines.push('          <Strd>')
      lines.push('            <CdtrRefInf>')
      lines.push('              <Tp>')
      lines.push('                <CdOrPrtry>')
      lines.push(`                  <Prtry>${isQrRef ? 'QRR' : 'SCOR'}</Prtry>`)
      lines.push('                </CdOrPrtry>')
      lines.push('              </Tp>')
      lines.push(`              <Ref>${xmlEscape(ref)}</Ref>`)
      lines.push('            </CdtrRefInf>')
      lines.push('          </Strd>')
    } else {
      lines.push(
        `          <Ustrd>${xmlEscape(sanitizeForPain001(o.purpose).slice(0, 140))}</Ustrd>`
      )
    }
    lines.push('        </RmtInf>')
    lines.push('      </CdtTrfTxInf>')
  }

  lines.push('    </PmtInf>')
  lines.push('  </CstmrCdtTrfInitn>')
  lines.push('</Document>')

  return lines.join('\n')
}

// ---------------------------------------------------------------
// Hauptfunktion
// ---------------------------------------------------------------

export interface GeneratePain001Input {
  run: PaymentRun
  orders: PaymentOrder[]
  debtor: DebtorSettings
  version: Pain001Version
  /** Override for deterministic testing */
  now?: string
}

export function generatePain001Xml(input: GeneratePain001Input): Pain001GenerationResult {
  const { run, orders, debtor, version } = input
  const createdAt = input.now ?? new Date().toISOString()

  // 1. Structural validation
  const validationErrors = validateInputs(debtor, orders)
  if (validationErrors.length > 0) {
    return { success: false, errors: validationErrors }
  }

  // 2. Generate XML
  const messageId = buildMessageId(debtor.organisation_id || 'PEKA', run.id)
  const xml =
    version === 'pain.001.001.09.ch.03'
      ? buildXmlV09(run, orders, debtor, messageId, createdAt)
      : buildXmlV03(run, orders, debtor, messageId, createdAt)

  // 3. Well-formedness validation (fast-xml-parser catches syntax issues)
  // NOTE: full XSD schema validation is not feasible in a Vercel-compatible
  // pure-JS runtime. We perform strict structural pre-validation + XML
  // well-formedness check. This is documented in the feature spec.
  const wellFormed = XMLValidator.validate(xml, {
    allowBooleanAttributes: false,
  })
  if (wellFormed !== true) {
    return {
      success: false,
      errors: [
        {
          field: 'xml',
          message: `Generated XML is not well-formed: ${wellFormed.err.msg} (line ${wellFormed.err.line})`,
        },
      ],
    }
  }

  return {
    success: true,
    xml,
    message_id: messageId,
    filename: buildFilename(run.id, run.execution_date),
  }
}
