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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CreatePaymentRunDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** If provided, navigate to the detail page after creation instead of refreshing */
  navigateToDetailOnSuccess?: boolean
}

export function CreatePaymentRunDialog({
  open,
  onOpenChange,
  navigateToDetailOnSuccess = true,
}: CreatePaymentRunDialogProps) {
  const t = useTranslations('paymentRuns')
  const tActions = useTranslations('actions')
  const tA11y = useTranslations('accessibility')
  const router = useRouter()

  const [name, setName] = useState('')
  const [executionDate, setExecutionDate] = useState<Date | undefined>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [calendarOpen, setCalendarOpen] = useState(false)

  const reset = useCallback(() => {
    setName('')
    setExecutionDate(undefined)
    setError(null)
  }, [])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!name.trim()) {
        setError(t('create.nameRequired'))
        return
      }

      setLoading(true)
      setError(null)
      try {
        const response = await fetch('/api/payment-runs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            execution_date: executionDate ? executionDate.toISOString().split('T')[0] : null,
          }),
        })

        const data = await response.json().catch(() => ({}))
        if (!response.ok) {
          console.error('Create payment run failed:', response.status, data)
          setError(data.error || t('create.error'))
          return
        }

        reset()
        onOpenChange(false)
        if (navigateToDetailOnSuccess && data.id) {
          router.push(`/payment-runs/${data.id}` as never)
        } else {
          router.refresh()
        }
      } catch (err) {
        console.error('Create payment run exception:', err)
        setError(t('create.error'))
      } finally {
        setLoading(false)
      }
    },
    [name, executionDate, t, onOpenChange, router, navigateToDetailOnSuccess, reset]
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
          <DialogTitle>{t('create.title')}</DialogTitle>
          <DialogDescription>{t('create.description')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="run-name">
              {t('create.name')}{' '}
              <span className="text-destructive" aria-hidden="true">*</span>
              <span className="sr-only">({tA11y('requiredField')})</span>
            </Label>
            <Input
              id="run-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('create.namePlaceholder')}
              maxLength={200}
              autoFocus
              required
              aria-required="true"
              aria-invalid={!!error}
              aria-describedby={error ? 'run-name-error' : undefined}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="run-execution-date">{t('create.executionDate')}</Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  id="run-execution-date"
                  type="button"
                  variant="outline"
                  className={cn('w-full justify-start text-left font-normal', !executionDate && 'text-muted-foreground')}
                  aria-label={tA11y('selectDate')}
                  aria-haspopup="dialog"
                  aria-expanded={calendarOpen}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" aria-hidden="true" />
                  {executionDate ? executionDate.toLocaleDateString() : t('create.executionDatePlaceholder')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={executionDate}
                  onSelect={(d) => {
                    setExecutionDate(d)
                    setCalendarOpen(false)
                  }}
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                />
              </PopoverContent>
            </Popover>
          </div>

          {error && (
            <p
              id="run-name-error"
              className="text-sm text-destructive"
              role="alert"
              aria-live="assertive"
            >
              {error}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              {tActions('cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && (
                <span
                  className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                  aria-hidden="true"
                />
              )}
              {t('create.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
