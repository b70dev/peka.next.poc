'use client'

import { useTranslations, useFormatter } from 'next-intl'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import type {
  PaymentOrder,
  PaymentOrderStatus,
} from '@/lib/payment-orders.types'

// =============================================================
// PROJ-24: Payment history table shown on the pensioner detail
// page. Lists payment_orders for the current insured person,
// sorted descending by execution date. Empty state renders a
// localized "no payments yet" message.
// =============================================================

interface PensionerPaymentHistoryProps {
  paymentOrders: PaymentOrder[]
}

const statusVariant: Record<
  PaymentOrderStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  draft: 'outline',
  in_payment_run: 'secondary',
  approved: 'default',
  exported: 'default',
  cancelled: 'destructive',
}

export function PensionerPaymentHistory({
  paymentOrders,
}: PensionerPaymentHistoryProps) {
  const t = useTranslations('pensioners.payments')
  const tPensioners = useTranslations('pensioners')
  const format = useFormatter()

  if (paymentOrders.length === 0) {
    return (
      <p
        className="text-sm text-muted-foreground py-6 text-center"
        role="status"
      >
        {t('empty')}
      </p>
    )
  }

  const formatDate = (value: string | null): string => {
    if (!value) return tPensioners('notAvailable')
    return format.dateTime(new Date(value), {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const formatAmount = (amount: number, currency: string): string =>
    format.number(amount, {
      style: 'currency',
      currency: currency || 'CHF',
    })

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableCaption className="sr-only">
          {tPensioners('detail.paymentHistory')}
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">{t('columns.date')}</TableHead>
            <TableHead scope="col" className="text-right">
              {t('columns.amount')}
            </TableHead>
            <TableHead scope="col">{t('columns.status')}</TableHead>
            <TableHead scope="col">{t('columns.reference')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paymentOrders.map((order) => (
            <TableRow key={order.id}>
              <TableCell className="whitespace-nowrap">
                {formatDate(order.execution_date ?? order.created_at)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatAmount(order.amount, order.currency)}
              </TableCell>
              <TableCell>
                <Badge variant={statusVariant[order.status]}>
                  {t(`statuses.${order.status}`)}
                </Badge>
              </TableCell>
              <TableCell className="font-mono text-xs break-all">
                {order.reference_number ?? tPensioners('notAvailable')}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
