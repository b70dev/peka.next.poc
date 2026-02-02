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
import { toast } from 'sonner'
import { Plus, Loader2 } from 'lucide-react'
import { AccountType, AccountBalance } from '@/lib/database.types'

interface CreateAccountDialogProps {
  employmentId: string
  accountTypes: AccountType[]
  existingAccounts: AccountBalance[]
}

export function CreateAccountDialog({
  employmentId,
  accountTypes,
  existingAccounts,
}: CreateAccountDialogProps) {
  const t = useTranslations('accounts.create')
  const tActions = useTranslations('actions')
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedTypeId, setSelectedTypeId] = useState<string>('')
  const [displayName, setDisplayName] = useState('')

  // Filter out account types that already exist for this employment
  const existingTypeIds = new Set(existingAccounts.map(a => a.account_type_id))
  const availableTypes = accountTypes.filter(type => !existingTypeIds.has(type.id))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedTypeId) return

    setLoading(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('accounts')
        .insert({
          employment_id: employmentId,
          account_type_id: selectedTypeId,
          name: displayName || null,
          is_active: true,
        })

      if (error) {
        if (error.code === '23505') {
          // Unique constraint violation
          toast.error(t('alreadyExists'))
        } else {
          toast.error(t('error'))
          console.error('Error creating account:', error)
        }
        return
      }

      toast.success(t('success'))
      setOpen(false)
      setSelectedTypeId('')
      setDisplayName('')
      router.refresh()
    } catch (error) {
      toast.error(t('error'))
      console.error('Error creating account:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={availableTypes.length === 0}>
          <Plus className="h-4 w-4 mr-2" />
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
            {/* Account Type */}
            <div className="space-y-2">
              <Label htmlFor="account-type">{t('accountType')} *</Label>
              <Select
                value={selectedTypeId}
                onValueChange={setSelectedTypeId}
              >
                <SelectTrigger id="account-type">
                  <SelectValue placeholder={t('selectAccountType')} />
                </SelectTrigger>
                <SelectContent>
                  {availableTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name_de}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Display Name */}
            <div className="space-y-2">
              <Label htmlFor="display-name">{t('displayName')}</Label>
              <Input
                id="display-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={t('displayNamePlaceholder')}
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
            <Button type="submit" disabled={loading || !selectedTypeId}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {tActions('save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
