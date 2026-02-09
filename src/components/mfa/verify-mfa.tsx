'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Shield, Key } from 'lucide-react'

interface VerifyMfaProps {
  onVerified: () => void
}

export function VerifyMfa({ onVerified }: VerifyMfaProps) {
  const t = useTranslations('auth.mfa')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [useBackupCode, setUseBackupCode] = useState(false)
  const [backupCode, setBackupCode] = useState('')
  const [attemptsRemaining, setAttemptsRemaining] = useState(5)

  const supabase = createClient()

  const handleVerify = async () => {
    const codeToVerify = useBackupCode ? backupCode : code
    if (!useBackupCode && codeToVerify.length !== 6) return
    if (useBackupCode && codeToVerify.length < 6) return

    setIsLoading(true)
    setError(null)

    try {
      // Get the TOTP factor
      const { data: factorsData } = await supabase.auth.mfa.listFactors()
      const totpFactor = factorsData?.totp?.[0]

      if (!totpFactor) {
        setError(t('errors.verifyFailed'))
        setIsLoading(false)
        return
      }

      if (useBackupCode) {
        // Verify backup code via server API route (sets httpOnly cookie for middleware)
        const backupResponse = await fetch('/api/mfa/verify-backup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: codeToVerify }),
        })
        const backupData = await backupResponse.json()

        if (backupData.locked) {
          setAttemptsRemaining(0)
          setError(t('errors.tooManyAttempts'))
          setIsLoading(false)
          return
        }

        if (!backupData.valid) {
          const remaining = backupData.attempts_remaining ?? (attemptsRemaining - 1)
          setAttemptsRemaining(remaining)
          setError(t('errors.backupCodeInvalid'))
          setBackupCode('')
          setIsLoading(false)
          return
        }

        // Backup code verified - cookie was set, redirect to dashboard
        onVerified()
        setIsLoading(false)
        return
      }

      // Create challenge
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: totpFactor.id,
      })

      if (challengeError) {
        setError(t('errors.challengeFailed'))
        setIsLoading(false)
        return
      }

      // Verify the code
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: challengeData.id,
        code: codeToVerify,
      })

      if (verifyError) {
        const remaining = attemptsRemaining - 1
        setAttemptsRemaining(remaining)

        if (remaining <= 0) {
          setError(t('errors.tooManyAttempts'))
        } else {
          setError(t('errors.invalidCode'))
        }
        setCode('')
        setIsLoading(false)
        return
      }

      // MFA verified successfully - redirect to dashboard
      onVerified()
    } catch {
      setError(t('errors.verifyFailed'))
    }

    setIsLoading(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleVerify()
    }
  }

  if (attemptsRemaining <= 0) {
    return (
      <div className="w-full max-w-md mx-auto">
        <Card>
          <CardHeader className="text-center">
            <Shield className="h-12 w-12 text-destructive mx-auto mb-2" />
            <CardTitle>{t('verify.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>{t('verify.accountLocked')}</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <Shield className="h-12 w-12 text-primary" />
          </div>
          <CardTitle>{t('verify.title')}</CardTitle>
          <CardDescription>
            {useBackupCode ? t('verify.backupCodeDescription') : t('verify.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!useBackupCode ? (
            /* TOTP Code entry */
            <div className="space-y-2">
              <Label htmlFor="totp-code">{t('verify.codeLabel')}</Label>
              <Input
                id="totp-code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder={t('verify.codePlaceholder')}
                value={code}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '')
                  setCode(value)
                }}
                onKeyDown={handleKeyDown}
                autoFocus
                autoComplete="one-time-code"
                className="text-center text-2xl tracking-[0.5em] font-mono"
                disabled={isLoading}
              />
            </div>
          ) : (
            /* Backup code entry */
            <div className="space-y-2">
              <Label htmlFor="backup-code">{t('verify.backupCodeLabel')}</Label>
              <Input
                id="backup-code"
                type="text"
                maxLength={8}
                placeholder={t('verify.backupCodePlaceholder')}
                value={backupCode}
                onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
                onKeyDown={handleKeyDown}
                autoFocus
                className="text-center text-xl tracking-[0.3em] font-mono uppercase"
                disabled={isLoading}
              />
            </div>
          )}

          {attemptsRemaining < 5 && (
            <p className="text-sm text-muted-foreground text-center">
              {t('verify.attemptsRemaining', { count: attemptsRemaining })}
            </p>
          )}

          <Button
            className="w-full"
            onClick={handleVerify}
            disabled={
              isLoading ||
              (!useBackupCode && code.length !== 6) ||
              (useBackupCode && backupCode.length < 6)
            }
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('verify.verifying')}
              </>
            ) : (
              t('verify.verify')
            )}
          </Button>

          <div className="text-center">
            <Button
              variant="link"
              size="sm"
              className="text-muted-foreground"
              onClick={() => {
                setUseBackupCode(!useBackupCode)
                setError(null)
                setCode('')
                setBackupCode('')
              }}
            >
              <Key className="mr-1 h-3 w-3" />
              {useBackupCode ? t('verify.backToCode') : t('verify.useBackupCode')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
