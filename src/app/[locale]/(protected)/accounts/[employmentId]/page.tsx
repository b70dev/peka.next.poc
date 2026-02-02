import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/routing'
import { LogoutButton } from '@/components/auth/logout-button'
import { LanguageSwitcher } from '@/components/i18n/language-switcher'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'
import { AccountSummaryCard } from '@/components/accounts/account-summary-card'
import { AccountsList } from '@/components/accounts/accounts-list'
import { CreateAccountDialog } from '@/components/accounts/create-account-dialog'
import { TransferDialog } from '@/components/accounts/transfer-dialog'

type Props = {
  params: Promise<{ locale: string; employmentId: string }>;
  searchParams: Promise<{
    showInactive?: string;
  }>;
};

export default async function EmploymentAccountsPage({ params, searchParams }: Props) {
  const { locale, employmentId } = await params;
  const search = await searchParams;
  setRequestLocale(locale);

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${locale}/login`)
  }

  const t = await getTranslations('accounts');
  const tNav = await getTranslations('navigation');

  const showInactive = search.showInactive === 'true';

  // Fetch employment with insured person and employer
  const { data: employment, error: employmentError } = await supabase
    .from('employments')
    .select(`
      *,
      insured_person:insured_persons!inner(*),
      employer:employers!inner(*)
    `)
    .eq('id', employmentId)
    .single();

  if (employmentError || !employment) {
    notFound();
  }

  // Fetch account summary
  const { data: accountSummary } = await supabase
    .from('account_summaries')
    .select('*')
    .eq('employment_id', employmentId)
    .single();

  // Fetch accounts with balances
  let accountsQuery = supabase
    .from('account_balances')
    .select('*')
    .eq('employment_id', employmentId)
    .order('account_type_name');

  const { data: accounts } = await accountsQuery;

  // Fetch account types for creating new accounts
  const { data: accountTypes } = await supabase
    .from('account_types')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');

  // Filter out inactive accounts if needed
  const filteredAccounts = showInactive
    ? accounts
    : accounts?.filter(a => {
        // We need to check is_active from the accounts table
        // The account_balances view doesn't include is_active, so we fetch it separately
        return true; // For now, show all - we'll fix this with a proper join
      });

  const person = employment.insured_person;
  const employer = employment.employer;

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('de-CH');
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="text-xl font-bold hover:opacity-80">
              peka.next
            </Link>
            <nav className="hidden md:flex items-center gap-4">
              <Link
                href="/dashboard"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                {tNav('dashboard')}
              </Link>
              <Link
                href="/insured"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                {tNav('insuredPersons')}
              </Link>
              <Link
                href="/accounts"
                className="text-sm font-medium"
              >
                {tNav('accounts')}
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {user.email}
            </span>
            <LogoutButton variant="outline" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main id="main-content" tabIndex={-1} className="container mx-auto px-4 py-8 outline-none">
        {/* Back link */}
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href="/accounts">
            <ChevronLeft className="h-4 w-4 mr-1" />
            {t('detail.backToList')}
          </Link>
        </Button>

        {/* Person info */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">
            {person.last_name}, {person.first_name}
          </h1>
          <p className="text-muted-foreground mt-1">
            {employer.name} | {t('detail.employment')} {formatDate(employment.entry_date)}
            {employment.exit_date && (
              <span className="text-orange-600 ml-2">
                ({t('detail.employmentEnded')} {formatDate(employment.exit_date)})
              </span>
            )}
          </p>
        </div>

        {/* Account Summary */}
        <AccountSummaryCard
          summary={accountSummary}
          className="mb-8"
        />

        {/* Actions */}
        <div className="flex flex-wrap gap-2 mb-6">
          <CreateAccountDialog
            employmentId={employmentId}
            accountTypes={accountTypes || []}
            existingAccounts={accounts || []}
          />
          {(accounts?.length ?? 0) >= 2 && (
            <TransferDialog
              employmentId={employmentId}
              accounts={accounts || []}
            />
          )}
        </div>

        {/* Accounts List */}
        <AccountsList
          accounts={filteredAccounts || []}
          employmentId={employmentId}
          showInactive={showInactive}
        />
      </main>
    </div>
  )
}
