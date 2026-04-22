import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { AppHeader } from '@/components/layout/app-header'
import { RentnerTable } from '@/components/rentner/rentner-table'
import type { PensionerRow } from '@/lib/pensioners'

// =============================================================
// PROJ-24: Rentner-Liste
// Zeigt alle aktiven Rentner (Versicherte mit aktivem Konto
// vom Typ "Rente"). Suche nach Name / AHV-Nr., Excel-Export.
// =============================================================

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{
    search?: string
  }>
}

interface PensionAccountJoin {
  id: string
  employment_id: string
  is_active: boolean
  monthly_pension_amount: number | null
  retirement_date: string | null
  account_type: { code: string | null } | null
  employment: {
    insured_person_id: string
    insured_person: {
      id: string
      first_name: string
      last_name: string
      ahv_number: string
      date_of_birth: string
      email: string | null
    } | null
  } | null
}

export default async function RentnerListPage({ params, searchParams }: Props) {
  const { locale } = await params
  const search = await searchParams
  setRequestLocale(locale)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${locale}/login`)
  }

  const t = await getTranslations('pensioners')

  // Strip PostgREST special characters and ILIKE wildcards to prevent
  // unintended broad matches / filter injection.
  const rawSearch = search.search || ''
  const searchTerm = rawSearch.replace(/[,()\%_]/g, '')

  // --- 1. Load all active pension accounts with joined person data ---
  // We select pension accounts via the account_type relation and only keep
  // rows where the account_type code identifies a pension (RENT / RENTE /
  // PENSION / etc.). The filter is applied client-side because the code
  // exact match may vary between deployments.
  //
  // Fields `monthly_pension_amount` and `retirement_date` are expected to
  // be added by the backend work for PROJ-24. Until then, the joined row
  // may return `null` for those columns — the UI degrades gracefully.
  const { data: rawAccounts, error } = await supabase
    .from('accounts')
    .select(
      `id,
       employment_id,
       is_active,
       monthly_pension_amount,
       retirement_date,
       account_type:account_types!inner(code),
       employment:employments!inner(
         insured_person_id,
         insured_person:insured_persons!inner(
           id, first_name, last_name, ahv_number, date_of_birth, email
         )
       )`
    )
    .eq('is_active', true)
    .returns<PensionAccountJoin[]>()

  if (error) {
    console.error('Error fetching pension accounts:', error)
  }

  // Keep only pension-type accounts (code starts with RENT or equals PENSION).
  const pensionAccounts: PensionAccountJoin[] = (rawAccounts || []).filter((row) => {
    const code = row.account_type?.code?.toUpperCase() ?? ''
    return code.startsWith('RENT') || code === 'PENSION' || code === 'PENS'
  })

  // --- 2. Aggregate per insured person ---
  // Rule (per spec edge case): one row per person, summed monthly amount,
  // most recent retirement_date, primary account id = highest amount /
  // most recent retirement_date.
  const perPerson = new Map<string, PensionerRow>()
  for (const row of pensionAccounts) {
    const person = row.employment?.insured_person
    if (!person) continue

    const amount = row.monthly_pension_amount ?? 0
    const existing = perPerson.get(person.id)

    if (!existing) {
      perPerson.set(person.id, {
        id: person.id,
        first_name: person.first_name,
        last_name: person.last_name,
        ahv_number: person.ahv_number,
        date_of_birth: person.date_of_birth,
        retirement_date: row.retirement_date,
        monthly_pension_amount: row.monthly_pension_amount,
        email: person.email,
        pension_account_id: row.id,
      })
    } else {
      // Sum amounts (treating null as 0)
      const existingAmount = existing.monthly_pension_amount ?? 0
      existing.monthly_pension_amount = existingAmount + amount

      // Keep the most recent retirement_date
      if (
        row.retirement_date &&
        (!existing.retirement_date || row.retirement_date > existing.retirement_date)
      ) {
        existing.retirement_date = row.retirement_date
        existing.pension_account_id = row.id
      }
    }
  }

  let pensioners = Array.from(perPerson.values())

  // --- 3. Apply search filter (client-side on the fetched set) ---
  if (searchTerm) {
    const needle = searchTerm.toLowerCase()
    const needleAhv = needle.replace(/\./g, '')
    pensioners = pensioners.filter((p) => {
      return (
        p.first_name.toLowerCase().includes(needle) ||
        p.last_name.toLowerCase().includes(needle) ||
        p.ahv_number.replace(/\./g, '').toLowerCase().includes(needleAhv) ||
        `${p.last_name} ${p.first_name}`.toLowerCase().includes(needle) ||
        `${p.first_name} ${p.last_name}`.toLowerCase().includes(needle)
      )
    })
  }

  // --- 4. Sort by last name ascending (default per spec) ---
  pensioners.sort((a, b) => {
    const lastCmp = a.last_name.localeCompare(b.last_name, locale)
    if (lastCmp !== 0) return lastCmp
    return a.first_name.localeCompare(b.first_name, locale)
  })

  const totalCount = pensioners.length

  return (
    <div className="min-h-screen bg-muted/30">
      <AppHeader userEmail={user.email} activeRoute="pensioners" />

      <main
        id="main-content"
        tabIndex={-1}
        className="container mx-auto px-4 py-8 outline-hidden"
      >
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground mt-2">{t('description')}</p>
        </div>

        <RentnerTable
          pensioners={pensioners}
          totalCount={totalCount}
          searchTerm={searchTerm}
        />
      </main>
    </div>
  )
}
