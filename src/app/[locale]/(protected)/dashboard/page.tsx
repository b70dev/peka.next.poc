import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LogoutButton } from '@/components/auth/logout-button'
import { LanguageSwitcher } from '@/components/i18n/language-switcher'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/routing'

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function DashboardPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${locale}/login`)
  }

  const t = await getTranslations('dashboard');
  const tNav = await getTranslations('navigation');

  // Fetch counts
  const { count: insuredCount } = await supabase
    .from('insured_persons')
    .select('*', { count: 'exact', head: true });

  const { count: employersCount } = await supabase
    .from('employers')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);

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
                className="text-sm font-medium"
              >
                {tNav('dashboard')}
              </Link>
              <Link
                href="/insured"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                {tNav('insuredPersons')}
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
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold tracking-tight">{t('title')}</h2>
          <p className="text-muted-foreground mt-2">
            {t('welcome')}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Link href="/insured">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle>{t('insuredPersons')}</CardTitle>
                <CardDescription>{t('insuredPersonsDescription')}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{insuredCount ?? 0}</p>
                <p className="text-sm text-muted-foreground">{t('personsRegistered')}</p>
              </CardContent>
            </Card>
          </Link>

          <Card>
            <CardHeader>
              <CardTitle>{t('employers')}</CardTitle>
              <CardDescription>{t('employersDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{employersCount ?? 0}</p>
              <p className="text-sm text-muted-foreground">{t('employersActive')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('yourAccount')}</CardTitle>
              <CardDescription>{t('yourAccountDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-sm text-muted-foreground">{t('emailLabel')}</p>
                <p className="font-medium">{user.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('loggedInVia')}</p>
                <p className="font-medium capitalize">
                  {user.app_metadata?.provider || 'email'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
