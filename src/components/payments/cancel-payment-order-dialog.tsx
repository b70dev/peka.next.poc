'use client'

import { useState, useCallback } from 'react'
import { useRouter } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
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
import type { PaymentOrder } from '@/lib/payment-orders.types'

interface CancelPaymentOrderDialogProps {
  order: PaymentOrder
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CancelPaymentOrderDialog({ order, open, onOpenChange }: CancelPaymentOrderDialogProps) {
  const t = useTranslations('paymentOrders')
  const router = useRouter()

  const [loading, setLoading] = useState(false)

  const handleConfirm = useCallback(async () => {
    setLoading(true)

    try {
      const response = await fetch(`/api/payment-orders/${order.id}/cancel`, {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        console.error('Cancel failed:', data.error)
        return
      }

      onOpenChange(false)
      router.refresh()
    } catch {
      console.error('Cancel request failed')
    } finally {
      setLoading(false)
    }
  }, [order.id, onOpenChange, router])

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('cancel.title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('cancel.description')}
            <span className="mt-2 block font-medium">
              {t('cancel.details', {
                recipient: order.recipient_name,
                amount: order.amount.toFixed(2),
              })}
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>
            {t('duplicateWarning.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading && (
              <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            )}
            {t('cancel.title')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
