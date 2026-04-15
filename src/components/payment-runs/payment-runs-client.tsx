'use client'

import { useTranslations } from 'next-intl'
import { useRouter, usePathname } from '@/i18n/routing'
import { useSearchParams } from 'next/navigation'
import { useState, useTransition, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Search, X } from 'lucide-react'
import { PaymentRunsTable } from './payment-runs-table'
import { CreatePaymentRunDialog } from './create-payment-run-dialog'
import { PermissionGate } from '@/components/auth/permission-gate'
import { useDebouncedCallback } from 'use-debounce'
import { PAYMENT_RUN_STATUSES, type PaymentRunStatus, type PaymentRunWithSummary } from '@/lib/payment-runs.types'

interface PaymentRunsClientProps {
  runs: PaymentRunWithSummary[]
  totalCount: number
  currentPage: number
  pageSize: number
  totalPages: number
  searchTerm: string
  statusFilter: PaymentRunStatus | ''
}

export function PaymentRunsClient({
  runs,
  totalCount,
  currentPage,
  pageSize,
  totalPages,
  searchTerm,
  statusFilter,
}: PaymentRunsClientProps) {
  const t = useTranslations('paymentRuns')
  const tActions = useTranslations('actions')
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [createOpen, setCreateOpen] = useState(false)

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString())
      Object.entries(updates).forEach(([key, value]) => {
        if (value) params.set(key, value)
        else params.delete(key)
      })
      if (!('page' in updates)) params.delete('page')
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}` as never)
      })
    },
    [searchParams, router, pathname]
  )

  const handleSearch = useDebouncedCallback((v: string) => updateParams({ search: v }), 300)
  const handleStatus = useCallback((s: string) => updateParams({ status: s === 'all' ? '' : s }), [updateParams])
  const handlePageChange = useCallback((p: number) => updateParams({ page: p.toString() }), [updateParams])
  const handleClear = useCallback(() => {
    startTransition(() => {
      router.replace(pathname as never)
    })
  }, [router, pathname])

  const hasFilters = searchTerm || statusFilter

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              type="search"
              defaultValue={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="pl-9"
              aria-label={t('searchPlaceholder')}
            />
          </div>
          <Select value={statusFilter || 'all'} onValueChange={handleStatus}>
            <SelectTrigger className="w-full sm:w-48" aria-label={t('filter.status')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('status.all')}</SelectItem>
              {PAYMENT_RUN_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {t(`status.${s}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={handleClear}>
              <X className="h-4 w-4 mr-1" aria-hidden="true" />
              {t('filter.clearFilters')}
            </Button>
          )}
        </div>
        <PermissionGate permission="payment_orders.create">
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
            {t('newRun')}
          </Button>
        </PermissionGate>
      </div>

      <PaymentRunsTable
        runs={runs}
        totalCount={totalCount}
        currentPage={currentPage}
        pageSize={pageSize}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        isPending={isPending}
      />

      <PermissionGate permission="payment_orders.create">
        <CreatePaymentRunDialog open={createOpen} onOpenChange={setCreateOpen} />
      </PermissionGate>
    </div>
  )
}
