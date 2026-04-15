import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { setRequestLocale, getTranslations } from 'next-intl/server'
import { AppHeader } from '@/components/layout/app-header'
import { DebtorSettingsForm } from '@/components/payment-runs/debtor-settings-form'
import { loadDebtorSettings } from '@/lib/debtor-settings'

// =============================================================
// PROJ-21: Auftraggeber-Konfigurationsseite
// Nur fuer super_admin zugaenglich.
// =============================================================

type Props = {
  params: Promise<{ locale: string }>
}

export default async function DebtorSettingsPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${locale}/login`)
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'super_admin') {
    redirect(`/${locale}/dashboard`)
  }

  const debtor = await loadDebtorSettings(supabase)

  const t = await getTranslations('paymentRuns.debtorSettings')

  return (
    <div className="min-h-screen bg-muted/30">
      <AppHeader userEmail={user.email} activeRoute="settings" />

      <main
        id="main-content"
        tabIndex={-1}
        className="container mx-auto px-4 py-8 outline-hidden max-w-2xl"
      >
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">{t('pageTitle')}</h1>
          <p className="text-muted-foreground mt-2">{t('pageDescription')}</p>
        </div>

        <DebtorSettingsForm initialSettings={debtor} />
      </main>
    </div>
  )
}
