'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
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
import { AlertCircle, Loader2 } from 'lucide-react'
import {
  AttributeType,
  AttributeValue,
  createAttribute,
} from '@/app/[locale]/(protected)/insured/[id]/actions'

interface CreateAttributeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  insuredPersonId: string
  attributeTypes: AttributeType[]
  attributeValues: AttributeValue[]
  existingTypeIds: string[]
}

export function CreateAttributeDialog({
  open,
  onOpenChange,
  insuredPersonId,
  attributeTypes,
  attributeValues,
  existingTypeIds,
}: CreateAttributeDialogProps) {
  const t = useTranslations('insured.attributes')
  const tActions = useTranslations('actions')

  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [selectedTypeId, setSelectedTypeId] = useState('')
  const [selectedValueId, setSelectedValueId] = useState('')
  const [note, setNote] = useState('')

  const filteredValues = attributeValues.filter(
    (v) => v.attribute_type_id === selectedTypeId
  )

  const availableTypes = attributeTypes.filter(
    (t) => !existingTypeIds.includes(t.id)
  )

  const handleTypeChange = (typeId: string) => {
    setSelectedTypeId(typeId)
    setSelectedValueId('')
  }

  const resetForm = () => {
    setSelectedTypeId('')
    setSelectedValueId('')
    setNote('')
    setError(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!selectedTypeId || !selectedValueId) return

    startTransition(async () => {
      const result = await createAttribute(insuredPersonId, {
        attribute_type_id: selectedTypeId,
        attribute_value_id: selectedValueId,
        note: note.trim() || null,
      })

      if (result.error) {
        setError(
          result.error === 'duplicateAttribute'
            ? t('create.duplicateError')
            : result.error
        )
      } else {
        onOpenChange(false)
        resetForm()
      }
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        onOpenChange(isOpen)
        if (!isOpen) resetForm()
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('create.title')}</DialogTitle>
          <DialogDescription>{t('create.description')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-950 rounded-md flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="attribute-type">{t('create.typeLabel')} *</Label>
            <Select value={selectedTypeId} onValueChange={handleTypeChange}>
              <SelectTrigger id="attribute-type">
                <SelectValue placeholder={t('create.typePlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {availableTypes.length === 0 ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    {t('create.noTypes')}
                  </div>
                ) : (
                  availableTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="attribute-value">{t('create.valueLabel')} *</Label>
            <Select
              value={selectedValueId}
              onValueChange={setSelectedValueId}
              disabled={!selectedTypeId}
            >
              <SelectTrigger id="attribute-value">
                <SelectValue placeholder={t('create.valuePlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {filteredValues.length === 0 ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    {t('create.noValues')}
                  </div>
                ) : (
                  filteredValues.map((value) => (
                    <SelectItem key={value.id} value={value.id}>
                      {value.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="attribute-note">{t('create.noteLabel')}</Label>
            <Textarea
              id="attribute-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t('create.notePlaceholder')}
              maxLength={500}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {tActions('cancel')}
            </Button>
            <Button
              type="submit"
              disabled={isPending || !selectedTypeId || !selectedValueId}
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {tActions('save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
