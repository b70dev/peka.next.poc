import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { AppHeader } from '@/components/layout/app-header'
import { EmploymentAccountsList } from '@/components/accounts/employment-accounts-list'

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    search?: string;
    page?: string;
    pageSize?: string;
  }>;
};

export default async function AccountsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const search = await searchParams;
  setRequestLocale(locale);

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${locale}/login`)
  }

  const t = await getTranslations('accounts');

  // Parse search params
  const searchTerm = search.search || '';
  const page = parseInt(search.page || '1', 10);
  const pageSize = parseInt(search.pageSize || '25', 10);

  // Build query for employments with account summaries
  // Join with insured_persons, employers, and account_summaries
  let query = supabase
    .from('employments')
    .select(`
      *,
      insured_person:insured_persons!inner(*),
      employer:employers!inner(*),
      account_summary:account_summaries(*)
    `, { count: 'exact' });

  // Apply search filter
  if (searchTerm) {
    const normalizedSearch = searchTerm.replace(/\./g, '');
    // Search in insured person name or AHV number, or employer name
    query = query.or(`insured_person.last_name.ilike.%${searchTerm}%,insured_person.first_name.ilike.%${searchTerm}%,insured_person.ahv_number.ilike.%${normalizedSearch}%,employer.name.ilike.%${searchTerm}%`);
  }

  // Order by insured person last name
  query = query.order('entry_date', { ascending: false });

  // Apply pagination
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data: employments, count, error } = await query;

  if (error) {
    console.error('Error fetching employments:', error);
  }

  const totalCount = count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="min-h-screen bg-muted/30">
      <AppHeader userEmail={user.email} activeRoute="accounts" />

      {/* Main Content */}
      <main id="main-content" tabIndex={-1} className="container mx-auto px-4 py-8 outline-none">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground mt-2">
            {t('description')}
          </p>
        </div>

        <EmploymentAccountsList
          employments={employments || []}
          totalCount={totalCount}
          currentPage={page}
          pageSize={pageSize}
          totalPages={totalPages}
          searchTerm={searchTerm}
        />
      </main>
    </div>
  )
}
