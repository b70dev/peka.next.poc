'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Loader2, Shield, Smartphone, Key, AlertTriangle, Mail } from 'lucide-react'
import { BackupCodesDisplay } from './backup-codes-display'

export function MfaSettings() {
  const t = useTranslations('auth.mfa')
  const tActions = useTranslations('actions')
  const [factorCreatedAt, setFactorCreatedAt] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showNewDeviceDialog, setShowNewDeviceDialog] = useState(false)
  const [showBackupCodesDialog, setShowBackupCodesDialog] = useState(false)
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false)
  const [confirmCode, setConfirmCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [backupStatus, setBackupStatus] = useState<{ total: number; used: number; remaining: number; warning: boolean } | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    loadMfaStatus()
  }, [])

  const getAccessToken = async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token ?? null
  }

  const loadMfaStatus = async () => {
    try {
      const { data } = await supabase.auth.mfa.listFactors()
      const totpFactor = data?.totp?.[0]

      if (totpFactor) {
        setFactorCreatedAt(totpFactor.created_at)
      }

      // Load backup code status
      const token = await getAccessToken()
      if (token) {
        const statusResponse = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/mfa-backup-codes?action=status`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            },
          }
        )
        if (statusResponse.ok) {
          setBackupStatus(await statusResponse.json())
        }
      }
    } catch {
      // Factor loading failed
    }
    setIsLoading(false)
  }

  const handleNewDevice = async () => {
    if (confirmCode.length !== 6) return

    setIsProcessing(true)
    setError(null)

    try {
      const { data: factorsData } = await supabase.auth.mfa.listFactors()
      const totpFactor = factorsData?.totp?.[0]

      if (!totpFactor) {
        setError(t('errors.verifyFailed'))
        setIsProcessing(false)
        return
      }

      // Verify current code first
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: totpFactor.id,
      })

      if (challengeError) {
        setError(t('errors.challengeFailed'))
        setIsProcessing(false)
        return
      }

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: challengeData.id,
        code: confirmCode,
      })

      if (verifyError) {
        setError(t('errors.invalidCode'))
        setConfirmCode('')
        setIsProcessing(false)
        return
      }

      // Unenroll the old factor
      await supabase.auth.mfa.unenroll({ factorId: totpFactor.id })

      // Redirect to MFA setup
      window.location.href = '/mfa/setup'
    } catch {
      setError(t('errors.verifyFailed'))
    }

    setIsProcessing(false)
  }

  const handleRegenerateBackupCodes = async () => {
    if (confirmCode.length !== 6) return

    setIsProcessing(true)
    setError(null)

    try {
      const { data: factorsData } = await supabase.auth.mfa.listFactors()
      const totpFactor = factorsData?.totp?.[0]

      if (!totpFactor) {
        setError(t('errors.verifyFailed'))
        setIsProcessing(false)
        return
      }

      // Verify current TOTP code first
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: totpFactor.id,
      })

      if (challengeError) {
        setError(t('errors.challengeFailed'))
        setIsProcessing(false)
        return
      }

      const { data: verifyData, error: verifyError } = await supabase.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: challengeData.id,
        code: confirmCode,
      })

      if (verifyError) {
        setError(t('errors.invalidCode'))
        setConfirmCode('')
        setIsProcessing(false)
        return
      }

      // Use the session from mfa.verify() directly to avoid stale token issues
      let accessToken: string | undefined = verifyData?.access_token
      if (!accessToken) {
        accessToken = await getAccessToken() ?? undefined
      }
      if (!accessToken) {
        setError(t('errors.verifyFailed'))
        setIsProcessing(false)
        return
      }

      // Generate new backup codes via Edge Function
      const response = await fetch(
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

      if (response.ok) {
        const data = await response.json()
        setBackupCodes(data.codes)
        setBackupStatus({ total: data.codes.length, used: 0, remaining: data.codes.length, warning: false })
        setShowRegenerateDialog(false)
        setShowBackupCodesDialog(true)
        setConfirmCode('')
      } else {
        setError(t('backup.regenerateError'))
      }
    } catch {
      setError(t('errors.verifyFailed'))
    }

    setIsProcessing(false)
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* MFA Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <CardTitle className="text-lg">{t('settings.title')}</CardTitle>
              <CardDescription>{t('settings.description')}</CardDescription>
            </div>
            <Badge variant="default" className="bg-green-500/10 text-green-700 border-green-500/20">
              Aktiv
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {factorCreatedAt && (
            <p className="text-sm text-muted-foreground">
              {t('settings.activeSince', {
                date: new Date(factorCreatedAt).toLocaleDateString(),
              })}
            </p>
          )}
        </CardContent>
      </Card>

      {/* New Device */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Smartphone className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-lg">{t('settings.newDevice')}</CardTitle>
              <CardDescription>{t('settings.newDeviceDescription')}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={() => {
              setShowNewDeviceDialog(true)
              setConfirmCode('')
              setError(null)
            }}
          >
            {t('settings.newDevice')}
          </Button>
        </CardContent>
      </Card>

      {/* Backup Codes */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Key className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-lg">{t('settings.backupCodes')}</CardTitle>
              <CardDescription>{t('settings.backupCodesDescription')}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {backupStatus && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {t('backup.codesRemaining', { count: backupStatus.remaining, total: backupStatus.total })}
              </p>
              {backupStatus.warning && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{t('backup.warningLow', { count: backupStatus.remaining })}</AlertDescription>
                </Alert>
              )}
              {backupStatus.remaining === 0 && backupStatus.total > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{t('backup.allUsed')}</AlertDescription>
                </Alert>
              )}
            </div>
          )}
          {!backupStatus && (
            <p className="text-sm text-muted-foreground">
              {t('backup.codesRemaining', { count: 0, total: 0 })}
            </p>
          )}
          <Button
            variant="outline"
            onClick={() => {
              setShowRegenerateDialog(true)
              setConfirmCode('')
              setError(null)
            }}
          >
            {t('backup.regenerate')}
          </Button>
        </CardContent>
      </Card>

      {/* Recovery Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <div>
              <CardTitle className="text-lg">{t('settings.recoveryInfo')}</CardTitle>
              <CardDescription>{t('settings.recoveryDescription')}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Button variant="outline" size="sm">
            <Mail className="mr-2 h-4 w-4" />
            {t('settings.contactAdmin')}
          </Button>
        </CardContent>
      </Card>

      {/* New Device Dialog */}
      <Dialog open={showNewDeviceDialog} onOpenChange={setShowNewDeviceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('settings.newDevice')}</DialogTitle>
            <DialogDescription>{t('settings.newDeviceConfirm')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="confirm-code-device">{t('verify.codeLabel')}</Label>
              <Input
                id="confirm-code-device"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder={t('verify.codePlaceholder')}
                value={confirmCode}
                onChange={(e) => setConfirmCode(e.target.value.replace(/\D/g, ''))}
                className="text-center text-xl tracking-[0.5em] font-mono"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDeviceDialog(false)}>
              {tActions('cancel')}
            </Button>
            <Button
              onClick={handleNewDevice}
              disabled={confirmCode.length !== 6 || isProcessing}
            >
              {isProcessing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {tActions('confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Regenerate Backup Codes Dialog */}
      <Dialog open={showRegenerateDialog} onOpenChange={setShowRegenerateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('backup.regenerate')}</DialogTitle>
            <DialogDescription>{t('backup.regenerateConfirm')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="confirm-code-backup">{t('settings.newDeviceConfirm')}</Label>
              <Input
                id="confirm-code-backup"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder={t('verify.codePlaceholder')}
                value={confirmCode}
                onChange={(e) => setConfirmCode(e.target.value.replace(/\D/g, ''))}
                className="text-center text-xl tracking-[0.5em] font-mono"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRegenerateDialog(false)}>
              {tActions('cancel')}
            </Button>
            <Button
              onClick={handleRegenerateBackupCodes}
              disabled={confirmCode.length !== 6 || isProcessing}
            >
              {isProcessing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {t('backup.regenerate')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Show Backup Codes Dialog */}
      <Dialog open={showBackupCodesDialog} onOpenChange={setShowBackupCodesDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('backup.title')}</DialogTitle>
            <DialogDescription>{t('backup.description')}</DialogDescription>
          </DialogHeader>
          {backupCodes.length > 0 && (
            <BackupCodesDisplay codes={backupCodes} />
          )}
          <DialogFooter>
            <Button onClick={() => setShowBackupCodesDialog(false)}>
              {tActions('close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
