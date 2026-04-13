'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { PaymentOrderForm, type PaymentOrderFormData, type PaymentOrderFormErrors } from './payment-order-form'
import { ForeignIBANWarningDialog } from './foreign-iban-warning-dialog'
import { normalizeIBAN, formatIBANForDisplay } from '@/lib/iban-validation'
import type { PaymentOrder } from '@/lib/payment-orders.types'

interface EditPaymentOrderDialogProps {
  order: PaymentOrder
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditPaymentOrderDialog({ order, open, onOpenChange }: EditPaymentOrderDialogProps) {
  const t = useTranslations('paymentOrders')
  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<PaymentOrderFormErrors>({})
  const [versionConflict, setVersionConflict] = useState(false)

  // Foreign IBAN warning state
  const [foreignIbanOpen, setForeignIbanOpen] = useState(false)
  const [foreignCountryCode, setForeignCountryCode] = useState('')
  const [foreignIbanResolver, setForeignIbanResolver] = useState<{
    resolve: (confirmed: boolean) => void
  } | null>(null)

  const initialData = useMemo((): PaymentOrderFormData => ({
    recipientName: order.recipient_name,
    iban: formatIBANForDisplay(order.iban),
    amount: order.amount.toString(),
    purpose: order.purpose,
    referenceNumber: order.reference_number || '',
    executionDate: order.execution_date ? new Date(order.execution_date) : undefined,
    note: order.note || '',
  }), [order])

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

  const handleSubmit = useCallback(
    async (formData: PaymentOrderFormData) => {
      setLoading(true)
      setErrors({})
      setVersionConflict(false)

      try {
        const response = await fetch(`/api/payment-orders/${order.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipient_name: formData.recipientName,
            iban: normalizeIBAN(formData.iban),
            amount: parseFloat(formData.amount),
            purpose: formData.purpose,
            reference_number: formData.referenceNumber || null,
            execution_date: formData.executionDate
              ? formData.executionDate.toISOString().split('T')[0]
              : null,
            note: formData.note || null,
            version: order.version,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          if (response.status === 409 && data.error === 'version_conflict') {
            setVersionConflict(true)
            return
          }

          setErrors({ recipientName: data.error || t('edit.error') })
          return
        }

        onOpenChange(false)
        router.refresh()
      } catch {
        setErrors({ recipientName: t('edit.error') })
      } finally {
        setLoading(false)
      }
    },
    [order.id, order.version, onOpenChange, router, t]
  )

  const handleReload = useCallback(() => {
    onOpenChange(false)
    router.refresh()
  }, [onOpenChange, router])

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('edit.title')}</DialogTitle>
            <DialogDescription>{t('edit.description')}</DialogDescription>
          </DialogHeader>

          {versionConflict ? (
            <div className="space-y-4">
              <p className="text-sm text-destructive">{t('edit.conflictError')}</p>
              <div className="flex justify-end">
                <Button onClick={handleReload}>{t('edit.conflictReload')}</Button>
              </div>
            </div>
          ) : (
            <PaymentOrderForm
              initialData={initialData}
              onSubmit={handleSubmit}
              onForeignIBANDetected={handleForeignIBANDetected}
              loading={loading}
              errors={errors}
              submitLabel={t('edit.title')}
              onCancel={() => onOpenChange(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      <ForeignIBANWarningDialog
        open={foreignIbanOpen}
        countryCode={foreignCountryCode}
        onConfirm={handleForeignIbanConfirm}
        onCancel={handleForeignIbanCancel}
      />
    </>
  )
}
