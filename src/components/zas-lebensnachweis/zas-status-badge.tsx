'use client'

import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import type { ZasRunStatus } from '@/lib/zas-runs.types'

const statusVariant: Record<
  ZasRunStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  request_created: 'outline',
  response_imported: 'secondary',
  completed: 'default',
  completed_without_response: 'default',
}

interface ZasStatusBadgeProps {
  status: ZasRunStatus
  className?: string
}

/**
 * PROJ-23: Renders the status of a ZAS Lebensnachweis run.
 * Translation keys live under `zasLifeVerification.statuses.*`.
 */
export function ZasStatusBadge({ status, className }: ZasStatusBadgeProps) {
  const t = useTranslations('zasLifeVerification.statuses')
  return (
    <Badge variant={statusVariant[status]} className={className}>
      {t(status)}
    </Badge>
  )
}
