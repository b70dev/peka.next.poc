import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { setRequestLocale, getTranslations } from 'next-intl/server'
import { AppHeader } from '@/components/layout/app-header'
import { ZasRunsClient } from '@/components/zas-lebensnachweis/zas-runs-client'
import type { ZasRun, ZasRunWithCounts } from '@/lib/zas-runs.types'

// =============================================================
// PROJ-23: /zas-lebensnachweis (Laufübersicht)
// Server-Component: Auth/Rolle prüfen, Läufe + Aggregationen
// laden, an Client-Component übergeben.
// =============================================================

type Props = {
  params: Promise<{ locale: string }>
}

export default async function ZasLifeVerificationPage({ params }: Props) {
  const { locale } = await params
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

  const t = await getTranslations('zasLifeVerification')

  // Läufe laden — gleiche Query wie GET /api/zas-runs.
  const { data: runRows, error: runsError } = await supabase
    .from('zas_life_verification_runs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500)

  if (runsError) {
    console.error('Error fetching ZAS runs:', runsError)
  }

  const runs = (runRows ?? []) as ZasRun[]
  const runIds = runs.map((r) => r.id)

  // Todesfälle pro Lauf zählen (gesamt + offen).
  const deathCounts = new Map<string, { total: number; open: number }>()
  if (runIds.length > 0) {
    const { data: deathRows } = await supabase
      .from('zas_life_verification_deaths')
      .select('run_id, status')
      .in('run_id', runIds)
      .limit(50_000)

    for (const row of deathRows ?? []) {
      const key = row.run_id as string
      const entry = deathCounts.get(key) ?? { total: 0, open: 0 }
      entry.total += 1
      if (row.status === 'open') entry.open += 1
      deathCounts.set(key, entry)
    }
  }

  // Ersteller-Namen auflösen.
  const creatorIds = Array.from(
    new Set(runs.map((r) => r.created_by).filter((id): id is string => Boolean(id)))
  )
  const creatorNames = new Map<string, string>()
  if (creatorIds.length > 0) {
    const { data: users } = await supabase
      .from('user_profiles')
      .select('id, email, full_name')
      .in('id', creatorIds)
    for (const u of users ?? []) {
      creatorNames.set(u.id as string, (u.full_name as string | null) ?? (u.email as string | null) ?? '')
    }
  }

  const enrichedRuns: ZasRunWithCounts[] = runs.map((r) => {
    const counts = deathCounts.get(r.id)
    return {
      ...r,
      death_count: counts?.total ?? 0,
      open_death_count: counts?.open ?? 0,
      created_by_name: r.created_by ? creatorNames.get(r.created_by) ?? null : null,
    }
  })

  return (
    <div className="min-h-screen bg-muted/30">
      <AppHeader userEmail={user.email} activeRoute="zas-lebensnachweis" />

      <main
        id="main-content"
        tabIndex={-1}
        className="container mx-auto px-4 py-8 outline-hidden"
      >
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground mt-2 max-w-3xl">{t('description')}</p>
        </div>

        <ZasRunsClient runs={enrichedRuns} />
      </main>
    </div>
  )
}
