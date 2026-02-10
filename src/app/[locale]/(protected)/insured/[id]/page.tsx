import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/routing'
import { AppHeader } from '@/components/layout/app-header'
import { InsuredPersonDetail } from '@/components/insured/insured-person-detail'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { AccountSummary } from '@/lib/database.types'

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

  // Fetch account summaries for all employments of this person
  const employmentIds = (employments || []).map(e => e.id)
  let accountSummariesMap: Record<string, AccountSummary> = {}
  if (employmentIds.length > 0) {
    const { data: summaries } = await supabase
      .from('account_summaries')
      .select('*')
      .in('employment_id', employmentIds)
    if (summaries) {
      accountSummariesMap = Object.fromEntries(
        summaries.map(s => [s.employment_id!, s])
      )
    }
  }

  if (error || !insuredPerson) {
    return (
      <div className="min-h-screen bg-muted/30">
        <AppHeader userEmail={user.email} activeRoute="insured" />

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
      <AppHeader userEmail={user.email} activeRoute="insured" />

      {/* Main Content */}
      <main id="main-content" tabIndex={-1} className="container mx-auto px-4 py-8 outline-none">
        <InsuredPersonDetail
          insuredPerson={insuredPerson}
          employments={employments || []}
          accountSummaries={accountSummariesMap}
        />
      </main>
    </div>
  )
}
