'use client'

import { useState, useCallback } from 'react'
import { useRouter } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface RejectRunDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  runId: string
}

export function RejectRunDialog({ open, onOpenChange, runId }: RejectRunDialogProps) {
  const t = useTranslations('paymentRuns')
  const tActions = useTranslations('actions')
  const router = useRouter()

  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (reason.trim().length < 5) {
        setError(t('reject.reasonTooShort'))
        return
      }

      setLoading(true)
      setError(null)
      try {
        const response = await fetch(`/api/payment-runs/${runId}/reject`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: reason.trim() }),
        })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) {
          console.error('Reject failed:', response.status, data)
          setError(data.error || t('reject.error'))
          return
        }

        setReason('')
        onOpenChange(false)
        router.refresh()
      } catch (err) {
        console.error('Reject exception:', err)
        setError(t('reject.error'))
      } finally {
        setLoading(false)
      }
    },
    [reason, runId, onOpenChange, router, t]
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('reject.title')}</DialogTitle>
          <DialogDescription>{t('reject.description')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleConfirm} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reject-reason">
              {t('reject.reason')} <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="reject-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('reject.reasonPlaceholder')}
              maxLength={2000}
              rows={4}
              aria-invalid={!!error}
              autoFocus
            />
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              {tActions('cancel')}
            </Button>
            <Button type="submit" variant="destructive" disabled={loading}>
              {loading && (
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              )}
              {t('reject.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
