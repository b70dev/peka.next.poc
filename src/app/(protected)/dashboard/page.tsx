import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LogoutButton } from '@/components/auth/logout-button'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold">peka.next</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {user.email}
            </span>
            <LogoutButton variant="outline" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground mt-2">
            Willkommen in der Pensionskassen-Verwaltung
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Versicherte Personen</CardTitle>
              <CardDescription>Übersicht der versicherten Personen</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">--</p>
              <p className="text-sm text-muted-foreground">Personen registriert</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Arbeitgeber</CardTitle>
              <CardDescription>Angeschlossene Unternehmen</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">--</p>
              <p className="text-sm text-muted-foreground">Arbeitgeber aktiv</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ihr Account</CardTitle>
              <CardDescription>Account-Informationen</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-sm text-muted-foreground">E-Mail</p>
                <p className="font-medium">{user.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Angemeldet über</p>
                <p className="font-medium capitalize">
                  {user.app_metadata?.provider || 'email'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
