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
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { AccountType, BalanceEffect } from '@/lib/database.types'

interface EditAccountTypeDialogProps {
  accountType: AccountType | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditAccountTypeDialog({
  accountType,
  open,
  onOpenChange,
}: EditAccountTypeDialogProps) {
  const t = useTranslations('settings.accountTypes.edit')
  const tActions = useTranslations('actions')
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [nameDe, setNameDe] = useState('')
  const [nameFr, setNameFr] = useState('')
  const [nameEn, setNameEn] = useState('')
  const [description, setDescription] = useState('')
  const [affectsBalance, setAffectsBalance] = useState<BalanceEffect>('positive')

  useEffect(() => {
    if (accountType) {
      setNameDe(accountType.name_de)
      setNameFr(accountType.name_fr || '')
      setNameEn(accountType.name_en || '')
      setDescription(accountType.description || '')
      setAffectsBalance(accountType.affects_balance)
    }
  }, [accountType])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!accountType || !nameDe) return

    setLoading(true)
    const supabase = createClient()

    try {
      const updateData: Record<string, unknown> = {
        name_de: nameDe,
        name_fr: nameFr || null,
        name_en: nameEn || null,
        description: description || null,
      }

      // Only allow changing affects_balance for non-system types
      if (!accountType.is_system) {
        updateData.affects_balance = affectsBalance
      }

      const { error } = await supabase
        .from('account_types')
        .update(updateData)
        .eq('id', accountType.id)

      if (error) {
        toast.error(t('error'))
        console.error('Error updating account type:', error)
        return
      }

      toast.success(t('success'))
      onOpenChange(false)
      router.refresh()
    } catch (error) {
      toast.error(t('error'))
      console.error('Error updating account type:', error)
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
                value={accountType?.code || ''}
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

            {/* Affects Balance */}
            <div className="space-y-2">
              <Label htmlFor="edit-affects-balance">{t('affectsBalance')}</Label>
              <Select
                value={affectsBalance}
                onValueChange={(value) => setAffectsBalance(value as BalanceEffect)}
                disabled={accountType?.is_system}
              >
                <SelectTrigger id="edit-affects-balance">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="positive">{t('effectPositive')}</SelectItem>
                  <SelectItem value="negative">{t('effectNegative')}</SelectItem>
                  <SelectItem value="neutral">{t('effectNeutral')}</SelectItem>
                </SelectContent>
              </Select>
              {accountType?.is_system && (
                <p className="text-xs text-muted-foreground">{t('effectReadOnly')}</p>
              )}
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
