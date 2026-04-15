import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/routing'
import { AppHeader } from '@/components/layout/app-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CreditCard, Receipt, Settings as SettingsIcon, Percent, Shield, Users, Building2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { getCurrentUserRole } from '@/lib/auth/require-role'
import { loadDebtorSettings } from '@/lib/debtor-settings'
import { isDebtorConfigured } from '@/lib/payment-run-exports.types'

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
  const tMfa = await getTranslations('auth.mfa.settings');
  const tUsers = await getTranslations('settings.userManagement');

  // Check if current user is super_admin for User Management card
  const roleResult = await getCurrentUserRole()
  const isSuperAdmin = roleResult.data?.role === 'super_admin'

  // Check if user is email/password (not IDP) for MFA card visibility
  const provider = user.app_metadata?.provider
  const isEmailUser = !provider || provider === 'email'

  // Check MFA status for email users
  let hasMfa = false
  if (isEmailUser) {
    const { data: factorsData } = await supabase.auth.mfa.listFactors()
    hasMfa = (factorsData?.totp?.filter(f => f.status === 'verified')?.length ?? 0) > 0
  }

  // Fetch counts for display
  const { count: accountTypesCount } = await supabase
    .from('account_types')
    .select('*', { count: 'exact', head: true })

  const { count: transactionTypesCount } = await supabase
    .from('transaction_types')
    .select('*', { count: 'exact', head: true })

  // Count employers with contribution rates configured
  const { count: contributionRatesCount } = await supabase
    .from('employer_contribution_rate_versions')
    .select('employer_id', { count: 'exact', head: true })

  // Count users for User Management card (only if super_admin)
  let usersCount: number | null = null
  if (isSuperAdmin) {
    const { count } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
    usersCount = count
  }

  // Load debtor config status (only relevant for super_admin)
  let debtorConfigured = false
  if (isSuperAdmin) {
    const debtor = await loadDebtorSettings(supabase)
    debtorConfigured = isDebtorConfigured(debtor)
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <AppHeader userEmail={user.email} activeRoute="settings" />

      {/* Main Content */}
      <main id="main-content" tabIndex={-1} className="container mx-auto px-4 py-8 outline-hidden">
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

          {/* MFA Card - only for email/password users */}
          {isEmailUser && (
            <Link href="/settings/mfa">
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">{t('mfa.title')}</CardTitle>
                  </div>
                  <CardDescription>{t('mfa.description')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Badge variant={hasMfa ? 'default' : 'secondary'} className={hasMfa ? 'bg-green-500/10 text-green-700 border-green-500/20' : ''}>
                    {hasMfa ? tMfa('title') : 'Nicht eingerichtet'}
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-1">{t('mfa.status')}</p>
                </CardContent>
              </Card>
            </Link>
          )}

          {/* Contribution Rates Card */}
          <Link href="/settings/contribution-rates">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Percent className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">{t('contributionRates.title')}</CardTitle>
                </div>
                <CardDescription>{t('contributionRates.description')}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{contributionRatesCount ?? 0}</p>
                <p className="text-sm text-muted-foreground">{t('contributionRates.count')}</p>
              </CardContent>
            </Card>
          </Link>

          {/* Debtor Card - only visible for Super-Admin */}
          {isSuperAdmin && (
            <Link href="/settings/debtor">
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">{t('debtor.title')}</CardTitle>
                  </div>
                  <CardDescription>{t('debtor.description')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Badge
                    variant={debtorConfigured ? 'default' : 'secondary'}
                    className={debtorConfigured ? 'bg-green-500/10 text-green-700 border-green-500/20' : ''}
                  >
                    {debtorConfigured ? t('debtor.configured') : t('debtor.notConfigured')}
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-1">{t('debtor.status')}</p>
                </CardContent>
              </Card>
            </Link>
          )}

          {/* User Management Card - only visible for Super-Admin */}
          {isSuperAdmin && (
            <Link href="/settings/users">
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">{tUsers('title')}</CardTitle>
                  </div>
                  <CardDescription>{tUsers('description')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{usersCount ?? 0}</p>
                  <p className="text-sm text-muted-foreground">{tUsers('count')}</p>
                </CardContent>
              </Card>
            </Link>
          )}
        </div>
      </main>
    </div>
  )
}
