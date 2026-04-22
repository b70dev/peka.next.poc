// =============================================================
// PROJ-24: Pensioner types and helpers
// A "pensioner" is an insured person with at least one active
// account of type "Rente" (pension). These types/helpers are
// shared between server pages, API routes, and client components.
// =============================================================

import type { InsuredPerson } from '@/lib/database.types'

/**
 * Single row in the pensioner list. One row per insured person.
 * If a person has multiple pension accounts, the amounts are summed
 * and the most recent retirement_date / account_id is used.
 */
export interface PensionerRow {
  /** Insured person id (primary identifier across the app) */
  id: string
  first_name: string
  last_name: string
  ahv_number: string
  date_of_birth: string
  /** ISO date when pension benefits started; null if not recorded */
  retirement_date: string | null
  /** Monthly pension amount in CHF; null if not yet configured */
  monthly_pension_amount: number | null
  /** Email address for export (optional) */
  email: string | null
  /** Id of the primary pension account (most recent / highest amount) */
  pension_account_id: string | null
}

/**
 * Full pensioner profile shown on the detail page.
 * Extends the list row with contact / address data and a second
 * "all accounts" list for the rare case of multiple pension accounts.
 */
export interface PensionerDetail extends PensionerRow {
  gender: InsuredPerson['gender']
  street: string | null
  postal_code: string | null
  city: string | null
  country: string | null
  phone: string | null
  mobile: string | null
  /** All active pension accounts attached to this person */
  pension_accounts: PensionerAccount[]
}

export interface PensionerAccount {
  account_id: string
  employment_id: string
  retirement_date: string | null
  monthly_pension_amount: number | null
}

/**
 * Formats a 13-digit AHV number into the canonical 756.XXXX.XXXX.XX form.
 * Returns the input unchanged if it already contains dots or has the wrong length.
 */
export function formatAhvNumber(ahv: string): string {
  if (ahv.length === 13 && !ahv.includes('.')) {
    return `${ahv.slice(0, 3)}.${ahv.slice(3, 7)}.${ahv.slice(7, 11)}.${ahv.slice(11)}`
  }
  return ahv
}

/**
 * Calculates age in completed years from an ISO date string.
 */
export function calculateAge(dateOfBirth: string): number {
  const birth = new Date(dateOfBirth)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDelta = today.getMonth() - birth.getMonth()
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
}
