'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { RoleBadge } from '@/components/ui/role-badge'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { changeUserRole, type UserProfile } from '@/app/[locale]/(protected)/settings/users/actions'
import type { UserRole } from '@/lib/auth/roles'

interface ChangeRoleDialogProps {
  user: UserProfile | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const AVAILABLE_ROLES: UserRole[] = ['super_admin', 'admin', 'viewer']

export function ChangeRoleDialog({ user, open, onOpenChange }: ChangeRoleDialogProps) {
  const t = useTranslations('settings.userManagement.changeRole')
  const tRoles = useTranslations('roles')
  const tActions = useTranslations('actions')
  const router = useRouter()

  const [newRole, setNewRole] = useState<UserRole | ''>('')
  const [mfaCode, setMfaCode] = useState('')
  const [loading, setLoading] = useState(false)

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setNewRole('')
      setMfaCode('')
      setLoading(false)
    }
    onOpenChange(isOpen)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user || !newRole || !mfaCode) return

    if (newRole === user.role) {
      toast.error(t('sameRole'))
      return
    }

    setLoading(true)
    try {
      const result = await changeUserRole(user.id, newRole, mfaCode)

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
            {/* Current Role */}
            <div className="space-y-2">
              <Label>{t('currentRole')}</Label>
              <div>
                <RoleBadge role={user.role} showTooltip={false} />
              </div>
            </div>

            {/* New Role */}
            <div className="space-y-2">
              <Label htmlFor="new-role">{t('newRole')}</Label>
              <Select
                value={newRole}
                onValueChange={(v) => setNewRole(v as UserRole)}
              >
                <SelectTrigger id="new-role">
                  <SelectValue placeholder={t('selectRole')} />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_ROLES.map((role) => (
                    <SelectItem key={role} value={role} disabled={role === user.role}>
                      {tRoles(role)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* MFA Code */}
            <div className="space-y-2">
              <Label htmlFor="mfa-code">{t('mfaCode')}</Label>
              <Input
                id="mfa-code"
                value={mfaCode}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6)
                  setMfaCode(value)
                }}
                placeholder={t('mfaCodePlaceholder')}
                maxLength={6}
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="one-time-code"
              />
              <p className="text-xs text-muted-foreground">{t('mfaCodeHint')}</p>
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
              disabled={loading || !newRole || newRole === user.role || mfaCode.length < 6}
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
