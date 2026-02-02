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
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { Plus, Loader2, ArrowUpCircle, ArrowDownCircle } from 'lucide-react'
import { TransactionEffect } from '@/lib/database.types'

export function CreateTransactionTypeDialog() {
  const t = useTranslations('settings.transactionTypes.create')
  const tActions = useTranslations('actions')
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [code, setCode] = useState('')
  const [nameDe, setNameDe] = useState('')
  const [nameFr, setNameFr] = useState('')
  const [nameEn, setNameEn] = useState('')
  const [description, setDescription] = useState('')
  const [effect, setEffect] = useState<TransactionEffect>('credit')
  const [isReversible, setIsReversible] = useState(true)
  const [requiresReference, setRequiresReference] = useState(false)

  const validateCode = (value: string) => {
    return /^[a-z0-9_]+$/.test(value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!code || !nameDe) return

    if (!validateCode(code)) {
      toast.error(t('invalidCode'))
      return
    }

    setLoading(true)
    const supabase = createClient()

    try {
      // Get max sort_order
      const { data: maxOrder } = await supabase
        .from('transaction_types')
        .select('sort_order')
        .order('sort_order', { ascending: false })
        .limit(1)
        .single()

      const sortOrder = (maxOrder?.sort_order ?? 0) + 1

      const { error } = await supabase
        .from('transaction_types')
        .insert({
          code,
          name_de: nameDe,
          name_fr: nameFr || null,
          name_en: nameEn || null,
          description: description || null,
          effect,
          is_reversible: isReversible,
          requires_reference: requiresReference,
          sort_order: sortOrder,
          is_active: true,
          is_system: false,
        })

      if (error) {
        if (error.code === '23505') {
          toast.error(t('codeExists'))
        } else {
          toast.error(t('error'))
          console.error('Error creating transaction type:', error)
        }
        return
      }

      toast.success(t('success'))
      setOpen(false)
      resetForm()
      router.refresh()
    } catch (error) {
      toast.error(t('error'))
      console.error('Error creating transaction type:', error)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setCode('')
    setNameDe('')
    setNameFr('')
    setNameEn('')
    setDescription('')
    setEffect('credit')
    setIsReversible(true)
    setRequiresReference(false)
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
            {/* Code */}
            <div className="space-y-2">
              <Label htmlFor="code">{t('code')} *</Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder={t('codePlaceholder')}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">{t('codeHint')}</p>
            </div>

            {/* Name DE */}
            <div className="space-y-2">
              <Label htmlFor="name-de">{t('nameDe')} *</Label>
              <Input
                id="name-de"
                value={nameDe}
                onChange={(e) => setNameDe(e.target.value)}
                placeholder={t('nameDePlaceholder')}
              />
            </div>

            {/* Name FR */}
            <div className="space-y-2">
              <Label htmlFor="name-fr">{t('nameFr')}</Label>
              <Input
                id="name-fr"
                value={nameFr}
                onChange={(e) => setNameFr(e.target.value)}
                placeholder={t('nameFrPlaceholder')}
              />
            </div>

            {/* Name EN */}
            <div className="space-y-2">
              <Label htmlFor="name-en">{t('nameEn')}</Label>
              <Input
                id="name-en"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder={t('nameEnPlaceholder')}
              />
            </div>

            {/* Effect */}
            <div className="space-y-2">
              <Label htmlFor="effect">{t('effect')} *</Label>
              <Select
                value={effect}
                onValueChange={(value) => setEffect(value as TransactionEffect)}
              >
                <SelectTrigger id="effect">
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
            </div>

            {/* Options */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="reversible">{t('isReversible')}</Label>
                  <p className="text-xs text-muted-foreground">{t('isReversibleHint')}</p>
                </div>
                <Switch
                  id="reversible"
                  checked={isReversible}
                  onCheckedChange={setIsReversible}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="requires-ref">{t('requiresReference')}</Label>
                  <p className="text-xs text-muted-foreground">{t('requiresReferenceHint')}</p>
                </div>
                <Switch
                  id="requires-ref"
                  checked={requiresReference}
                  onCheckedChange={setRequiresReference}
                />
              </div>
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
            <Button type="submit" disabled={loading || !code || !nameDe}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {tActions('save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
