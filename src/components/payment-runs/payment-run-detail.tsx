'use client'

import { useState, useMemo, useCallback } from 'react'
import { useTranslations, useFormatter } from 'next-intl'
import { Link, useRouter } from '@/i18n/routing'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ChevronLeft,
  Plus,
  Trash2,
  Send,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  AlertTriangle,
  History,
} from 'lucide-react'
import { usePermissions } from '@/hooks/use-permissions'
import { formatIBANForDisplay } from '@/lib/iban-validation'
import type { PaymentRun, PaymentRunEvent, PaymentRunStatus } from '@/lib/payment-runs.types'
import type { PaymentOrder } from '@/lib/payment-orders.types'
import { AddOrdersDialog } from './add-orders-dialog'
import { RejectRunDialog } from './reject-run-dialog'
import { ConfirmActionDialog } from './confirm-action-dialog'

interface PaymentRunDetailProps {
  run: PaymentRun
  orders: PaymentOrder[]
  events: PaymentRunEvent[]
  currentUserId: string
  highAmountThreshold: number
}

const statusVariant: Record<PaymentRunStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'outline',
  in_review: 'secondary',
  visaed: 'secondary',
  approved: 'default',
  rejected: 'destructive',
  exported: 'default',
}

export function PaymentRunDetail({
  run,
  orders,
  events,
  currentUserId,
  highAmountThreshold,
}: PaymentRunDetailProps) {
  const t = useTranslations('paymentRuns')
  const tActions = useTranslations('actions')
  const format = useFormatter()
  const router = useRouter()
  const { hasPermission } = usePermissions()
  const canManage = hasPermission('payment_orders.create')

  const [addOrdersOpen, setAddOrdersOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false)
  const [visaConfirmOpen, setVisaConfirmOpen] = useState(false)
  const [approveConfirmOpen, setApproveConfirmOpen] = useState(false)
  const [removingOrderId, setRemovingOrderId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const totalAmount = useMemo(
    () => orders.reduce((sum, o) => sum + Number(o.amount), 0),
    [orders]
  )

  const highAmountOrders = useMemo(
    () => orders.filter((o) => Number(o.amount) >= highAmountThreshold),
    [orders, highAmountThreshold]
  )

  const isEditable = run.status === 'draft'
  const canSubmit = run.status === 'draft' && orders.length > 0
  const canVisa = run.status === 'in_review'
  const canApprove = run.status === 'visaed' && run.visaed_by !== currentUserId
  const canReject = run.status === 'in_review' || run.status === 'visaed'
  const fourEyesViolation = run.status === 'visaed' && run.visaed_by === currentUserId

  const callAction = useCallback(
    async (url: string, method: 'POST' | 'DELETE', body?: unknown) => {
      setLoading(true)
      setActionError(null)
      try {
        const response = await fetch(url, {
          method,
          headers: body ? { 'Content-Type': 'application/json' } : undefined,
          body: body ? JSON.stringify(body) : undefined,
        })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) {
          console.error('Action failed:', url, response.status, data)
          setActionError(data.error || t('detail.actionError'))
          return false
        }
        router.refresh()
        return true
      } catch (err) {
        console.error('Action exception:', err)
        setActionError(t('detail.actionError'))
        return false
      } finally {
        setLoading(false)
      }
    },
    [router, t]
  )

  const handleSubmit = useCallback(async () => {
    const ok = await callAction(`/api/payment-runs/${run.id}/submit`, 'POST')
    if (ok) setSubmitConfirmOpen(false)
  }, [callAction, run.id])

  const handleVisa = useCallback(async () => {
    const ok = await callAction(`/api/payment-runs/${run.id}/visa`, 'POST')
    if (ok) setVisaConfirmOpen(false)
  }, [callAction, run.id])

  const handleApprove = useCallback(async () => {
    const ok = await callAction(`/api/payment-runs/${run.id}/approve`, 'POST')
    if (ok) setApproveConfirmOpen(false)
  }, [callAction, run.id])

  const handleRemoveOrder = useCallback(
    async (orderId: string) => {
      setRemovingOrderId(orderId)
      await callAction(`/api/payment-runs/${run.id}/orders/${orderId}`, 'DELETE')
      setRemovingOrderId(null)
    },
    [callAction, run.id]
  )

  return (
    <div className="space-y-6">
      {/* Back & Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/payment-runs">
            <ChevronLeft className="h-4 w-4 mr-1" aria-hidden="true" />
            {t('detail.backToList')}
          </Link>
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{run.name}</h1>
          <p className="text-muted-foreground mt-1">
            {t('detail.createdAt')}: {new Date(run.created_at).toLocaleString()}
            {run.execution_date && (
              <> · {t('detail.executionDate')}: {new Date(run.execution_date).toLocaleDateString()}</>
            )}
          </p>
        </div>
        <Badge variant={statusVariant[run.status]} className="text-sm self-start">
          {t(`status.${run.status}`)}
        </Badge>
      </div>

      {/* Rejection reason */}
      {run.status === 'rejected' && run.rejection_reason && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4">
          <h3 className="font-semibold text-destructive flex items-center gap-2">
            <XCircle className="h-4 w-4" aria-hidden="true" />
            {t('detail.rejectedHeading')}
          </h3>
          <p className="mt-2 text-sm">{run.rejection_reason}</p>
        </div>
      )}

      {/* Four-eyes violation warning */}
      {fourEyesViolation && (
        <div className="rounded-lg border border-amber-500/50 bg-amber-500/5 p-4 text-sm">
          <span className="font-semibold">{t('detail.fourEyesNotice')}</span>
        </div>
      )}

      {/* Action errors */}
      {actionError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive" role="alert">
          {actionError}
        </div>
      )}

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('detail.summary.orderCount')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums">{orders.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('detail.summary.totalAmount')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums">
              {format.number(totalAmount, { style: 'currency', currency: 'CHF' })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              {highAmountOrders.length > 0 && <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden="true" />}
              {t('detail.summary.highAmount')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums">{highAmountOrders.length}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {t('detail.summary.highAmountThreshold', {
                threshold: format.number(highAmountThreshold, { style: 'currency', currency: 'CHF' }),
              })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Workflow actions */}
      {canManage && run.status !== 'exported' && (
        <Card>
          <CardHeader>
            <CardTitle>{t('detail.actions.title')}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {isEditable && (
              <Button onClick={() => setAddOrdersOpen(true)} disabled={loading}>
                <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                {t('detail.actions.addOrders')}
              </Button>
            )}
            {canSubmit && (
              <Button variant="default" onClick={() => setSubmitConfirmOpen(true)} disabled={loading}>
                <Send className="h-4 w-4 mr-2" aria-hidden="true" />
                {t('detail.actions.submit')}
              </Button>
            )}
            {canVisa && (
              <Button variant="default" onClick={() => setVisaConfirmOpen(true)} disabled={loading}>
                <ShieldCheck className="h-4 w-4 mr-2" aria-hidden="true" />
                {t('detail.actions.visa')}
              </Button>
            )}
            {canApprove && (
              <Button variant="default" onClick={() => setApproveConfirmOpen(true)} disabled={loading}>
                <CheckCircle2 className="h-4 w-4 mr-2" aria-hidden="true" />
                {t('detail.actions.approve')}
              </Button>
            )}
            {canReject && (
              <Button variant="destructive" onClick={() => setRejectOpen(true)} disabled={loading}>
                <XCircle className="h-4 w-4 mr-2" aria-hidden="true" />
                {t('detail.actions.reject')}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Orders list */}
      <Card>
        <CardHeader>
          <CardTitle>{t('detail.orders.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">{t('detail.orders.empty')}</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('detail.orders.recipient')}</TableHead>
                    <TableHead className="hidden md:table-cell">{t('detail.orders.iban')}</TableHead>
                    <TableHead className="text-right">{t('detail.orders.amount')}</TableHead>
                    <TableHead className="hidden lg:table-cell">{t('detail.orders.purpose')}</TableHead>
                    {isEditable && <TableHead></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => {
                    const isHighAmount = Number(order.amount) >= highAmountThreshold
                    return (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.recipient_name}</TableCell>
                        <TableCell className="hidden md:table-cell font-mono text-xs">
                          {formatIBANForDisplay(order.iban)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          <span className={isHighAmount ? 'flex items-center justify-end gap-1 text-amber-700 dark:text-amber-400' : ''}>
                            {isHighAmount && <AlertTriangle className="h-3 w-3" aria-hidden="true" />}
                            {format.number(Number(order.amount), { style: 'currency', currency: 'CHF' })}
                          </span>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{order.purpose}</TableCell>
                        {isEditable && (
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveOrder(order.id)}
                              disabled={loading || removingOrderId === order.id}
                              aria-label={t('detail.orders.remove')}
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Audit trail */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" aria-hidden="true" />
            {t('detail.audit.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('detail.audit.empty')}</p>
          ) : (
            <ul className="space-y-3">
              {events.map((event) => (
                <li key={event.id} className="flex gap-3 border-l-2 border-muted pl-4">
                  <div className="flex-1">
                    <p className="text-sm">
                      <span className="font-medium">{t(`detail.audit.events.${event.event_type}`)}</span>
                      {event.actor_name && <span className="text-muted-foreground"> · {event.actor_name}</span>}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(event.created_at).toLocaleString()}
                    </p>
                    {event.payload && Object.keys(event.payload).length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1 font-mono">
                        {JSON.stringify(event.payload)}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      {isEditable && (
        <AddOrdersDialog
          open={addOrdersOpen}
          onOpenChange={setAddOrdersOpen}
          runId={run.id}
        />
      )}

      <ConfirmActionDialog
        open={submitConfirmOpen}
        onOpenChange={setSubmitConfirmOpen}
        title={t('detail.actions.submit')}
        description={t('detail.confirmations.submit', { count: orders.length })}
        confirmLabel={t('detail.actions.submit')}
        onConfirm={handleSubmit}
        loading={loading}
      />
      <ConfirmActionDialog
        open={visaConfirmOpen}
        onOpenChange={setVisaConfirmOpen}
        title={t('detail.actions.visa')}
        description={t('detail.confirmations.visa')}
        confirmLabel={t('detail.actions.visa')}
        onConfirm={handleVisa}
        loading={loading}
      />
      <ConfirmActionDialog
        open={approveConfirmOpen}
        onOpenChange={setApproveConfirmOpen}
        title={t('detail.actions.approve')}
        description={t('detail.confirmations.approve', {
          amount: format.number(totalAmount, { style: 'currency', currency: 'CHF' }),
          count: orders.length,
        })}
        confirmLabel={t('detail.actions.approve')}
        onConfirm={handleApprove}
        loading={loading}
        variant="default"
      />
      <RejectRunDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        runId={run.id}
      />
    </div>
  )
}
