'use client'

import { useCallback, useState } from 'react'
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

interface CreateZasRunDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * PROJ-23: Confirmation dialog to start a new ZAS Lebensnachweis run.
 * The backend computes the active-pensioner count, so we just confirm
 * the action; on success we navigate to the new run's detail page.
 */
export function CreateZasRunDialog({ open, onOpenChange }: CreateZasRunDialogProps) {
  const t = useTranslations('zasLifeVerification')
  const tActions = useTranslations('actions')
  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/zas-runs', { method: 'POST' })
      const data = (await response.json().catch(() => ({}))) as {
        error?: string
        id?: string
      }

      if (!response.ok) {
        if (response.status === 422 && data.error === 'no_active_pensioners') {
          setError(t('create.noPensioners'))
          return
        }
        setError(t('create.error'))
        return
      }

      const newId = typeof data.id === 'string' ? data.id : null
      onOpenChange(false)
      toast.success(t('toasts.runCreated'))

      if (newId) {
        router.push(`/zas-lebensnachweis/${newId}` as never)
      } else {
        router.refresh()
      }
    } catch (err) {
      console.error('Create ZAS run exception:', err)
      setError(t('create.error'))
    } finally {
      setLoading(false)
    }
  }, [t, onOpenChange, router])

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setError(null)
        onOpenChange(o)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('create.title')}</DialogTitle>
          <DialogDescription>{t('create.description')}</DialogDescription>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">{t('create.info')}</p>

        {error && (
          <p
            className="text-sm text-destructive"
            role="alert"
            aria-live="assertive"
          >
            {error}
          </p>
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
          <Button type="button" onClick={handleConfirm} disabled={loading}>
            {loading && (
              <span
                className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                aria-hidden="true"
              />
            )}
            {t('create.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
