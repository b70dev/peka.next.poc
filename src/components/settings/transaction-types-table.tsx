'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { MoreHorizontal, Pencil, Lock, ArrowUpCircle, ArrowDownCircle, RotateCcw, Check, X } from 'lucide-react'
import { TransactionType } from '@/lib/database.types'
import { EditTransactionTypeDialog } from './edit-transaction-type-dialog'

interface TransactionTypeWithUsage extends TransactionType {
  usage_count: number
}

interface TransactionTypesTableProps {
  transactionTypes: TransactionTypeWithUsage[]
}

export function TransactionTypesTable({ transactionTypes }: TransactionTypesTableProps) {
  const t = useTranslations('settings.transactionTypes')
  const router = useRouter()
  const [editingType, setEditingType] = useState<TransactionType | null>(null)

  const handleToggleActive = async (type: TransactionTypeWithUsage) => {
    if (type.is_system) {
      toast.error(t('cannotDeactivateSystem'))
      return
    }

    const supabase = createClient()
    const { error } = await supabase
      .from('transaction_types')
      .update({ is_active: !type.is_active })
      .eq('id', type.id)

    if (error) {
      toast.error(t('updateError'))
      console.error('Error toggling transaction type:', error)
      return
    }

    toast.success(type.is_active ? t('deactivated') : t('activated'))
    router.refresh()
  }

  const getEffectIcon = (effect: string) => {
    return effect === 'credit'
      ? <ArrowUpCircle className="h-4 w-4 text-green-600" />
      : <ArrowDownCircle className="h-4 w-4 text-red-600" />
  }

  const getEffectBadge = (effect: string) => {
    return effect === 'credit'
      ? <Badge variant="default" className="bg-green-100 text-green-800">{t('credit')}</Badge>
      : <Badge variant="destructive">{t('debit')}</Badge>
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">#</TableHead>
              <TableHead>{t('columns.code')}</TableHead>
              <TableHead>{t('columns.nameDe')}</TableHead>
              <TableHead>{t('columns.nameFr')}</TableHead>
              <TableHead className="text-center">{t('columns.effect')}</TableHead>
              <TableHead className="text-center">{t('columns.reversible')}</TableHead>
              <TableHead className="text-center">{t('columns.type')}</TableHead>
              <TableHead className="text-center">{t('columns.usage')}</TableHead>
              <TableHead className="text-center">{t('columns.active')}</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactionTypes.map((type, index) => (
              <TableRow key={type.id} className={!type.is_active ? 'opacity-50' : ''}>
                <TableCell className="font-mono text-sm text-muted-foreground">
                  {type.sort_order}
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {type.code}
                </TableCell>
                <TableCell className="font-medium">
                  {type.name_de}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {type.name_fr || '-'}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    {getEffectIcon(type.effect)}
                    {getEffectBadge(type.effect)}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  {type.is_reversible ? (
                    <Badge variant="outline" className="gap-1">
                      <RotateCcw className="h-3 w-3" />
                      <Check className="h-3 w-3 text-green-600" />
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1">
                      <X className="h-3 w-3 text-muted-foreground" />
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {type.is_system ? (
                    <Badge variant="outline" className="gap-1">
                      <Lock className="h-3 w-3" />
                      System
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Custom</Badge>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline">{type.usage_count}</Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Switch
                    checked={type.is_active}
                    onCheckedChange={() => handleToggleActive(type)}
                    disabled={type.is_system}
                    aria-label={type.is_active ? t('deactivate') : t('activate')}
                  />
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditingType(type)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        {t('edit')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {transactionTypes.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  {t('noTransactionTypes')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <EditTransactionTypeDialog
        transactionType={editingType}
        open={!!editingType}
        onOpenChange={(open) => !open && setEditingType(null)}
      />
    </>
  )
}
