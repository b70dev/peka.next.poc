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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import { ArrowLeftRight, Loader2, AlertTriangle } from 'lucide-react'
import { AccountBalance } from '@/lib/database.types'

interface TransferDialogProps {
  employmentId: string
  accounts: AccountBalance[]
}

export function TransferDialog({ employmentId, accounts }: TransferDialogProps) {
  const t = useTranslations('transactions.transfer')
  const tActions = useTranslations('actions')
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sourceAccountId, setSourceAccountId] = useState<string>('')
  const [targetAccountId, setTargetAccountId] = useState<string>('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')

  const sourceAccount = accounts.find(a => a.account_id === sourceAccountId)
  const parsedAmount = parseFloat(amount) || 0

  const hasInsufficientFunds = sourceAccount && parsedAmount > (sourceAccount.balance ?? 0)
  const isSameAccount = Boolean(sourceAccountId && sourceAccountId === targetAccountId)

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return 'CHF 0.00'
    return new Intl.NumberFormat('de-CH', {
      style: 'currency',
      currency: 'CHF',
    }).format(amount)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!sourceAccountId || !targetAccountId || parsedAmount <= 0) return
    if (isSameAccount) return

    setLoading(true)
    const supabase = createClient()

    try {
      // Get transaction types for transfer
      const { data: transactionTypes } = await supabase
        .from('transaction_types')
        .select('*')
        .in('code', ['umbuchung_soll', 'umbuchung_haben'])

      const debitType = transactionTypes?.find(t => t.code === 'umbuchung_soll')
      const creditType = transactionTypes?.find(t => t.code === 'umbuchung_haben')

      if (!debitType || !creditType) {
        toast.error(t('error'))
        return
      }

      const today = new Date().toISOString().split('T')[0]

      // Create debit transaction on source account
      const { data: debitTransaction, error: debitError } = await supabase
        .from('transactions')
        .insert({
          account_id: sourceAccountId,
          transaction_type_id: debitType.id,
          amount: parsedAmount,
          booking_date: today,
          value_date: today,
          description: description || `Umbuchung nach ${accounts.find(a => a.account_id === targetAccountId)?.account_type_name}`,
        })
        .select()
        .single()

      if (debitError) {
        toast.error(t('error'))
        console.error('Error creating debit transaction:', debitError)
        return
      }

      // Create credit transaction on target account with reference to debit
      const { error: creditError } = await supabase
        .from('transactions')
        .insert({
          account_id: targetAccountId,
          transaction_type_id: creditType.id,
          amount: parsedAmount,
          booking_date: today,
          value_date: today,
          description: description || `Umbuchung von ${accounts.find(a => a.account_id === sourceAccountId)?.account_type_name}`,
          related_transaction_id: debitTransaction.id,
        })

      if (creditError) {
        toast.error(t('error'))
        console.error('Error creating credit transaction:', creditError)
        return
      }

      toast.success(t('success'))
      setOpen(false)
      setSourceAccountId('')
      setTargetAccountId('')
      setAmount('')
      setDescription('')
      router.refresh()
    } catch (error) {
      toast.error(t('error'))
      console.error('Error during transfer:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <ArrowLeftRight className="h-4 w-4 mr-2" />
          {t('title')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t('title')}</DialogTitle>
            <DialogDescription>{t('description')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Source Account */}
            <div className="space-y-2">
              <Label htmlFor="source-account">{t('sourceAccount')} *</Label>
              <Select
                value={sourceAccountId}
                onValueChange={setSourceAccountId}
              >
                <SelectTrigger id="source-account">
                  <SelectValue placeholder={t('selectAccount')} />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.account_id!} value={account.account_id!}>
                      {account.account_type_name} ({formatCurrency(account.balance)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Target Account */}
            <div className="space-y-2">
              <Label htmlFor="target-account">{t('targetAccount')} *</Label>
              <Select
                value={targetAccountId}
                onValueChange={setTargetAccountId}
              >
                <SelectTrigger id="target-account">
                  <SelectValue placeholder={t('selectAccount')} />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.account_id!} value={account.account_id!}>
                      {account.account_type_name} ({formatCurrency(account.balance)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Same Account Error */}
            {isSameAccount && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{t('sameAccountError')}</AlertDescription>
              </Alert>
            )}

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">{t('amount')} *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>

            {/* Insufficient Funds Warning */}
            {hasInsufficientFunds && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{t('insufficientFundsWarning')}</AlertDescription>
              </Alert>
            )}
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
              disabled={loading || !sourceAccountId || !targetAccountId || parsedAmount <= 0 || isSameAccount}
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {tActions('confirm')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
