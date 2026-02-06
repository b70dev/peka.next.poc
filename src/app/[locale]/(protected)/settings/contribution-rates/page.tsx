import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/routing'
import { LogoutButton } from '@/components/auth/logout-button'
import { LanguageSwitcher } from '@/components/i18n/language-switcher'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronLeft, Building2, ChevronRight } from 'lucide-react'
import { getEmployers } from './actions'

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function ContributionRatesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${locale}/login`)
  }

  const t = await getTranslations('settings.contributionRates');
  const tNav = await getTranslations('navigation');

  // Fetch employers
  const { employers, error } = await getEmployers()

  // If only one employer, redirect directly to that employer's page
  if (employers && employers.length === 1) {
    redirect(`/${locale}/settings/contribution-rates/${employers[0].id}`)
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
        {/* Back link */}
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href="/settings">
            <ChevronLeft className="h-4 w-4 mr-1" />
            {t('backToSettings')}
          </Link>
        </Button>

        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground mt-2">
            {t('selectEmployerDescription')}
          </p>
        </div>

        {error ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              {error}
            </CardContent>
          </Card>
        ) : !employers || employers.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              {t('noEmployers')}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {employers.map((employer) => (
              <Link key={employer.id} href={`/settings/contribution-rates/${employer.id}`}>
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Building2 className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">{employer.name}</CardTitle>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
