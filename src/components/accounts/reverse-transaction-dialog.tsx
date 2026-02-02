'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { RotateCcw, Loader2, ArrowUpCircle, ArrowDownCircle } from 'lucide-react'
import { TransactionWithRunningBalance } from '@/lib/database.types'

interface ReverseTransactionDialogProps {
  transaction: TransactionWithRunningBalance
  accountId: string
}

export function ReverseTransactionDialog({
  transaction,
  accountId,
}: ReverseTransactionDialogProps) {
  const t = useTranslations('transactions.reverse')
  const tActions = useTranslations('actions')
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [reason, setReason] = useState('')

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return 'CHF 0.00'
    return new Intl.NumberFormat('de-CH', {
      style: 'currency',
      currency: 'CHF',
    }).format(amount)
  }

  const formatDate = (date: string | null | undefined) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('de-CH')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!reason.trim()) {
      toast.error(t('reasonRequired'))
      return
    }

    setLoading(true)
    const supabase = createClient()

    try {
      // Get the reversal transaction type
      const { data: reversalType } = await supabase
        .from('transaction_types')
        .select('*')
        .eq('code', 'stornierung')
        .single()

      if (!reversalType) {
        toast.error(t('error'))
        return
      }

      const today = new Date().toISOString().split('T')[0]

      // Create reversal transaction (opposite effect of original)
      const { error: reversalError } = await supabase
        .from('transactions')
        .insert({
          account_id: accountId,
          transaction_type_id: reversalType.id,
          amount: transaction.amount,
          booking_date: today,
          value_date: today,
          description: `Stornierung: ${reason}`,
          related_transaction_id: transaction.id,
        })

      if (reversalError) {
        toast.error(t('error'))
        console.error('Error creating reversal:', reversalError)
        return
      }

      // Mark original transaction as reversed
      const { error: updateError } = await supabase
        .from('transactions')
        .update({ is_reversed: true })
        .eq('id', transaction.id)

      if (updateError) {
        console.error('Error marking transaction as reversed:', updateError)
        // The reversal was created, so we continue
      }

      toast.success(t('success'))
      setOpen(false)
      setReason('')
      router.refresh()
    } catch (error) {
      toast.error(t('error'))
      console.error('Error reversing transaction:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <RotateCcw className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t('title')}</DialogTitle>
            <DialogDescription>{t('description')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Original Transaction Details */}
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                {t('originalTransaction')}
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {transaction.effect === 'credit' ? (
                    <ArrowUpCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <ArrowDownCircle className="h-4 w-4 text-red-600" />
                  )}
                  <span className="font-medium">{transaction.transaction_type_name}</span>
                </div>
                <span className={`font-mono font-bold ${
                  transaction.effect === 'credit' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {transaction.effect === 'credit' ? '+' : '-'}
                  {formatCurrency(transaction.amount)}
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                {formatDate(transaction.booking_date)}
                {transaction.description && (
                  <span className="ml-2">- {transaction.description}</span>
                )}
              </div>
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <Label htmlFor="reason">{t('reason')} *</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t('reasonPlaceholder')}
                rows={3}
                required
              />
            </div>
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
            <Button
              type="submit"
              variant="destructive"
              disabled={loading || !reason.trim()}
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('confirm')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
