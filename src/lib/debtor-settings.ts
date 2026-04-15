// =============================================================
// PROJ-21: Helpers to load/save debtor (Auftraggeber) settings
// from the generic app_settings key-value table.
// =============================================================

import type { SupabaseClient } from '@supabase/supabase-js'
import { DEBTOR_SETTING_KEYS, type DebtorSettings } from '@/lib/payment-run-exports.types'

const DEFAULT_DEBTOR: DebtorSettings = {
  name: '',
  street: '',
  postal_code: '',
  city: '',
  country: 'CH',
  iban: '',
  organisation_id: '',
}

/** Convert a settings-key (debtor.name) to DebtorSettings field (name). */
function keyToField(key: string): keyof DebtorSettings {
  return key.replace(/^debtor\./, '') as keyof DebtorSettings
}

/** Extracts a string value from the stored JSONB value. */
function asString(value: unknown): string {
  if (typeof value === 'string') return value
  if (value === null || value === undefined) return ''
  return String(value)
}

export async function loadDebtorSettings(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>
): Promise<DebtorSettings> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('key, value')
    .in('key', DEBTOR_SETTING_KEYS as unknown as string[])

  if (error || !data) {
    console.error('Error loading debtor settings:', error)
    return { ...DEFAULT_DEBTOR }
  }

  const result: DebtorSettings = { ...DEFAULT_DEBTOR }
  for (const row of data) {
    const field = keyToField(row.key)
    result[field] = asString(row.value)
  }
  return result
}
