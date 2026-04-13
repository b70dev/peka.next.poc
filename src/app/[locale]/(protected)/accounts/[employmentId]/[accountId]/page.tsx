import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/routing'
import { AppHeader } from '@/components/layout/app-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronLeft, Wallet } from 'lucide-react'
import { TransactionsTable } from '@/components/accounts/transactions-table'
import { CreateTransactionDialog } from '@/components/accounts/create-transaction-dialog'
import { PermissionGate } from '@/components/auth/permission-gate'

type Props = {
  params: Promise<{ locale: string; employmentId: string; accountId: string }>;
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
  }>;
};

export default async function AccountTransactionsPage({ params, searchParams }: Props) {
  const { locale, employmentId, accountId } = await params;
  const search = await searchParams;
  setRequestLocale(locale);

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${locale}/login`)
  }

  const t = await getTranslations('transactions');
  const tAccounts = await getTranslations('accounts');

  const page = parseInt(search.page || '1', 10);
  const pageSize = parseInt(search.pageSize || '50', 10);

  // Fetch account with balance
  const { data: accountBalance, error: accountError } = await supabase
    .from('account_balances')
    .select('*')
    .eq('account_id', accountId)
    .single();

  if (accountError || !accountBalance) {
    notFound();
  }

  // Fetch employment with insured person
  const { data: employment } = await supabase
    .from('employments')
    .select(`
      *,
      insured_person:insured_persons!inner(*),
      employer:employers!inner(*)
    `)
    .eq('id', employmentId)
    .single();

  if (!employment) {
    notFound();
  }

  // Fetch transactions with running balance using the database function
  const offset = (page - 1) * pageSize;
  const { data: transactions, error: transactionsError } = await supabase
    .rpc('get_transactions_with_running_balance', {
      p_account_id: accountId,
      p_limit: pageSize,
      p_offset: offset,
    });

  if (transactionsError) {
    console.error('Error fetching transactions:', transactionsError);
  }

  // Get total count of transactions
  const { count: totalCount } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('account_id', accountId);

  const totalPages = Math.ceil((totalCount || 0) / pageSize);

  // Fetch transaction types for creating new transactions
  const { data: transactionTypes } = await supabase
    .from('transaction_types')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');

  const person = employment.insured_person;

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return 'CHF 0.00'
    return new Intl.NumberFormat('de-CH', {
      style: 'currency',
      currency: 'CHF',
    }).format(amount)
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <AppHeader userEmail={user.email} activeRoute="accounts" />

      {/* Main Content */}
      <main id="main-content" tabIndex={-1} className="container mx-auto px-4 py-8 outline-hidden">
        {/* Back link */}
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href={`/accounts/${employmentId}`}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            {tAccounts('detail.backToAccounts')}
          </Link>
        </Button>

        {/* Account info */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Wallet className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">
              {accountBalance.account_type_name}
            </h1>
            <Badge variant={accountBalance.affects_balance === 'positive' ? 'default' :
                           accountBalance.affects_balance === 'negative' ? 'destructive' : 'secondary'}>
              {accountBalance.affects_balance === 'positive' ? '+' :
               accountBalance.affects_balance === 'negative' ? '-' : '~'}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            {person.last_name}, {person.first_name} | {employment.employer.name}
          </p>
        </div>

        {/* Current Balance Card */}
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">
              {t('create.currentBalance')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-4xl font-bold ${(accountBalance.balance ?? 0) < 0 ? 'text-red-600' : ''}`}>
              {formatCurrency(accountBalance.balance)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {accountBalance.transaction_count ?? 0} {t('columns.type').toLowerCase()}
            </p>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-2 mb-6">
          <PermissionGate permission="transactions.create">
            <CreateTransactionDialog
              accountId={accountId}
              currentBalance={accountBalance.balance ?? 0}
              transactionTypes={transactionTypes || []}
            />
          </PermissionGate>
        </div>

        {/* Transactions Table */}
        <TransactionsTable
          transactions={transactions || []}
          totalCount={totalCount || 0}
          currentPage={page}
          pageSize={pageSize}
          totalPages={totalPages}
          accountId={accountId}
        />
      </main>
    </div>
  )
}
