import { redirect } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/routing'
import { AppHeader } from '@/components/layout/app-header'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'
import { requireRole } from '@/lib/auth/require-role'
import { getAllUsers } from './actions'
import { UsersTable } from '@/components/settings/users-table'

type Props = {
  params: Promise<{ locale: string }>
}

export default async function UsersPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  // Only Super-Admins can access this page
  const { data: currentUser, error: roleError } = await requireRole('super_admin')
  if (roleError) {
    redirect(`/${locale}/dashboard`)
  }

  const t = await getTranslations('settings.userManagement')
  const { users, error } = await getAllUsers()

  return (
    <div className="min-h-screen bg-muted/30">
      <AppHeader userEmail={currentUser.email} activeRoute="settings" />

      <main id="main-content" tabIndex={-1} className="container mx-auto px-4 py-8 outline-hidden">
        {/* Back link */}
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href="/settings">
            <ChevronLeft className="h-4 w-4 mr-1" />
            {t('backToSettings')}
          </Link>
        </Button>

        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground mt-2">
            {t('description')}
          </p>
        </div>

        {error ? (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-destructive">
            {error}
          </div>
        ) : (
          <UsersTable
            users={users ?? []}
            currentUserId={currentUser.userId}
          />
        )}
      </main>
    </div>
  )
}
