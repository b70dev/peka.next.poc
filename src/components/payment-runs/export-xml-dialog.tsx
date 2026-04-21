'use client'

import { useState, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/routing'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Download } from 'lucide-react'
import { DEFAULT_PAIN001_VERSION } from '@/lib/payment-run-exports.types'
import type { Pain001ValidationError } from '@/lib/payment-run-exports.types'

interface ExportXmlDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  runId: string
  /** If true, the debtor settings have all mandatory fields filled in. */
  debtorConfigured: boolean
}

export function ExportXmlDialog({
  open,
  onOpenChange,
  runId,
  debtorConfigured,
}: ExportXmlDialogProps) {
  const t = useTranslations('paymentRuns.export')
  const tActions = useTranslations('actions')
  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<Pain001ValidationError[]>([])

  useEffect(() => {
    if (!open) return
    setError(null)
    setValidationErrors([])
  }, [open])

  const handleExport = useCallback(async () => {
    setLoading(true)
    setError(null)
    setValidationErrors([])
    try {
      const response = await fetch(`/api/payment-runs/${runId}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pain_version: DEFAULT_PAIN001_VERSION }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        if (
          (data.code === 'validation_failed' || data.code === 'xsd_validation_failed') &&
          Array.isArray(data.errors)
        ) {
          setValidationErrors(data.errors)
        }
        setError(data.error || t('genericError'))
        return
      }

      const blob = await response.blob()
      const filename =
        response.headers
          .get('Content-Disposition')
          ?.match(/filename="([^"]+)"/)?.[1] ?? 'pain001.xml'
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)

      onOpenChange(false)
      router.refresh()
    } catch (err) {
      console.error('Export failed:', err)
      setError(t('genericError'))
    } finally {
      setLoading(false)
    }
  }, [runId, onOpenChange, router, t])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        {!debtorConfigured && (
          <div
            className="rounded-lg border border-amber-500/50 bg-amber-500/5 p-4 text-sm"
            role="alert"
          >
            <div className="flex items-start gap-2">
              <AlertTriangle
                className="h-4 w-4 mt-0.5 text-amber-600 flex-shrink-0"
                aria-hidden="true"
              />
              <p>{t('debtorMissing')}</p>
            </div>
          </div>
        )}

        <div className="space-y-1 rounded-md border bg-muted/30 p-3 text-sm">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {t('versionLabel')}
          </p>
          <p className="font-mono">{DEFAULT_PAIN001_VERSION}</p>
          <p className="text-xs text-muted-foreground">{t('versionHint')}</p>
        </div>

        {error && (
          <div
            className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive"
            role="alert"
          >
            <p className="font-medium">{error}</p>
            {validationErrors.length > 0 && (
              <ul className="mt-2 space-y-1 list-disc list-inside">
                {validationErrors.slice(0, 10).map((e, idx) => (
                  <li key={idx} className="text-xs">
                    <span className="font-mono">{e.field}</span>
                    {e.recipient_name && ` [${e.recipient_name}]`}
                    {e.line ? ` (line ${e.line})` : ''}: {e.message}
                  </li>
                ))}
                {validationErrors.length > 10 && (
                  <li className="text-xs italic">
                    {t('moreErrors', { count: validationErrors.length - 10 })}
                  </li>
                )}
              </ul>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {tActions('cancel')}
          </Button>
          <Button type="button" onClick={handleExport} disabled={loading || !debtorConfigured}>
            {loading ? (
              <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Download className="h-4 w-4 mr-2" aria-hidden="true" />
            )}
            {t('submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
