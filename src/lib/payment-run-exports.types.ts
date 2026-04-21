// =============================================================
// PROJ-21: pain.001 XML Export types
// Mirrors the payment_run_exports table and debtor settings.
// =============================================================

// SUPPORTED_PAIN001_VERSIONS lists the versions that new exports may be
// generated with. The DB enum `pain001_version` still carries the legacy
// `pain.001.001.03.ch.02` value so historical records remain readable; new
// exports are only produced in `pain.001.001.09.ch.03` (SPS 2026 standard).
export const SUPPORTED_PAIN001_VERSIONS = ['pain.001.001.09.ch.03'] as const

export type Pain001Version = (typeof SUPPORTED_PAIN001_VERSIONS)[number]

/** Superset: includes legacy values that may appear in historical export rows. */
export const KNOWN_PAIN001_VERSIONS = [
  'pain.001.001.03.ch.02',
  'pain.001.001.09.ch.03',
] as const
export type KnownPain001Version = (typeof KNOWN_PAIN001_VERSIONS)[number]

export const DEFAULT_PAIN001_VERSION: Pain001Version = 'pain.001.001.09.ch.03'

export interface PaymentRunExport {
  id: string
  payment_run_id: string
  exported_at: string
  exported_by: string
  exported_by_name?: string | null
  pain_version: KnownPain001Version
  filename: string
  message_id: string
  /** xml_content intentionally omitted in list responses to keep payload small */
  xml_content?: string
  created_at: string
}

/** Auftraggeber-Stammdaten (in app_settings als einzelne Keys gespeichert) */
export interface DebtorSettings {
  name: string
  street: string
  postal_code: string
  city: string
  country: string
  iban: string
  /** Kurzkennung der Pensionskasse fuer MsgId-Generierung */
  organisation_id: string
}

export const DEBTOR_SETTING_KEYS = [
  'debtor.name',
  'debtor.street',
  'debtor.postal_code',
  'debtor.city',
  'debtor.country',
  'debtor.iban',
  'debtor.organisation_id',
] as const

export type DebtorSettingKey = (typeof DEBTOR_SETTING_KEYS)[number]

/** Prueft, ob die Debtor-Konfiguration vollstaendig ist (fuer Export-Button-Aktivierung) */
export function isDebtorConfigured(settings: DebtorSettings): boolean {
  return (
    settings.name.trim().length > 0 &&
    settings.street.trim().length > 0 &&
    settings.postal_code.trim().length > 0 &&
    settings.city.trim().length > 0 &&
    settings.country.trim().length > 0 &&
    settings.iban.trim().length > 0 &&
    settings.organisation_id.trim().length > 0
  )
}

export interface Pain001ValidationError {
  field: string
  message: string
  order_id?: string
  recipient_name?: string
  /** 1-based line in the generated XML, if the error is schema-level. */
  line?: number
}

export interface Pain001GenerationResult {
  success: boolean
  xml?: string
  message_id?: string
  filename?: string
  errors?: Pain001ValidationError[]
}
