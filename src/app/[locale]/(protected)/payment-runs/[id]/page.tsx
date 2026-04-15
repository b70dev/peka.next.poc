import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { setRequestLocale, getTranslations } from 'next-intl/server'
import { AppHeader } from '@/components/layout/app-header'
import { PaymentRunDetail } from '@/components/payment-runs/payment-run-detail'
import { SETTING_HIGH_AMOUNT_THRESHOLD } from '@/lib/payment-runs.types'
import type { PaymentRun, PaymentRunEvent } from '@/lib/payment-runs.types'
import type { PaymentOrder } from '@/lib/payment-orders.types'
import type { PaymentRunExport, Pain001Version } from '@/lib/payment-run-exports.types'
import { loadDebtorSettings } from '@/lib/debtor-settings'
import { isDebtorConfigured } from '@/lib/payment-run-exports.types'

type Props = {
  params: Promise<{ locale: string; id: string }>
}

type UserProfile = {
  id: string
  email: string | null
  full_name: string | null
}

export default async function PaymentRunDetailPage({ params }: Props) {
  const { locale, id } = await params
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

  if (!profile || profile.role === 'viewer') {
    redirect(`/${locale}/dashboard`)
  }

  // Fetch the run
  const { data: run, error: runError } = await supabase
    .from('payment_runs')
    .select('*')
    .eq('id', id)
    .single()

  if (runError || !run) {
    notFound()
  }

  // Fetch contained orders
  const { data: orders } = await supabase
    .from('payment_orders')
    .select('*')
    .eq('payment_run_id', id)
    .order('created_at', { ascending: false })

  // Fetch audit trail
  const { data: events } = await supabase
    .from('payment_run_events')
    .select('*')
    .eq('payment_run_id', id)
    .order('created_at', { ascending: false })
    .limit(100)

  // Resolve actor names (actors + run's user FK fields)
  const actorIds = new Set<string>()
  events?.forEach((e) => actorIds.add(e.actor_id))
  ;[run.created_by, run.submitted_by, run.visaed_by, run.approved_by, run.rejected_by].forEach((uid) => {
    if (uid) actorIds.add(uid)
  })

  const userMap: Record<string, UserProfile> = {}
  if (actorIds.size > 0) {
    const { data: users } = await supabase
      .from('user_profiles')
      .select('id, email, full_name')
      .in('id', Array.from(actorIds))
    users?.forEach((u) => {
      userMap[u.id] = u as UserProfile
    })
  }

  const enrichedEvents: PaymentRunEvent[] = (events ?? []).map((e) => ({
    ...e,
    actor_name: userMap[e.actor_id]?.full_name ?? userMap[e.actor_id]?.email ?? null,
  }))

  // Fetch high-amount threshold setting
  const { data: thresholdSetting } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', SETTING_HIGH_AMOUNT_THRESHOLD)
    .single()

  const highAmountThreshold =
    typeof thresholdSetting?.value === 'number' ? thresholdSetting.value : 100000

  // Fetch XML export history for this run
  const { data: exportRows } = await supabase
    .from('payment_run_exports')
    .select('id, payment_run_id, exported_at, exported_by, pain_version, filename, message_id, created_at')
    .eq('payment_run_id', id)
    .order('exported_at', { ascending: false })
    .limit(50)

  // Enrich with exporter names (re-use the userMap if exporter already loaded)
  const exporterIds = Array.from(
    new Set((exportRows ?? []).map((e) => e.exported_by).filter((uid) => !userMap[uid]))
  )
  if (exporterIds.length > 0) {
    const { data: exporterUsers } = await supabase
      .from('user_profiles')
      .select('id, email, full_name')
      .in('id', exporterIds)
    exporterUsers?.forEach((u) => {
      userMap[u.id] = u as UserProfile
    })
  }

  const enrichedExports: PaymentRunExport[] = (exportRows ?? []).map((e) => ({
    id: e.id,
    payment_run_id: e.payment_run_id,
    exported_at: e.exported_at,
    exported_by: e.exported_by,
    pain_version: e.pain_version as Pain001Version,
    filename: e.filename,
    message_id: e.message_id,
    created_at: e.created_at,
    exported_by_name:
      userMap[e.exported_by]?.full_name ?? userMap[e.exported_by]?.email ?? null,
  }))

  // Debtor-Config Verfuegbarkeit fuer Export-Button
  const debtor = await loadDebtorSettings(supabase)
  const debtorConfigured = isDebtorConfigured(debtor)

  const t = await getTranslations('paymentRuns')

  return (
    <div className="min-h-screen bg-muted/30">
      <AppHeader userEmail={user.email} activeRoute="payment-runs" />

      <main id="main-content" tabIndex={-1} className="container mx-auto px-4 py-8 outline-hidden">
        <PaymentRunDetail
          run={run as PaymentRun}
          orders={(orders ?? []) as PaymentOrder[]}
          events={enrichedEvents}
          currentUserId={user.id}
          highAmountThreshold={highAmountThreshold}
          exports={enrichedExports}
          debtorConfigured={debtorConfigured}
        />
      </main>
    </div>
  )
}
