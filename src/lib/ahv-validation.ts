// AHV Number validation (Swiss Social Security Number)
// Format: 756.xxxx.xxxx.xx (13 digits total)
// Uses EAN-13 check digit algorithm

export function validateAhvNumber(ahv: string): { valid: boolean; error?: string } {
  // Remove dots for validation
  const normalized = ahv.replace(/\./g, '')

  // Check length
  if (normalized.length !== 13) {
    return { valid: false, error: 'ahvInvalidLength' }
  }

  // Check if all digits
  if (!/^\d{13}$/.test(normalized)) {
    return { valid: false, error: 'ahvInvalidFormat' }
  }

  // Check country code (756 = Switzerland)
  if (!normalized.startsWith('756')) {
    return { valid: false, error: 'ahvInvalidCountry' }
  }

  // Validate check digit (EAN-13 algorithm)
  const digits = normalized.split('').map(Number)
  let sum = 0
  for (let i = 0; i < 12; i++) {
    sum += digits[i] * (i % 2 === 0 ? 1 : 3)
  }
  const checkDigit = (10 - (sum % 10)) % 10

  if (checkDigit !== digits[12]) {
    return { valid: false, error: 'ahvInvalidCheckDigit' }
  }

  return { valid: true }
}

// Format AHV number with dots
export function formatAhvNumber(ahv: string): string {
  const normalized = ahv.replace(/\./g, '')
  if (normalized.length === 13) {
    return `${normalized.slice(0, 3)}.${normalized.slice(3, 7)}.${normalized.slice(7, 11)}.${normalized.slice(11)}`
  }
  return ahv
}
