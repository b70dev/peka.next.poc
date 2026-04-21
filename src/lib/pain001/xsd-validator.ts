// =============================================================
// PROJ-21: XSD-Validator fuer pain.001.001.09.ch.03
//
// Verwendet xmllint-wasm (WebAssembly-Port von libxml2). Laeuft im
// Node-Runtime von Vercel; kein natives Binary, keine Edge-Runtime-
// Abhaengigkeiten.
//
// Das XSD wird beim ersten Aufruf von der Platte geladen und danach
// gecached (Next.js file-tracing inkludiert den Pfad via
// outputFileTracingIncludes in next.config.ts).
// =============================================================

import 'server-only'
import fs from 'node:fs/promises'
import path from 'node:path'
import { validateXML } from 'xmllint-wasm'
import type { Pain001ValidationError } from '@/lib/payment-run-exports.types'

const XSD_FILENAME = 'pain.001.001.09.ch.03.xsd'
const XSD_PATH = path.join(
  process.cwd(),
  'src',
  'lib',
  'pain001',
  'schemas',
  XSD_FILENAME
)

let cachedXsd: string | null = null

async function loadXsd(): Promise<string> {
  if (cachedXsd !== null) return cachedXsd
  cachedXsd = await fs.readFile(XSD_PATH, 'utf8')
  return cachedXsd
}

export interface XsdValidationResult {
  valid: boolean
  errors: Pain001ValidationError[]
}

/**
 * Validiert den generierten pain.001.001.09.ch.03 XML-String gegen das
 * offizielle SIX-Schema. Liefert bei Verstoessen strukturierte Fehler
 * (Zeilennummer + Message), damit das UI diese dem Admin zeigen kann.
 */
export async function validatePain001AgainstXsd(xml: string): Promise<XsdValidationResult> {
  const schema = await loadXsd()

  const result = await validateXML({
    xml: [{ fileName: 'pain001.xml', contents: xml }],
    schema: [{ fileName: XSD_FILENAME, contents: schema }],
  })

  if (result.valid) {
    return { valid: true, errors: [] }
  }

  const errors: Pain001ValidationError[] = result.errors.map((e) => ({
    field: 'xml',
    message: e.message,
    line: e.loc?.lineNumber,
  }))

  return { valid: false, errors }
}
