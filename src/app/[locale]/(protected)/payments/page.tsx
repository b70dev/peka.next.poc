import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { AppHeader } from '@/components/layout/app-header'
import { PaymentOrdersClient } from '@/components/payments/payment-orders-client'
import type { PaymentOrder, PaymentOrderStatus } from '@/lib/payment-orders.types'

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{
    search?: string
    status?: string
    page?: string
    pageSize?: string
  }>
}

export default async function PaymentOrdersPage({ params, searchParams }: Props) {
  const { locale } = await params
  const search = await searchParams
  setRequestLocale(locale)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${locale}/login`)
  }

  // Check if user has admin or super_admin role
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role === 'viewer') {
    redirect(`/${locale}/dashboard`)
  }

  const t = await getTranslations('paymentOrders')

  // Parse search params
  const searchTerm = search.search || ''
  const statusFilter = (search.status || '') as PaymentOrderStatus | ''
  const page = parseInt(search.page || '1', 10)
  const pageSize = parseInt(search.pageSize || '25', 10)

  // Build query
  let query = supabase
    .from('payment_orders')
    .select('*', { count: 'exact' })

  // Apply search filter — strip PostgREST special chars (comma, parentheses) to prevent filter injection
  if (searchTerm) {
    const sanitized = searchTerm.replace(/[,()]/g, '')
    const sanitizedIban = sanitized.replace(/\s/g, '')
    query = query.or(
      `recipient_name.ilike.%${sanitized}%,iban.ilike.%${sanitizedIban}%`
    )
  }

  // Apply status filter
  if (statusFilter) {
    query = query.eq('status', statusFilter)
  }

  // Order by created_at descending (newest first)
  query = query.order('created_at', { ascending: false })

  // Apply pagination
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  query = query.range(from, to)

  const { data: paymentOrders, count, error } = await query

  if (error) {
    console.error('Error fetching payment orders:', error)
  }

  const totalCount = count || 0
  const totalPages = Math.ceil(totalCount / pageSize)

  return (
    <div className="min-h-screen bg-muted/30">
      <AppHeader userEmail={user.email} activeRoute="payments" />

      <main id="main-content" tabIndex={-1} className="container mx-auto px-4 py-8 outline-hidden">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground mt-2">
            {t('description')}
          </p>
        </div>

        <PaymentOrdersClient
          paymentOrders={(paymentOrders || []) as PaymentOrder[]}
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
