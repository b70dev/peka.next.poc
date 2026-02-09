import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/routing'
import { AppHeader } from '@/components/layout/app-header'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'
import { AccountTypesTable } from '@/components/settings/account-types-table'
import { CreateAccountTypeDialog } from '@/components/settings/create-account-type-dialog'

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AccountTypesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${locale}/login`)
  }

  const t = await getTranslations('settings.accountTypes');

  // Fetch account types with usage count
  const { data: accountTypes } = await supabase
    .from('account_types')
    .select('*')
    .order('sort_order')

  // Get usage counts for each account type
  const { data: usageCounts } = await supabase
    .from('accounts')
    .select('account_type_id')

  // Calculate usage map
  const usageMap = new Map<string, number>()
  usageCounts?.forEach(account => {
    const count = usageMap.get(account.account_type_id) || 0
    usageMap.set(account.account_type_id, count + 1)
  })

  // Enhance account types with usage count
  const accountTypesWithUsage = accountTypes?.map(type => ({
    ...type,
    usage_count: usageMap.get(type.id) || 0
  })) || []

  return (
    <div className="min-h-screen bg-muted/30">
      <AppHeader userEmail={user.email} activeRoute="settings" />

      {/* Main Content */}
      <main id="main-content" tabIndex={-1} className="container mx-auto px-4 py-8 outline-none">
        {/* Back link */}
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href="/settings">
            <ChevronLeft className="h-4 w-4 mr-1" />
            {t('backToSettings')}
          </Link>
        </Button>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
            <p className="text-muted-foreground mt-2">
              {t('description')}
            </p>
          </div>
          <CreateAccountTypeDialog />
        </div>

        <AccountTypesTable accountTypes={accountTypesWithUsage} />
      </main>
    </div>
  )
}
