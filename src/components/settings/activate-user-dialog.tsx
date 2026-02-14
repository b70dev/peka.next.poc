'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { activateUser, type UserProfile } from '@/app/[locale]/(protected)/settings/users/actions'

interface ActivateUserDialogProps {
  user: UserProfile | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ActivateUserDialog({ user, open, onOpenChange }: ActivateUserDialogProps) {
  const t = useTranslations('settings.userManagement.activate')
  const tActions = useTranslations('actions')
  const router = useRouter()

  const [loading, setLoading] = useState(false)

  const handleActivate = async () => {
    if (!user) return

    setLoading(true)
    try {
      const result = await activateUser(user.id)

      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success(t('success'))
      onOpenChange(false)
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
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('description', { name: displayName })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {tActions('cancel')}
          </Button>
          <Button
            onClick={handleActivate}
            disabled={loading}
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {t('confirm')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
