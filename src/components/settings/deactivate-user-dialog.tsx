'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import { Loader2, AlertTriangle } from 'lucide-react'
import { deactivateUser, type UserProfile } from '@/app/[locale]/(protected)/settings/users/actions'

interface DeactivateUserDialogProps {
  user: UserProfile | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeactivateUserDialog({ user, open, onOpenChange }: DeactivateUserDialogProps) {
  const t = useTranslations('settings.userManagement.deactivate')
  const tActions = useTranslations('actions')
  const router = useRouter()

  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setReason('')
      setLoading(false)
    }
    onOpenChange(isOpen)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) return

    setLoading(true)
    try {
      const result = await deactivateUser(user.id, reason || undefined)

      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success(t('success'))
      handleOpenChange(false)
      router.refresh()
    } catch {
      toast.error(t('error'))
    } finally {
      setLoading(false)
    }
  }

  if (!user) return null

  const displayName = user.full_name || user.email || '-'

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t('title')}</DialogTitle>
            <DialogDescription>
              {t('description', { name: displayName })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {t('warning')}
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="deactivate-reason">{t('reason')}</Label>
              <Textarea
                id="deactivate-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t('reasonPlaceholder')}
                rows={3}
                maxLength={500}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
            >
              {tActions('cancel')}
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={loading}
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
