'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/routing'
import { InsuredPerson } from '@/lib/database.types'
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
import { Loader2 } from 'lucide-react'
import { updateInsuredPerson } from '@/app/[locale]/(protected)/insured/[id]/actions'

interface EditInsuredPersonDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  insuredPerson: InsuredPerson
}

export function EditInsuredPersonDialog({
  open,
  onOpenChange,
  insuredPerson,
}: EditInsuredPersonDialogProps) {
  const t = useTranslations('insured')
  const tActions = useTranslations('actions')
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    first_name: insuredPerson.first_name,
    last_name: insuredPerson.last_name,
    date_of_birth: insuredPerson.date_of_birth,
    gender: insuredPerson.gender || '',
    nationality: insuredPerson.nationality || 'CH',
    marital_status: insuredPerson.marital_status || '',
    email: insuredPerson.email || '',
    phone: insuredPerson.phone || '',
    mobile: insuredPerson.mobile || '',
    street: insuredPerson.street || '',
    postal_code: insuredPerson.postal_code || '',
    city: insuredPerson.city || '',
    country: insuredPerson.country || 'CH',
    emergency_contact_name: insuredPerson.emergency_contact_name || '',
    emergency_contact_phone: insuredPerson.emergency_contact_phone || '',
    notes: insuredPerson.notes || '',
  })

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      const result = await updateInsuredPerson(insuredPerson.id, {
        first_name: formData.first_name,
        last_name: formData.last_name,
        date_of_birth: formData.date_of_birth,
        gender: formData.gender as 'm' | 'f' | 'd' | null || null,
        nationality: formData.nationality || null,
        marital_status: formData.marital_status as 'single' | 'married' | 'divorced' | 'widowed' | 'registered_partnership' | null || null,
        email: formData.email || null,
        phone: formData.phone || null,
        mobile: formData.mobile || null,
        street: formData.street || null,
        postal_code: formData.postal_code || null,
        city: formData.city || null,
        country: formData.country || null,
        emergency_contact_name: formData.emergency_contact_name || null,
        emergency_contact_phone: formData.emergency_contact_phone || null,
        notes: formData.notes || null,
      })

      if (result.error) {
        setError(result.error)
      } else {
        onOpenChange(false)
        router.refresh()
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('detail.edit.title')}</DialogTitle>
          <DialogDescription>
            {t('detail.edit.description')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-950 rounded-md">
              {error}
            </div>
          )}

          {/* Personal Data */}
          <div className="space-y-4">
            <h3 className="font-medium">{t('detail.sections.personalData')}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">{t('detail.fields.firstName')} *</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => handleChange('first_name', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">{t('detail.fields.lastName')} *</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => handleChange('last_name', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date_of_birth">{t('detail.fields.dateOfBirth')} *</Label>
                <Input
                  id="date_of_birth"
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => handleChange('date_of_birth', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">{t('detail.fields.gender')}</Label>
                <Select value={formData.gender} onValueChange={(v) => handleChange('gender', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="-" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="m">{t('detail.gender.m')}</SelectItem>
                    <SelectItem value="f">{t('detail.gender.f')}</SelectItem>
                    <SelectItem value="d">{t('detail.gender.d')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="nationality">{t('detail.fields.nationality')}</Label>
                <Input
                  id="nationality"
                  value={formData.nationality}
                  onChange={(e) => handleChange('nationality', e.target.value)}
                  maxLength={2}
                  placeholder="CH"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="marital_status">{t('detail.fields.maritalStatus')}</Label>
                <Select value={formData.marital_status} onValueChange={(v) => handleChange('marital_status', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="-" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">{t('detail.maritalStatus.single')}</SelectItem>
                    <SelectItem value="married">{t('detail.maritalStatus.married')}</SelectItem>
                    <SelectItem value="divorced">{t('detail.maritalStatus.divorced')}</SelectItem>
                    <SelectItem value="widowed">{t('detail.maritalStatus.widowed')}</SelectItem>
                    <SelectItem value="registered_partnership">{t('detail.maritalStatus.registered_partnership')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Contact Data */}
          <div className="space-y-4">
            <h3 className="font-medium">{t('detail.sections.contactData')}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t('detail.fields.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">{t('detail.fields.phone')}</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mobile">{t('detail.fields.mobile')}</Label>
                <Input
                  id="mobile"
                  type="tel"
                  value={formData.mobile}
                  onChange={(e) => handleChange('mobile', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="space-y-4">
            <h3 className="font-medium">{t('detail.sections.address')}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label htmlFor="street">{t('detail.fields.street')}</Label>
                <Input
                  id="street"
                  value={formData.street}
                  onChange={(e) => handleChange('street', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postal_code">{t('detail.fields.postalCode')}</Label>
                <Input
                  id="postal_code"
                  value={formData.postal_code}
                  onChange={(e) => handleChange('postal_code', e.target.value)}
                  maxLength={10}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">{t('detail.fields.city')}</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">{t('detail.fields.country')}</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => handleChange('country', e.target.value)}
                  maxLength={2}
                  placeholder="CH"
                />
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="space-y-4">
            <h3 className="font-medium">{t('detail.sections.emergencyContact')}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="emergency_contact_name">{t('detail.fields.emergencyName')}</Label>
                <Input
                  id="emergency_contact_name"
                  value={formData.emergency_contact_name}
                  onChange={(e) => handleChange('emergency_contact_name', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergency_contact_phone">{t('detail.fields.emergencyPhone')}</Label>
                <Input
                  id="emergency_contact_phone"
                  type="tel"
                  value={formData.emergency_contact_phone}
                  onChange={(e) => handleChange('emergency_contact_phone', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-4">
            <h3 className="font-medium">{t('detail.sections.notes')}</h3>
            <div className="space-y-2">
              <Label htmlFor="notes">{t('detail.fields.notes')}</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {tActions('cancel')}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {tActions('save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
