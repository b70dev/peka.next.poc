'use client'

import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PermissionGate } from '@/components/auth/permission-gate'
import { Search, Plus, X, Layers } from 'lucide-react'
import { PAYMENT_ORDER_STATUSES, type PaymentOrderStatus } from '@/lib/payment-orders.types'

interface PaymentOrdersToolbarProps {
  searchTerm: string
  statusFilter: PaymentOrderStatus | ''
  onSearchChange: (value: string) => void
  onStatusFilterChange: (status: string) => void
  onClearFilters: () => void
  onCreateNew: () => void
  onCreateNewRun: () => void
  isPending: boolean
}

export function PaymentOrdersToolbar({
  searchTerm,
  statusFilter,
  onSearchChange,
  onStatusFilterChange,
  onClearFilters,
  onCreateNew,
  onCreateNewRun,
  isPending,
}: PaymentOrdersToolbarProps) {
  const t = useTranslations('paymentOrders')

  const hasActiveFilters = !!searchTerm || !!statusFilter

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            type="search"
            placeholder={t('searchPlaceholder')}
            defaultValue={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
            aria-label={t('searchPlaceholder')}
          />
        </div>

        {/* Status filter */}
        <Select
          value={statusFilter || 'all'}
          onValueChange={(value) =>
            onStatusFilterChange(value === 'all' ? '' : value)
          }
        >
          <SelectTrigger className="w-full sm:w-[200px]" aria-label={t('filter.status')}>
            <SelectValue placeholder={t('filter.status')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('status.all')}</SelectItem>
            {PAYMENT_ORDER_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {t(`status.${status}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Clear filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            disabled={isPending}
            aria-label={t('filter.clearFilters')}
          >
            <X className="h-4 w-4 mr-1" aria-hidden="true" />
            {t('filter.clearFilters')}
          </Button>
        )}
      </div>

      {/* Action buttons */}
      <PermissionGate permission="payment_orders.create">
        <div className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onCreateNewRun} disabled={isPending}>
            <Layers className="h-4 w-4 mr-2" aria-hidden="true" />
            {t('newRun')}
          </Button>
          <Button onClick={onCreateNew} disabled={isPending}>
            <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
            {t('newOrder')}
          </Button>
        </div>
      </PermissionGate>
    </div>
  )
}
