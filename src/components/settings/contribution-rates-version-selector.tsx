'use client'

import { useTranslations } from 'next-intl'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'
import { ContributionRateVersion } from '@/app/[locale]/(protected)/settings/contribution-rates/actions'

interface VersionSelectorProps {
  versions: ContributionRateVersion[]
  selectedVersionId: string | null
  onVersionChange: (versionId: string) => void
  isLoading?: boolean
}

export function VersionSelector({
  versions,
  selectedVersionId,
  onVersionChange,
  isLoading = false
}: VersionSelectorProps) {
  const t = useTranslations('settings.contributionRates.version')

  if (versions.length === 0) {
    return null
  }

  // Format version label
  const formatVersionLabel = (version: ContributionRateVersion) => {
    const validFrom = new Date(version.valid_from).toLocaleDateString('de-CH')
    const isCurrent = version.valid_to === null

    return {
      label: `${t('validFrom')}: ${validFrom}`,
      isCurrent
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Select
        value={selectedVersionId || undefined}
        onValueChange={onVersionChange}
        disabled={isLoading}
      >
        <SelectTrigger className="w-full sm:w-[280px]">
          {isLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{t('selectVersion')}</span>
            </div>
          ) : (
            <SelectValue placeholder={t('selectVersion')} />
          )}
        </SelectTrigger>
        <SelectContent>
          {versions.map((version) => {
            const { label, isCurrent } = formatVersionLabel(version)
            return (
              <SelectItem key={version.id} value={version.id}>
                <div className="flex items-center gap-2">
                  <span>{label}</span>
                  {isCurrent && (
                    <Badge variant="default" className="text-xs">
                      {t('current')}
                    </Badge>
                  )}
                </div>
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>
    </div>
  )
}
