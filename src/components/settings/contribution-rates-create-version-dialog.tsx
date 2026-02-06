'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { Plus, Loader2 } from 'lucide-react'
import {
  ContributionRateWithTotal,
  createVersion,
  getBvgMinimumRates
} from '@/app/[locale]/(protected)/settings/contribution-rates/actions'

interface CreateVersionDialogProps {
  employerId: string
  onVersionCreated: () => void
  currentRates?: ContributionRateWithTotal[]
  isFirst?: boolean
}

export function CreateVersionDialog({
  employerId,
  onVersionCreated,
  currentRates = [],
  isFirst = false
}: CreateVersionDialogProps) {
  const t = useTranslations('settings.contributionRates')
  const tActions = useTranslations('actions')

  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [validFrom, setValidFrom] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })
  const [copyFromCurrent, setCopyFromCurrent] = useState(true)
  const [useBvgMinimum, setUseBvgMinimum] = useState(false)
  const [sameForAllGenders, setSameForAllGenders] = useState(true)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validFrom) {
      toast.error(t('validation.validFromRequired'))
      return
    }

    // Validate date is not in the past
    const selectedDate = new Date(validFrom)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (selectedDate < today) {
      toast.error(t('validation.validFromFuture'))
      return
    }

    setLoading(true)
    try {
      let rates: { age: number; gender: 'M' | 'W' | null; employee_rate: number; employer_rate: number }[] = []

      if (useBvgMinimum || isFirst) {
        // Load BVG minimum rates
        const { rates: bvgRates, error } = await getBvgMinimumRates()
        if (error || !bvgRates) {
          toast.error(t('bvgMinimum.error'))
          return
        }
        rates = bvgRates.map(rate => ({
          age: rate.age,
          gender: null as 'M' | 'W' | null,
          employee_rate: rate.employee_rate,
          employer_rate: rate.employer_rate
        }))
      } else if (copyFromCurrent && currentRates.length > 0) {
        // Copy from current rates
        rates = currentRates.map(rate => ({
          age: rate.age,
          gender: rate.gender,
          employee_rate: rate.employee_rate,
          employer_rate: rate.employer_rate
        }))
      } else {
        // Create empty rates for all ages (18-70)
        for (let age = 18; age <= 70; age++) {
          rates.push({
            age,
            gender: null,
            employee_rate: 0,
            employer_rate: 0
          })
        }
      }

      const result = await createVersion({
        employer_id: employerId,
        valid_from: validFrom,
        same_for_all_genders: sameForAllGenders,
        rates
      })

      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success(t('create.success'))
      setOpen(false)
      onVersionCreated()
    } catch (error) {
      toast.error(t('create.error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={isFirst ? 'default' : 'outline'}>
          <Plus className="h-4 w-4 mr-2" />
          {isFirst ? t('createFirstVersion') : t('version.newVersion')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t('create.title')}</DialogTitle>
            <DialogDescription>{t('create.description')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Valid From Date */}
            <div className="space-y-2">
              <Label htmlFor="valid-from">{t('create.validFrom')} *</Label>
              <Input
                id="valid-from"
                type="date"
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
              <p className="text-xs text-muted-foreground">
                {t('create.validFromHint')}
              </p>
            </div>

            {/* Same for all genders */}
            <div className="flex items-center justify-between">
              <Label htmlFor="same-genders">{t('sameForAllGenders')}</Label>
              <Switch
                id="same-genders"
                checked={sameForAllGenders}
                onCheckedChange={setSameForAllGenders}
              />
            </div>

            {/* Copy from current */}
            {!isFirst && currentRates.length > 0 && (
              <div className="flex items-center justify-between">
                <Label htmlFor="copy-current">{t('create.copyFromCurrent')}</Label>
                <Switch
                  id="copy-current"
                  checked={copyFromCurrent}
                  onCheckedChange={(checked) => {
                    setCopyFromCurrent(checked)
                    if (checked) setUseBvgMinimum(false)
                  }}
                />
              </div>
            )}

            {/* Use BVG Minimum */}
            {!isFirst && (
              <div className="flex items-center justify-between">
                <Label htmlFor="use-bvg">{t('create.useBvgMinimum')}</Label>
                <Switch
                  id="use-bvg"
                  checked={useBvgMinimum}
                  onCheckedChange={(checked) => {
                    setUseBvgMinimum(checked)
                    if (checked) setCopyFromCurrent(false)
                  }}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              {tActions('cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('version.createVersion')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
