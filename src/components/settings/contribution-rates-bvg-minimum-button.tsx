'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { FileDown, Loader2 } from 'lucide-react'
import {
  ContributionRateWithTotal,
  getBvgMinimumRates,
  createBvgMinimumVersion
} from '@/app/[locale]/(protected)/settings/contribution-rates/actions'

interface BvgMinimumButtonProps {
  employerId: string
  onRatesLoaded?: (rates: ContributionRateWithTotal[]) => void
  onRatesCreated?: () => void
  sameForAllGenders?: boolean
  isFirst?: boolean
}

export function BvgMinimumButton({
  employerId,
  onRatesLoaded,
  onRatesCreated,
  sameForAllGenders = true,
  isFirst = false
}: BvgMinimumButtonProps) {
  const t = useTranslations('settings.contributionRates')
  const tActions = useTranslations('actions')

  const [loading, setLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleClick = () => {
    if (isFirst) {
      // If first version, create directly without confirmation
      handleCreateFirst()
    } else {
      // Show confirmation dialog
      setShowConfirm(true)
    }
  }

  const handleCreateFirst = async () => {
    setLoading(true)
    try {
      const result = await createBvgMinimumVersion(employerId)

      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success(t('bvgMinimum.success'))
      onRatesCreated?.()
    } catch (error) {
      toast.error(t('bvgMinimum.error'))
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async () => {
    setShowConfirm(false)
    setLoading(true)

    try {
      const { rates: bvgRates, error } = await getBvgMinimumRates()

      if (error || !bvgRates) {
        toast.error(t('bvgMinimum.error'))
        return
      }

      // Convert BVG rates to ContributionRateWithTotal format
      const convertedRates: ContributionRateWithTotal[] = bvgRates.map(rate => ({
        id: `temp-${rate.age}`,
        version_id: '',
        age: rate.age,
        gender: sameForAllGenders ? null : 'M' as const,
        employee_rate: rate.employee_rate,
        employer_rate: rate.employer_rate,
        total_rate: rate.total_rate
      }))

      // If not same for all genders, duplicate for female
      if (!sameForAllGenders) {
        const femaleRates = bvgRates.map(rate => ({
          id: `temp-${rate.age}-W`,
          version_id: '',
          age: rate.age,
          gender: 'W' as const,
          employee_rate: rate.employee_rate,
          employer_rate: rate.employer_rate,
          total_rate: rate.total_rate
        }))
        convertedRates.push(...femaleRates)
      }

      toast.success(t('bvgMinimum.success'))
      onRatesLoaded?.(convertedRates)
    } catch (error) {
      toast.error(t('bvgMinimum.error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button
        variant={isFirst ? 'outline' : 'secondary'}
        onClick={handleClick}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <FileDown className="h-4 w-4 mr-2" />
        )}
        {t('useBvgMinimum')}
      </Button>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('bvgMinimum.title')}</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>{t('bvgMinimum.confirmOverwrite')}</p>
              <div className="mt-4 space-y-1 text-sm">
                <p className="font-medium">BVG-Minimum-Saetze:</p>
                <ul className="list-disc list-inside text-muted-foreground">
                  <li>{t('bvgMinimum.rates.18-24')}</li>
                  <li>{t('bvgMinimum.rates.25-34')}</li>
                  <li>{t('bvgMinimum.rates.35-44')}</li>
                  <li>{t('bvgMinimum.rates.45-54')}</li>
                  <li>{t('bvgMinimum.rates.55-70')}</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tActions('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>
              {tActions('confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
