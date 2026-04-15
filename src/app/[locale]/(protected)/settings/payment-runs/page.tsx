import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { setRequestLocale, getTranslations } from 'next-intl/server'
import { AppHeader } from '@/components/layout/app-header'
import { PaymentRunSettingsForm } from '@/components/payment-runs/payment-run-settings-form'
import { SETTING_HIGH_AMOUNT_THRESHOLD } from '@/lib/payment-runs.types'

type Props = {
  params: Promise<{ locale: string }>
}

export default async function PaymentRunSettingsPage({ params }: Props) {
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

  // Only super_admin may edit settings
  if (!profile || profile.role !== 'super_admin') {
    redirect(`/${locale}/dashboard`)
  }

  const { data: setting } = await supabase
    .from('app_settings')
    .select('key, value, description, updated_at')
    .eq('key', SETTING_HIGH_AMOUNT_THRESHOLD)
    .single()

  const currentValue = typeof setting?.value === 'number' ? setting.value : 100000

  const t = await getTranslations('paymentRuns.settings')

  return (
    <div className="min-h-screen bg-muted/30">
      <AppHeader userEmail={user.email} activeRoute="settings" />

      <main id="main-content" tabIndex={-1} className="container mx-auto px-4 py-8 outline-hidden max-w-2xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground mt-2">{t('description')}</p>
        </div>

        <PaymentRunSettingsForm
          initialThreshold={currentValue}
          description={setting?.description ?? null}
        />
      </main>
    </div>
  )
}
