'use client'

import { useTranslations } from 'next-intl'
import { useFormatter } from 'next-intl'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { PermissionGate } from '@/components/auth/permission-gate'
import { Pencil, Ban, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, FileText } from 'lucide-react'
import type { PaymentOrder, PaymentOrderStatus } from '@/lib/payment-orders.types'
import { EDITABLE_STATUSES, CANCELLABLE_STATUSES } from '@/lib/payment-orders.types'
import { formatIBANForDisplay } from '@/lib/iban-validation'

interface PaymentOrdersTableProps {
  paymentOrders: PaymentOrder[]
  totalCount: number
  currentPage: number
  pageSize: number
  totalPages: number
  onPageChange: (page: number) => void
  onEdit: (order: PaymentOrder) => void
  onCancel: (order: PaymentOrder) => void
  isPending: boolean
}

const statusVariant: Record<PaymentOrderStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'outline',
  in_payment_run: 'secondary',
  approved: 'default',
  exported: 'default',
  cancelled: 'destructive',
}

export function PaymentOrdersTable({
  paymentOrders,
  totalCount,
  currentPage,
  pageSize,
  totalPages,
  onPageChange,
  onEdit,
  onCancel,
  isPending,
}: PaymentOrdersTableProps) {
  const t = useTranslations('paymentOrders')
  const format = useFormatter()

  // Loading skeleton
  if (isPending) {
    return (
      <div className="space-y-4">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('columns.recipientName')}</TableHead>
                <TableHead className="hidden md:table-cell">{t('columns.iban')}</TableHead>
                <TableHead>{t('columns.amount')}</TableHead>
                <TableHead className="hidden lg:table-cell">{t('columns.purpose')}</TableHead>
                <TableHead>{t('columns.status')}</TableHead>
                <TableHead className="hidden sm:table-cell">{t('columns.createdAt')}</TableHead>
                <TableHead>{t('columns.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-16" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    )
  }

  // Empty state
  if (paymentOrders.length === 0 && totalCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
        <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" aria-hidden="true" />
        <h3 className="text-lg font-semibold">{t('empty')}</h3>
        <p className="text-sm text-muted-foreground mt-1">{t('emptyDescription')}</p>
      </div>
    )
  }

  // No results for current filter
  if (paymentOrders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
        <h3 className="text-lg font-semibold">{t('noResults')}</h3>
        <p className="text-sm text-muted-foreground mt-1">{t('noResultsDescription')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Results count */}
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {t('found', { count: totalCount })}
      </p>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('columns.recipientName')}</TableHead>
              <TableHead className="hidden md:table-cell">{t('columns.iban')}</TableHead>
              <TableHead className="text-right">{t('columns.amount')}</TableHead>
              <TableHead className="hidden lg:table-cell">{t('columns.purpose')}</TableHead>
              <TableHead>{t('columns.status')}</TableHead>
              <TableHead className="hidden sm:table-cell">{t('columns.createdAt')}</TableHead>
              <TableHead>
                <span className="sr-only">{t('columns.actions')}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paymentOrders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-medium">
                  {order.recipient_name}
                </TableCell>
                <TableCell className="hidden md:table-cell font-mono text-sm">
                  {formatIBANForDisplay(order.iban)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {format.number(order.amount, {
                    style: 'currency',
                    currency: 'CHF',
                    minimumFractionDigits: 2,
                  })}
                </TableCell>
                <TableCell className="hidden lg:table-cell max-w-[200px] truncate" title={order.purpose}>
                  {order.purpose}
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariant[order.status]}>
                    {t(`status.${order.status}`)}
                  </Badge>
                </TableCell>
                <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                  {format.dateTime(new Date(order.created_at), {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                  })}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <PermissionGate permission="payment_orders.edit">
                      {EDITABLE_STATUSES.includes(order.status) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEdit(order)}
                          aria-label={`${t('columns.actions')}: ${order.recipient_name}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      {CANCELLABLE_STATUSES.includes(order.status) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onCancel(order)}
                          aria-label={`${t('cancel.title')}: ${order.recipient_name}`}
                        >
                          <Ban className="h-4 w-4" />
                        </Button>
                      )}
                    </PermissionGate>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {currentPage} / {totalPages}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => onPageChange(1)}
              disabled={currentPage <= 1}
              aria-label="First page"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onPageChange(totalPages)}
              disabled={currentPage >= totalPages}
              aria-label="Last page"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
