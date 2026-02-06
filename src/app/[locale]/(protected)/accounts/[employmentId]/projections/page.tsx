import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/routing'
import { LogoutButton } from '@/components/auth/logout-button'
import { LanguageSwitcher } from '@/components/i18n/language-switcher'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronLeft, Calculator, AlertTriangle } from 'lucide-react'
import { getEmploymentForProjection, getSavedProjections } from './actions'
import { calculateAge } from '@/lib/projections'
import { ProjectionClient, type SavedProjection } from '@/components/projections/projection-client'

type Props = {
  params: Promise<{ locale: string; employmentId: string }>;
};

export default async function ProjectionsPage({ params }: Props) {
  const { locale, employmentId } = await params
  setRequestLocale(locale)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${locale}/login`)
  }

  const t = await getTranslations('projections')
  const tNav = await getTranslations('navigation')
  const tAccounts = await getTranslations('accounts')

  // Fetch employment data
  const employmentData = await getEmploymentForProjection(employmentId)

  if ('error' in employmentData) {
    notFound()
  }

  const { insuredPerson, employer, balances, annualContribution, conversionRateUeob, systemParams } = employmentData

  // Calculate age
  const currentAge = calculateAge(insuredPerson.date_of_birth)

  // Check if projection is possible
  const hasBalance = balances.total > 0
  const canProject = hasBalance

  // Fetch saved projections
  const savedProjectionsResult = await getSavedProjections(employmentId)
  const savedProjections: SavedProjection[] = ('projections' in savedProjectionsResult ? savedProjectionsResult.projections : []) as SavedProjection[]

  const formatDate = (date: string | null) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('de-CH')
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-CH', {
      style: 'currency',
      currency: 'CHF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

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
          <Link href={`/accounts/${employmentId}`}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            {t('backToAccounts')}
          </Link>
        </Button>

        {/* Person info */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <Calculator className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {t('title')}
              </h1>
              <p className="text-muted-foreground mt-1">
                {insuredPerson.last_name}, {insuredPerson.first_name} | {employer.name}
              </p>
            </div>
          </div>
        </div>

        {/* Current balances card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{t('currentBalances')}</CardTitle>
            <CardDescription>
              {t('balanceDate', { date: formatDate(balances.date) })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{t('balanceObl')}</p>
                <p className="text-lg font-semibold">{formatCurrency(balances.obl)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('balanceUeob')}</p>
                <p className="text-lg font-semibold">{formatCurrency(balances.ueob)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('balanceTotal')}</p>
                <p className="text-lg font-semibold text-primary">{formatCurrency(balances.total)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('age')}</p>
                <p className="text-lg font-semibold">{currentAge} {t('parameters.years')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* No data warning */}
        {!canProject && (
          <Card className="mb-6 border-orange-200 bg-orange-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-6 w-6 text-orange-600" />
                <div>
                  <p className="font-medium text-orange-800">{t('noData.title')}</p>
                  <p className="text-sm text-orange-700">
                    {!hasBalance ? t('noData.noBalance') : t('noData.noEmployment')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Projection interface */}
        {canProject && (
          <ProjectionClient
            employmentId={employmentId}
            currentAge={currentAge}
            balances={balances}
            annualContribution={annualContribution}
            conversionRateUeob={conversionRateUeob}
            systemParams={systemParams}
            savedProjections={savedProjections}
          />
        )}
      </main>
    </div>
  )
}
