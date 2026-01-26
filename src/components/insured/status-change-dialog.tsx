'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { InsuredPersonStatus } from '@/lib/database.types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { Badge } from '@/components/ui/badge'
import { changeStatus } from '@/app/[locale]/(protected)/insured/[id]/actions'

const statusColors: Record<InsuredPersonStatus, string> = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  exited: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  retired: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  deceased: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
}

const allStatuses: InsuredPersonStatus[] = ['active', 'exited', 'retired', 'deceased']

interface StatusChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  insuredPersonId: string;
  currentStatus: InsuredPersonStatus | null;
}

export function StatusChangeDialog({
  open,
  onOpenChange,
  insuredPersonId,
  currentStatus,
}: StatusChangeDialogProps) {
  const t = useTranslations('insured')
  const tActions = useTranslations('actions')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newStatus, setNewStatus] = useState<string>('')
  const [reason, setReason] = useState('')

  const availableStatuses = allStatuses.filter(s => s !== currentStatus)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newStatus) return

    setLoading(true)
    setError(null)

    try {
      const result = await changeStatus(insuredPersonId, newStatus, reason || undefined)

      if (result?.error) {
        setError(result.error)
      } else {
        onOpenChange(false)
        setNewStatus('')
        setReason('')
      }
    } catch (err) {
      setError('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('detail.statusChange.title')}</DialogTitle>
          <DialogDescription>
            Status der versicherten Person ändern
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>{t('detail.statusChange.currentStatus')}</Label>
            <div>
              {currentStatus ? (
                <Badge className={statusColors[currentStatus]} variant="secondary">
                  {t(`status.${currentStatus}`)}
                </Badge>
              ) : (
                <span className="text-muted-foreground">-</span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="newStatus">{t('detail.statusChange.newStatus')}</Label>
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger id="newStatus">
                <SelectValue placeholder="Neuen Status auswählen" />
              </SelectTrigger>
              <SelectContent>
                {availableStatuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    <div className="flex items-center gap-2">
                      <Badge className={statusColors[status]} variant="secondary">
                        {t(`status.${status}`)}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">{t('detail.statusChange.reason')}</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('detail.statusChange.reasonPlaceholder')}
              rows={3}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {tActions('cancel')}
            </Button>
            <Button type="submit" disabled={loading || !newStatus}>
              {loading ? '...' : tActions('confirm')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
