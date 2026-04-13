'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LanguageSwitcher } from '@/components/i18n/language-switcher'
import { Link } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
import { Mail, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function VerifyEmailPage() {
  const t = useTranslations('auth')
  const tVerify = useTranslations('auth.verifyEmail')
  const tCommon = useTranslations('common')
  const [isResending, setIsResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const [resendError, setResendError] = useState<string | null>(null)

  const handleResend = async () => {
    setIsResending(true)
    setResendError(null)
    setResendSuccess(false)

    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (session?.user?.email) {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: session.user.email,
      })

      if (error) {
        setResendError(tVerify('resendError'))
      } else {
        setResendSuccess(true)
      }
    } else {
      setResendError(tVerify('resendError'))
    }

    setIsResending(false)
  }

  return (
    <main id="main-content" tabIndex={-1} className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-12 outline-hidden">
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

        {/* Verify Email Card */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="space-y-1 pb-4">
            <div className="flex justify-center mb-4">
              <Mail className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-2xl text-center">{tVerify('title')}</CardTitle>
            <CardDescription className="text-center">
              {tVerify('description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground text-center">
              {tVerify('checkSpam')}
            </p>

            {resendSuccess && (
              <div className="rounded-md bg-green-500/10 p-3" role="status">
                <p className="text-sm text-green-600 dark:text-green-400 text-center">{tVerify('resendSuccess')}</p>
              </div>
            )}

            {resendError && (
              <div className="rounded-md bg-destructive/10 p-3" role="alert">
                <p className="text-sm text-destructive text-center">{resendError}</p>
              </div>
            )}

            <Button
              variant="outline"
              className="w-full"
              onClick={handleResend}
              disabled={isResending}
            >
              {isResending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {tVerify('resending')}
                </>
              ) : (
                tVerify('resendButton')
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-6 text-center">
          <Link href="/login" className="text-sm text-muted-foreground hover:text-primary underline-offset-4 hover:underline">
            {tVerify('backToLogin')}
          </Link>
        </div>
      </div>
    </main>
  )
}
