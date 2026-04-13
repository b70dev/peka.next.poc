// =============================================================
// PROJ-19: IBAN validation utilities using ibantools
// =============================================================

import { validateIBAN, ValidationErrorsIBAN, friendlyFormatIBAN } from 'ibantools'

export interface IBANValidationResult {
  valid: boolean
  errorMessage: string | null
  /** Whether the IBAN is from a country other than CH or LI */
  isForeignIBAN: boolean
  /** The country code extracted from the IBAN */
  countryCode: string | null
  /** The IBAN formatted with spaces for display */
  formattedIBAN: string | null
}

/** Swiss and Liechtenstein country codes (no foreign IBAN warning) */
const DOMESTIC_COUNTRY_CODES = ['CH', 'LI']

/**
 * Validates an IBAN string and returns structured result.
 * Uses ibantools for format + check digit validation.
 */
export function validateIBANInput(rawIban: string): IBANValidationResult {
  // Normalize: remove spaces, convert to uppercase
  const normalized = rawIban.replace(/\s/g, '').toUpperCase()

  if (!normalized) {
    return {
      valid: false,
      errorMessage: null, // Empty = no error shown yet
      isForeignIBAN: false,
      countryCode: null,
      formattedIBAN: null,
    }
  }

  const result = validateIBAN(normalized)

  if (!result.valid) {
    // Map ibantools error codes to user-friendly keys
    const errorKey = mapValidationError(result.errorCodes)
    return {
      valid: false,
      errorMessage: errorKey,
      isForeignIBAN: false,
      countryCode: normalized.length >= 2 ? normalized.slice(0, 2) : null,
      formattedIBAN: null,
    }
  }

  const countryCode = normalized.slice(0, 2)
  const isForeignIBAN = !DOMESTIC_COUNTRY_CODES.includes(countryCode)

  return {
    valid: true,
    errorMessage: null,
    isForeignIBAN,
    countryCode,
    formattedIBAN: friendlyFormatIBAN(normalized) ?? normalized,
  }
}

/**
 * Normalizes an IBAN string (removes spaces, uppercase).
 */
export function normalizeIBAN(iban: string): string {
  return iban.replace(/\s/g, '').toUpperCase()
}

/**
 * Formats an IBAN for display (groups of 4).
 */
export function formatIBANForDisplay(iban: string): string {
  return friendlyFormatIBAN(normalizeIBAN(iban)) ?? iban
}

function mapValidationError(errorCodes: ValidationErrorsIBAN[]): string {
  if (errorCodes.includes(ValidationErrorsIBAN.WrongBBANLength)) {
    return 'ibanInvalidLength'
  }
  if (errorCodes.includes(ValidationErrorsIBAN.WrongAccountBankBranchChecksum) ||
      errorCodes.includes(ValidationErrorsIBAN.ChecksumNotNumber)) {
    return 'ibanInvalidChecksum'
  }
  if (errorCodes.includes(ValidationErrorsIBAN.NoIBANCountry)) {
    return 'ibanInvalidCountry'
  }
  if (errorCodes.includes(ValidationErrorsIBAN.NoIBANProvided)) {
    return 'ibanRequired'
  }
  return 'ibanInvalidFormat'
}
