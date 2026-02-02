'use client'

import { useState, useMemo } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import { Plus, Loader2, AlertTriangle, ArrowUpCircle, ArrowDownCircle } from 'lucide-react'
import { TransactionType } from '@/lib/database.types'
import { cn } from '@/lib/utils'

interface CreateTransactionDialogProps {
  accountId: string
  currentBalance: number
  transactionTypes: TransactionType[]
}

export function CreateTransactionDialog({
  accountId,
  currentBalance,
  transactionTypes,
}: CreateTransactionDialogProps) {
  const t = useTranslations('transactions.create')
  const tActions = useTranslations('actions')
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedTypeId, setSelectedTypeId] = useState<string>('')
  const [amount, setAmount] = useState('')
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0])
  const [valueDate, setValueDate] = useState(new Date().toISOString().split('T')[0])
  const [reference, setReference] = useState('')
  const [description, setDescription] = useState('')

  const selectedType = transactionTypes.find(type => type.id === selectedTypeId)
  const parsedAmount = parseFloat(amount) || 0

  // Calculate new balance based on transaction type effect
  const newBalance = useMemo(() => {
    if (!selectedType || parsedAmount === 0) return currentBalance
    return selectedType.effect === 'credit'
      ? currentBalance + parsedAmount
      : currentBalance - parsedAmount
  }, [currentBalance, selectedType, parsedAmount])

  const isNegativeBalance = newBalance < 0
  const isHighAmount = parsedAmount > 1000000
  const isFutureDate = new Date(bookingDate) > new Date()

  // Filter out transfer and reversal types - those should use specific dialogs
  const availableTypes = transactionTypes.filter(
    type => !['umbuchung_soll', 'umbuchung_haben', 'stornierung'].includes(type.code)
  )

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-CH', {
      style: 'currency',
      currency: 'CHF',
    }).format(amount)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedTypeId || parsedAmount <= 0) return

    setLoading(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('transactions')
        .insert({
          account_id: accountId,
          transaction_type_id: selectedTypeId,
          amount: parsedAmount,
          booking_date: bookingDate,
          value_date: valueDate || bookingDate,
          reference: reference || null,
          description: description || null,
        })

      if (error) {
        toast.error(t('error'))
        console.error('Error creating transaction:', error)
        return
      }

      toast.success(t('success'))
      setOpen(false)
      resetForm()
      router.refresh()
    } catch (error) {
      toast.error(t('error'))
      console.error('Error creating transaction:', error)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setSelectedTypeId('')
    setAmount('')
    setBookingDate(new Date().toISOString().split('T')[0])
    setValueDate(new Date().toISOString().split('T')[0])
    setReference('')
    setDescription('')
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          {t('title')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t('title')}</DialogTitle>
            <DialogDescription>{t('description')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Current Balance */}
            <div className="bg-muted/50 p-3 rounded-lg">
              <p className="text-sm text-muted-foreground">{t('currentBalance')}</p>
              <p className="text-xl font-bold">{formatCurrency(currentBalance)}</p>
            </div>

            {/* Transaction Type */}
            <div className="space-y-2">
              <Label htmlFor="transaction-type">{t('transactionType')} *</Label>
              <Select
                value={selectedTypeId}
                onValueChange={setSelectedTypeId}
              >
                <SelectTrigger id="transaction-type">
                  <SelectValue placeholder={t('selectType')} />
                </SelectTrigger>
                <SelectContent>
                  {availableTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      <div className="flex items-center gap-2">
                        {type.effect === 'credit' ? (
                          <ArrowUpCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <ArrowDownCircle className="h-4 w-4 text-red-600" />
                        )}
                        {type.name_de}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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
                placeholder={t('amountPlaceholder')}
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="booking-date">{t('bookingDate')} *</Label>
                <Input
                  id="booking-date"
                  type="date"
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="value-date">{t('valueDate')}</Label>
                <Input
                  id="value-date"
                  type="date"
                  value={valueDate}
                  onChange={(e) => setValueDate(e.target.value)}
                />
              </div>
            </div>

            {/* Reference */}
            <div className="space-y-2">
              <Label htmlFor="reference">{t('reference')}</Label>
              <Input
                id="reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder={t('referencePlaceholder')}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">{t('descriptionLabel')}</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('descriptionPlaceholder')}
                rows={2}
              />
            </div>

            {/* Warnings */}
            {isFutureDate && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{t('futureDateWarning')}</AlertDescription>
              </Alert>
            )}

            {isHighAmount && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{t('highAmountWarning')}</AlertDescription>
              </Alert>
            )}

            {isNegativeBalance && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{t('negativeBalanceWarning')}</AlertDescription>
              </Alert>
            )}

            {/* New Balance Preview */}
            {selectedType && parsedAmount > 0 && (
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-sm text-muted-foreground">{t('newBalancePreview')}</p>
                <p className={cn(
                  'text-xl font-bold',
                  isNegativeBalance && 'text-red-600'
                )}>
                  {formatCurrency(newBalance)}
                </p>
              </div>
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
            <Button type="submit" disabled={loading || !selectedTypeId || parsedAmount <= 0}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('book')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
