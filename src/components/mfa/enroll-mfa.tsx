'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Shield, Smartphone, Key, Copy, Check } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { BackupCodesDisplay } from './backup-codes-display'

type EnrollStep = 'qr-code' | 'verify' | 'backup-codes'

interface EnrollMfaProps {
  onComplete: () => void
}

export function EnrollMfa({ onComplete }: EnrollMfaProps) {
  const t = useTranslations('auth.mfa')
  const tActions = useTranslations('actions')
  const [step, setStep] = useState<EnrollStep>('qr-code')
  const [qrCode, setQrCode] = useState<string>('')
  const [secret, setSecret] = useState<string>('')
  const [factorId, setFactorId] = useState<string>('')
  const [verifyCode, setVerifyCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isEnrolling, setIsEnrolling] = useState(false)
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [codesSaved, setCodesSaved] = useState(false)
  const enrollStartedRef = useRef(false)

  const supabase = createClient()

  const startEnrollment = async () => {
    setIsEnrolling(true)
    setError(null)

    try {
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Authenticator App',
      })

      if (enrollError) {
        setError(t('errors.enrollFailed'))
        setIsEnrolling(false)
        return
      }

      if (data) {
        setQrCode(data.totp.qr_code)
        setSecret(data.totp.secret)
        setFactorId(data.id)
      }
    } catch {
      setError(t('errors.enrollFailed'))
    }

    setIsEnrolling(false)
  }

  const handleVerify = async () => {
    if (verifyCode.length !== 6) return

    setIsLoading(true)
    setError(null)

    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      })

      if (challengeError) {
        setError(t('errors.challengeFailed'))
        setIsLoading(false)
        return
      }

      const { data: verifyData, error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code: verifyCode,
      })

      if (verifyError) {
        setError(t('errors.invalidCode'))
        setVerifyCode('')
        setIsLoading(false)
        return
      }

      // Generate backup codes via Edge Function
      // Use the access_token from mfa.verify() directly (fresh AAL2 token)
      try {
        let accessToken: string | undefined = verifyData?.access_token
        if (!accessToken) {
          const { data: { session } } = await supabase.auth.getSession()
          accessToken = session?.access_token ?? undefined
        }
        if (accessToken) {
          const backupResponse = await fetch(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/mfa-backup-codes?action=generate`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
              },
            }
          )
          if (backupResponse.ok) {
            const backupData = await backupResponse.json()
            setBackupCodes(backupData.codes)
          } else {
            const errorData = await backupResponse.json().catch(() => ({}))
            console.error('Backup code generation failed:', backupResponse.status, errorData)
            setError(t('errors.backupCodeGenerationFailed'))
          }
        } else {
          console.error('No access token available for backup code generation')
          setError(t('errors.backupCodeGenerationFailed'))
        }
      } catch (err) {
        console.error('Failed to generate backup codes:', err)
        setError(t('errors.backupCodeGenerationFailed'))
      }

      // Always advance to backup codes step - MFA is already verified
      setStep('backup-codes')
    } catch {
      setError(t('errors.verifyFailed'))
    }

    setIsLoading(false)
  }

  const handleComplete = () => {
    onComplete()
  }

  // Start enrollment when component mounts (useEffect prevents double-execution in StrictMode)
  useEffect(() => {
    if (!enrollStartedRef.current) {
      enrollStartedRef.current = true
      startEnrollment()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="w-full max-w-lg mx-auto space-y-6">
      <div className="text-center space-y-2">
        <div className="flex justify-center">
          <Shield className="h-12 w-12 text-primary" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{t('setup.title')}</h1>
        <p className="text-muted-foreground">{t('setup.description')}</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2">
        <StepIndicator step={1} active={step === 'qr-code'} completed={step !== 'qr-code'} />
        <div className="w-8 h-0.5 bg-muted" />
        <StepIndicator step={2} active={step === 'verify'} completed={step === 'backup-codes'} />
        <div className="w-8 h-0.5 bg-muted" />
        <StepIndicator step={3} active={step === 'backup-codes'} completed={false} />
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Step 1: QR Code */}
      {step === 'qr-code' && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">{t('setup.step1Title')}</CardTitle>
            </div>
            <CardDescription>{t('setup.step1Description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isEnrolling ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : qrCode ? (
              <>
                {/* QR Code */}
                <div className="flex justify-center">
                  <div className="p-4 bg-white rounded-lg border">
                    <img
                      src={qrCode}
                      alt="MFA QR Code"
                      className="w-48 h-48"
                    />
                  </div>
                </div>

                {/* Manual code */}
                <div className="space-y-2">
                  <p className="text-sm font-medium">{t('setup.manualCode')}</p>
                  <p className="text-xs text-muted-foreground">{t('setup.manualCodeDescription')}</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 p-3 bg-muted rounded-md text-sm font-mono break-all select-all">
                      {secret}
                    </code>
                    <CopyButton text={secret} />
                  </div>
                </div>

                <Button
                  className="w-full"
                  onClick={() => setStep('verify')}
                >
                  {tActions('next')}
                </Button>
              </>
            ) : null}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Verify Code */}
      {step === 'verify' && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">{t('setup.step2Title')}</CardTitle>
            </div>
            <CardDescription>{t('setup.step2Description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mfa-code">{t('setup.codeLabel')}</Label>
              <Input
                id="mfa-code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder={t('setup.codePlaceholder')}
                value={verifyCode}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '')
                  setVerifyCode(value)
                }}
                autoFocus
                autoComplete="one-time-code"
                className="text-center text-2xl tracking-[0.5em] font-mono"
                aria-describedby={error ? 'verify-error' : undefined}
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setStep('qr-code')
                  setVerifyCode('')
                  setError(null)
                }}
              >
                {tActions('back')}
              </Button>
              <Button
                className="flex-1"
                onClick={handleVerify}
                disabled={verifyCode.length !== 6 || isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('verify.verifying')}
                  </>
                ) : (
                  t('setup.verifyCode')
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Backup Codes */}
      {step === 'backup-codes' && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">{t('setup.step3Title')}</CardTitle>
            </div>
            <CardDescription>{t('setup.step3Description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <BackupCodesDisplay codes={backupCodes} />

            <div className="flex items-center space-x-2">
              <Checkbox
                id="codes-saved"
                checked={codesSaved}
                onCheckedChange={(checked) => setCodesSaved(checked === true)}
              />
              <Label htmlFor="codes-saved" className="text-sm cursor-pointer">
                {t('backup.confirmSaved')}
              </Label>
            </div>

            <Button
              className="w-full"
              onClick={handleComplete}
              disabled={backupCodes.length > 0 && !codesSaved}
            >
              {tActions('confirm')}
            </Button>
          </CardContent>
        </Card>
      )}

      <p className="text-center text-sm text-muted-foreground">
        {t('setup.mandatory')}
      </p>
    </div>
  )
}

function StepIndicator({ step, active, completed }: { step: number; active: boolean; completed: boolean }) {
  return (
    <div
      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
        active
          ? 'bg-primary text-primary-foreground'
          : completed
            ? 'bg-primary/20 text-primary'
            : 'bg-muted text-muted-foreground'
      }`}
    >
      {completed ? <Check className="h-4 w-4" /> : step}
    </div>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Button variant="outline" size="icon" onClick={handleCopy} aria-label="Copy">
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    </Button>
  )
}

