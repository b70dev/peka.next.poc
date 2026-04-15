import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { AppHeader } from '@/components/layout/app-header'
import { PaymentRunsClient } from '@/components/payment-runs/payment-runs-client'
import type { PaymentRunStatus, PaymentRunWithSummary } from '@/lib/payment-runs.types'

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{
    search?: string
    status?: string
    page?: string
    pageSize?: string
  }>
}

export default async function PaymentRunsPage({ params, searchParams }: Props) {
  const { locale } = await params
  const search = await searchParams
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

  const t = await getTranslations('paymentRuns')

  const searchTerm = search.search || ''
  const statusFilter = (search.status || '') as PaymentRunStatus | ''
  const page = parseInt(search.page || '1', 10)
  const pageSize = parseInt(search.pageSize || '25', 10)

  let query = supabase.from('payment_runs').select('*', { count: 'exact' })

  if (searchTerm) {
    const sanitized = searchTerm.replace(/[,()]/g, '')
    query = query.ilike('name', `%${sanitized}%`)
  }
  if (statusFilter) {
    query = query.eq('status', statusFilter)
  }

  query = query.order('created_at', { ascending: false })
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  query = query.range(from, to)

  const { data: runs, count, error } = await query

  if (error) {
    console.error('Error fetching payment runs:', error)
  }

  // Enrich each run with order count and total amount
  const runIds = (runs ?? []).map((r) => r.id)
  let summaries: Record<string, { order_count: number; total_amount: number }> = {}

  if (runIds.length > 0) {
    const { data: orderAggs } = await supabase
      .from('payment_orders')
      .select('payment_run_id, amount')
      .in('payment_run_id', runIds)

    if (orderAggs) {
      for (const row of orderAggs) {
        const key = row.payment_run_id as string
        if (!summaries[key]) {
          summaries[key] = { order_count: 0, total_amount: 0 }
        }
        summaries[key].order_count += 1
        summaries[key].total_amount += Number(row.amount)
      }
    }
  }

  const enrichedRuns: PaymentRunWithSummary[] = (runs ?? []).map((r) => ({
    ...r,
    order_count: summaries[r.id]?.order_count ?? 0,
    total_amount: summaries[r.id]?.total_amount ?? 0,
  }))

  const totalCount = count || 0
  const totalPages = Math.ceil(totalCount / pageSize)

  return (
    <div className="min-h-screen bg-muted/30">
      <AppHeader userEmail={user.email} activeRoute="payment-runs" />

      <main id="main-content" tabIndex={-1} className="container mx-auto px-4 py-8 outline-hidden">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground mt-2">{t('description')}</p>
        </div>

        <PaymentRunsClient
          runs={enrichedRuns}
          totalCount={totalCount}
          currentPage={page}
          pageSize={pageSize}
          totalPages={totalPages}
          searchTerm={searchTerm}
          statusFilter={statusFilter}
        />
      </main>
    </div>
  )
}
