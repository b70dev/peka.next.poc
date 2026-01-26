import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/routing'
import { LogoutButton } from '@/components/auth/logout-button'
import { LanguageSwitcher } from '@/components/i18n/language-switcher'
import { InsuredPersonDetail } from '@/components/insured/insured-person-detail'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function InsuredPersonDetailPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${locale}/login`)
  }

  const t = await getTranslations('insured');
  const tNav = await getTranslations('navigation');

  // Fetch insured person with employments
  const { data: insuredPerson, error } = await supabase
    .from('insured_persons')
    .select('*')
    .eq('id', id)
    .single();

  // Fetch employments with employer details
  const { data: employments } = await supabase
    .from('employments')
    .select('*, employer:employers(*)')
    .eq('insured_person_id', id)
    .order('entry_date', { ascending: false });

  if (error || !insuredPerson) {
    return (
      <div className="min-h-screen bg-muted/30">
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

        <main id="main-content" tabIndex={-1} className="container mx-auto px-4 py-8 outline-none">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold mb-2">{t('detail.notFound')}</h1>
            <p className="text-muted-foreground mb-6">{t('detail.notFoundDescription')}</p>
            <Button asChild>
              <Link href="/insured">
                <ChevronLeft className="h-4 w-4 mr-2" />
                {t('detail.backToList')}
              </Link>
            </Button>
          </div>
        </main>
      </div>
    );
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
        <InsuredPersonDetail
          insuredPerson={insuredPerson}
          employments={employments || []}
        />
      </main>
    </div>
  )
}
