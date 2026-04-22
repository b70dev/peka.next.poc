'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
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

interface EditPensionAmountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  accountId: string
  currentAmount: number | null
}

/**
 * PROJ-24: Admin dialog to edit the monthly pension amount on a pension account.
 * Calls PATCH /api/pensioners/[accountId]/pension-amount.
 */
export function EditPensionAmountDialog({
  open,
  onOpenChange,
  accountId,
  currentAmount,
}: EditPensionAmountDialogProps) {
  const t = useTranslations('pensioners.detail')
  const tActions = useTranslations('actions')
  const router = useRouter()
  const [amount, setAmount] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset form state whenever the dialog opens
  useEffect(() => {
    if (open) {
      setAmount(currentAmount !== null ? String(currentAmount) : '')
      setError(null)
    }
  }, [open, currentAmount])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const parsed = Number(amount.replace(',', '.'))
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError(t('amountInvalid'))
      return
    }

    setIsSaving(true)
    try {
      const res = await fetch(
        `/api/pensioners/${encodeURIComponent(accountId)}/pension-amount`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ monthly_pension_amount: parsed }),
        }
      )

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `HTTP ${res.status}`)
      }

      toast.success(t('saveSuccess'))
      onOpenChange(false)
      router.refresh()
    } catch (err) {
      console.error('Save pension amount failed:', err)
      const message = err instanceof Error ? err.message : t('saveError')
      setError(message)
      toast.error(t('saveError'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t('editAmountTitle')}</DialogTitle>
            <DialogDescription>{t('editAmountDescription')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="monthly-pension-amount">{t('amountLabel')}</Label>
              <Input
                id="monthly-pension-amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                placeholder={t('amountPlaceholder')}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? 'pension-amount-error' : undefined}
                autoFocus
              />
              {error && (
                <p
                  id="pension-amount-error"
                  className="text-sm text-destructive"
                  role="alert"
                >
                  {error}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              {tActions('cancel')}
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
              )}
              {tActions('save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
