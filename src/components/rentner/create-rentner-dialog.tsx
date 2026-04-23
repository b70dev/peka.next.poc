'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { formatAhvNumber } from '@/lib/pensioners'

export interface SelectablePerson {
  id: string
  first_name: string
  last_name: string
  ahv_number: string
  employments: SelectableEmployment[]
}

export interface SelectableEmployment {
  id: string
  employer_name: string | null
  entry_date: string
  exit_date: string | null
}

interface CreateRentnerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  persons: SelectablePerson[]
}

export function CreateRentnerDialog({
  open,
  onOpenChange,
  persons,
}: CreateRentnerDialogProps) {
  const t = useTranslations('pensioners.new')
  const tActions = useTranslations('actions')
  const router = useRouter()

  const [personOpen, setPersonOpen] = useState(false)
  const [personId, setPersonId] = useState<string>('')
  const [employmentId, setEmploymentId] = useState<string>('')
  const [retirementDate, setRetirementDate] = useState<string>('')
  const [amount, setAmount] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setPersonId('')
      setEmploymentId('')
      setRetirementDate('')
      setAmount('')
      setError(null)
    }
  }, [open])

  const selectedPerson = useMemo(
    () => persons.find((p) => p.id === personId) ?? null,
    [persons, personId]
  )

  const employmentsSorted = useMemo(() => {
    if (!selectedPerson) return []
    return [...selectedPerson.employments].sort((a, b) => {
      // Active (no exit_date) first, then most recent entry_date
      const aActive = !a.exit_date ? 0 : 1
      const bActive = !b.exit_date ? 0 : 1
      if (aActive !== bActive) return aActive - bActive
      return b.entry_date.localeCompare(a.entry_date)
    })
  }, [selectedPerson])

  const canSubmit =
    personId && employmentId && retirementDate && amount && !saving

  const handlePersonSelect = (newPersonId: string) => {
    setPersonId(newPersonId)
    setEmploymentId('')
    setPersonOpen(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const parsedAmount = Number(amount.replace(',', '.'))
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError(t('errorInvalidAmount'))
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/pensioners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          insured_person_id: personId,
          employment_id: employmentId,
          retirement_date: retirementDate,
          monthly_pension_amount: parsedAmount,
        }),
      })

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        // Special-case 409: person already has an active pension
        if (res.status === 409) {
          setError(t('errorAlreadyHasPension'))
          return
        }
        throw new Error(body.error || `HTTP ${res.status}`)
      }

      toast.success(t('successToast'))
      onOpenChange(false)
      router.refresh()
    } catch (err) {
      console.error('Create pension account failed:', err)
      const message = err instanceof Error ? err.message : t('errorGeneric')
      setError(message)
      toast.error(t('errorGeneric'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t('title')}</DialogTitle>
            <DialogDescription>{t('description')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Person picker */}
            <div className="space-y-2">
              <Label htmlFor="person-trigger">{t('personLabel')}</Label>
              <Popover open={personOpen} onOpenChange={setPersonOpen}>
                <PopoverTrigger asChild>
                  <Button
                    id="person-trigger"
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={personOpen}
                    className="w-full justify-between font-normal"
                  >
                    {selectedPerson ? (
                      <span className="truncate">
                        {selectedPerson.last_name}, {selectedPerson.first_name}
                        <span className="text-muted-foreground ml-2 font-mono text-xs">
                          {formatAhvNumber(selectedPerson.ahv_number)}
                        </span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">
                        {t('personPlaceholder')}
                      </span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[var(--radix-popover-trigger-width)] p-0"
                  align="start"
                >
                  <Command
                    filter={(value, search) => {
                      // value is `${last_name} ${first_name} ${ahv_number}` lowercased
                      const needle = search.toLowerCase().replace(/\./g, '')
                      const haystack = value.toLowerCase().replace(/\./g, '')
                      return haystack.includes(needle) ? 1 : 0
                    }}
                  >
                    <CommandInput placeholder={t('personSearchPlaceholder')} />
                    <CommandList>
                      <CommandEmpty>{t('personNotFound')}</CommandEmpty>
                      <CommandGroup>
                        {persons.map((p) => {
                          const value = `${p.last_name} ${p.first_name} ${p.ahv_number}`
                          return (
                            <CommandItem
                              key={p.id}
                              value={value}
                              onSelect={() => handlePersonSelect(p.id)}
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  personId === p.id ? 'opacity-100' : 'opacity-0'
                                )}
                              />
                              <div className="flex flex-col">
                                <span>
                                  {p.last_name}, {p.first_name}
                                </span>
                                <span className="text-muted-foreground font-mono text-xs">
                                  {formatAhvNumber(p.ahv_number)}
                                </span>
                              </div>
                            </CommandItem>
                          )
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Employment picker */}
            <div className="space-y-2">
              <Label htmlFor="employment-select">{t('employmentLabel')}</Label>
              {selectedPerson && employmentsSorted.length === 0 ? (
                <p className="text-sm text-destructive" role="alert">
                  {t('noEmployments')}
                </p>
              ) : (
                <Select
                  value={employmentId}
                  onValueChange={setEmploymentId}
                  disabled={!selectedPerson}
                >
                  <SelectTrigger id="employment-select" className="w-full">
                    <SelectValue placeholder={t('employmentPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {employmentsSorted.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.employer_name ?? t('employerUnknown')} ·{' '}
                        {e.entry_date}
                        {e.exit_date ? ` – ${e.exit_date}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Retirement date */}
            <div className="space-y-2">
              <Label htmlFor="retirement-date">{t('retirementDateLabel')}</Label>
              <Input
                id="retirement-date"
                type="date"
                value={retirementDate}
                onChange={(e) => setRetirementDate(e.target.value)}
              />
            </div>

            {/* Monthly amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">{t('amountLabel')}</Label>
              <Input
                id="amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                placeholder={t('amountPlaceholder')}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              {tActions('cancel')}
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {saving && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
              )}
              {t('create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
