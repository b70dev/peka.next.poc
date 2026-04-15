'use client'

import { useTranslations, useFormatter } from 'next-intl'
import { FileDown } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import type { PaymentRunExport } from '@/lib/payment-run-exports.types'

interface ExportsHistoryProps {
  runId: string
  exports: PaymentRunExport[]
  totalAmount: number
  orderCount: number
}

export function ExportsHistory({ runId, exports, totalAmount, orderCount }: ExportsHistoryProps) {
  const t = useTranslations('paymentRuns.exportHistory')
  const format = useFormatter()

  if (exports.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileDown className="h-5 w-5" aria-hidden="true" />
            {t('title')}
          </CardTitle>
          <div className="text-sm text-muted-foreground">
            <span>{t('runSummary', { count: orderCount })}</span>
            <span className="mx-2" aria-hidden="true">·</span>
            <span className="font-semibold text-foreground tabular-nums">
              {format.number(totalAmount, { style: 'currency', currency: 'CHF' })}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('columns.exportedAt')}</TableHead>
                <TableHead>{t('columns.version')}</TableHead>
                <TableHead className="hidden md:table-cell">{t('columns.filename')}</TableHead>
                <TableHead className="hidden lg:table-cell">{t('columns.exportedBy')}</TableHead>
                <TableHead className="text-right">{t('columns.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {exports.map((exp) => (
                <TableRow key={exp.id}>
                  <TableCell className="tabular-nums">
                    {new Date(exp.exported_at).toLocaleString()}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{exp.pain_version}</TableCell>
                  <TableCell className="hidden md:table-cell font-mono text-xs">
                    {exp.filename}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {exp.exported_by_name ?? '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="outline" size="sm">
                      <a
                        href={`/api/payment-runs/${runId}/exports/${exp.id}`}
                        download={exp.filename}
                      >
                        <FileDown className="h-3 w-3 mr-1" aria-hidden="true" />
                        {t('redownload')}
                      </a>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
