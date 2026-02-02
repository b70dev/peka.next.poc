'use client'

import { useTranslations } from 'next-intl'
import { useRouter, useSearchParams } from 'next/navigation'
import { Link } from '@/i18n/routing'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Wallet, ArrowRight, Calendar } from 'lucide-react'
import { AccountBalance } from '@/lib/database.types'
import { cn } from '@/lib/utils'

interface AccountsListProps {
  accounts: AccountBalance[]
  employmentId: string
  showInactive: boolean
}

export function AccountsList({ accounts, employmentId, showInactive }: AccountsListProps) {
  const t = useTranslations('accounts')
  const router = useRouter()
  const searchParams = useSearchParams()

  const toggleInactive = () => {
    const params = new URLSearchParams(searchParams.toString())
    if (showInactive) {
      params.delete('showInactive')
    } else {
      params.set('showInactive', 'true')
    }
    router.push(`?${params.toString()}`)
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{t('list.title')}</h2>
        <div className="flex items-center gap-2">
          <Switch
            id="show-inactive"
            checked={showInactive}
            onCheckedChange={toggleInactive}
          />
          <Label htmlFor="show-inactive" className="text-sm text-muted-foreground">
            {showInactive ? t('hideInactive') : t('showInactive')}
          </Label>
        </div>
      </div>

      {/* Accounts Grid */}
      {accounts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">{t('list.noAccounts')}</h3>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => (
            <Link
              key={account.account_id}
              href={`/accounts/${employmentId}/${account.account_id}`}
            >
              <Card className={cn(
                'hover:bg-muted/50 transition-colors cursor-pointer h-full',
                // account.is_active === false && 'opacity-60'
              )}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">
                      {account.account_type_name}
                    </CardTitle>
                    <Badge
                      variant={account.affects_balance === 'positive' ? 'default' :
                               account.affects_balance === 'negative' ? 'destructive' : 'secondary'}
                      className="text-xs"
                    >
                      {account.affects_balance === 'positive' ? '+' :
                       account.affects_balance === 'negative' ? '-' : '~'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Balance */}
                    <div>
                      <p className="text-sm text-muted-foreground">{t('list.balance')}</p>
                      <p className={cn(
                        'text-2xl font-bold',
                        (account.balance ?? 0) < 0 && 'text-red-600'
                      )}>
                        {formatCurrency(account.balance)}
                      </p>
                    </div>

                    {/* Transaction info */}
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{account.transaction_count ?? 0} {t('list.transactions')}</span>
                      {account.last_transaction_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(account.last_transaction_date)}
                        </span>
                      )}
                    </div>

                    {/* View link */}
                    <div className="flex items-center justify-end text-sm text-primary">
                      {t('list.viewTransactions')}
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
