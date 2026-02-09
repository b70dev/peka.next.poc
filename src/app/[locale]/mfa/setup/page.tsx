'use client'

import { EnrollMfa } from '@/components/mfa/enroll-mfa'
import { LanguageSwitcher } from '@/components/i18n/language-switcher'

export default function MfaSetupPage() {
  const handleComplete = () => {
    window.location.href = '/dashboard'
  }

  return (
    <main id="main-content" tabIndex={-1} className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-12 outline-none">
      <div className="w-full max-w-lg">
        {/* Language Switcher */}
        <div className="flex justify-end mb-4">
          <LanguageSwitcher />
        </div>

        <EnrollMfa onComplete={handleComplete} />
      </div>
    </main>
  )
}
