'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Employment, Employer } from '@/lib/database.types'
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
import { addEmployment, updateEmployment, getEmployers } from '@/app/[locale]/(protected)/insured/[id]/actions'

type EmploymentWithEmployer = Employment & {
  employer: Employer | null;
};

interface EmploymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  insuredPersonId: string;
  employment?: EmploymentWithEmployer;
  mode: 'add' | 'edit';
}

export function EmploymentDialog({
  open,
  onOpenChange,
  insuredPersonId,
  employment,
  mode,
}: EmploymentDialogProps) {
  const t = useTranslations('insured.detail.employments')
  const tActions = useTranslations('actions')

  const [employers, setEmployers] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    employer_id: '',
    entry_date: '',
    exit_date: '',
    employment_rate: 100,
  })

  useEffect(() => {
    if (open) {
      getEmployers().then((result) => {
        if (result.employers) {
          setEmployers(result.employers)
        }
      })

      if (mode === 'edit' && employment) {
        setFormData({
          employer_id: employment.employer_id,
          entry_date: employment.entry_date,
          exit_date: employment.exit_date || '',
          employment_rate: employment.employment_rate,
        })
      } else {
        setFormData({
          employer_id: '',
          entry_date: new Date().toISOString().split('T')[0],
          exit_date: '',
          employment_rate: 100,
        })
      }
      setError(null)
    }
  }, [open, mode, employment])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      let result
      if (mode === 'add') {
        result = await addEmployment(insuredPersonId, {
          employer_id: formData.employer_id,
          entry_date: formData.entry_date,
          employment_rate: formData.employment_rate,
        })
      } else if (employment) {
        result = await updateEmployment(employment.id, insuredPersonId, {
          employer_id: formData.employer_id,
          entry_date: formData.entry_date,
          exit_date: formData.exit_date || null,
          employment_rate: formData.employment_rate,
        })
      }

      if (result?.error) {
        setError(result.error)
      } else {
        onOpenChange(false)
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
          <DialogTitle>
            {mode === 'add' ? t('addEmployment') : t('editEmployment')}
          </DialogTitle>
          <DialogDescription>
            {mode === 'add'
              ? 'Neue Anstellung hinzufügen'
              : 'Anstellung bearbeiten'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="employer">{t('employer')}</Label>
            <Select
              value={formData.employer_id}
              onValueChange={(value) => setFormData({ ...formData, employer_id: value })}
            >
              <SelectTrigger id="employer">
                <SelectValue placeholder="Arbeitgeber auswählen" />
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
            <Label htmlFor="entry_date">{t('entryDate')}</Label>
            <Input
              id="entry_date"
              type="date"
              value={formData.entry_date}
              onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })}
              required
            />
          </div>

          {mode === 'edit' && (
            <div className="space-y-2">
              <Label htmlFor="exit_date">{t('exitDate')}</Label>
              <Input
                id="exit_date"
                type="date"
                value={formData.exit_date}
                onChange={(e) => setFormData({ ...formData, exit_date: e.target.value })}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="employment_rate">{t('employmentRate')} (%)</Label>
            <Input
              id="employment_rate"
              type="number"
              min="1"
              max="100"
              value={formData.employment_rate}
              onChange={(e) => setFormData({ ...formData, employment_rate: parseInt(e.target.value) || 0 })}
              required
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {tActions('cancel')}
            </Button>
            <Button type="submit" disabled={loading || !formData.employer_id}>
              {loading ? '...' : tActions('save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
