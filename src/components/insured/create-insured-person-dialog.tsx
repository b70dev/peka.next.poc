'use client'

import { useState, useEffect, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/routing'
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
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Plus, AlertCircle } from 'lucide-react'
import { createInsuredPerson, getEmployersForSelect } from '@/app/[locale]/(protected)/insured/actions'
import { validateAhvNumber } from '@/lib/ahv-validation'

interface Employer {
  id: string
  name: string
}

export function CreateInsuredPersonDialog() {
  const t = useTranslations('insured')
  const tActions = useTranslations('actions')
  const tValidation = useTranslations('validation')
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [employers, setEmployers] = useState<Employer[]>([])
  const [ahvError, setAhvError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    // Personal data
    first_name: '',
    last_name: '',
    ahv_number: '',
    date_of_birth: '',
    gender: '',
    nationality: 'CH',
    marital_status: '',
    // Contact data
    email: '',
    phone: '',
    mobile: '',
    // Address
    street: '',
    postal_code: '',
    city: '',
    country: 'CH',
    // Emergency contact
    emergency_contact_name: '',
    emergency_contact_phone: '',
    // Notes
    notes: '',
    // Employment
    employer_id: '',
    entry_date: '',
    employment_rate: '100',
  })

  // Load employers when dialog opens
  useEffect(() => {
    if (open) {
      loadEmployers()
    }
  }, [open])

  const loadEmployers = async () => {
    const result = await getEmployersForSelect()
    if (result.employers) {
      setEmployers(result.employers)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))

    // Validate AHV number on change
    if (field === 'ahv_number') {
      if (value.replace(/\./g, '').length === 13) {
        const validation = validateAhvNumber(value)
        if (!validation.valid && validation.error) {
          setAhvError(t(`create.validation.${validation.error}`))
        } else {
          setAhvError(null)
        }
      } else {
        setAhvError(null)
      }
    }
  }

  const formatAhvInput = (value: string) => {
    // Remove non-digits
    const digits = value.replace(/\D/g, '')

    // Format as 756.xxxx.xxxx.xx
    if (digits.length <= 3) return digits
    if (digits.length <= 7) return `${digits.slice(0, 3)}.${digits.slice(3)}`
    if (digits.length <= 11) return `${digits.slice(0, 3)}.${digits.slice(3, 7)}.${digits.slice(7)}`
    return `${digits.slice(0, 3)}.${digits.slice(3, 7)}.${digits.slice(7, 11)}.${digits.slice(11, 13)}`
  }

  const handleAhvChange = (value: string) => {
    const formatted = formatAhvInput(value)
    handleChange('ahv_number', formatted)
  }

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      ahv_number: '',
      date_of_birth: '',
      gender: '',
      nationality: 'CH',
      marital_status: '',
      email: '',
      phone: '',
      mobile: '',
      street: '',
      postal_code: '',
      city: '',
      country: 'CH',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      notes: '',
      employer_id: '',
      entry_date: '',
      employment_rate: '100',
    })
    setError(null)
    setAhvError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate required fields
    if (!formData.first_name || !formData.last_name || !formData.ahv_number ||
        !formData.date_of_birth || !formData.employer_id || !formData.entry_date) {
      setError(tValidation('required'))
      return
    }

    // Validate AHV number
    const ahvValidation = validateAhvNumber(formData.ahv_number)
    if (!ahvValidation.valid) {
      setAhvError(t(`create.validation.${ahvValidation.error}`))
      return
    }

    startTransition(async () => {
      const result = await createInsuredPerson({
        first_name: formData.first_name,
        last_name: formData.last_name,
        ahv_number: formData.ahv_number,
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
        country: formData.country || 'CH',
        emergency_contact_name: formData.emergency_contact_name || null,
        emergency_contact_phone: formData.emergency_contact_phone || null,
        notes: formData.notes || null,
        employment: {
          employer_id: formData.employer_id,
          entry_date: formData.entry_date,
          employment_rate: parseInt(formData.employment_rate, 10),
        },
      })

      if (result.error) {
        if (result.error === 'ahvAlreadyExists') {
          setAhvError(t('create.validation.ahvAlreadyExists'))
        } else if (result.error.startsWith('ahv')) {
          setAhvError(t(`create.validation.${result.error}`))
        } else {
          setError(result.error)
        }
      } else if (result.success && result.id) {
        setOpen(false)
        resetForm()
        router.push(`/insured/${result.id}`)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen)
      if (!isOpen) resetForm()
    }}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          {t('create.button')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('create.title')}</DialogTitle>
          <DialogDescription>
            {t('create.description')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-950 rounded-md flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {/* Personal Data */}
          <div className="space-y-4">
            <h3 className="font-medium border-b pb-2">{t('detail.sections.personalData')}</h3>
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
                <Label htmlFor="ahv_number">{t('detail.fields.ahvNumber')} *</Label>
                <Input
                  id="ahv_number"
                  value={formData.ahv_number}
                  onChange={(e) => handleAhvChange(e.target.value)}
                  placeholder="756.xxxx.xxxx.xx"
                  maxLength={16}
                  className={ahvError ? 'border-red-500' : ''}
                  required
                />
                {ahvError && (
                  <p className="text-sm text-red-500">{ahvError}</p>
                )}
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

          {/* Employment (Required) */}
          <div className="space-y-4">
            <h3 className="font-medium border-b pb-2">{t('create.employment.title')} *</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="employer_id">{t('detail.employments.employer')} *</Label>
                <Select value={formData.employer_id} onValueChange={(v) => handleChange('employer_id', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('create.employment.selectEmployer')} />
                  </SelectTrigger>
                  <SelectContent>
                    {employers.map((employer) => (
                      <SelectItem key={employer.id} value={employer.id}>
                        {employer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="entry_date">{t('detail.employments.entryDate')} *</Label>
                <Input
                  id="entry_date"
                  type="date"
                  value={formData.entry_date}
                  onChange={(e) => handleChange('entry_date', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="employment_rate">{t('detail.employments.employmentRate')} *</Label>
                <div className="relative">
                  <Input
                    id="employment_rate"
                    type="number"
                    min="1"
                    max="100"
                    value={formData.employment_rate}
                    onChange={(e) => handleChange('employment_rate', e.target.value)}
                    className="pr-8"
                    required
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Data */}
          <div className="space-y-4">
            <h3 className="font-medium border-b pb-2">{t('detail.sections.contactData')}</h3>
            <div className="grid grid-cols-3 gap-4">
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
            <h3 className="font-medium border-b pb-2">{t('detail.sections.address')}</h3>
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
            <h3 className="font-medium border-b pb-2">{t('detail.sections.emergencyContact')}</h3>
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
            <h3 className="font-medium border-b pb-2">{t('detail.sections.notes')}</h3>
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
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
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
