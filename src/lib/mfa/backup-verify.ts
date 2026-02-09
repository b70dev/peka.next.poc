/**
 * HMAC-based backup code verification token utility.
 * Used to create/verify a signed cookie that proves a backup code was verified.
 * Works in both Edge Runtime (middleware) and Node.js Runtime (API routes).
 */

const COOKIE_NAME = 'mfa_backup_verified'
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

function getSecret(): string {
  return process.env.MFA_BACKUP_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
}

async function getHmacKey(): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(getSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
}

function toBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(str: string): Uint8Array {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/') + '=='.slice(0, (4 - (str.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

export async function createBackupVerificationToken(userId: string): Promise<string> {
  const expiry = Date.now() + TOKEN_TTL_MS
  const payload = `${userId}:${expiry}`
  const key = await getHmacKey()
  const encoder = new TextEncoder()
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  const hmac = toBase64Url(signature)
  return `${payload}:${hmac}`
}

export async function verifyBackupVerificationToken(token: string, userId: string): Promise<boolean> {
  try {
    const lastColonIndex = token.lastIndexOf(':')
    if (lastColonIndex === -1) return false

    const payload = token.substring(0, lastColonIndex)
    const hmac = token.substring(lastColonIndex + 1)

    const [tokenUserId, expiryStr] = payload.split(':')
    if (tokenUserId !== userId) return false

    const expiry = parseInt(expiryStr, 10)
    if (isNaN(expiry) || Date.now() > expiry) return false

    const key = await getHmacKey()
    const encoder = new TextEncoder()
    const signatureBytes = fromBase64Url(hmac)

    return crypto.subtle.verify('HMAC', key, signatureBytes.buffer as ArrayBuffer, encoder.encode(payload))
  } catch {
    return false
  }
}

export { COOKIE_NAME }
