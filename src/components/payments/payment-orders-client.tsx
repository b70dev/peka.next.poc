'use client'

import { useTranslations } from 'next-intl'
import { useRouter, usePathname } from '@/i18n/routing'
import { useSearchParams } from 'next/navigation'
import { useState, useTransition, useCallback } from 'react'
import { PaymentOrdersToolbar } from './payment-orders-toolbar'
import { PaymentOrdersTable } from './payment-orders-table'
import { CreatePaymentOrderDialog } from './create-payment-order-dialog'
import { EditPaymentOrderDialog } from './edit-payment-order-dialog'
import { CancelPaymentOrderDialog } from './cancel-payment-order-dialog'
import { PermissionGate } from '@/components/auth/permission-gate'
import type { PaymentOrder, PaymentOrderStatus } from '@/lib/payment-orders.types'
import { useDebouncedCallback } from 'use-debounce'

interface PaymentOrdersClientProps {
  paymentOrders: PaymentOrder[]
  totalCount: number
  currentPage: number
  pageSize: number
  totalPages: number
  searchTerm: string
  statusFilter: PaymentOrderStatus | ''
}

export function PaymentOrdersClient({
  paymentOrders,
  totalCount,
  currentPage,
  pageSize,
  totalPages,
  searchTerm,
  statusFilter,
}: PaymentOrdersClientProps) {
  const t = useTranslations('paymentOrders')
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  // Dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editingOrder, setEditingOrder] = useState<PaymentOrder | null>(null)
  const [cancellingOrder, setCancellingOrder] = useState<PaymentOrder | null>(null)

  const updateSearchParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString())
      Object.entries(updates).forEach(([key, value]) => {
        if (value) {
          params.set(key, value)
        } else {
          params.delete(key)
        }
      })
      // Reset page when filters change (unless page itself is being set)
      if (!('page' in updates)) {
        params.delete('page')
      }
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}` as never)
      })
    },
    [searchParams, router, pathname]
  )

  const handleSearch = useDebouncedCallback((value: string) => {
    updateSearchParams({ search: value })
  }, 300)

  const handleStatusFilter = useCallback(
    (status: string) => {
      updateSearchParams({ status })
    },
    [updateSearchParams]
  )

  const handlePageChange = useCallback(
    (page: number) => {
      updateSearchParams({ page: page.toString() })
    },
    [updateSearchParams]
  )

  const handleClearFilters = useCallback(() => {
    startTransition(() => {
      router.replace(pathname as never)
    })
  }, [router, pathname])

  return (
    <div className="space-y-4">
      <PaymentOrdersToolbar
        searchTerm={searchTerm}
        statusFilter={statusFilter}
        onSearchChange={handleSearch}
        onStatusFilterChange={handleStatusFilter}
        onClearFilters={handleClearFilters}
        onCreateNew={() => setCreateDialogOpen(true)}
        isPending={isPending}
      />

      <PaymentOrdersTable
        paymentOrders={paymentOrders}
        totalCount={totalCount}
        currentPage={currentPage}
        pageSize={pageSize}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        onEdit={setEditingOrder}
        onCancel={setCancellingOrder}
        isPending={isPending}
      />

      <PermissionGate permission="payment_orders.create">
        <CreatePaymentOrderDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
        />
      </PermissionGate>

      {editingOrder && (
        <EditPaymentOrderDialog
          order={editingOrder}
          open={!!editingOrder}
          onOpenChange={(open) => {
            if (!open) setEditingOrder(null)
          }}
        />
      )}

      {cancellingOrder && (
        <CancelPaymentOrderDialog
          order={cancellingOrder}
          open={!!cancellingOrder}
          onOpenChange={(open) => {
            if (!open) setCancellingOrder(null)
          }}
        />
      )}
    </div>
  )
}
