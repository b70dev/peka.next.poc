'use client'

import { useState, useEffect } from 'react'
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
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { Loader2, ArrowUpCircle, ArrowDownCircle } from 'lucide-react'
import { TransactionType, TransactionEffect } from '@/lib/database.types'

interface EditTransactionTypeDialogProps {
  transactionType: TransactionType | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditTransactionTypeDialog({
  transactionType,
  open,
  onOpenChange,
}: EditTransactionTypeDialogProps) {
  const t = useTranslations('settings.transactionTypes.edit')
  const tActions = useTranslations('actions')
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [nameDe, setNameDe] = useState('')
  const [nameFr, setNameFr] = useState('')
  const [nameEn, setNameEn] = useState('')
  const [description, setDescription] = useState('')
  const [effect, setEffect] = useState<TransactionEffect>('credit')
  const [isReversible, setIsReversible] = useState(true)
  const [requiresReference, setRequiresReference] = useState(false)

  useEffect(() => {
    if (transactionType) {
      setNameDe(transactionType.name_de)
      setNameFr(transactionType.name_fr || '')
      setNameEn(transactionType.name_en || '')
      setDescription(transactionType.description || '')
      setEffect(transactionType.effect)
      setIsReversible(transactionType.is_reversible)
      setRequiresReference(transactionType.requires_reference)
    }
  }, [transactionType])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!transactionType || !nameDe) return

    setLoading(true)
    const supabase = createClient()

    try {
      const updateData: Record<string, unknown> = {
        name_de: nameDe,
        name_fr: nameFr || null,
        name_en: nameEn || null,
        description: description || null,
      }

      // Only allow changing these for non-system types
      if (!transactionType.is_system) {
        updateData.effect = effect
        updateData.is_reversible = isReversible
        updateData.requires_reference = requiresReference
      }

      const { error } = await supabase
        .from('transaction_types')
        .update(updateData)
        .eq('id', transactionType.id)

      if (error) {
        toast.error(t('error'))
        console.error('Error updating transaction type:', error)
        return
      }

      toast.success(t('success'))
      onOpenChange(false)
      router.refresh()
    } catch (error) {
      toast.error(t('error'))
      console.error('Error updating transaction type:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t('title')}</DialogTitle>
            <DialogDescription>{t('description')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Code (read-only) */}
            <div className="space-y-2">
              <Label htmlFor="edit-code">{t('code')}</Label>
              <Input
                id="edit-code"
                value={transactionType?.code || ''}
                disabled
                className="font-mono bg-muted"
              />
              <p className="text-xs text-muted-foreground">{t('codeReadOnly')}</p>
            </div>

            {/* Name DE */}
            <div className="space-y-2">
              <Label htmlFor="edit-name-de">{t('nameDe')} *</Label>
              <Input
                id="edit-name-de"
                value={nameDe}
                onChange={(e) => setNameDe(e.target.value)}
              />
            </div>

            {/* Name FR */}
            <div className="space-y-2">
              <Label htmlFor="edit-name-fr">{t('nameFr')}</Label>
              <Input
                id="edit-name-fr"
                value={nameFr}
                onChange={(e) => setNameFr(e.target.value)}
              />
            </div>

            {/* Name EN */}
            <div className="space-y-2">
              <Label htmlFor="edit-name-en">{t('nameEn')}</Label>
              <Input
                id="edit-name-en"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
              />
            </div>

            {/* Effect */}
            <div className="space-y-2">
              <Label htmlFor="edit-effect">{t('effect')}</Label>
              <Select
                value={effect}
                onValueChange={(value) => setEffect(value as TransactionEffect)}
                disabled={transactionType?.is_system}
              >
                <SelectTrigger id="edit-effect">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit">
                    <div className="flex items-center gap-2">
                      <ArrowUpCircle className="h-4 w-4 text-green-600" />
                      {t('effectCredit')}
                    </div>
                  </SelectItem>
                  <SelectItem value="debit">
                    <div className="flex items-center gap-2">
                      <ArrowDownCircle className="h-4 w-4 text-red-600" />
                      {t('effectDebit')}
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              {transactionType?.is_system && (
                <p className="text-xs text-muted-foreground">{t('effectReadOnly')}</p>
              )}
            </div>

            {/* Options */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="edit-reversible">{t('isReversible')}</Label>
                  <p className="text-xs text-muted-foreground">{t('isReversibleHint')}</p>
                </div>
                <Switch
                  id="edit-reversible"
                  checked={isReversible}
                  onCheckedChange={setIsReversible}
                  disabled={transactionType?.is_system}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="edit-requires-ref">{t('requiresReference')}</Label>
                  <p className="text-xs text-muted-foreground">{t('requiresReferenceHint')}</p>
                </div>
                <Switch
                  id="edit-requires-ref"
                  checked={requiresReference}
                  onCheckedChange={setRequiresReference}
                  disabled={transactionType?.is_system}
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="edit-description">{t('descriptionLabel')}</Label>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              {tActions('cancel')}
            </Button>
            <Button type="submit" disabled={loading || !nameDe}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {tActions('save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
