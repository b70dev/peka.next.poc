'use client'

import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Minus, Wallet, Calendar, CreditCard } from 'lucide-react'
import { AccountSummary } from '@/lib/database.types'
import { cn } from '@/lib/utils'

interface AccountSummaryCardProps {
  summary: AccountSummary | null
  className?: string
}

export function AccountSummaryCard({ summary, className }: AccountSummaryCardProps) {
  const t = useTranslations('accounts.summary')

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

  // For now, we don't have trend data in the view
  // This would need to be calculated from historical data
  const trend: number = 0
  const trendPercent: number = 0

  return (
    <Card className={cn('bg-linear-to-r from-primary/5 to-primary/10 border-primary/20', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          {t('title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-3">
          {/* Total Balance */}
          <div>
            <p className="text-sm text-muted-foreground mb-1">{t('totalBalance')}</p>
            <p className="text-3xl font-bold">
              {formatCurrency(summary?.total_balance)}
            </p>
            {trendPercent !== 0 && (
              <div className="flex items-center gap-1 mt-1">
                {trend > 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : trend < 0 ? (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                ) : (
                  <Minus className="h-4 w-4 text-muted-foreground" />
                )}
                <span className={cn(
                  'text-sm',
                  trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-muted-foreground'
                )}>
                  {trendPercent > 0 ? '+' : ''}{trendPercent.toFixed(1)}% {t('trend')}
                </span>
              </div>
            )}
          </div>

          {/* Active Accounts */}
          <div>
            <p className="text-sm text-muted-foreground mb-1">{t('activeAccounts')}</p>
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              <p className="text-2xl font-semibold">
                {summary?.active_account_count ?? 0}
              </p>
              {summary?.total_account_count && summary.total_account_count > (summary.active_account_count ?? 0) && (
                <span className="text-sm text-muted-foreground">
                  / {summary.total_account_count}
                </span>
              )}
            </div>
          </div>

          {/* Last Transaction */}
          <div>
            <p className="text-sm text-muted-foreground mb-1">{t('lastTransaction')}</p>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <p className="text-lg font-medium">
                {formatDate(summary?.last_transaction_date)}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
