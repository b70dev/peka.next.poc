'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/routing'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SETTING_HIGH_AMOUNT_THRESHOLD } from '@/lib/payment-runs.types'

interface PaymentRunSettingsFormProps {
  initialThreshold: number
  description: string | null
}

export function PaymentRunSettingsForm({ initialThreshold, description }: PaymentRunSettingsFormProps) {
  const t = useTranslations('paymentRuns.settings')
  const tActions = useTranslations('actions')
  const router = useRouter()

  const [threshold, setThreshold] = useState(initialThreshold.toString())
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  const handleSave = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      const numeric = parseFloat(threshold)
      if (!Number.isFinite(numeric) || numeric < 0) {
        setMessage({ kind: 'error', text: t('invalid') })
        return
      }

      setLoading(true)
      setMessage(null)
      try {
        const response = await fetch(`/api/settings/${encodeURIComponent(SETTING_HIGH_AMOUNT_THRESHOLD)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value: numeric }),
        })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) {
          console.error('Update setting failed:', response.status, data)
          setMessage({ kind: 'error', text: data.error || t('saveError') })
          return
        }
        setMessage({ kind: 'success', text: t('saveSuccess') })
        router.refresh()
      } catch (err) {
        console.error('Update setting exception:', err)
        setMessage({ kind: 'error', text: t('saveError') })
      } finally {
        setLoading(false)
      }
    },
    [threshold, router, t]
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('thresholdLabel')}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="threshold">{t('thresholdInputLabel')}</Label>
            <Input
              id="threshold"
              type="number"
              step="1"
              min="0"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              className="tabular-nums max-w-xs"
            />
          </div>

          {message && (
            <p
              className={message.kind === 'error' ? 'text-sm text-destructive' : 'text-sm text-green-700 dark:text-green-400'}
              role={message.kind === 'error' ? 'alert' : 'status'}
            >
              {message.text}
            </p>
          )}

          <Button type="submit" disabled={loading}>
            {loading && (
              <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            )}
            {tActions('save')}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
