import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/routing'
import { AppHeader } from '@/components/layout/app-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronLeft, Building2, AlertCircle } from 'lucide-react'
import { getContributionRateVersions, getCurrentContributionRates } from '../actions'
import { ContributionRatesClient } from '@/components/settings/contribution-rates-client'

type Props = {
  params: Promise<{ locale: string; employerId: string }>;
};

export default async function ContributionRatesDetailPage({ params }: Props) {
  const { locale, employerId } = await params;
  setRequestLocale(locale);

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${locale}/login`)
  }

  const t = await getTranslations('settings.contributionRates');

  // Fetch employer details
  const { data: employer, error: employerError } = await supabase
    .from('employers')
    .select('id, name')
    .eq('id', employerId)
    .single()

  if (employerError || !employer) {
    notFound()
  }

  // Fetch versions
  const { versions, error: versionsError } = await getContributionRateVersions(employerId)

  // Fetch current rates
  const { version: currentVersion, rates: currentRates, message } = await getCurrentContributionRates(employerId)

  const hasRates = currentVersion && currentRates && currentRates.length > 0

  return (
    <div className="min-h-screen bg-muted/30">
      <AppHeader userEmail={user.email} activeRoute="settings" />

      {/* Main Content */}
      <main id="main-content" tabIndex={-1} className="container mx-auto px-4 py-8 outline-hidden">
        {/* Back link */}
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href="/settings/contribution-rates">
            <ChevronLeft className="h-4 w-4 mr-1" />
            {t('backToSettings')}
          </Link>
        </Button>

        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Building2 className="h-6 w-6 text-primary" />
              <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
            </div>
            <p className="text-muted-foreground">
              {employer.name}
            </p>
          </div>
        </div>

        {versionsError ? (
          <Card>
            <CardContent className="py-8 text-center text-destructive">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              {versionsError}
            </CardContent>
          </Card>
        ) : !hasRates ? (
          <Card>
            <CardHeader>
              <CardTitle>{t('noRatesConfigured')}</CardTitle>
              <CardDescription>{t('noRatesDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              <ContributionRatesClient
                employerId={employerId}
                employerName={employer.name}
                versions={versions || []}
                currentVersion={null}
                currentRates={[]}
                isEmpty={true}
              />
            </CardContent>
          </Card>
        ) : (
          <ContributionRatesClient
            employerId={employerId}
            employerName={employer.name}
            versions={versions || []}
            currentVersion={currentVersion}
            currentRates={currentRates}
            isEmpty={false}
          />
        )}
      </main>
    </div>
  )
}
