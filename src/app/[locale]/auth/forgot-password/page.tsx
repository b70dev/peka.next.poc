'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'
import { LanguageSwitcher } from '@/components/i18n/language-switcher'
import { Link } from '@/i18n/routing'
import { useTranslations } from 'next-intl'

export default function ForgotPasswordPage() {
  const t = useTranslations('auth')
  const tForgot = useTranslations('auth.forgotPasswordPage')
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

        {/* Forgot Password Card */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl text-center">{tForgot('title')}</CardTitle>
            <CardDescription className="text-center">
              {tForgot('description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ForgotPasswordForm />
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-6 text-center">
          <Link href="/login" className="text-sm text-muted-foreground hover:text-primary underline-offset-4 hover:underline">
            {tForgot('backToLogin')}
          </Link>
        </div>
      </div>
    </main>
  )
}
