import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/routing'
import { LogoutButton } from '@/components/auth/logout-button'
import { LanguageSwitcher } from '@/components/i18n/language-switcher'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CreditCard, Receipt, Settings as SettingsIcon } from 'lucide-react'

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function SettingsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${locale}/login`)
  }

  const t = await getTranslations('settings');
  const tNav = await getTranslations('navigation');

  // Fetch counts for display
  const { count: accountTypesCount } = await supabase
    .from('account_types')
    .select('*', { count: 'exact', head: true })

  const { count: transactionTypesCount } = await supabase
    .from('transaction_types')
    .select('*', { count: 'exact', head: true })

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
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                {tNav('accounts')}
              </Link>
              <Link
                href="/settings"
                className="text-sm font-medium"
              >
                {tNav('settings')}
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
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <SettingsIcon className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          </div>
          <p className="text-muted-foreground mt-2">
            {t('description')}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Account Types Card */}
          <Link href="/settings/account-types">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">{t('accountTypes.title')}</CardTitle>
                </div>
                <CardDescription>{t('accountTypes.description')}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{accountTypesCount ?? 0}</p>
                <p className="text-sm text-muted-foreground">{t('accountTypes.count')}</p>
              </CardContent>
            </Card>
          </Link>

          {/* Transaction Types Card */}
          <Link href="/settings/transaction-types">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Receipt className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">{t('transactionTypes.title')}</CardTitle>
                </div>
                <CardDescription>{t('transactionTypes.description')}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{transactionTypesCount ?? 0}</p>
                <p className="text-sm text-muted-foreground">{t('transactionTypes.count')}</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </main>
    </div>
  )
}
