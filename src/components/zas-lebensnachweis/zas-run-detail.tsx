'use client'

import { useCallback, useMemo, useState } from 'react'
import { useFormatter, useTranslations } from 'next-intl'
import { Link, useRouter } from '@/i18n/routing'
import { toast } from 'sonner'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  ChevronLeft,
  CheckCircle2,
  Download,
  Upload,
  XCircle,
} from 'lucide-react'
import { usePermissions } from '@/hooks/use-permissions'
import { ZasStatusBadge } from './zas-status-badge'
import { ZasDeathsTable } from './zas-deaths-table'
import { ImportResponseDialog } from './import-response-dialog'
import { ConfirmActionDialog } from '@/components/payment-runs/confirm-action-dialog'
import type { ZasDeath, ZasRun } from '@/lib/zas-runs.types'

interface ZasRunDetailProps {
  run: ZasRun
  deaths: ZasDeath[]
  createdByName: string | null
}

/**
 * PROJ-23: Detail view for a single ZAS Lebensnachweis run.
 * Status-driven action area + summary cards + deaths table.
 */
export function ZasRunDetail({ run, deaths, createdByName }: ZasRunDetailProps) {
  const t = useTranslations('zasLifeVerification')
  const format = useFormatter()
  const router = useRouter()
  const { hasPermission } = usePermissions()
  const canManage = hasPermission('zas.manage')

  const [importOpen, setImportOpen] = useState(false)
  const [completeOpen, setCompleteOpen] = useState(false)
  const [completeWithoutOpen, setCompleteWithoutOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const summary = useMemo(() => {
    const total = deaths.length
    const open = deaths.filter((d) => d.status === 'open').length
    return { total, open, processed: total - open }
  }, [deaths])

  const dateLabel = format.dateTime(new Date(run.created_at), {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  const dateTimeLabel = format.dateTime(new Date(run.created_at), {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const showRequestStatusActions = run.status === 'request_created'
  const showResponseImportedActions = run.status === 'response_imported'
  const isCompleted =
    run.status === 'completed' || run.status === 'completed_without_response'
  const canComplete = summary.open === 0

  const completeRun = useCallback(
    async (mode: 'completed' | 'completed_without_response') => {
      setActionLoading(true)
      setActionError(null)
      try {
        const response = await fetch(
          `/api/zas-runs/${run.id}/complete?mode=${mode}`,
          { method: 'PATCH' }
        )
        if (!response.ok) {
          const body = await response.json().catch(() => ({}))
          console.error('Complete run failed:', response.status, body)
          setActionError(t('detail.actions.actionError'))
          return
        }
        toast.success(t('toasts.completed'))
        if (mode === 'completed') setCompleteOpen(false)
        else setCompleteWithoutOpen(false)
        router.refresh()
      } catch (err) {
        console.error('Complete run exception:', err)
        setActionError(t('detail.actions.actionError'))
      } finally {
        setActionLoading(false)
      }
    },
    [run.id, t, router]
  )

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/zas-lebensnachweis">
                {t('detail.breadcrumbList')}
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{dateLabel}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Back button + header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/zas-lebensnachweis">
            <ChevronLeft className="h-4 w-4 mr-1" aria-hidden="true" />
            {t('detail.backToList')}
          </Link>
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t('detail.headingPrefix')} {dateLabel}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {t('detail.createdAt')}: {dateTimeLabel}
            {createdByName && (
              <>
                {' · '}
                {t('detail.createdBy')}: {createdByName}
              </>
            )}
          </p>
          <p className="text-xs text-muted-foreground mt-1 font-mono">
            {t('detail.requestFilename')}:{' '}
            {run.request_filename ?? t('detail.filenamePending')}
          </p>
        </div>
        <ZasStatusBadge status={run.status} className="text-sm self-start" />
      </div>

      {/* Read-only hint */}
      {isCompleted && (
        <div
          className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          {t('detail.actions.readOnlyHint')}
        </div>
      )}

      {/* Action error */}
      {actionError && (
        <div
          className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive"
          role="alert"
        >
          {actionError}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('detail.summary.pensioners')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums">
              {run.pensioner_count}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('detail.summary.deaths')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums">{summary.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('detail.summary.openVsProcessed')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums">
              {t('detail.summary.openVsProcessedFormat', {
                open: summary.open,
                processed: summary.processed,
              })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Action area */}
      {canManage && (showRequestStatusActions || showResponseImportedActions) && (
        <Card>
          <CardHeader>
            <CardTitle>{t('detail.actions.title')}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {showRequestStatusActions && (
              <>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      {/* span wrapper so the tooltip shows even on disabled button */}
                      <span tabIndex={0}>
                        <Button
                          variant="outline"
                          disabled
                          aria-disabled="true"
                          aria-describedby={`download-not-impl-${run.id}`}
                        >
                          <Download
                            className="h-4 w-4 mr-2"
                            aria-hidden="true"
                          />
                          {t('detail.actions.downloadAgain')}
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent
                      id={`download-not-impl-${run.id}`}
                      role="tooltip"
                    >
                      {t('detail.actions.downloadNotImplemented')}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <Button
                  variant="default"
                  onClick={() => setImportOpen(true)}
                  disabled={actionLoading}
                >
                  <Upload className="h-4 w-4 mr-2" aria-hidden="true" />
                  {t('detail.actions.importResponse')}
                </Button>

                <Button
                  variant="destructive"
                  onClick={() => setCompleteWithoutOpen(true)}
                  disabled={actionLoading}
                >
                  <XCircle className="h-4 w-4 mr-2" aria-hidden="true" />
                  {t('detail.actions.completeWithoutResponse')}
                </Button>
              </>
            )}

            {showResponseImportedActions && (
              <Button
                onClick={() => setCompleteOpen(true)}
                disabled={actionLoading || !canComplete}
                title={!canComplete ? t('detail.actions.completeBlockedByOpenDeaths') : undefined}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" aria-hidden="true" />
                {t('detail.actions.complete')}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Deaths table — show whenever deaths exist or run was imported */}
      {(deaths.length > 0 || run.status !== 'request_created') && (
        <Card>
          <CardHeader>
            <CardTitle>{t('deaths.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ZasDeathsTable
              runId={run.id}
              deaths={deaths}
              canEdit={canManage && !isCompleted}
            />
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      {canManage && (
        <>
          <ImportResponseDialog
            runId={run.id}
            open={importOpen}
            onOpenChange={setImportOpen}
          />
          <ConfirmActionDialog
            open={completeOpen}
            onOpenChange={setCompleteOpen}
            title={t('detail.completeConfirm.title')}
            description={t('detail.completeConfirm.description')}
            confirmLabel={t('detail.completeConfirm.submit')}
            onConfirm={() => completeRun('completed')}
            loading={actionLoading}
          />
          <ConfirmActionDialog
            open={completeWithoutOpen}
            onOpenChange={setCompleteWithoutOpen}
            title={t('detail.completeWithoutResponseConfirm.title')}
            description={t('detail.completeWithoutResponseConfirm.description')}
            confirmLabel={t('detail.completeWithoutResponseConfirm.submit')}
            onConfirm={() => completeRun('completed_without_response')}
            loading={actionLoading}
            variant="destructive"
          />
        </>
      )}

    </div>
  )
}
