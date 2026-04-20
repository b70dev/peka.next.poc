'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { PasswordStrength } from '@/components/auth/password-strength'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/routing'

export function RegistrationForm() {
  const t = useTranslations('auth')
  const tReg = useTranslations('auth.registration')
  const tVal = useTranslations('validation')
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const registrationSchema = z.object({
    fullName: z.string().min(1, tVal('required')),
    email: z.string().email(tVal('invalidEmail')),
    password: z.string()
      .min(12, tReg('requirements.minLength'))
      .regex(/[A-Z]/, tReg('requirements.uppercase'))
      .regex(/[0-9]/, tReg('requirements.number'))
      .regex(/[^A-Za-z0-9]/, tReg('requirements.special')),
    confirmPassword: z.string().min(1, tVal('required')),
    acceptTerms: z.literal(true, { message: tReg('termsRequired') }),
  }).refine((data) => data.password === data.confirmPassword, {
    message: tReg('passwordMismatch'),
    path: ['confirmPassword'],
  })

  type RegistrationFormData = z.infer<typeof registrationSchema>

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      acceptTerms: undefined as unknown as true,
    },
  })

  // eslint-disable-next-line react-hooks/incompatible-library -- react-hook-form's watch is not compatible with React Compiler
  const passwordValue = watch('password', '')

  const onSubmit = async (data: RegistrationFormData) => {
    setIsLoading(true)
    setError(null)

    const supabase = createClient()

    const { error: signUpError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.fullName,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (signUpError) {
      if (signUpError.message.includes('already registered') || signUpError.message.includes('already been registered')) {
        setError(tReg('errorEmailExists'))
      } else if (signUpError.message.includes('rate limit') || signUpError.status === 429) {
        setError(tReg('errorRateLimit'))
      } else {
        setError(tReg('errorGeneric'))
      }
      setIsLoading(false)
      return
    }

    router.push('/auth/verify-email')
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      {/* Full Name */}
      <div className="space-y-2">
        <Label htmlFor="fullName">
          {tReg('name')} <span aria-hidden="true" className="text-destructive">*</span>
          <span className="sr-only">({tVal('required')})</span>
        </Label>
        <Input
          id="fullName"
          type="text"
          placeholder={tReg('namePlaceholder')}
          autoComplete="name"
          disabled={isLoading}
          aria-required="true"
          aria-invalid={!!errors.fullName}
          aria-describedby={errors.fullName ? 'fullName-error' : undefined}
          {...register('fullName')}
        />
        {errors.fullName && (
          <p id="fullName-error" className="text-sm text-destructive" role="alert">
            {errors.fullName.message}
          </p>
        )}
      </div>

      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="reg-email">
          {t('email')} <span aria-hidden="true" className="text-destructive">*</span>
          <span className="sr-only">({tVal('required')})</span>
        </Label>
        <Input
          id="reg-email"
          type="email"
          placeholder="name@beispiel.ch"
          autoComplete="email"
          disabled={isLoading}
          aria-required="true"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'reg-email-error' : undefined}
          {...register('email')}
        />
        {errors.email && (
          <p id="reg-email-error" className="text-sm text-destructive" role="alert">
            {errors.email.message}
          </p>
        )}
      </div>

      {/* Password */}
      <div className="space-y-2">
        <Label htmlFor="reg-password">
          {t('password')} <span aria-hidden="true" className="text-destructive">*</span>
          <span className="sr-only">({tVal('required')})</span>
        </Label>
        <Input
          id="reg-password"
          type="password"
          placeholder="••••••••••••"
          autoComplete="new-password"
          disabled={isLoading}
          aria-required="true"
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? 'reg-password-error' : 'password-strength'}
          {...register('password')}
        />
        {errors.password && (
          <p id="reg-password-error" className="text-sm text-destructive" role="alert">
            {errors.password.message}
          </p>
        )}
        <div id="password-strength">
          <PasswordStrength password={passwordValue} />
        </div>
      </div>

      {/* Confirm Password */}
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">
          {tReg('confirmPassword')} <span aria-hidden="true" className="text-destructive">*</span>
          <span className="sr-only">({tVal('required')})</span>
        </Label>
        <Input
          id="confirmPassword"
          type="password"
          placeholder="••••••••••••"
          autoComplete="new-password"
          disabled={isLoading}
          aria-required="true"
          aria-invalid={!!errors.confirmPassword}
          aria-describedby={errors.confirmPassword ? 'confirmPassword-error' : undefined}
          {...register('confirmPassword')}
        />
        {errors.confirmPassword && (
          <p id="confirmPassword-error" className="text-sm text-destructive" role="alert">
            {errors.confirmPassword.message}
          </p>
        )}
      </div>

      {/* Terms Checkbox */}
      <div className="space-y-2">
        <div className="flex items-start gap-2">
          <Checkbox
            id="acceptTerms"
            disabled={isLoading}
            aria-required="true"
            aria-invalid={!!errors.acceptTerms}
            aria-describedby={errors.acceptTerms ? 'acceptTerms-error' : undefined}
            onCheckedChange={(checked) => {
              setValue('acceptTerms', checked === true ? true : undefined as unknown as true, { shouldValidate: true })
            }}
          />
          <Label htmlFor="acceptTerms" className="text-sm font-normal leading-snug cursor-pointer">
            {tReg('acceptTerms')}
          </Label>
        </div>
        {errors.acceptTerms && (
          <p id="acceptTerms-error" className="text-sm text-destructive" role="alert">
            {errors.acceptTerms.message}
          </p>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-md bg-destructive/10 p-3" role="alert" aria-live="polite">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Submit */}
      <Button type="submit" className="w-full h-11" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {tReg('registering')}
          </>
        ) : (
          t('register')
        )}
      </Button>
    </form>
  )
}
