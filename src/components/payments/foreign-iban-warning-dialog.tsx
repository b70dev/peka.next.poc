'use client'

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

interface ForeignIBANWarningDialogProps {
  open: boolean
  countryCode: string
  onConfirm: () => void
  onCancel: () => void
}

export function ForeignIBANWarningDialog({
  open,
  countryCode,
  onConfirm,
  onCancel,
}: ForeignIBANWarningDialogProps) {
  const t = useTranslations('paymentOrders.foreignIbanWarning')

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('description', { country: countryCode })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>{t('cancel')}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>{t('confirm')}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
