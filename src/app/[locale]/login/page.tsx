'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { OAuthButtons } from '@/components/auth/oauth-buttons'
import { LoginForm } from '@/components/auth/login-form'
import { LanguageSwitcher } from '@/components/i18n/language-switcher'
import { Link } from '@/i18n/routing'
import { useTranslations } from 'next-intl'

export default function LoginPage() {
  const t = useTranslations('auth');
  const tCommon = useTranslations('common');

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-12">
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

        {/* Login Card */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl text-center">{t('loginTitle')}</CardTitle>
            <CardDescription className="text-center">
              {t('loginDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* OAuth Buttons */}
            <OAuthButtons />

            {/* Separator */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  {t('or')}
                </span>
              </div>
            </div>

            {/* Email/Password Form */}
            <LoginForm />
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            {t('noAccount')}{' '}
            <Link href="/auth/register" className="text-primary hover:underline underline-offset-4">
              {t('register')}
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
    </div>
  )
}
