'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ResetPasswordForm } from '@/components/auth/reset-password-form'
import { LanguageSwitcher } from '@/components/i18n/language-switcher'
import { useTranslations } from 'next-intl'

export default function ResetPasswordPage() {
  const tReset = useTranslations('auth.resetPasswordPage')
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

        {/* Reset Password Card */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl text-center">{tReset('title')}</CardTitle>
            <CardDescription className="text-center">
              {tReset('description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResetPasswordForm />
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
