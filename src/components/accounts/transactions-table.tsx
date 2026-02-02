'use client'

import { useTranslations } from 'next-intl'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ChevronLeft, ChevronRight, ArrowUpCircle, ArrowDownCircle, RotateCcw } from 'lucide-react'
import { TransactionWithRunningBalance } from '@/lib/database.types'
import { cn } from '@/lib/utils'
import { ReverseTransactionDialog } from './reverse-transaction-dialog'

interface TransactionsTableProps {
  transactions: TransactionWithRunningBalance[]
  totalCount: number
  currentPage: number
  pageSize: number
  totalPages: number
  accountId: string
}

export function TransactionsTable({
  transactions,
  totalCount,
  currentPage,
  pageSize,
  totalPages,
  accountId,
}: TransactionsTableProps) {
  const t = useTranslations('transactions')
  const tPagination = useTranslations('insured.pagination')
  const router = useRouter()
  const searchParams = useSearchParams()

  const updateSearchParams = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === '') {
        params.delete(key)
      } else {
        params.set(key, value)
      }
    })
    router.push(`?${params.toString()}`)
  }

  const handlePageChange = (newPage: number) => {
    updateSearchParams({ page: newPage.toString() })
  }

  const handlePageSizeChange = (newSize: string) => {
    updateSearchParams({ pageSize: newSize, page: '1' })
  }

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return 'CHF 0.00'
    return new Intl.NumberFormat('de-CH', {
      style: 'currency',
      currency: 'CHF',
    }).format(amount)
  }

  const formatDate = (date: string | null | undefined) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('de-CH')
  }

  const from = (currentPage - 1) * pageSize + 1
  const to = Math.min(currentPage * pageSize, totalCount)

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{t('noTransactions')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">{t('columns.date')}</TableHead>
              <TableHead className="w-[100px]">{t('columns.valueDate')}</TableHead>
              <TableHead>{t('columns.type')}</TableHead>
              <TableHead>{t('columns.description')}</TableHead>
              <TableHead className="text-right">{t('columns.amount')}</TableHead>
              <TableHead className="text-right">{t('columns.balance')}</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => (
              <TableRow
                key={transaction.id}
                className={cn(transaction.is_reversed && 'opacity-50 line-through')}
              >
                <TableCell className="font-mono text-sm">
                  {formatDate(transaction.booking_date)}
                </TableCell>
                <TableCell className="font-mono text-sm text-muted-foreground">
                  {formatDate(transaction.value_date)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {transaction.effect === 'credit' ? (
                      <ArrowUpCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <ArrowDownCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span>{transaction.transaction_type_name}</span>
                    {transaction.is_reversed && (
                      <Badge variant="outline" className="text-xs">
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Storniert
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="max-w-[200px] truncate">
                  {transaction.description || '-'}
                  {transaction.reference && (
                    <span className="text-xs text-muted-foreground ml-2">
                      ({transaction.reference})
                    </span>
                  )}
                </TableCell>
                <TableCell className={cn(
                  'text-right font-mono',
                  transaction.effect === 'credit' ? 'text-green-600' : 'text-red-600'
                )}>
                  {transaction.effect === 'credit' ? '+' : '-'}
                  {formatCurrency(transaction.amount)}
                </TableCell>
                <TableCell className={cn(
                  'text-right font-mono font-medium',
                  transaction.running_balance < 0 && 'text-red-600'
                )}>
                  {formatCurrency(transaction.running_balance)}
                </TableCell>
                <TableCell>
                  {!transaction.is_reversed && !transaction.related_transaction_id && (
                    <ReverseTransactionDialog
                      transaction={transaction}
                      accountId={accountId}
                    />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {tPagination('perPage')}:
            </span>
            <Select
              value={pageSize.toString()}
              onValueChange={handlePageSizeChange}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {t('pagination.showing', { from, to, total: totalCount })}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
            >
              {tPagination('first')}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm px-2">
              {t('pagination.page', { page: currentPage, totalPages })}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
            >
              {tPagination('last')}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
