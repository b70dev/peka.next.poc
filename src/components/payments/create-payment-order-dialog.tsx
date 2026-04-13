'use client'

import { useState, useCallback } from 'react'
import { useRouter } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { PaymentOrderForm, type PaymentOrderFormData, type PaymentOrderFormErrors } from './payment-order-form'
import { ForeignIBANWarningDialog } from './foreign-iban-warning-dialog'
import { normalizeIBAN } from '@/lib/iban-validation'
import type { DuplicateCheckResult } from '@/lib/payment-orders.types'

interface CreatePaymentOrderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreatePaymentOrderDialog({ open, onOpenChange }: CreatePaymentOrderDialogProps) {
  const t = useTranslations('paymentOrders')
  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<PaymentOrderFormErrors>({})

  // Foreign IBAN warning state
  const [foreignIbanOpen, setForeignIbanOpen] = useState(false)
  const [foreignCountryCode, setForeignCountryCode] = useState('')
  const [foreignIbanResolver, setForeignIbanResolver] = useState<{
    resolve: (confirmed: boolean) => void
  } | null>(null)

  // Duplicate warning state
  const [duplicateWarningOpen, setDuplicateWarningOpen] = useState(false)
  const [duplicates, setDuplicates] = useState<DuplicateCheckResult['duplicates']>([])
  const [pendingFormData, setPendingFormData] = useState<PaymentOrderFormData | null>(null)

  const handleForeignIBANDetected = useCallback(
    (countryCode: string): Promise<boolean> => {
      return new Promise((resolve) => {
        setForeignCountryCode(countryCode)
        setForeignIbanOpen(true)
        setForeignIbanResolver({ resolve })
      })
    },
    []
  )

  const handleForeignIbanConfirm = useCallback(() => {
    setForeignIbanOpen(false)
    foreignIbanResolver?.resolve(true)
    setForeignIbanResolver(null)
  }, [foreignIbanResolver])

  const handleForeignIbanCancel = useCallback(() => {
    setForeignIbanOpen(false)
    foreignIbanResolver?.resolve(false)
    setForeignIbanResolver(null)
  }, [foreignIbanResolver])

  const submitOrder = useCallback(
    async (formData: PaymentOrderFormData, force: boolean) => {
      setLoading(true)
      setErrors({})

      try {
        const response = await fetch('/api/payment-orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipient_name: formData.recipientName,
            iban: normalizeIBAN(formData.iban),
            amount: parseFloat(formData.amount),
            currency: 'CHF',
            purpose: formData.purpose,
            reference_number: formData.referenceNumber || null,
            execution_date: formData.executionDate
              ? formData.executionDate.toISOString().split('T')[0]
              : null,
            note: formData.note || null,
            force,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          // Handle duplicate warning
          if (response.status === 409 && data.error === 'duplicate_warning') {
            setDuplicates(data.duplicates)
            setPendingFormData(formData)
            setDuplicateWarningOpen(true)
            return
          }

          setErrors({ recipientName: data.error || t('create.error') })
          return
        }

        // Success — close dialog and refresh page data
        onOpenChange(false)
        router.refresh()
      } catch {
        setErrors({ recipientName: t('create.error') })
      } finally {
        setLoading(false)
      }
    },
    [onOpenChange, router, t]
  )

  const handleSubmit = useCallback(
    (formData: PaymentOrderFormData) => {
      submitOrder(formData, false)
    },
    [submitOrder]
  )

  const handleDuplicateConfirm = useCallback(() => {
    setDuplicateWarningOpen(false)
    if (pendingFormData) {
      submitOrder(pendingFormData, true)
    }
    setPendingFormData(null)
    setDuplicates([])
  }, [pendingFormData, submitOrder])

  const handleDuplicateCancel = useCallback(() => {
    setDuplicateWarningOpen(false)
    setPendingFormData(null)
    setDuplicates([])
  }, [])

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('create.title')}</DialogTitle>
            <DialogDescription>{t('create.description')}</DialogDescription>
          </DialogHeader>
          <PaymentOrderForm
            onSubmit={handleSubmit}
            onForeignIBANDetected={handleForeignIBANDetected}
            loading={loading}
            errors={errors}
            submitLabel={t('create.title')}
            onCancel={() => onOpenChange(false)}
          />
        </DialogContent>
      </Dialog>

      <ForeignIBANWarningDialog
        open={foreignIbanOpen}
        countryCode={foreignCountryCode}
        onConfirm={handleForeignIbanConfirm}
        onCancel={handleForeignIbanCancel}
      />

      <AlertDialog open={duplicateWarningOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('duplicateWarning.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('duplicateWarning.description')}
              {duplicates.map((dup) => (
                <span key={dup.id} className="mt-2 block text-sm">
                  {t('duplicateWarning.existingOrder', {
                    recipient: dup.recipient_name,
                    amount: dup.amount.toFixed(2),
                    date: new Date(dup.created_at).toLocaleDateString(),
                  })}
                </span>
              ))}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDuplicateCancel}>
              {t('duplicateWarning.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDuplicateConfirm}>
              {t('duplicateWarning.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
