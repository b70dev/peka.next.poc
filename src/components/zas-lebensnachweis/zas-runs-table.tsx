'use client'

import { useTranslations, useFormatter } from 'next-intl'
import { useRouter } from '@/i18n/routing'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { FileText } from 'lucide-react'
import { ZasStatusBadge } from './zas-status-badge'
import type { ZasRunWithCounts } from '@/lib/zas-runs.types'

interface ZasRunsTableProps {
  runs: ZasRunWithCounts[]
}

/**
 * PROJ-23: Overview table for ZAS Lebensnachweis runs.
 * Whole row is clickable (PROJ-24 row-click pattern).
 */
export function ZasRunsTable({ runs }: ZasRunsTableProps) {
  const t = useTranslations('zasLifeVerification')
  const format = useFormatter()
  const router = useRouter()

  if (runs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-card p-12 text-center">
        <FileText
          className="h-12 w-12 text-muted-foreground/50 mb-4"
          aria-hidden="true"
        />
        <h2 className="text-lg font-semibold">{t('empty')}</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-md">
          {t('emptyDescription')}
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-md border bg-card overflow-x-auto">
      <Table>
        <TableCaption className="sr-only">{t('title')}</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">{t('columns.createdAt')}</TableHead>
            <TableHead scope="col" className="text-right">
              {t('columns.pensionerCount')}
            </TableHead>
            <TableHead scope="col" className="text-right">
              {t('columns.deathCount')}
            </TableHead>
            <TableHead scope="col">{t('columns.status')}</TableHead>
            <TableHead scope="col" className="hidden md:table-cell">
              {t('columns.createdBy')}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {runs.map((run) => {
            const navigate = () => router.push(`/zas-lebensnachweis/${run.id}` as never)
            const dateLabel = format.dateTime(new Date(run.created_at), {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            })
            return (
              <TableRow
                key={run.id}
                className="hover:bg-muted/50 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
                role="button"
                tabIndex={0}
                onClick={navigate}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    navigate()
                  }
                }}
                aria-label={`${dateLabel} · ${run.pensioner_count}`}
              >
                <TableCell className="font-medium">{dateLabel}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {run.pensioner_count}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {run.death_count}
                </TableCell>
                <TableCell>
                  <ZasStatusBadge status={run.status} />
                </TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground">
                  {run.created_by_name ?? '—'}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
