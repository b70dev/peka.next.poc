'use client'

import { useTranslations, useFormatter } from 'next-intl'
import { Link } from '@/i18n/routing'
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
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, FileText, Eye, Search } from 'lucide-react'
import type { PaymentRunStatus, PaymentRunWithSummary } from '@/lib/payment-runs.types'

interface PaymentRunsTableProps {
  runs: PaymentRunWithSummary[]
  totalCount: number
  currentPage: number
  pageSize: number
  totalPages: number
  onPageChange: (page: number) => void
  isPending: boolean
}

const statusVariant: Record<PaymentRunStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'outline',
  in_review: 'secondary',
  visaed: 'secondary',
  approved: 'default',
  rejected: 'destructive',
  exported: 'default',
}

export function PaymentRunsTable({
  runs,
  totalCount,
  currentPage,
  pageSize,
  totalPages,
  onPageChange,
  isPending,
}: PaymentRunsTableProps) {
  const t = useTranslations('paymentRuns')
  const tActions = useTranslations('actions')
  const format = useFormatter()

  if (isPending) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('columns.name')}</TableHead>
              <TableHead>{t('columns.status')}</TableHead>
              <TableHead className="text-right">{t('columns.orderCount')}</TableHead>
              <TableHead className="text-right">{t('columns.totalAmount')}</TableHead>
              <TableHead className="hidden sm:table-cell">{t('columns.executionDate')}</TableHead>
              <TableHead className="hidden sm:table-cell">{t('columns.createdAt')}</TableHead>
              <TableHead>{t('columns.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-8 w-16" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  if (runs.length === 0 && totalCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
        <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" aria-hidden="true" />
        <h3 className="text-lg font-semibold">{t('empty')}</h3>
        <p className="text-sm text-muted-foreground mt-1">{t('emptyDescription')}</p>
      </div>
    )
  }

  if (runs.length === 0 && totalCount > 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
        <Search className="h-12 w-12 text-muted-foreground/50 mb-4" aria-hidden="true" />
        <h3 className="text-lg font-semibold">{t('noResults')}</h3>
        <p className="text-sm text-muted-foreground mt-1">{t('noResultsDescription')}</p>
      </div>
    )
  }

  const startItem = (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, totalCount)

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('columns.name')}</TableHead>
              <TableHead>{t('columns.status')}</TableHead>
              <TableHead className="text-right">{t('columns.orderCount')}</TableHead>
              <TableHead className="text-right">{t('columns.totalAmount')}</TableHead>
              <TableHead className="hidden sm:table-cell">{t('columns.executionDate')}</TableHead>
              <TableHead className="hidden sm:table-cell">{t('columns.createdAt')}</TableHead>
              <TableHead>{t('columns.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {runs.map((run) => (
              <TableRow key={run.id}>
                <TableCell className="font-medium">{run.name}</TableCell>
                <TableCell>
                  <Badge variant={statusVariant[run.status]}>
                    {t(`status.${run.status}`)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">{run.order_count}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {format.number(run.total_amount, { style: 'currency', currency: 'CHF' })}
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  {run.execution_date ? new Date(run.execution_date).toLocaleDateString() : '-'}
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  {new Date(run.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/payment-runs/${run.id}` as never}>
                      <Eye className="h-4 w-4 mr-1" aria-hidden="true" />
                      {tActions('view')}
                    </Link>
                  </Button>
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
            {t('pagination.range', { from: startItem, to: endItem, total: totalCount })}
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" disabled={currentPage === 1} onClick={() => onPageChange(1)} aria-label={t('pagination.first')}>
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)} aria-label={t('pagination.previous')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm px-3">
              {t('pagination.page', { current: currentPage, total: totalPages })}
            </span>
            <Button variant="outline" size="icon" disabled={currentPage === totalPages} onClick={() => onPageChange(currentPage + 1)} aria-label={t('pagination.next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" disabled={currentPage === totalPages} onClick={() => onPageChange(totalPages)} aria-label={t('pagination.last')}>
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
