'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/routing'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { validateIBANInput } from '@/lib/iban-validation'
import type { DebtorSettings } from '@/lib/payment-run-exports.types'

interface DebtorSettingsFormProps {
  initialSettings: DebtorSettings
}

export function DebtorSettingsForm({ initialSettings }: DebtorSettingsFormProps) {
  const t = useTranslations('paymentRuns.debtorSettings')
  const tActions = useTranslations('actions')
  const tA11y = useTranslations('accessibility')
  const router = useRouter()

  const [form, setForm] = useState<DebtorSettings>(initialSettings)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof DebtorSettings, string>>>({})

  const update = <K extends keyof DebtorSettings>(key: K, value: DebtorSettings[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  const validate = useCallback((): boolean => {
    const errs: Partial<Record<keyof DebtorSettings, string>> = {}
    if (!form.name.trim()) errs.name = t('errors.required')
    if (!form.street.trim()) errs.street = t('errors.required')
    if (!form.postal_code.trim()) errs.postal_code = t('errors.required')
    if (!form.city.trim()) errs.city = t('errors.required')
    if (!form.country.trim()) errs.country = t('errors.required')
    if (!form.organisation_id.trim()) errs.organisation_id = t('errors.required')
    if (!form.iban.trim()) {
      errs.iban = t('errors.required')
    } else {
      const ibanCheck = validateIBANInput(form.iban)
      if (!ibanCheck.valid) {
        errs.iban = t('errors.ibanInvalid')
      } else if (ibanCheck.isForeignIBAN) {
        errs.iban = t('errors.ibanForeign')
      }
    }
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }, [form, t])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setMessage(null)
      if (!validate()) return

      setLoading(true)
      try {
        const response = await fetch('/api/settings/debtor', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) {
          console.error('Save debtor failed:', response.status, data)
          setMessage({ kind: 'error', text: data.error || t('saveError') })
          return
        }
        setMessage({ kind: 'success', text: t('saveSuccess') })
        router.refresh()
      } catch (err) {
        console.error('Save debtor exception:', err)
        setMessage({ kind: 'error', text: t('saveError') })
      } finally {
        setLoading(false)
      }
    },
    [form, validate, router, t]
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="debtor-name">
              {t('fields.name')}{' '}
              <span className="text-destructive" aria-hidden="true">*</span>
              <span className="sr-only">({tA11y('requiredField')})</span>
            </Label>
            <Input
              id="debtor-name"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              maxLength={140}
              required
              aria-required="true"
              aria-invalid={!!fieldErrors.name}
              aria-describedby={fieldErrors.name ? 'debtor-name-error' : undefined}
            />
            {fieldErrors.name && (
              <p id="debtor-name-error" className="text-sm text-destructive" role="alert" aria-live="assertive">
                {fieldErrors.name}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="debtor-street">
              {t('fields.street')}{' '}
              <span className="text-destructive" aria-hidden="true">*</span>
              <span className="sr-only">({tA11y('requiredField')})</span>
            </Label>
            <Input
              id="debtor-street"
              value={form.street}
              onChange={(e) => update('street', e.target.value)}
              maxLength={140}
              required
              aria-required="true"
              aria-invalid={!!fieldErrors.street}
              aria-describedby={fieldErrors.street ? 'debtor-street-error' : undefined}
            />
            {fieldErrors.street && (
              <p id="debtor-street-error" className="text-sm text-destructive" role="alert" aria-live="assertive">
                {fieldErrors.street}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="debtor-postal">
                {t('fields.postalCode')}{' '}
                <span className="text-destructive" aria-hidden="true">*</span>
                <span className="sr-only">({tA11y('requiredField')})</span>
              </Label>
              <Input
                id="debtor-postal"
                value={form.postal_code}
                onChange={(e) => update('postal_code', e.target.value)}
                maxLength={16}
                required
                aria-required="true"
                aria-invalid={!!fieldErrors.postal_code}
                aria-describedby={fieldErrors.postal_code ? 'debtor-postal-error' : undefined}
              />
              {fieldErrors.postal_code && (
                <p id="debtor-postal-error" className="text-sm text-destructive" role="alert" aria-live="assertive">
                  {fieldErrors.postal_code}
                </p>
              )}
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="debtor-city">
                {t('fields.city')}{' '}
                <span className="text-destructive" aria-hidden="true">*</span>
                <span className="sr-only">({tA11y('requiredField')})</span>
              </Label>
              <Input
                id="debtor-city"
                value={form.city}
                onChange={(e) => update('city', e.target.value)}
                maxLength={70}
                required
                aria-required="true"
                aria-invalid={!!fieldErrors.city}
                aria-describedby={fieldErrors.city ? 'debtor-city-error' : undefined}
              />
              {fieldErrors.city && (
                <p id="debtor-city-error" className="text-sm text-destructive" role="alert" aria-live="assertive">
                  {fieldErrors.city}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2 max-w-xs">
            <Label htmlFor="debtor-country">
              {t('fields.country')}{' '}
              <span className="text-destructive" aria-hidden="true">*</span>
              <span className="sr-only">({tA11y('requiredField')})</span>
            </Label>
            <Select
              value={form.country || 'CH'}
              onValueChange={(v) => update('country', v)}
            >
              <SelectTrigger
                id="debtor-country"
                aria-required="true"
                aria-invalid={!!fieldErrors.country}
                aria-describedby={fieldErrors.country ? 'debtor-country-error' : undefined}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CH">CH – {t('countries.CH')}</SelectItem>
                <SelectItem value="LI">LI – {t('countries.LI')}</SelectItem>
              </SelectContent>
            </Select>
            {fieldErrors.country && (
              <p id="debtor-country-error" className="text-sm text-destructive" role="alert" aria-live="assertive">
                {fieldErrors.country}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="debtor-iban">
              {t('fields.iban')}{' '}
              <span className="text-destructive" aria-hidden="true">*</span>
              <span className="sr-only">({tA11y('requiredField')})</span>
            </Label>
            <Input
              id="debtor-iban"
              value={form.iban}
              onChange={(e) => update('iban', e.target.value)}
              maxLength={34}
              placeholder="CH93 0076 2011 6238 5295 7"
              className="font-mono"
              required
              aria-required="true"
              aria-invalid={!!fieldErrors.iban}
              aria-describedby={`debtor-iban-hint${fieldErrors.iban ? ' debtor-iban-error' : ''}`}
            />
            {fieldErrors.iban && (
              <p id="debtor-iban-error" className="text-sm text-destructive" role="alert" aria-live="assertive">
                {fieldErrors.iban}
              </p>
            )}
            <p id="debtor-iban-hint" className="text-xs text-muted-foreground">{t('fields.ibanHint')}</p>
          </div>

          <div className="space-y-2 max-w-xs">
            <Label htmlFor="debtor-org-id">
              {t('fields.organisationId')}{' '}
              <span className="text-destructive" aria-hidden="true">*</span>
              <span className="sr-only">({tA11y('requiredField')})</span>
            </Label>
            <Input
              id="debtor-org-id"
              value={form.organisation_id}
              onChange={(e) => update('organisation_id', e.target.value)}
              maxLength={35}
              required
              aria-required="true"
              aria-invalid={!!fieldErrors.organisation_id}
              aria-describedby={`debtor-org-id-hint${fieldErrors.organisation_id ? ' debtor-org-id-error' : ''}`}
            />
            {fieldErrors.organisation_id && (
              <p id="debtor-org-id-error" className="text-sm text-destructive" role="alert" aria-live="assertive">
                {fieldErrors.organisation_id}
              </p>
            )}
            <p id="debtor-org-id-hint" className="text-xs text-muted-foreground">{t('fields.organisationIdHint')}</p>
          </div>

          {message && (
            <p
              className={
                message.kind === 'error'
                  ? 'text-sm text-destructive'
                  : 'text-sm text-green-700 dark:text-green-400'
              }
              role={message.kind === 'error' ? 'alert' : 'status'}
              aria-live={message.kind === 'error' ? 'assertive' : 'polite'}
            >
              {message.text}
            </p>
          )}

          <Button type="submit" disabled={loading}>
            {loading && (
              <span
                className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                aria-hidden="true"
              />
            )}
            {tActions('save')}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
