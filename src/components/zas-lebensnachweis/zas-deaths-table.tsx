'use client'

import { useCallback, useState } from 'react'
import { useTranslations, useFormatter } from 'next-intl'
import { Link, useRouter } from '@/i18n/routing'
import { toast } from 'sonner'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle2, ExternalLink, Loader2 } from 'lucide-react'
import { formatAhvNumber } from '@/lib/pensioners'
import type { ZasDeath, ZasDeathStatus } from '@/lib/zas-runs.types'

interface ZasDeathsTableProps {
  runId: string
  deaths: ZasDeath[]
  canEdit: boolean
}

const deathStatusVariant: Record<
  ZasDeathStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  open: 'destructive',
  processed: 'default',
  already_known: 'secondary',
}

/**
 * PROJ-23: Tabular view of all deaths reported in one ZAS run.
 * Inline action: mark as processed (PATCH /api/zas-runs/[id]/deaths/[deathId]).
 */
export function ZasDeathsTable({ runId, deaths, canEdit }: ZasDeathsTableProps) {
  const t = useTranslations('zasLifeVerification.deaths')
  const format = useFormatter()
  const router = useRouter()
  const [pendingId, setPendingId] = useState<string | null>(null)

  const updateStatus = useCallback(
    async (deathId: string, status: 'processed' | 'already_known') => {
      setPendingId(deathId)
      try {
        const response = await fetch(
          `/api/zas-runs/${runId}/deaths/${deathId}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status }),
          }
        )
        if (!response.ok) {
          const body = await response.json().catch(() => ({}))
          console.error('Update death failed:', response.status, body)
          toast.error(t('patchError'))
          return
        }
        toast.success(t('statuses.processed'))
        router.refresh()
      } catch (err) {
        console.error('Update death exception:', err)
        toast.error(t('patchError'))
      } finally {
        setPendingId(null)
      }
    },
    [runId, t, router]
  )

  if (deaths.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        {t('empty')}
      </p>
    )
  }

  const formatDate = (value: string | null) => {
    if (!value) return '—'
    return format.dateTime(new Date(value), {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  return (
    <div
      className="rounded-md border overflow-x-auto"
      aria-live="polite"
      aria-busy={pendingId !== null}
    >
      <Table>
        <TableCaption className="sr-only">{t('title')}</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">{t('columns.name')}</TableHead>
            <TableHead scope="col">{t('columns.ahvNumber')}</TableHead>
            <TableHead scope="col">{t('columns.dateOfDeath')}</TableHead>
            <TableHead scope="col">{t('columns.status')}</TableHead>
            <TableHead scope="col" className="text-right">
              {t('columns.actions')}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {deaths.map((death) => {
            const fullName =
              [death.last_name, death.first_name].filter(Boolean).join(', ') ||
              '—'
            const isPending = pendingId === death.id
            const isOpen = death.status === 'open'
            return (
              <TableRow key={death.id}>
                <TableCell className="font-medium">{fullName}</TableCell>
                <TableCell>
                  <span className="font-mono text-sm">
                    {formatAhvNumber(death.ahv_number)}
                  </span>
                </TableCell>
                <TableCell>{formatDate(death.date_of_death)}</TableCell>
                <TableCell>
                  <Badge variant={deathStatusVariant[death.status]}>
                    {t(`statuses.${death.status}`)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-wrap gap-2 justify-end">
                    {death.insured_person_id ? (
                      <Button variant="ghost" size="sm" asChild>
                        <Link
                          href={`/insured/${death.insured_person_id}` as never}
                        >
                          <ExternalLink
                            className="h-4 w-4 mr-1"
                            aria-hidden="true"
                          />
                          {t('openInProfile')}
                        </Link>
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground self-center">
                        {t('noProfileLink')}
                      </span>
                    )}
                    {canEdit && isOpen && (
                      <Button
                        size="sm"
                        onClick={() => updateStatus(death.id, 'processed')}
                        disabled={isPending}
                      >
                        {isPending ? (
                          <Loader2
                            className="h-4 w-4 mr-1 animate-spin"
                            aria-hidden="true"
                          />
                        ) : (
                          <CheckCircle2
                            className="h-4 w-4 mr-1"
                            aria-hidden="true"
                          />
                        )}
                        {t('markProcessed')}
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
