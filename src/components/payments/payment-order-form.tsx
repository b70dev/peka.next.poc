'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon } from 'lucide-react'
import { validateIBANInput, formatIBANForDisplay } from '@/lib/iban-validation'
import { cn } from '@/lib/utils'

export interface PaymentOrderFormData {
  recipientName: string
  iban: string
  amount: string
  purpose: string
  referenceNumber: string
  executionDate: Date | undefined
  note: string
}

export interface PaymentOrderFormErrors {
  recipientName?: string
  iban?: string
  amount?: string
  purpose?: string
}

interface PaymentOrderFormProps {
  initialData?: PaymentOrderFormData
  onSubmit: (data: PaymentOrderFormData) => void
  onForeignIBANDetected: (countryCode: string) => Promise<boolean>
  loading: boolean
  errors: PaymentOrderFormErrors
  submitLabel: string
  onCancel: () => void
}

export function PaymentOrderForm({
  initialData,
  onSubmit,
  onForeignIBANDetected,
  loading,
  errors,
  submitLabel,
  onCancel,
}: PaymentOrderFormProps) {
  const t = useTranslations('paymentOrders.create')
  const tValidation = useTranslations('paymentOrders.validation')
  const tActions = useTranslations('actions')

  const [formData, setFormData] = useState<PaymentOrderFormData>(
    initialData || {
      recipientName: '',
      iban: '',
      amount: '',
      purpose: '',
      referenceNumber: '',
      executionDate: undefined,
      note: '',
    }
  )

  const [ibanError, setIbanError] = useState<string | null>(null)
  const [localErrors, setLocalErrors] = useState<PaymentOrderFormErrors>({})
  const [calendarOpen, setCalendarOpen] = useState(false)

  const updateField = useCallback(
    <K extends keyof PaymentOrderFormData>(key: K, value: PaymentOrderFormData[K]) => {
      setFormData((prev) => ({ ...prev, [key]: value }))
      // Clear local error when user types
      setLocalErrors((prev) => ({ ...prev, [key]: undefined }))
    },
    []
  )

  const handleIBANChange = useCallback(
    (value: string) => {
      updateField('iban', value)
      if (value.replace(/\s/g, '').length >= 5) {
        const result = validateIBANInput(value)
        if (!result.valid && result.errorMessage) {
          setIbanError(tValidation(result.errorMessage as never))
        } else {
          setIbanError(null)
        }
      } else {
        setIbanError(null)
      }
    },
    [updateField, tValidation]
  )

  const handleIBANBlur = useCallback(() => {
    if (formData.iban) {
      const result = validateIBANInput(formData.iban)
      if (result.valid && result.formattedIBAN) {
        // Update display with formatted IBAN
        setFormData((prev) => ({ ...prev, iban: result.formattedIBAN! }))
      }
    }
  }, [formData.iban])

  const validate = useCallback((): boolean => {
    const newErrors: PaymentOrderFormErrors = {}

    if (!formData.recipientName.trim()) {
      newErrors.recipientName = tValidation('recipientNameRequired')
    }

    if (!formData.iban.trim()) {
      newErrors.iban = tValidation('ibanRequired')
    } else {
      const result = validateIBANInput(formData.iban)
      if (!result.valid) {
        newErrors.iban = result.errorMessage
          ? tValidation(result.errorMessage as never)
          : tValidation('ibanInvalidFormat')
      }
    }

    const amount = parseFloat(formData.amount)
    if (!formData.amount) {
      newErrors.amount = tValidation('amountRequired')
    } else if (isNaN(amount) || amount <= 0) {
      newErrors.amount = tValidation('amountPositive')
    }

    if (!formData.purpose.trim()) {
      newErrors.purpose = tValidation('purposeRequired')
    } else if (formData.purpose.length > 140) {
      newErrors.purpose = tValidation('purposeMaxLength')
    }

    setLocalErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData, tValidation])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      if (!validate()) return

      // Check for foreign IBAN
      const ibanResult = validateIBANInput(formData.iban)
      if (ibanResult.isForeignIBAN && ibanResult.countryCode) {
        const confirmed = await onForeignIBANDetected(ibanResult.countryCode)
        if (!confirmed) return
      }

      onSubmit(formData)
    },
    [formData, validate, onForeignIBANDetected, onSubmit]
  )

  const combinedErrors = { ...localErrors, ...errors }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Recipient Name */}
      <div className="space-y-2">
        <Label htmlFor="recipient-name">
          {t('recipientName')} <span className="text-destructive">*</span>
        </Label>
        <Input
          id="recipient-name"
          value={formData.recipientName}
          onChange={(e) => updateField('recipientName', e.target.value)}
          placeholder={t('recipientNamePlaceholder')}
          maxLength={140}
          aria-invalid={!!combinedErrors.recipientName}
          aria-describedby={combinedErrors.recipientName ? 'recipient-name-error' : undefined}
        />
        {combinedErrors.recipientName && (
          <p id="recipient-name-error" className="text-sm text-destructive" role="alert">
            {combinedErrors.recipientName}
          </p>
        )}
      </div>

      {/* IBAN */}
      <div className="space-y-2">
        <Label htmlFor="iban">
          {t('iban')} <span className="text-destructive">*</span>
        </Label>
        <Input
          id="iban"
          value={formData.iban}
          onChange={(e) => handleIBANChange(e.target.value)}
          onBlur={handleIBANBlur}
          placeholder={t('ibanPlaceholder')}
          maxLength={42}
          className="font-mono"
          aria-invalid={!!(ibanError || combinedErrors.iban)}
          aria-describedby={ibanError || combinedErrors.iban ? 'iban-error' : undefined}
        />
        {(ibanError || combinedErrors.iban) && (
          <p id="iban-error" className="text-sm text-destructive" role="alert">
            {ibanError || combinedErrors.iban}
          </p>
        )}
      </div>

      {/* Amount */}
      <div className="space-y-2">
        <Label htmlFor="amount">
          {t('amount')} <span className="text-destructive">*</span>
        </Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          min="0.01"
          value={formData.amount}
          onChange={(e) => updateField('amount', e.target.value)}
          placeholder={t('amountPlaceholder')}
          className="tabular-nums"
          aria-invalid={!!combinedErrors.amount}
          aria-describedby={combinedErrors.amount ? 'amount-error' : undefined}
        />
        {combinedErrors.amount && (
          <p id="amount-error" className="text-sm text-destructive" role="alert">
            {combinedErrors.amount}
          </p>
        )}
      </div>

      {/* Purpose */}
      <div className="space-y-2">
        <Label htmlFor="purpose">
          {t('purpose')} <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="purpose"
          value={formData.purpose}
          onChange={(e) => updateField('purpose', e.target.value.slice(0, 140))}
          placeholder={t('purposePlaceholder')}
          maxLength={140}
          rows={2}
          aria-invalid={!!combinedErrors.purpose}
          aria-describedby="purpose-char-count"
        />
        <p id="purpose-char-count" className="text-xs text-muted-foreground">
          {t('purposeCharCount', { count: formData.purpose.length })}
        </p>
        {combinedErrors.purpose && (
          <p className="text-sm text-destructive" role="alert">
            {combinedErrors.purpose}
          </p>
        )}
      </div>

      {/* Reference Number (optional) */}
      <div className="space-y-2">
        <Label htmlFor="reference-number">{t('referenceNumber')}</Label>
        <Input
          id="reference-number"
          value={formData.referenceNumber}
          onChange={(e) => updateField('referenceNumber', e.target.value)}
          placeholder={t('referenceNumberPlaceholder')}
          maxLength={35}
        />
      </div>

      {/* Execution Date (optional) */}
      <div className="space-y-2">
        <Label htmlFor="execution-date">{t('executionDate')}</Label>
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              id="execution-date"
              variant="outline"
              className={cn(
                'w-full justify-start text-left font-normal',
                !formData.executionDate && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" aria-hidden="true" />
              {formData.executionDate
                ? formData.executionDate.toLocaleDateString()
                : t('executionDatePlaceholder')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={formData.executionDate}
              onSelect={(date) => {
                updateField('executionDate', date)
                setCalendarOpen(false)
              }}
              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Internal Note (optional) */}
      <div className="space-y-2">
        <Label htmlFor="note">{t('note')}</Label>
        <Textarea
          id="note"
          value={formData.note}
          onChange={(e) => updateField('note', e.target.value)}
          placeholder={t('notePlaceholder')}
          rows={2}
        />
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          {tActions('cancel')}
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && (
            <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          )}
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
