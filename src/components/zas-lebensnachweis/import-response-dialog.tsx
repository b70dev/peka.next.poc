'use client'

import { useCallback, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/routing'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertTriangle } from 'lucide-react'

interface ImportResponseDialogProps {
  runId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

const MAX_BYTES = 10 * 1024 * 1024 // 10 MB
const HELP_ID = 'zas-import-help'
const NOT_IMPL_ID = 'zas-import-not-impl'

/**
 * PROJ-23: Upload form for the ZAS eCH-0086 response XML.
 * The backend currently returns 501 Not Implemented for this
 * endpoint; we surface that clearly via a permanent inline notice
 * and a toast on submit.
 */
export function ImportResponseDialog({
  runId,
  open,
  onOpenChange,
}: ImportResponseDialogProps) {
  const t = useTranslations('zasLifeVerification.import')
  const tToasts = useTranslations('zasLifeVerification.toasts')
  const tActions = useTranslations('actions')
  const router = useRouter()

  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const reset = useCallback(() => {
    setFile(null)
    setError(null)
    if (inputRef.current) inputRef.current.value = ''
  }, [])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setError(null)

      if (!file) {
        setError(t('fileRequired'))
        return
      }
      if (file.size > MAX_BYTES) {
        setError(t('fileTooLarge'))
        return
      }
      const isXml =
        file.type === 'application/xml' ||
        file.type === 'text/xml' ||
        file.name.toLowerCase().endsWith('.xml')
      if (!isXml) {
        setError(t('fileWrongType'))
        return
      }

      setLoading(true)
      try {
        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch(
          `/api/zas-runs/${runId}/import-response`,
          {
            method: 'POST',
            body: formData,
          }
        )

        if (response.status === 501) {
          // Expected today — parser stub.
          toast.warning(tToasts('importNotImplemented'))
          onOpenChange(false)
          reset()
          return
        }

        if (!response.ok) {
          const body = await response.json().catch(() => ({}))
          console.error('Import response failed:', response.status, body)
          setError(t('genericError'))
          return
        }

        // Once the parser is wired up we'd surface a success toast
        // and refresh the page to load the deaths.
        toast.success(t('submit'))
        onOpenChange(false)
        reset()
        router.refresh()
      } catch (err) {
        console.error('Import response exception:', err)
        setError(t('genericError'))
      } finally {
        setLoading(false)
      }
    },
    [file, onOpenChange, reset, router, runId, t, tToasts]
  )

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset()
        onOpenChange(o)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        <div
          id={NOT_IMPL_ID}
          className="rounded-md border border-amber-500/50 bg-amber-500/5 p-3 text-sm flex gap-2"
          role="status"
        >
          <AlertTriangle
            className="h-4 w-4 text-amber-600 flex-none mt-0.5"
            aria-hidden="true"
          />
          <div>
            <p className="font-semibold">{t('notImplementedTitle')}</p>
            <p className="text-muted-foreground mt-1">
              {t('notImplementedHint')}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="zas-response-file">{t('fileLabel')}</Label>
            <Input
              ref={inputRef}
              id="zas-response-file"
              type="file"
              accept=".xml,application/xml,text/xml"
              onChange={(e) => {
                const next = e.target.files?.[0] ?? null
                setFile(next)
                setError(null)
              }}
              aria-describedby={`${HELP_ID} ${NOT_IMPL_ID}`}
              aria-invalid={Boolean(error)}
              required
              disabled={loading}
            />
            <p id={HELP_ID} className="text-xs text-muted-foreground">
              {t('fileHelp')}
            </p>
            {error && (
              <p
                className="text-sm text-destructive"
                role="alert"
                aria-live="assertive"
              >
                {error}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              {tActions('cancel')}
            </Button>
            <Button type="submit" disabled={loading || !file}>
              {loading && (
                <span
                  className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                  aria-hidden="true"
                />
              )}
              {t('submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
