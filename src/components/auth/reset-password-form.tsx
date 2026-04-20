'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PasswordStrength } from '@/components/auth/password-strength'
import { createClient } from '@/lib/supabase/client'
import { Loader2, CheckCircle2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'

export function ResetPasswordForm() {
  const t = useTranslations('auth')
  const tReset = useTranslations('auth.resetPasswordPage')
  const tReg = useTranslations('auth.registration')
  const tVal = useTranslations('validation')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  const resetPasswordSchema = z.object({
    password: z.string()
      .min(12, tReg('requirements.minLength'))
      .regex(/[A-Z]/, tReg('requirements.uppercase'))
      .regex(/[0-9]/, tReg('requirements.number'))
      .regex(/[^A-Za-z0-9]/, tReg('requirements.special')),
    confirmPassword: z.string().min(1, tVal('required')),
  }).refine((data) => data.password === data.confirmPassword, {
    message: tReg('passwordMismatch'),
    path: ['confirmPassword'],
  })

  type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  })

  // eslint-disable-next-line react-hooks/incompatible-library -- react-hook-form's watch is not compatible with React Compiler
  const passwordValue = watch('password', '')

  const onSubmit = async (data: ResetPasswordFormData) => {
    setIsLoading(true)
    setError(null)

    const supabase = createClient()

    const { error: updateError } = await supabase.auth.updateUser({
      password: data.password,
    })

    if (updateError) {
      if (updateError.message.includes('same_password') || updateError.message.includes('same password')) {
        setError(tReset('errorSamePassword'))
      } else {
        setError(tReset('errorGeneric'))
      }
      setIsLoading(false)
      return
    }

    // Sign out all sessions after password reset
    await supabase.auth.signOut({ scope: 'global' })
    setIsSuccess(true)
    setIsLoading(false)
  }

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <CheckCircle2 className="h-12 w-12 text-green-500" />
        <div className="space-y-2">
          <p className="font-medium">{tReset('successTitle')}</p>
          <p className="text-sm text-muted-foreground">{tReset('successDescription')}</p>
        </div>
        <Link href="/login" className="w-full">
          <Button className="w-full h-11">{t('login')}</Button>
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      {/* New Password */}
      <div className="space-y-2">
        <Label htmlFor="new-password">
          {tReset('newPassword')} <span aria-hidden="true" className="text-destructive">*</span>
          <span className="sr-only">({tVal('required')})</span>
        </Label>
        <Input
          id="new-password"
          type="password"
          placeholder="••••••••••••"
          autoComplete="new-password"
          disabled={isLoading}
          aria-required="true"
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? 'new-password-error' : 'new-password-strength'}
          {...register('password')}
        />
        {errors.password && (
          <p id="new-password-error" className="text-sm text-destructive" role="alert">
            {errors.password.message}
          </p>
        )}
        <div id="new-password-strength">
          <PasswordStrength password={passwordValue} />
        </div>
      </div>

      {/* Confirm Password */}
      <div className="space-y-2">
        <Label htmlFor="confirm-new-password">
          {tReg('confirmPassword')} <span aria-hidden="true" className="text-destructive">*</span>
          <span className="sr-only">({tVal('required')})</span>
        </Label>
        <Input
          id="confirm-new-password"
          type="password"
          placeholder="••••••••••••"
          autoComplete="new-password"
          disabled={isLoading}
          aria-required="true"
          aria-invalid={!!errors.confirmPassword}
          aria-describedby={errors.confirmPassword ? 'confirm-new-password-error' : undefined}
          {...register('confirmPassword')}
        />
        {errors.confirmPassword && (
          <p id="confirm-new-password-error" className="text-sm text-destructive" role="alert">
            {errors.confirmPassword.message}
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
            {tReset('saving')}
          </>
        ) : (
          tReset('savePassword')
        )}
      </Button>
    </form>
  )
}
