'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Check, X } from 'lucide-react'

interface PasswordStrengthProps {
  password: string
}

function calculateStrength(password: string): number {
  if (!password) return 0
  let score = 0
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  return score
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const t = useTranslations('auth.registration')

  const strength = useMemo(() => calculateStrength(password), [password])

  const requirements = useMemo(() => [
    { met: password.length >= 12, label: t('requirements.minLength') },
    { met: /[A-Z]/.test(password), label: t('requirements.uppercase') },
    { met: /[0-9]/.test(password), label: t('requirements.number') },
    { met: /[^A-Za-z0-9]/.test(password), label: t('requirements.special') },
  ], [password, t])

  if (!password) return null

  const strengthLabel = strength <= 1 ? t('strengthWeak') : strength <= 2 ? t('strengthMedium') : strength <= 3 ? t('strengthGood') : t('strengthStrong')
  const strengthColor = strength <= 1 ? 'bg-destructive' : strength <= 2 ? 'bg-orange-500' : strength <= 3 ? 'bg-yellow-500' : 'bg-green-500'

  return (
    <div className="space-y-2">
      {/* Strength bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 flex gap-1">
          {[1, 2, 3, 4].map((level) => (
            <div
              key={level}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                level <= strength ? strengthColor : 'bg-muted'
              }`}
            />
          ))}
        </div>
        <span className="text-xs text-muted-foreground">{strengthLabel}</span>
      </div>

      {/* Requirements checklist */}
      <ul className="space-y-1" aria-label={t('requirementsLabel')}>
        {requirements.map((req) => (
          <li key={req.label} className="flex items-center gap-1.5 text-xs">
            {req.met ? (
              <Check className="h-3 w-3 text-green-500" aria-hidden="true" />
            ) : (
              <X className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
            )}
            <span className={req.met ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}>
              {req.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
