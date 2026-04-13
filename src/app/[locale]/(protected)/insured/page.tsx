import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { InsuredPersonsTable } from '@/components/insured/insured-persons-table'
import { CreateInsuredPersonDialog } from '@/components/insured/create-insured-person-dialog'
import { AppHeader } from '@/components/layout/app-header'
import { PermissionGate } from '@/components/auth/permission-gate'
import { InsuredPerson, Employer } from '@/lib/database.types'

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    search?: string;
    page?: string;
    pageSize?: string;
    sortBy?: string;
    sortDirection?: string;
  }>;
};

type InsuredPersonWithEmployer = InsuredPerson & {
  employer: Employer | null;
};

export default async function InsuredPersonsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const search = await searchParams;
  setRequestLocale(locale);

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${locale}/login`)
  }

  const t = await getTranslations('insured');

  // Parse search params
  const searchTerm = search.search || '';
  const page = parseInt(search.page || '1', 10);
  const pageSize = parseInt(search.pageSize || '25', 10);
  const sortBy = search.sortBy || 'last_name';
  const sortDirection = (search.sortDirection || 'asc') as 'asc' | 'desc';

  // Build query
  let query = supabase
    .from('insured_persons')
    .select('*, employer:employers(*)', { count: 'exact' });

  // Apply search filter
  if (searchTerm) {
    const normalizedSearch = searchTerm.replace(/\./g, '');
    query = query.or(`last_name.ilike.%${searchTerm}%,first_name.ilike.%${searchTerm}%,ahv_number.ilike.%${normalizedSearch}%`);
  }

  // Apply sorting
  query = query.order(sortBy, { ascending: sortDirection === 'asc' });

  // Apply pagination
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data: insuredPersons, count, error } = await query;

  if (error) {
    console.error('Error fetching insured persons:', error);
  }

  const totalCount = count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="min-h-screen bg-muted/30">
      <AppHeader userEmail={user.email} activeRoute="insured" />

      {/* Main Content */}
      <main id="main-content" tabIndex={-1} className="container mx-auto px-4 py-8 outline-hidden">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
            <p className="text-muted-foreground mt-2">
              {t('description')}
            </p>
          </div>
          <PermissionGate permission="insured.create">
            <CreateInsuredPersonDialog />
          </PermissionGate>
        </div>

        <InsuredPersonsTable
          insuredPersons={(insuredPersons || []) as InsuredPersonWithEmployer[]}
          totalCount={totalCount}
          currentPage={page}
          pageSize={pageSize}
          totalPages={totalPages}
          searchTerm={searchTerm}
          sortBy={sortBy}
          sortDirection={sortDirection}
        />
      </main>
    </div>
  )
}
