'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { Loader2, CheckCircle2 } from 'lucide-react'
import { useTranslations } from 'next-intl'

export function ForgotPasswordForm() {
  const t = useTranslations('auth')
  const tForgot = useTranslations('auth.forgotPasswordPage')
  const tVal = useTranslations('validation')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isEmailSent, setIsEmailSent] = useState(false)

  const forgotPasswordSchema = z.object({
    email: z.string().email(tVal('invalidEmail')),
  })

  type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true)
    setError(null)

    const supabase = createClient()

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
    })

    if (resetError) {
      if (resetError.message.includes('rate limit') || resetError.status === 429) {
        setError(tForgot('errorRateLimit'))
      } else {
        setError(tForgot('errorGeneric'))
      }
      setIsLoading(false)
      return
    }

    setIsEmailSent(true)
    setIsLoading(false)
  }

  if (isEmailSent) {
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <CheckCircle2 className="h-12 w-12 text-green-500" />
        <div className="space-y-2">
          <p className="font-medium">{tForgot('emailSentTitle')}</p>
          <p className="text-sm text-muted-foreground">{tForgot('emailSentDescription')}</p>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="forgot-email">
          {t('email')} <span aria-hidden="true" className="text-destructive">*</span>
          <span className="sr-only">({tVal('required')})</span>
        </Label>
        <Input
          id="forgot-email"
          type="email"
          placeholder="name@beispiel.ch"
          autoComplete="email"
          disabled={isLoading}
          aria-required="true"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'forgot-email-error' : undefined}
          {...register('email')}
        />
        {errors.email && (
          <p id="forgot-email-error" className="text-sm text-destructive" role="alert">
            {errors.email.message}
          </p>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3" role="alert" aria-live="polite">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <Button type="submit" className="w-full h-11" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {tForgot('sending')}
          </>
        ) : (
          tForgot('sendResetLink')
        )}
      </Button>
    </form>
  )
}
