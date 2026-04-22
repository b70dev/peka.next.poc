import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/routing'
import { AppHeader } from '@/components/layout/app-header'
import { RentnerDetail } from '@/components/rentner/rentner-detail'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'
import type { PensionerDetail, PensionerAccount } from '@/lib/pensioners'
import type { PaymentOrder } from '@/lib/payment-orders.types'

// =============================================================
// PROJ-24: Rentner-Detailprofil
// =============================================================

type Props = {
  params: Promise<{ locale: string; id: string }>
}

interface PensionAccountRow {
  id: string
  employment_id: string
  is_active: boolean
  monthly_pension_amount: number | null
  retirement_date: string | null
  account_type: { code: string | null } | null
}

export default async function RentnerDetailPage({ params }: Props) {
  const { locale, id } = await params
  setRequestLocale(locale)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${locale}/login`)
  }

  const t = await getTranslations('pensioners')

  // 1. Fetch insured person master data
  const { data: insuredPerson, error: personError } = await supabase
    .from('insured_persons')
    .select('*')
    .eq('id', id)
    .single()

  if (personError || !insuredPerson) {
    return (
      <div className="min-h-screen bg-muted/30">
        <AppHeader userEmail={user.email} activeRoute="pensioners" />
        <main
          id="main-content"
          tabIndex={-1}
          className="container mx-auto px-4 py-8 outline-hidden"
        >
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold mb-2">{t('detail.notFound')}</h1>
            <p className="text-muted-foreground mb-6">
              {t('detail.notFoundDescription')}
            </p>
            <Button asChild>
              <Link href="/rentner">
                <ChevronLeft className="h-4 w-4 mr-2" />
                {t('detail.backToList')}
              </Link>
            </Button>
          </div>
        </main>
      </div>
    )
  }

  // 2. Fetch all active pension accounts for this person (via employments)
  const { data: employments } = await supabase
    .from('employments')
    .select('id')
    .eq('insured_person_id', id)
    .limit(100)

  const employmentIds = (employments || []).map((e) => e.id)

  let rawPensionAccounts: PensionAccountRow[] = []
  if (employmentIds.length > 0) {
    const { data, error: accountsError } = await supabase
      .from('accounts')
      .select(
        `id,
         employment_id,
         is_active,
         monthly_pension_amount,
         retirement_date,
         account_type:account_types!inner(code)`
      )
      .in('employment_id', employmentIds)
      .eq('is_active', true)
      .returns<PensionAccountRow[]>()

    if (accountsError) {
      console.error('Error fetching pension accounts:', accountsError)
    } else if (data) {
      rawPensionAccounts = data
    }
  }

  const pensionAccounts: PensionerAccount[] = rawPensionAccounts
    .filter((row) => {
      const code = row.account_type?.code?.toUpperCase() ?? ''
      return code.startsWith('RENT') || code === 'PENSION' || code === 'PENS'
    })
    .map((row) => ({
      account_id: row.id,
      employment_id: row.employment_id,
      retirement_date: row.retirement_date,
      monthly_pension_amount: row.monthly_pension_amount,
    }))

  // Aggregate the pensioner detail: total amount, most recent retirement date,
  // primary (most recent / highest) account id.
  const totalAmount = pensionAccounts.reduce(
    (sum, a) => sum + (a.monthly_pension_amount ?? 0),
    0
  )
  const hasAnyAmount = pensionAccounts.some(
    (a) => a.monthly_pension_amount !== null
  )
  const mostRecentAccount = pensionAccounts.reduce<PensionerAccount | null>(
    (best, current) => {
      if (!best) return current
      const bestDate = best.retirement_date ?? ''
      const currentDate = current.retirement_date ?? ''
      return currentDate > bestDate ? current : best
    },
    null
  )

  const pensioner: PensionerDetail = {
    id: insuredPerson.id,
    first_name: insuredPerson.first_name,
    last_name: insuredPerson.last_name,
    ahv_number: insuredPerson.ahv_number,
    date_of_birth: insuredPerson.date_of_birth,
    email: insuredPerson.email,
    gender: insuredPerson.gender,
    street: insuredPerson.street,
    postal_code: insuredPerson.postal_code,
    city: insuredPerson.city,
    country: insuredPerson.country,
    phone: insuredPerson.phone,
    mobile: insuredPerson.mobile,
    retirement_date: mostRecentAccount?.retirement_date ?? null,
    monthly_pension_amount: hasAnyAmount ? totalAmount : null,
    pension_account_id: mostRecentAccount?.account_id ?? null,
    pension_accounts: pensionAccounts,
  }

  // 3. Fetch payment history for this person (PROJ-19 table)
  const { data: paymentOrders } = await supabase
    .from('payment_orders')
    .select('*')
    .eq('insured_person_id', id)
    .order('execution_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(100)

  const paymentHistory = (paymentOrders || []) as PaymentOrder[]

  return (
    <div className="min-h-screen bg-muted/30">
      <AppHeader userEmail={user.email} activeRoute="pensioners" />

      <main
        id="main-content"
        tabIndex={-1}
        className="container mx-auto px-4 py-8 outline-hidden"
      >
        <RentnerDetail pensioner={pensioner} paymentHistory={paymentHistory} />
      </main>
    </div>
  )
}
