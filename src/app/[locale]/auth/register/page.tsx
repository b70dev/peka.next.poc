'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RegistrationForm } from '@/components/auth/registration-form'
import { LanguageSwitcher } from '@/components/i18n/language-switcher'
import { Link } from '@/i18n/routing'
import { useTranslations } from 'next-intl'

export default function RegisterPage() {
  const t = useTranslations('auth')
  const tReg = useTranslations('auth.registration')
  const tCommon = useTranslations('common')

  return (
    <main id="main-content" tabIndex={-1} className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-12 outline-none">
      <div className="w-full max-w-md">
        {/* Language Switcher */}
        <div className="flex justify-end mb-4">
          <LanguageSwitcher />
        </div>

        {/* Logo & Branding */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {tCommon('appName')}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {tCommon('appDescription')}
          </p>
        </div>

        {/* Registration Card */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl text-center">{tReg('title')}</CardTitle>
            <CardDescription className="text-center">
              {tReg('description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RegistrationForm />
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            {t('hasAccount')}{' '}
            <Link href="/login" className="text-primary hover:underline underline-offset-4">
              {t('login')}
            </Link>
          </p>
          <p className="mt-4 text-xs text-muted-foreground">
            <Link href="/datenschutz" className="hover:underline underline-offset-4">
              {t('privacy')}
            </Link>
            {' · '}
            <Link href="/impressum" className="hover:underline underline-offset-4">
              {t('imprint')}
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
