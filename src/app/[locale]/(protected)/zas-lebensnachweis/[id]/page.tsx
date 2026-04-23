import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { setRequestLocale } from 'next-intl/server'
import { AppHeader } from '@/components/layout/app-header'
import { ZasRunDetail } from '@/components/zas-lebensnachweis/zas-run-detail'
import type { ZasDeath, ZasRun } from '@/lib/zas-runs.types'

// =============================================================
// PROJ-23: /zas-lebensnachweis/[id] (Detailseite)
// Lädt Lauf + Todesfälle + Ersteller-/Importeur-Namen.
// =============================================================

type Props = {
  params: Promise<{ locale: string; id: string }>
}

export default async function ZasLifeVerificationDetailPage({ params }: Props) {
  const { locale, id } = await params
  setRequestLocale(locale)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

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

  const { data: runRow, error: runError } = await supabase
    .from('zas_life_verification_runs')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (runError) {
    console.error('Error loading ZAS run:', runError)
  }
  if (!runRow) {
    notFound()
  }
  const run = runRow as ZasRun

  const { data: deathRows } = await supabase
    .from('zas_life_verification_deaths')
    .select('*')
    .eq('run_id', id)
    .order('last_name', { ascending: true, nullsFirst: false })
    .order('first_name', { ascending: true, nullsFirst: false })
    .limit(10_000)

  const deaths = (deathRows ?? []) as ZasDeath[]

  // Beteiligte User auflösen (Ersteller, Importeur, Abschliessender).
  const userIds = new Set<string>()
  for (const uid of [run.created_by, run.response_imported_by, run.completed_by]) {
    if (uid) userIds.add(uid)
  }
  const userNames = new Map<string, string>()
  if (userIds.size > 0) {
    const { data: users } = await supabase
      .from('user_profiles')
      .select('id, email, full_name')
      .in('id', Array.from(userIds))
    for (const u of users ?? []) {
      userNames.set(
        u.id as string,
        (u.full_name as string | null) ?? (u.email as string | null) ?? ''
      )
    }
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <AppHeader userEmail={user.email} activeRoute="zas-lebensnachweis" />

      <main
        id="main-content"
        tabIndex={-1}
        className="container mx-auto px-4 py-8 outline-hidden"
      >
        <ZasRunDetail
          run={run}
          deaths={deaths}
          createdByName={run.created_by ? userNames.get(run.created_by) ?? null : null}
        />
      </main>
    </div>
  )
}
