'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from '@/i18n/routing'
import { useTranslations, useFormatter } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import { formatIBANForDisplay } from '@/lib/iban-validation'
import type { PaymentOrder } from '@/lib/payment-orders.types'

interface AddOrdersDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  runId: string
}

export function AddOrdersDialog({ open, onOpenChange, runId }: AddOrdersDialogProps) {
  const t = useTranslations('paymentRuns')
  const tActions = useTranslations('actions')
  const format = useFormatter()
  const router = useRouter()

  const [availableOrders, setAvailableOrders] = useState<PaymentOrder[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load available draft orders when dialog opens
  useEffect(() => {
    if (!open) return

    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const supabase = createClient()
        const { data, error: queryError } = await supabase
          .from('payment_orders')
          .select('*')
          .eq('status', 'draft')
          .is('payment_run_id', null)
          .order('created_at', { ascending: false })
          .limit(500)

        if (cancelled) return
        if (queryError) {
          console.error('Error loading available orders:', queryError)
          setError(t('addOrders.loadError'))
          return
        }
        setAvailableOrders((data ?? []) as PaymentOrder[])
        setSelectedIds(new Set())
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [open, t])

  const filtered = availableOrders.filter((o) => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return (
      o.recipient_name.toLowerCase().includes(term) ||
      o.iban.toLowerCase().includes(term) ||
      o.purpose.toLowerCase().includes(term)
    )
  })

  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (filtered.every((o) => prev.has(o.id))) {
        // All visible selected — deselect them
        const next = new Set(prev)
        filtered.forEach((o) => next.delete(o.id))
        return next
      } else {
        // Some or none selected — select all visible
        const next = new Set(prev)
        filtered.forEach((o) => next.add(o.id))
        return next
      }
    })
  }, [filtered])

  const selectedTotal = availableOrders
    .filter((o) => selectedIds.has(o.id))
    .reduce((sum, o) => sum + Number(o.amount), 0)

  const handleSave = useCallback(async () => {
    if (selectedIds.size === 0) return
    setSaving(true)
    setError(null)
    try {
      const response = await fetch(`/api/payment-runs/${runId}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_ids: Array.from(selectedIds) }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        console.error('Add orders failed:', response.status, data)
        setError(data.error || t('addOrders.saveError'))
        return
      }
      onOpenChange(false)
      router.refresh()
    } catch (err) {
      console.error('Add orders exception:', err)
      setError(t('addOrders.saveError'))
    } finally {
      setSaving(false)
    }
  }, [selectedIds, runId, onOpenChange, router, t])

  const allVisibleSelected = filtered.length > 0 && filtered.every((o) => selectedIds.has(o.id))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('addOrders.title')}</DialogTitle>
          <DialogDescription>{t('addOrders.description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 flex-1 overflow-hidden flex flex-col">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('addOrders.searchPlaceholder')}
              className="pl-9"
            />
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">{t('addOrders.loading')}</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {availableOrders.length === 0 ? t('addOrders.empty') : t('addOrders.noResults')}
            </p>
          ) : (
            <div className="flex-1 overflow-y-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="p-2 w-10">
                      <Checkbox
                        checked={allVisibleSelected}
                        onCheckedChange={toggleAll}
                        aria-label={t('addOrders.selectAll')}
                      />
                    </th>
                    <th className="p-2 text-left">{t('detail.orders.recipient')}</th>
                    <th className="p-2 text-left hidden md:table-cell">{t('detail.orders.iban')}</th>
                    <th className="p-2 text-right">{t('detail.orders.amount')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((order) => (
                    <tr key={order.id} className="border-t hover:bg-muted/30 cursor-pointer" onClick={() => toggle(order.id)}>
                      <td className="p-2">
                        <Checkbox
                          checked={selectedIds.has(order.id)}
                          onCheckedChange={() => toggle(order.id)}
                          onClick={(e) => e.stopPropagation()}
                          aria-label={order.recipient_name}
                        />
                      </td>
                      <td className="p-2 font-medium">{order.recipient_name}</td>
                      <td className="p-2 hidden md:table-cell font-mono text-xs">
                        {formatIBANForDisplay(order.iban)}
                      </td>
                      <td className="p-2 text-right tabular-nums">
                        {format.number(Number(order.amount), { style: 'currency', currency: 'CHF' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {selectedIds.size > 0 && (
            <div className="flex items-center justify-between text-sm px-1">
              <span>{t('addOrders.selected', { count: selectedIds.size })}</span>
              <span className="font-medium tabular-nums">
                {format.number(selectedTotal, { style: 'currency', currency: 'CHF' })}
              </span>
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {tActions('cancel')}
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving || selectedIds.size === 0}>
            {saving && (
              <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            )}
            {t('addOrders.submit', { count: selectedIds.size })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
