'use client'

import { VerifyMfa } from '@/components/mfa/verify-mfa'
import { LanguageSwitcher } from '@/components/i18n/language-switcher'
import { useTranslations } from 'next-intl'

export default function MfaVerifyPage() {
  const tCommon = useTranslations('common')

  const handleVerified = () => {
    window.location.href = '/dashboard'
  }

  return (
    <main id="main-content" tabIndex={-1} className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-12 outline-hidden">
      <div className="w-full max-w-md">
        {/* Language Switcher */}
        <div className="flex justify-end mb-4">
          <LanguageSwitcher />
        </div>

        {/* Branding */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {tCommon('appName')}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {tCommon('appDescription')}
          </p>
        </div>

        <VerifyMfa onVerified={handleVerified} />
      </div>
    </main>
  )
}
