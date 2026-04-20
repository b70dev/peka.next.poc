'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Plus, Pencil, Trash2, Tag } from 'lucide-react'
import {
  AttributeType,
  AttributeValue,
  InsuredPersonAttribute,
  deleteAttribute,
} from '@/app/[locale]/(protected)/insured/[id]/actions'
import { CreateAttributeDialog } from './create-attribute-dialog'
import { EditAttributeDialog } from './edit-attribute-dialog'

interface AttributesTabProps {
  insuredPersonId: string
  attributes: InsuredPersonAttribute[]
  attributeTypes: AttributeType[]
  attributeValues: AttributeValue[]
  canEdit: boolean
}

export function AttributesTab({
  insuredPersonId,
  attributes,
  attributeTypes,
  attributeValues,
  canEdit,
}: AttributesTabProps) {
  const t = useTranslations('insured.attributes')
  const tActions = useTranslations('actions')

  const [createOpen, setCreateOpen] = useState(false)
  const [editAttribute, setEditAttribute] = useState<InsuredPersonAttribute | null>(null)
  const [deleteAttribute_, setDeleteAttribute] = useState<InsuredPersonAttribute | null>(null)
  const [isPending, startTransition] = useTransition()

  const existingTypeIds = attributes.map((a) => a.attribute_type_id)

  const handleDelete = () => {
    if (!deleteAttribute_) return

    startTransition(async () => {
      await deleteAttribute(deleteAttribute_.id, insuredPersonId)
      setDeleteAttribute(null)
    })
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            {t('title')}
          </CardTitle>
          {canEdit && (
            <Button
              size="sm"
              onClick={() => setCreateOpen(true)}
              disabled={attributeTypes.length === 0 || existingTypeIds.length >= attributeTypes.length}
            >
              <Plus className="h-4 w-4 mr-1" />
              {t('addButton')}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {attributes.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <p className="text-muted-foreground">{t('empty')}</p>
              {canEdit && (
                <p className="text-sm text-muted-foreground">{t('emptyDescription')}</p>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('columns.type')}</TableHead>
                  <TableHead>{t('columns.value')}</TableHead>
                  <TableHead>{t('columns.note')}</TableHead>
                  {canEdit && <TableHead className="w-[100px]">{t('columns.actions')}</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {attributes.map((attr) => (
                  <TableRow key={attr.id}>
                    <TableCell className="font-medium">
                      {attr.attribute_type?.name ?? '-'}
                    </TableCell>
                    <TableCell>{attr.attribute_value?.name ?? '-'}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {attr.note || '-'}
                    </TableCell>
                    {canEdit && (
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditAttribute(attr)}
                            aria-label={tActions('edit')}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteAttribute(attr)}
                            aria-label={tActions('delete')}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CreateAttributeDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        insuredPersonId={insuredPersonId}
        attributeTypes={attributeTypes}
        attributeValues={attributeValues}
        existingTypeIds={existingTypeIds}
      />

      {editAttribute && (
        <EditAttributeDialog
          open={!!editAttribute}
          onOpenChange={(open) => { if (!open) setEditAttribute(null) }}
          insuredPersonId={insuredPersonId}
          attribute={editAttribute}
          attributeTypes={attributeTypes}
          attributeValues={attributeValues}
          existingTypeIds={existingTypeIds}
        />
      )}

      <AlertDialog
        open={!!deleteAttribute_}
        onOpenChange={(open) => { if (!open) setDeleteAttribute(null) }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('delete.title')}</AlertDialogTitle>
            <AlertDialogDescription>{t('delete.description')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tActions('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('delete.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
