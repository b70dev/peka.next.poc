'use client'

import { useState, useTransition, useEffect } from 'react'
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
  InsuredPersonAttribute,
  updateAttribute,
} from '@/app/[locale]/(protected)/insured/[id]/actions'

interface EditAttributeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  insuredPersonId: string
  attribute: InsuredPersonAttribute
  attributeTypes: AttributeType[]
  attributeValues: AttributeValue[]
  existingTypeIds: string[]
}

export function EditAttributeDialog({
  open,
  onOpenChange,
  insuredPersonId,
  attribute,
  attributeTypes,
  attributeValues,
  existingTypeIds,
}: EditAttributeDialogProps) {
  const t = useTranslations('insured.attributes')
  const tActions = useTranslations('actions')

  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [selectedTypeId, setSelectedTypeId] = useState(attribute.attribute_type_id)
  const [selectedValueId, setSelectedValueId] = useState(attribute.attribute_value_id)
  const [note, setNote] = useState(attribute.note || '')

  useEffect(() => {
    if (open) {
      setSelectedTypeId(attribute.attribute_type_id)
      setSelectedValueId(attribute.attribute_value_id)
      setNote(attribute.note || '')
      setError(null)
    }
  }, [open, attribute])

  const filteredValues = attributeValues.filter(
    (v) => v.attribute_type_id === selectedTypeId
  )

  const availableTypes = attributeTypes.filter(
    (t) => !existingTypeIds.includes(t.id) || t.id === attribute.attribute_type_id
  )

  const handleTypeChange = (typeId: string) => {
    setSelectedTypeId(typeId)
    setSelectedValueId('')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!selectedTypeId || !selectedValueId) return

    startTransition(async () => {
      const result = await updateAttribute(attribute.id, insuredPersonId, {
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
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('edit.title')}</DialogTitle>
          <DialogDescription>{t('edit.description')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-950 rounded-md flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="edit-attribute-type">{t('create.typeLabel')} *</Label>
            <Select value={selectedTypeId} onValueChange={handleTypeChange}>
              <SelectTrigger id="edit-attribute-type">
                <SelectValue placeholder={t('create.typePlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {availableTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-attribute-value">{t('create.valueLabel')} *</Label>
            <Select
              value={selectedValueId}
              onValueChange={setSelectedValueId}
              disabled={!selectedTypeId}
            >
              <SelectTrigger id="edit-attribute-value">
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
            <Label htmlFor="edit-attribute-note">{t('create.noteLabel')}</Label>
            <Textarea
              id="edit-attribute-note"
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
